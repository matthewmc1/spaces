# Phase 5: Rollup Metrics, Teams & Programmes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build org-level and team-level rollup dashboards, classify spaces by type, and add programmes as cross-cutting work containers spanning multiple spaces.

**Architecture:** Backend adds `space_type`, a `programmes` domain, and a read-only `rollup` domain backed by a Postgres materialized view refreshed every 5 min on a Go goroutine, cached in Redis with a 5-min TTL. Frontend adds three new routes (`/org`, `/spaces/[id]/team`, `/programmes`, `/programmes/[id]`) and a handful of rollup components that consume new hooks.

**Tech Stack:** Go stdlib + pgx, Next.js 16 + TanStack Query, Tailwind v4, PostgreSQL 16 materialized views, Redis cache

---

## Part A: Database & Backend Foundation (Tasks 1–3)

### Task 1: Database Migration — Space Types, Programmes, Materialized View

**Files:**
- Create: `backend/migrations/008_phase5_rollup_teams_programmes.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- +goose Up

-- 1. Add space_type to spaces
ALTER TABLE spaces ADD COLUMN space_type TEXT NOT NULL DEFAULT 'workstream'
    CHECK (space_type IN ('organization', 'department', 'team', 'workstream'));

-- 2. Backfill: mark the earliest root space per tenant as the organization
UPDATE spaces s SET space_type = 'organization'
WHERE s.parent_space_id IS NULL
  AND s.id = (
    SELECT id FROM spaces
    WHERE tenant_id = s.tenant_id AND parent_space_id IS NULL
    ORDER BY created_at ASC LIMIT 1
  );

-- 3. Programmes table
CREATE TABLE programmes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'completed')),
    owner_id    UUID NOT NULL REFERENCES users(id),
    start_date  DATE,
    target_date DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_programmes_tenant ON programmes(tenant_id);

-- 4. Programme-space join table
CREATE TABLE programme_spaces (
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    space_id     UUID NOT NULL REFERENCES spaces(id),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    role         TEXT NOT NULL DEFAULT 'contributes'
                 CHECK (role IN ('owns', 'contributes')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (programme_id, space_id)
);
CREATE INDEX idx_programme_spaces_space ON programme_spaces(space_id);
CREATE INDEX idx_programme_spaces_tenant ON programme_spaces(tenant_id);

-- 5. Extend goal_links to accept programme source type
ALTER TABLE goal_links DROP CONSTRAINT goal_links_source_type_check;
ALTER TABLE goal_links ADD CONSTRAINT goal_links_source_type_check
    CHECK (source_type IN ('goal', 'card', 'programme'));

-- 6. Materialized view for rollup stats
CREATE MATERIALIZED VIEW space_rollup_stats AS
SELECT
    s.id AS space_id,
    s.tenant_id,
    s.path,
    s.space_type,
    COUNT(c.id) AS total_cards,
    COUNT(*) FILTER (WHERE c.column_name = 'done') AS done_cards,
    COUNT(*) FILTER (WHERE c.column_name IN ('planned','in_progress','review')) AS in_flight,
    COUNT(*) FILTER (WHERE c.priority IN ('p0','p1') AND c.column_name != 'done') AS high_pri_open,
    COALESCE(AVG(EXTRACT(EPOCH FROM (now() - c.moved_at)) / 86400)
        FILTER (WHERE c.column_name != 'done'), 0) AS avg_cycle_days,
    COUNT(DISTINCT g.id) AS total_goals,
    COUNT(DISTINCT gl.source_id) FILTER (WHERE gl.source_type = 'card') AS linked_cards
FROM spaces s
LEFT JOIN cards c ON c.space_id = s.id AND c.tenant_id = s.tenant_id
LEFT JOIN goals g ON g.space_id = s.id AND g.tenant_id = s.tenant_id
LEFT JOIN goal_links gl ON gl.target_goal_id = g.id
GROUP BY s.id;

CREATE UNIQUE INDEX idx_space_rollup_stats_space ON space_rollup_stats(space_id);
CREATE INDEX idx_space_rollup_stats_path ON space_rollup_stats(tenant_id, path text_pattern_ops);

-- +goose Down
DROP MATERIALIZED VIEW IF EXISTS space_rollup_stats;
ALTER TABLE goal_links DROP CONSTRAINT IF EXISTS goal_links_source_type_check;
ALTER TABLE goal_links ADD CONSTRAINT goal_links_source_type_check
    CHECK (source_type IN ('goal', 'card'));
DROP TABLE IF EXISTS programme_spaces;
DROP TABLE IF EXISTS programmes;
ALTER TABLE spaces DROP COLUMN IF EXISTS space_type;
```

- [ ] **Step 2: Apply the migration in parts to avoid goose Down running inline**

The psql `-i` method runs both Up and Down. Apply Up sections separately using `-c`:

```bash
docker exec -i spaces-postgres-1 psql -U spaces -d spaces -c "
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS space_type TEXT NOT NULL DEFAULT 'workstream'
    CHECK (space_type IN ('organization', 'department', 'team', 'workstream'));

UPDATE spaces s SET space_type = 'organization'
WHERE s.parent_space_id IS NULL
  AND s.id = (
    SELECT id FROM spaces
    WHERE tenant_id = s.tenant_id AND parent_space_id IS NULL
    ORDER BY created_at ASC LIMIT 1
  );
"
```

Then create the tables:

```bash
docker exec -i spaces-postgres-1 psql -U spaces -d spaces -c "
CREATE TABLE IF NOT EXISTS programmes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'completed')),
    owner_id    UUID NOT NULL REFERENCES users(id),
    start_date  DATE,
    target_date DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_programmes_tenant ON programmes(tenant_id);

CREATE TABLE IF NOT EXISTS programme_spaces (
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    space_id     UUID NOT NULL REFERENCES spaces(id),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    role         TEXT NOT NULL DEFAULT 'contributes'
                 CHECK (role IN ('owns', 'contributes')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (programme_id, space_id)
);
CREATE INDEX IF NOT EXISTS idx_programme_spaces_space ON programme_spaces(space_id);
CREATE INDEX IF NOT EXISTS idx_programme_spaces_tenant ON programme_spaces(tenant_id);
"
```

Then update goal_links constraint:

```bash
docker exec -i spaces-postgres-1 psql -U spaces -d spaces -c "
ALTER TABLE goal_links DROP CONSTRAINT IF EXISTS goal_links_source_type_check;
ALTER TABLE goal_links ADD CONSTRAINT goal_links_source_type_check
    CHECK (source_type IN ('goal', 'card', 'programme'));
"
```

Then create the materialized view:

```bash
docker exec -i spaces-postgres-1 psql -U spaces -d spaces -c "
CREATE MATERIALIZED VIEW IF NOT EXISTS space_rollup_stats AS
SELECT
    s.id AS space_id,
    s.tenant_id,
    s.path,
    s.space_type,
    COUNT(c.id) AS total_cards,
    COUNT(*) FILTER (WHERE c.column_name = 'done') AS done_cards,
    COUNT(*) FILTER (WHERE c.column_name IN ('planned','in_progress','review')) AS in_flight,
    COUNT(*) FILTER (WHERE c.priority IN ('p0','p1') AND c.column_name != 'done') AS high_pri_open,
    COALESCE(AVG(EXTRACT(EPOCH FROM (now() - c.moved_at)) / 86400)
        FILTER (WHERE c.column_name != 'done'), 0) AS avg_cycle_days,
    COUNT(DISTINCT g.id) AS total_goals,
    COUNT(DISTINCT gl.source_id) FILTER (WHERE gl.source_type = 'card') AS linked_cards
FROM spaces s
LEFT JOIN cards c ON c.space_id = s.id AND c.tenant_id = s.tenant_id
LEFT JOIN goals g ON g.space_id = s.id AND g.tenant_id = s.tenant_id
LEFT JOIN goal_links gl ON gl.target_goal_id = g.id
GROUP BY s.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_rollup_stats_space ON space_rollup_stats(space_id);
CREATE INDEX IF NOT EXISTS idx_space_rollup_stats_path ON space_rollup_stats(tenant_id, path text_pattern_ops);
"
```

- [ ] **Step 3: Verify**

```bash
docker exec spaces-postgres-1 psql -U spaces -d spaces -c "\d spaces" | grep space_type
docker exec spaces-postgres-1 psql -U spaces -d spaces -c "\dt programmes"
docker exec spaces-postgres-1 psql -U spaces -d spaces -c "\dt programme_spaces"
docker exec spaces-postgres-1 psql -U spaces -d spaces -c "\dm space_rollup_stats"
docker exec spaces-postgres-1 psql -U spaces -d spaces -c "SELECT COUNT(*) FROM space_rollup_stats"
```

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/008_phase5_rollup_teams_programmes.sql
git commit -m "feat: migration for space types, programmes, rollup materialized view"
```

---

### Task 2: Update Space Model with `space_type`

**Files:**
- Modify: `backend/internal/spaces/model.go`
- Modify: `backend/internal/spaces/repository.go`

- [ ] **Step 1: Add SpaceType field to Space struct**

Open `backend/internal/spaces/model.go`. Find the `Space` struct and add the `SpaceType` field after `Visibility`:

```go
type Space struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenant_id"`
	ParentSpaceID *uuid.UUID `json:"parent_space_id,omitempty"`
	Name          string     `json:"name"`
	Description   string     `json:"description,omitempty"`
	Slug          string     `json:"slug"`
	Icon          string     `json:"icon,omitempty"`
	Color         string     `json:"color,omitempty"`
	Path          string     `json:"path"`
	OwnerID       uuid.UUID  `json:"owner_id"`
	Visibility    string     `json:"visibility"`
	SpaceType     string     `json:"space_type"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
```

Add SpaceType to `CreateInput` and `UpdateInput`:

```go
type CreateInput struct {
	ParentSpaceID *uuid.UUID `json:"parent_space_id,omitempty"`
	Name          string     `json:"name"`
	Description   string     `json:"description,omitempty"`
	Slug          string     `json:"slug"`
	Icon          string     `json:"icon,omitempty"`
	Color         string     `json:"color,omitempty"`
	Visibility    string     `json:"visibility,omitempty"`
	SpaceType     string     `json:"space_type,omitempty"`
}

type UpdateInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Color       *string `json:"color,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
	Status      *string `json:"status,omitempty"`
	SpaceType   *string `json:"space_type,omitempty"`
	Path        *string `json:"-"`
}
```

- [ ] **Step 2: Update repository queries**

Open `backend/internal/spaces/repository.go`. Every SELECT needs `space_type` in the column list and every scan function needs the field.

Replace all SELECT column lists that currently read:
```
id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, status, created_at, updated_at
```
with:
```
id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, space_type, status, created_at, updated_at
```

Update the `Create` INSERT to include space_type with a default:

```go
const q = `
    INSERT INTO spaces (tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, space_type, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE(NULLIF($10, ''), 'public'), COALESCE(NULLIF($11, ''), 'workstream'), 'on_track')
    RETURNING id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, space_type, status, created_at, updated_at`

row := r.db.QueryRow(ctx, q,
    tenantID,
    input.ParentSpaceID,
    input.Name,
    input.Description,
    input.Slug,
    input.Icon,
    input.Color,
    path,
    ownerID,
    input.Visibility,
    input.SpaceType,
)
```

Update the `Update` UPDATE to include space_type COALESCE:

```go
const q = `
    UPDATE spaces SET
        name        = COALESCE($3, name),
        description = COALESCE($4, description),
        icon        = COALESCE($5, icon),
        color       = COALESCE($6, color),
        visibility  = COALESCE($7, visibility),
        status      = COALESCE($8, status),
        space_type  = COALESCE($9, space_type),
        path        = COALESCE($10, path),
        updated_at  = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, space_type, status, created_at, updated_at`

row := r.db.QueryRow(ctx, q,
    id,
    tenantID,
    input.Name,
    input.Description,
    input.Icon,
    input.Color,
    input.Visibility,
    input.Status,
    input.SpaceType,
    input.Path,
)
```

Update both `scanSpace` and `scanSpaces` to read the new column in the correct position:

```go
func scanSpace(row pgx.Row) (*Space, error) {
	var s Space
	err := row.Scan(
		&s.ID,
		&s.TenantID,
		&s.ParentSpaceID,
		&s.Name,
		&s.Description,
		&s.Slug,
		&s.Icon,
		&s.Color,
		&s.Path,
		&s.OwnerID,
		&s.Visibility,
		&s.SpaceType,
		&s.Status,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}
```

Same ordering for `scanSpaces` (iterating `rows.Scan(...)`).

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Test**

```bash
cd backend && go test ./internal/spaces/...
```

Expected: all tests pass. If tests fail because they construct a `Space` literal that now mismatches positions, update them to use named fields.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/spaces/
git commit -m "feat: add space_type field to spaces domain"
```

---

### Task 3: Frontend Space Type Field

**Files:**
- Modify: `frontend/src/types/space.ts`
- Modify: `frontend/src/components/spaces/CreateSpaceDialog.tsx` (if exists — otherwise skip)

- [ ] **Step 1: Add SpaceType to the Space interface**

```typescript
export type SpaceType = "organization" | "department" | "team" | "workstream";

export interface Space {
  id: string;
  tenant_id: string;
  parent_space_id?: string;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  color?: string;
  path: string;
  owner_id: string;
  visibility: "public" | "private" | "restricted";
  space_type: SpaceType;
  status: SpaceStatus;
  created_at: string;
  updated_at: string;
}
```

Also add `space_type?: SpaceType` to `CreateSpaceInput` and `UpdateSpaceInput`.

- [ ] **Step 2: Optional — add a type picker to CreateSpaceDialog if that component exists**

Read `frontend/src/components/spaces/CreateSpaceDialog.tsx`. If it has a form with name/slug/description, add a Select with options: "Workstream" (default), "Team", "Department", "Organization". If the file doesn't exist, skip this step.

- [ ] **Step 3: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/types/space.ts frontend/src/components/spaces/CreateSpaceDialog.tsx
git commit -m "feat: space_type field on frontend Space type"
```

---

## Part B: Programmes Backend (Tasks 4–6)

### Task 4: Programmes Model & Repository

**Files:**
- Create: `backend/internal/programmes/model.go`
- Create: `backend/internal/programmes/repository.go`

- [ ] **Step 1: Write model.go**

```go
package programmes

import (
	"time"

	"github.com/google/uuid"
)

type Programme struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	Status      string     `json:"status"`
	OwnerID     uuid.UUID  `json:"owner_id"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ProgrammeSpace struct {
	ProgrammeID uuid.UUID `json:"programme_id"`
	SpaceID     uuid.UUID `json:"space_id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateInput struct {
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type UpdateInput struct {
	Name        *string    `json:"name,omitempty"`
	Description *string    `json:"description,omitempty"`
	Status      *string    `json:"status,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type LinkSpaceInput struct {
	SpaceID uuid.UUID `json:"space_id"`
	Role    string    `json:"role"`
}
```

- [ ] **Step 2: Write repository.go**

```go
package programmes

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Repository interface {
	Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Programme, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Programme, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Programme, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Programme, error)

	LinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID, role string) (*ProgrammeSpace, error)
	UnlinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID) error
	ListSpaces(ctx context.Context, tenantID, programmeID uuid.UUID) ([]ProgrammeSpace, error)
	ListByTenantSpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Programme, error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Programme, error) {
	const q = `
		INSERT INTO programmes (tenant_id, name, description, owner_id, start_date, target_date)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, tenant_id, name, description, status, owner_id, start_date, target_date, created_at, updated_at`

	row := r.db.QueryRow(ctx, q, tenantID, input.Name, input.Description, ownerID, input.StartDate, input.TargetDate)
	return scanProgramme(row)
}

func (r *pgRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Programme, error) {
	const q = `
		SELECT id, tenant_id, name, description, status, owner_id, start_date, target_date, created_at, updated_at
		FROM programmes WHERE id = $1 AND tenant_id = $2`
	row := r.db.QueryRow(ctx, q, id, tenantID)
	p, err := scanProgramme(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("programme", id.String())
		}
		return nil, err
	}
	return p, nil
}

func (r *pgRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Programme, error) {
	const q = `
		UPDATE programmes SET
			name        = COALESCE($3, name),
			description = COALESCE($4, description),
			status      = COALESCE($5, status),
			start_date  = COALESCE($6, start_date),
			target_date = COALESCE($7, target_date),
			updated_at  = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, name, description, status, owner_id, start_date, target_date, created_at, updated_at`

	row := r.db.QueryRow(ctx, q, id, tenantID, input.Name, input.Description, input.Status, input.StartDate, input.TargetDate)
	p, err := scanProgramme(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("programme", id.String())
		}
		return nil, err
	}
	return p, nil
}

func (r *pgRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM programmes WHERE id = $1 AND tenant_id = $2`
	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("programme", id.String())
	}
	return nil
}

func (r *pgRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Programme, error) {
	const q = `
		SELECT id, tenant_id, name, description, status, owner_id, start_date, target_date, created_at, updated_at
		FROM programmes WHERE tenant_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var programmes []Programme
	for rows.Next() {
		p, err := scanProgrammeFromRows(rows)
		if err != nil {
			return nil, err
		}
		programmes = append(programmes, *p)
	}
	return programmes, rows.Err()
}

func (r *pgRepository) LinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID, role string) (*ProgrammeSpace, error) {
	const q = `
		INSERT INTO programme_spaces (programme_id, space_id, tenant_id, role)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (programme_id, space_id) DO UPDATE SET role = EXCLUDED.role
		RETURNING programme_id, space_id, tenant_id, role, created_at`
	var ps ProgrammeSpace
	err := r.db.QueryRow(ctx, q, programmeID, spaceID, tenantID, role).Scan(
		&ps.ProgrammeID, &ps.SpaceID, &ps.TenantID, &ps.Role, &ps.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ps, nil
}

func (r *pgRepository) UnlinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID) error {
	const q = `DELETE FROM programme_spaces WHERE tenant_id = $1 AND programme_id = $2 AND space_id = $3`
	result, err := r.db.Exec(ctx, q, tenantID, programmeID, spaceID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("programme_space", spaceID.String())
	}
	return nil
}

func (r *pgRepository) ListSpaces(ctx context.Context, tenantID, programmeID uuid.UUID) ([]ProgrammeSpace, error) {
	const q = `
		SELECT programme_id, space_id, tenant_id, role, created_at
		FROM programme_spaces WHERE tenant_id = $1 AND programme_id = $2`
	rows, err := r.db.Query(ctx, q, tenantID, programmeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var links []ProgrammeSpace
	for rows.Next() {
		var ps ProgrammeSpace
		if err := rows.Scan(&ps.ProgrammeID, &ps.SpaceID, &ps.TenantID, &ps.Role, &ps.CreatedAt); err != nil {
			return nil, err
		}
		links = append(links, ps)
	}
	return links, rows.Err()
}

func (r *pgRepository) ListByTenantSpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Programme, error) {
	const q = `
		SELECT DISTINCT p.id, p.tenant_id, p.name, p.description, p.status, p.owner_id, p.start_date, p.target_date, p.created_at, p.updated_at
		FROM programmes p
		JOIN programme_spaces ps ON ps.programme_id = p.id
		WHERE p.tenant_id = $1 AND ps.space_id = $2
		ORDER BY p.created_at DESC`
	rows, err := r.db.Query(ctx, q, tenantID, spaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var programmes []Programme
	for rows.Next() {
		p, err := scanProgrammeFromRows(rows)
		if err != nil {
			return nil, err
		}
		programmes = append(programmes, *p)
	}
	return programmes, rows.Err()
}

func scanProgramme(row pgx.Row) (*Programme, error) {
	var p Programme
	err := row.Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Status, &p.OwnerID, &p.StartDate, &p.TargetDate, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func scanProgrammeFromRows(rows pgx.Rows) (*Programme, error) {
	var p Programme
	err := rows.Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Status, &p.OwnerID, &p.StartDate, &p.TargetDate, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}
```

- [ ] **Step 3: Build and commit**

```bash
cd backend && go build ./...
git add backend/internal/programmes/
git commit -m "feat: programmes domain — model and repository"
```

---

### Task 5: Programmes Service, Handler, Routes

**Files:**
- Create: `backend/internal/programmes/service.go`
- Create: `backend/internal/programmes/handler.go`
- Create: `backend/internal/programmes/routes.go`
- Modify: `backend/api/router.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write service.go**

```go
package programmes

import (
	"context"

	"github.com/google/uuid"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Programme, error) {
	if input.Name == "" {
		return nil, domainerrors.Validation("name is required")
	}
	return s.repo.Create(ctx, tenantID, ownerID, input)
}

func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Programme, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Programme, error) {
	if input.Status != nil {
		switch *input.Status {
		case "active", "paused", "completed":
		default:
			return nil, domainerrors.Validation("status must be active, paused, or completed")
		}
	}
	return s.repo.Update(ctx, tenantID, id, input)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *Service) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Programme, error) {
	return s.repo.ListByTenant(ctx, tenantID)
}

func (s *Service) LinkSpace(ctx context.Context, tenantID, programmeID uuid.UUID, input LinkSpaceInput) (*ProgrammeSpace, error) {
	if input.SpaceID == uuid.Nil {
		return nil, domainerrors.Validation("space_id is required")
	}
	role := input.Role
	if role == "" {
		role = "contributes"
	}
	if role != "owns" && role != "contributes" {
		return nil, domainerrors.Validation("role must be 'owns' or 'contributes'")
	}
	return s.repo.LinkSpace(ctx, tenantID, programmeID, input.SpaceID, role)
}

func (s *Service) UnlinkSpace(ctx context.Context, tenantID, programmeID, spaceID uuid.UUID) error {
	return s.repo.UnlinkSpace(ctx, tenantID, programmeID, spaceID)
}

func (s *Service) ListSpaces(ctx context.Context, tenantID, programmeID uuid.UUID) ([]ProgrammeSpace, error) {
	return s.repo.ListSpaces(ctx, tenantID, programmeID)
}
```

- [ ] **Step 2: Write handler.go**

```go
package programmes

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) HandleListProgrammes(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	programmes, err := h.svc.ListByTenant(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if programmes == nil {
		programmes = []Programme{}
	}
	respond.JSON(w, http.StatusOK, programmes)
}

func (h *Handler) HandleGetProgramme(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	p, err := h.svc.GetByID(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, p)
}

func (h *Handler) HandleCreateProgramme(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	claims, err := auth.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	var input CreateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	p, err := h.svc.Create(r.Context(), tenantID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, p)
}

func (h *Handler) HandleUpdateProgramme(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	p, err := h.svc.Update(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, p)
}

func (h *Handler) HandleDeleteProgramme(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	if err := h.svc.Delete(r.Context(), tenantID, id); err != nil {
		respond.Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleListSpaces(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	links, err := h.svc.ListSpaces(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if links == nil {
		links = []ProgrammeSpace{}
	}
	respond.JSON(w, http.StatusOK, links)
}

func (h *Handler) HandleLinkSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	var input LinkSpaceInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	ps, err := h.svc.LinkSpace(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, ps)
}

func (h *Handler) HandleUnlinkSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	programmeID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	spaceID, err := uuid.Parse(r.PathValue("spaceId"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid space id"))
		return
	}
	if err := h.svc.UnlinkSpace(r.Context(), tenantID, programmeID, spaceID); err != nil {
		respond.Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 3: Write routes.go**

```go
package programmes

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler, requireAdmin func(http.Handler) http.Handler) {
	read := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	admin := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(requireAdmin(fn)))
	}

	mux.Handle("GET /programmes", read(h.HandleListProgrammes))
	mux.Handle("GET /programmes/{id}", read(h.HandleGetProgramme))
	mux.Handle("POST /programmes", admin(h.HandleCreateProgramme))
	mux.Handle("PUT /programmes/{id}", admin(h.HandleUpdateProgramme))
	mux.Handle("DELETE /programmes/{id}", admin(h.HandleDeleteProgramme))
	mux.Handle("GET /programmes/{id}/spaces", read(h.HandleListSpaces))
	mux.Handle("POST /programmes/{id}/spaces", admin(h.HandleLinkSpace))
	mux.Handle("DELETE /programmes/{id}/spaces/{spaceId}", admin(h.HandleUnlinkSpace))
}
```

- [ ] **Step 4: Wire into router.go**

Open `backend/api/router.go`. Add `programmes` to imports. Add `ProgrammesHandler *programmes.Handler` to the `Config` struct. Inside `NewRouter`, add the route registration after the existing ones:

```go
programmes.RegisterRoutes(mux, cfg.ProgrammesHandler, authMW, tenantMW, requireAdmin)
```

- [ ] **Step 5: Wire into main.go**

Open `backend/cmd/server/main.go`. Add import, create repo/service/handler, pass to api.Config:

```go
import "github.com/matthewmcgibbon/spaces/backend/internal/programmes"

// ...with other repo/service/handler creations:
programmesRepo := programmes.NewRepository(pool)
programmesSvc := programmes.NewService(programmesRepo)
programmesHandler := programmes.NewHandler(programmesSvc)

// ...in api.Config:
ProgrammesHandler: programmesHandler,
```

- [ ] **Step 6: Build, test, commit**

```bash
cd backend && go build ./...
git add backend/internal/programmes/ backend/api/router.go backend/cmd/server/main.go
git commit -m "feat: programmes domain — service, handler, routes"
```

---

### Task 6: Programmes Frontend — Types, API, Hooks

**Files:**
- Create: `frontend/src/types/programme.ts`
- Create: `frontend/src/lib/api/programmes.ts`
- Create: `frontend/src/hooks/useProgrammes.ts`

- [ ] **Step 1: Write types/programme.ts**

```typescript
export type ProgrammeStatus = "active" | "paused" | "completed";
export type ProgrammeRole = "owns" | "contributes";

export interface Programme {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: ProgrammeStatus;
  owner_id: string;
  start_date?: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeSpace {
  programme_id: string;
  space_id: string;
  tenant_id: string;
  role: ProgrammeRole;
  created_at: string;
}

export interface CreateProgrammeInput {
  name: string;
  description?: string;
  start_date?: string;
  target_date?: string;
}

export interface UpdateProgrammeInput {
  name?: string;
  description?: string;
  status?: ProgrammeStatus;
  start_date?: string;
  target_date?: string;
}

export interface LinkSpaceInput {
  space_id: string;
  role?: ProgrammeRole;
}
```

- [ ] **Step 2: Write lib/api/programmes.ts**

```typescript
import { apiFetch } from "./client";
import type {
  Programme,
  ProgrammeSpace,
  CreateProgrammeInput,
  UpdateProgrammeInput,
  LinkSpaceInput,
} from "@/types/programme";

export function listProgrammes(): Promise<Programme[]> {
  return apiFetch<Programme[]>("/programmes");
}

export function getProgramme(id: string): Promise<Programme> {
  return apiFetch<Programme>(`/programmes/${id}`);
}

export function createProgramme(input: CreateProgrammeInput): Promise<Programme> {
  return apiFetch<Programme>("/programmes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProgramme(id: string, input: UpdateProgrammeInput): Promise<Programme> {
  return apiFetch<Programme>(`/programmes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteProgramme(id: string): Promise<void> {
  return apiFetch<void>(`/programmes/${id}`, { method: "DELETE" });
}

export function listProgrammeSpaces(programmeId: string): Promise<ProgrammeSpace[]> {
  return apiFetch<ProgrammeSpace[]>(`/programmes/${programmeId}/spaces`);
}

export function linkSpace(programmeId: string, input: LinkSpaceInput): Promise<ProgrammeSpace> {
  return apiFetch<ProgrammeSpace>(`/programmes/${programmeId}/spaces`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function unlinkSpace(programmeId: string, spaceId: string): Promise<void> {
  return apiFetch<void>(`/programmes/${programmeId}/spaces/${spaceId}`, { method: "DELETE" });
}
```

- [ ] **Step 3: Write hooks/useProgrammes.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProgrammes,
  getProgramme,
  createProgramme,
  updateProgramme,
  deleteProgramme,
  listProgrammeSpaces,
  linkSpace,
  unlinkSpace,
} from "@/lib/api/programmes";
import type { CreateProgrammeInput, UpdateProgrammeInput, LinkSpaceInput } from "@/types/programme";

export function useProgrammes() {
  return useQuery({ queryKey: ["programmes"], queryFn: listProgrammes });
}

export function useProgramme(id: string) {
  return useQuery({
    queryKey: ["programmes", id],
    queryFn: () => getProgramme(id),
    enabled: !!id,
  });
}

export function useCreateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProgrammeInput) => createProgramme(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useUpdateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProgrammeInput }) =>
      updateProgramme(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProgramme(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useProgrammeSpaces(programmeId: string) {
  return useQuery({
    queryKey: ["programmes", programmeId, "spaces"],
    queryFn: () => listProgrammeSpaces(programmeId),
    enabled: !!programmeId,
  });
}

export function useLinkSpace(programmeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LinkSpaceInput) => linkSpace(programmeId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes", programmeId, "spaces"] }),
  });
}

export function useUnlinkSpace(programmeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => unlinkSpace(programmeId, spaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes", programmeId, "spaces"] }),
  });
}
```

- [ ] **Step 4: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/types/programme.ts frontend/src/lib/api/programmes.ts frontend/src/hooks/useProgrammes.ts
git commit -m "feat: programmes frontend — types, API client, hooks"
```

---

## Part C: Rollup Backend (Tasks 7–9)

### Task 7: Rollup Model & Service (Hierarchy + Programme)

**Files:**
- Create: `backend/internal/rollup/model.go`
- Create: `backend/internal/rollup/service.go`

- [ ] **Step 1: Write model.go**

```go
package rollup

import "github.com/google/uuid"

type SpaceRollup struct {
	SpaceID        uuid.UUID             `json:"space_id"`
	TenantID       uuid.UUID             `json:"tenant_id"`
	SpaceType      string                `json:"space_type"`
	TotalCards     int                   `json:"total_cards"`
	DoneCards      int                   `json:"done_cards"`
	InFlight       int                   `json:"in_flight"`
	HighPriOpen    int                   `json:"high_pri_open"`
	Completion     float64               `json:"completion_pct"`
	AvgCycleDays   float64               `json:"avg_cycle_days"`
	TotalGoals     int                   `json:"total_goals"`
	LinkedCards    int                   `json:"linked_cards"`
	AlignmentPct   float64               `json:"alignment_pct"`
	ChildBreakdown []SpaceRollupSummary  `json:"child_breakdown,omitempty"`
}

type SpaceRollupSummary struct {
	SpaceID      uuid.UUID `json:"space_id"`
	SpaceType    string    `json:"space_type"`
	TotalCards   int       `json:"total_cards"`
	DoneCards    int       `json:"done_cards"`
	InFlight     int       `json:"in_flight"`
	Completion   float64   `json:"completion_pct"`
	AlignmentPct float64   `json:"alignment_pct"`
}

type ProgrammeRollup struct {
	ProgrammeID  uuid.UUID            `json:"programme_id"`
	TenantID     uuid.UUID            `json:"tenant_id"`
	TotalCards   int                  `json:"total_cards"`
	DoneCards    int                  `json:"done_cards"`
	InFlight     int                  `json:"in_flight"`
	HighPriOpen  int                  `json:"high_pri_open"`
	Completion   float64              `json:"completion_pct"`
	AvgCycleDays float64              `json:"avg_cycle_days"`
	TotalGoals   int                  `json:"total_goals"`
	LinkedCards  int                  `json:"linked_cards"`
	AlignmentPct float64              `json:"alignment_pct"`
	Members      []SpaceRollupSummary `json:"members"`
}
```

- [ ] **Step 2: Write service.go**

```go
package rollup

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const cacheTTL = 5 * time.Minute

type Service struct {
	db    *pgxpool.Pool
	cache *redis.Client
}

func NewService(db *pgxpool.Pool, cache *redis.Client) *Service {
	return &Service{db: db, cache: cache}
}

// GetSpaceRollup returns aggregated metrics for a space and all descendants,
// using the materialized space_rollup_stats view. Results are cached for 5 min.
func (s *Service) GetSpaceRollup(ctx context.Context, tenantID, spaceID uuid.UUID) (*SpaceRollup, error) {
	cacheKey := "rollup:" + tenantID.String() + ":" + spaceID.String()
	if cached := s.getCache(ctx, cacheKey); cached != nil {
		var result SpaceRollup
		if err := json.Unmarshal(cached, &result); err == nil {
			return &result, nil
		}
	}

	// Fetch the root space's path
	var rootPath string
	var rootType string
	err := s.db.QueryRow(ctx,
		`SELECT path, space_type FROM space_rollup_stats WHERE tenant_id = $1 AND space_id = $2`,
		tenantID, spaceID,
	).Scan(&rootPath, &rootType)
	if err != nil {
		return nil, err
	}

	// Fetch the space and all descendants from the materialized view
	const q = `
		SELECT space_id, space_type, total_cards, done_cards, in_flight, high_pri_open,
		       avg_cycle_days, total_goals, linked_cards
		FROM space_rollup_stats
		WHERE tenant_id = $1 AND path LIKE $2 || '%'`

	rows, err := s.db.Query(ctx, q, tenantID, rootPath)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := &SpaceRollup{
		SpaceID:   spaceID,
		TenantID:  tenantID,
		SpaceType: rootType,
	}
	var totalCycleSum float64
	var cycleCount int

	for rows.Next() {
		var row struct {
			SpaceID      uuid.UUID
			SpaceType    string
			TotalCards   int
			DoneCards    int
			InFlight     int
			HighPriOpen  int
			AvgCycleDays float64
			TotalGoals   int
			LinkedCards  int
		}
		if err := rows.Scan(&row.SpaceID, &row.SpaceType, &row.TotalCards, &row.DoneCards,
			&row.InFlight, &row.HighPriOpen, &row.AvgCycleDays, &row.TotalGoals, &row.LinkedCards); err != nil {
			return nil, err
		}

		result.TotalCards += row.TotalCards
		result.DoneCards += row.DoneCards
		result.InFlight += row.InFlight
		result.HighPriOpen += row.HighPriOpen
		result.TotalGoals += row.TotalGoals
		result.LinkedCards += row.LinkedCards

		if row.AvgCycleDays > 0 {
			totalCycleSum += row.AvgCycleDays
			cycleCount++
		}

		if row.SpaceID != spaceID {
			childCompletion := 0.0
			if row.TotalCards > 0 {
				childCompletion = float64(row.DoneCards) / float64(row.TotalCards) * 100
			}
			childAlignment := 0.0
			if row.InFlight > 0 {
				childAlignment = float64(row.LinkedCards) / float64(row.InFlight) * 100
			}
			result.ChildBreakdown = append(result.ChildBreakdown, SpaceRollupSummary{
				SpaceID:      row.SpaceID,
				SpaceType:    row.SpaceType,
				TotalCards:   row.TotalCards,
				DoneCards:    row.DoneCards,
				InFlight:     row.InFlight,
				Completion:   childCompletion,
				AlignmentPct: childAlignment,
			})
		}
	}

	if result.TotalCards > 0 {
		result.Completion = float64(result.DoneCards) / float64(result.TotalCards) * 100
	}
	if result.InFlight > 0 {
		result.AlignmentPct = float64(result.LinkedCards) / float64(result.InFlight) * 100
	}
	if cycleCount > 0 {
		result.AvgCycleDays = totalCycleSum / float64(cycleCount)
	}

	s.setCache(ctx, cacheKey, result)
	return result, nil
}

// GetOrgRollup finds the tenant's organization-type root space and returns its rollup.
func (s *Service) GetOrgRollup(ctx context.Context, tenantID uuid.UUID) (*SpaceRollup, error) {
	var orgID uuid.UUID
	err := s.db.QueryRow(ctx,
		`SELECT id FROM spaces WHERE tenant_id = $1 AND space_type = 'organization' AND parent_space_id IS NULL LIMIT 1`,
		tenantID,
	).Scan(&orgID)
	if err != nil {
		// Fallback: use the earliest root space
		err2 := s.db.QueryRow(ctx,
			`SELECT id FROM spaces WHERE tenant_id = $1 AND parent_space_id IS NULL ORDER BY created_at ASC LIMIT 1`,
			tenantID,
		).Scan(&orgID)
		if err2 != nil {
			return nil, err2
		}
	}
	return s.GetSpaceRollup(ctx, tenantID, orgID)
}

// GetProgrammeRollup aggregates metrics across all spaces linked to a programme.
func (s *Service) GetProgrammeRollup(ctx context.Context, tenantID, programmeID uuid.UUID) (*ProgrammeRollup, error) {
	cacheKey := "rollup:programme:" + tenantID.String() + ":" + programmeID.String()
	if cached := s.getCache(ctx, cacheKey); cached != nil {
		var result ProgrammeRollup
		if err := json.Unmarshal(cached, &result); err == nil {
			return &result, nil
		}
	}

	const q = `
		SELECT srs.space_id, srs.space_type, srs.total_cards, srs.done_cards, srs.in_flight,
		       srs.high_pri_open, srs.avg_cycle_days, srs.total_goals, srs.linked_cards
		FROM space_rollup_stats srs
		JOIN programme_spaces ps ON ps.space_id = srs.space_id
		WHERE srs.tenant_id = $1 AND ps.programme_id = $2`

	rows, err := s.db.Query(ctx, q, tenantID, programmeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := &ProgrammeRollup{ProgrammeID: programmeID, TenantID: tenantID}
	var totalCycleSum float64
	var cycleCount int

	for rows.Next() {
		var row struct {
			SpaceID      uuid.UUID
			SpaceType    string
			TotalCards   int
			DoneCards    int
			InFlight     int
			HighPriOpen  int
			AvgCycleDays float64
			TotalGoals   int
			LinkedCards  int
		}
		if err := rows.Scan(&row.SpaceID, &row.SpaceType, &row.TotalCards, &row.DoneCards,
			&row.InFlight, &row.HighPriOpen, &row.AvgCycleDays, &row.TotalGoals, &row.LinkedCards); err != nil {
			return nil, err
		}

		result.TotalCards += row.TotalCards
		result.DoneCards += row.DoneCards
		result.InFlight += row.InFlight
		result.HighPriOpen += row.HighPriOpen
		result.TotalGoals += row.TotalGoals
		result.LinkedCards += row.LinkedCards

		if row.AvgCycleDays > 0 {
			totalCycleSum += row.AvgCycleDays
			cycleCount++
		}

		memberCompletion := 0.0
		if row.TotalCards > 0 {
			memberCompletion = float64(row.DoneCards) / float64(row.TotalCards) * 100
		}
		memberAlignment := 0.0
		if row.InFlight > 0 {
			memberAlignment = float64(row.LinkedCards) / float64(row.InFlight) * 100
		}
		result.Members = append(result.Members, SpaceRollupSummary{
			SpaceID:      row.SpaceID,
			SpaceType:    row.SpaceType,
			TotalCards:   row.TotalCards,
			DoneCards:    row.DoneCards,
			InFlight:     row.InFlight,
			Completion:   memberCompletion,
			AlignmentPct: memberAlignment,
		})
	}

	if result.TotalCards > 0 {
		result.Completion = float64(result.DoneCards) / float64(result.TotalCards) * 100
	}
	if result.InFlight > 0 {
		result.AlignmentPct = float64(result.LinkedCards) / float64(result.InFlight) * 100
	}
	if cycleCount > 0 {
		result.AvgCycleDays = totalCycleSum / float64(cycleCount)
	}

	s.setCache(ctx, cacheKey, result)
	return result, nil
}

func (s *Service) getCache(ctx context.Context, key string) []byte {
	if s.cache == nil {
		return nil
	}
	data, err := s.cache.Get(ctx, key).Bytes()
	if err != nil {
		return nil
	}
	return data
}

func (s *Service) setCache(ctx context.Context, key string, value any) {
	if s.cache == nil {
		return
	}
	data, err := json.Marshal(value)
	if err != nil {
		slog.Warn("rollup cache marshal failed", "key", key, "error", err)
		return
	}
	if err := s.cache.Set(ctx, key, data, cacheTTL).Err(); err != nil {
		slog.Warn("rollup cache set failed", "key", key, "error", err)
	}
}
```

- [ ] **Step 3: Build and commit**

```bash
cd backend && go build ./...
git add backend/internal/rollup/model.go backend/internal/rollup/service.go
git commit -m "feat: rollup service — hierarchy and programme aggregation"
```

---

### Task 8: Rollup Refresher Goroutine

**Files:**
- Create: `backend/internal/rollup/refresher.go`

- [ ] **Step 1: Write refresher.go**

```go
package rollup

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const refreshInterval = 5 * time.Minute

// StartRefreshLoop launches a goroutine that refreshes the
// space_rollup_stats materialized view every 5 minutes.
// It runs until ctx is canceled.
func StartRefreshLoop(ctx context.Context, db *pgxpool.Pool) {
	go func() {
		// Initial refresh on startup
		refreshOnce(ctx, db)

		ticker := time.NewTicker(refreshInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				slog.Info("rollup refresh loop stopping")
				return
			case <-ticker.C:
				refreshOnce(ctx, db)
			}
		}
	}()
}

func refreshOnce(ctx context.Context, db *pgxpool.Pool) {
	start := time.Now()
	_, err := db.Exec(ctx, `REFRESH MATERIALIZED VIEW CONCURRENTLY space_rollup_stats`)
	if err != nil {
		slog.Warn("rollup materialized view refresh failed", "error", err)
		return
	}
	slog.Info("rollup materialized view refreshed", "duration_ms", time.Since(start).Milliseconds())
}
```

- [ ] **Step 2: Build and commit**

```bash
cd backend && go build ./...
git add backend/internal/rollup/refresher.go
git commit -m "feat: rollup materialized view refresh loop"
```

---

### Task 9: Rollup Handler, Routes, and Wiring

**Files:**
- Create: `backend/internal/rollup/handler.go`
- Create: `backend/internal/rollup/routes.go`
- Modify: `backend/api/router.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write handler.go**

```go
package rollup

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) HandleSpaceRollup(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	spaceID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid space id"))
		return
	}
	rollup, err := h.svc.GetSpaceRollup(r.Context(), tenantID, spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, rollup)
}

func (h *Handler) HandleOrgRollup(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	rollup, err := h.svc.GetOrgRollup(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, rollup)
}

func (h *Handler) HandleProgrammeRollup(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	programmeID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid programme id"))
		return
	}
	rollup, err := h.svc.GetProgrammeRollup(r.Context(), tenantID, programmeID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, rollup)
}
```

- [ ] **Step 2: Write routes.go**

```go
package rollup

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler) {
	read := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}

	mux.Handle("GET /spaces/{id}/rollup", read(h.HandleSpaceRollup))
	mux.Handle("GET /org/rollup", read(h.HandleOrgRollup))
	mux.Handle("GET /programmes/{id}/rollup", read(h.HandleProgrammeRollup))
}
```

- [ ] **Step 3: Wire into router.go**

Add `rollup` import. Add `RollupHandler *rollup.Handler` to the `Config` struct. Inside `NewRouter`, add:

```go
rollup.RegisterRoutes(mux, cfg.RollupHandler, authMW, tenantMW)
```

- [ ] **Step 4: Wire into main.go**

Add import and wire the service, handler, and refresh loop. The main.go should already have `redisClient` from Phase 4. Add:

```go
import "github.com/matthewmcgibbon/spaces/backend/internal/rollup"

// After redisClient setup (from Phase 4):
rollupSvc := rollup.NewService(pool, redisClient)
rollupHandler := rollup.NewHandler(rollupSvc)

// Start the materialized view refresh loop
rollup.StartRefreshLoop(ctx, pool)

// In api.Config:
RollupHandler: rollupHandler,
```

- [ ] **Step 5: Build, run, verify endpoints**

```bash
cd backend && go build ./...
```

Restart the backend. Test endpoints:

```bash
curl -s -H "Authorization: Bearer dev-token" http://localhost:8080/org/rollup
curl -s -H "Authorization: Bearer dev-token" http://localhost:8080/programmes
```

Expected: `/org/rollup` returns a SpaceRollup JSON, `/programmes` returns `[]`.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/rollup/handler.go backend/internal/rollup/routes.go backend/api/router.go backend/cmd/server/main.go
git commit -m "feat: rollup handler, routes, and refresh loop wiring"
```

---

## Part D: Rollup Frontend (Tasks 10–11)

### Task 10: Rollup Types, API, Hooks

**Files:**
- Create: `frontend/src/types/rollup.ts`
- Create: `frontend/src/lib/api/rollup.ts`
- Create: `frontend/src/hooks/useRollup.ts`

- [ ] **Step 1: Write types/rollup.ts**

```typescript
export interface SpaceRollupSummary {
  space_id: string;
  space_type: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  completion_pct: number;
  alignment_pct: number;
}

export interface SpaceRollup {
  space_id: string;
  tenant_id: string;
  space_type: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  high_pri_open: number;
  completion_pct: number;
  avg_cycle_days: number;
  total_goals: number;
  linked_cards: number;
  alignment_pct: number;
  child_breakdown?: SpaceRollupSummary[];
}

export interface ProgrammeRollup {
  programme_id: string;
  tenant_id: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  high_pri_open: number;
  completion_pct: number;
  avg_cycle_days: number;
  total_goals: number;
  linked_cards: number;
  alignment_pct: number;
  members: SpaceRollupSummary[];
}
```

- [ ] **Step 2: Write lib/api/rollup.ts**

```typescript
import { apiFetch } from "./client";
import type { SpaceRollup, ProgrammeRollup } from "@/types/rollup";

export function getSpaceRollup(spaceId: string): Promise<SpaceRollup> {
  return apiFetch<SpaceRollup>(`/spaces/${spaceId}/rollup`);
}

export function getOrgRollup(): Promise<SpaceRollup> {
  return apiFetch<SpaceRollup>("/org/rollup");
}

export function getProgrammeRollup(programmeId: string): Promise<ProgrammeRollup> {
  return apiFetch<ProgrammeRollup>(`/programmes/${programmeId}/rollup`);
}
```

- [ ] **Step 3: Write hooks/useRollup.ts**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getSpaceRollup, getOrgRollup, getProgrammeRollup } from "@/lib/api/rollup";

const STALE_TIME = 60 * 1000;

export function useSpaceRollup(spaceId: string) {
  return useQuery({
    queryKey: ["rollup", "space", spaceId],
    queryFn: () => getSpaceRollup(spaceId),
    enabled: !!spaceId,
    staleTime: STALE_TIME,
  });
}

export function useOrgRollup() {
  return useQuery({
    queryKey: ["rollup", "org"],
    queryFn: getOrgRollup,
    staleTime: STALE_TIME,
  });
}

export function useProgrammeRollup(programmeId: string) {
  return useQuery({
    queryKey: ["rollup", "programme", programmeId],
    queryFn: () => getProgrammeRollup(programmeId),
    enabled: !!programmeId,
    staleTime: STALE_TIME,
  });
}
```

- [ ] **Step 4: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/types/rollup.ts frontend/src/lib/api/rollup.ts frontend/src/hooks/useRollup.ts
git commit -m "feat: rollup frontend — types, API client, hooks"
```

---

### Task 11: Rollup Reusable Components

**Files:**
- Create: `frontend/src/components/rollup/RollupKPIs.tsx`
- Create: `frontend/src/components/rollup/DepartmentBreakdown.tsx`
- Create: `frontend/src/components/rollup/ProgrammeCard.tsx`

- [ ] **Step 1: Write RollupKPIs.tsx**

```tsx
"use client";

import { MetricCard } from "@/components/ui/MetricCard";
import type { SpaceRollup, ProgrammeRollup } from "@/types/rollup";

interface RollupKPIsProps {
  rollup?: SpaceRollup | ProgrammeRollup;
}

export function RollupKPIs({ rollup }: RollupKPIsProps) {
  const inFlight = rollup?.in_flight ?? 0;
  const cycle = rollup?.avg_cycle_days ?? 0;
  const completion = rollup?.completion_pct ?? 0;
  const alignment = rollup?.alignment_pct ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        label="In Flight"
        value={inFlight}
        tooltip="Cards in Planned, In Progress, or Review across all descendant spaces."
        className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]"
      />
      <MetricCard
        label="Avg Cycle"
        value={`${cycle.toFixed(1)}d`}
        tooltip="Average age of in-flight cards across all descendant spaces."
        className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]"
      />
      <MetricCard
        label="Completion"
        value={`${Math.round(completion)}%`}
        tooltip="Percentage of cards that are Done across the rolled-up scope."
        className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]"
      />
      <MetricCard
        label="Alignment"
        value={`${Math.round(alignment)}%`}
        tooltip="Percentage of in-flight cards linked to at least one goal."
        className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]"
      />
    </div>
  );
}
```

- [ ] **Step 2: Write DepartmentBreakdown.tsx**

```tsx
"use client";

import type { SpaceRollupSummary } from "@/types/rollup";

interface DepartmentBreakdownProps {
  children?: SpaceRollupSummary[];
  spaceNames: Record<string, string>;
}

export function DepartmentBreakdown({ children, spaceNames }: DepartmentBreakdownProps) {
  const items = (children ?? [])
    .filter((c) => c.space_type === "department" || c.space_type === "team")
    .sort((a, b) => b.completion_pct - a.completion_pct)
    .slice(0, 10);

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic">No department or team breakdown available.</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const name = spaceNames[item.space_id] || item.space_id.slice(0, 8);
        const barColor =
          item.completion_pct >= 70
            ? "bg-emerald-500"
            : item.completion_pct >= 40
              ? "bg-amber-500"
              : "bg-rose-500";
        return (
          <div key={item.space_id} className="flex items-center gap-3">
            <span className="text-xs text-neutral-600 truncate w-32">{name}</span>
            <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all`}
                style={{ width: `${Math.round(item.completion_pct)}%` }}
              />
            </div>
            <span className="text-[11px] font-[family-name:var(--font-mono)] text-neutral-500 w-10 text-right">
              {Math.round(item.completion_pct)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write ProgrammeCard.tsx**

```tsx
"use client";

import Link from "next/link";
import type { Programme } from "@/types/programme";

interface ProgrammeCardProps {
  programme: Programme;
  completionPct?: number;
}

const statusStyles: Record<string, { dot: string; label: string }> = {
  active:    { dot: "bg-emerald-400", label: "Active" },
  paused:    { dot: "bg-amber-400",   label: "Paused" },
  completed: { dot: "bg-neutral-400", label: "Completed" },
};

export function ProgrammeCard({ programme, completionPct }: ProgrammeCardProps) {
  const status = statusStyles[programme.status] || statusStyles.active;
  const targetDate = programme.target_date
    ? new Date(programme.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <Link href={`/programmes/${programme.id}`}>
      <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all p-5 cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-[family-name:var(--font-display)] text-neutral-800 truncate">
            {programme.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{status.label}</span>
          </div>
        </div>
        {programme.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{programme.description}</p>
        )}
        {completionPct !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Progress</span>
              <span className="text-[11px] font-[family-name:var(--font-mono)] text-neutral-500">
                {Math.round(completionPct)}%
              </span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"
                style={{ width: `${Math.round(completionPct)}%` }}
              />
            </div>
          </div>
        )}
        {targetDate && (
          <p className="text-[10px] text-neutral-400">Target: {targetDate}</p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/components/rollup/
git commit -m "feat: rollup reusable components — KPIs, breakdown, programme card"
```

---

## Part E: Pages (Tasks 12–14)

### Task 12: Org Rollup Dashboard Page

**Files:**
- Create: `frontend/src/app/org/page.tsx`
- Modify: `frontend/src/components/common/Sidebar.tsx` — add Org link

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { Sidebar } from "@/components/common/Sidebar";
import { useOrgRollup } from "@/hooks/useRollup";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useSpaces } from "@/hooks/useSpaces";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { DepartmentBreakdown } from "@/components/rollup/DepartmentBreakdown";
import { ProgrammeCard } from "@/components/rollup/ProgrammeCard";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrgDashboardPage() {
  const { data: rollup, isLoading } = useOrgRollup();
  const { data: programmes } = useProgrammes();
  const { data: spaces } = useSpaces();

  const spaceNames: Record<string, string> = {};
  (spaces ?? []).forEach((s) => { spaceNames[s.id] = s.name; });

  const activeProgrammes = (programmes ?? []).filter((p) => p.status === "active");

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
              Organization Dashboard
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Rolled-up metrics across all teams, workstreams, and programmes.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton variant="rectangle" height="100px" />
              <Skeleton variant="rectangle" height="240px" />
            </div>
          ) : (
            <div className="space-y-8">
              <RollupKPIs rollup={rollup} />

              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                  Team Breakdown
                </h2>
                <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5">
                  <DepartmentBreakdown
                    children={rollup?.child_breakdown}
                    spaceNames={spaceNames}
                  />
                </div>
              </section>

              {activeProgrammes.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                    Active Programmes
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeProgrammes.map((p) => (
                      <ProgrammeCard key={p.id} programme={p} />
                    ))}
                  </div>
                </section>
              )}

              {rollup && rollup.high_pri_open > 0 && (
                <section>
                  <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-4">
                    <p className="text-sm text-amber-800">
                      <strong>{rollup.high_pri_open}</strong> high-priority cards are still open across the org.
                    </p>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add Org link to Sidebar**

Read `frontend/src/components/common/Sidebar.tsx`. Find the nav items list and add an entry before the Settings link:

```tsx
import { Building2 } from "lucide-react";

// In the nav items array / section:
<Link href="/org" className="...existing classes...">
  <Building2 className="w-4 h-4" />
  <span>Organization</span>
</Link>
```

Match the existing styling of other sidebar links (don't invent new classes).

- [ ] **Step 3: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/org/page.tsx frontend/src/components/common/Sidebar.tsx
git commit -m "feat: org rollup dashboard page"
```

---

### Task 13: Team Dashboard Page

**Files:**
- Create: `frontend/src/app/spaces/[id]/team/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/common/Sidebar";
import { useSpace, useSpaceTree } from "@/hooks/useSpaces";
import { useSpaceRollup } from "@/hooks/useRollup";
import { useGoals } from "@/hooks/useGoals";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowRight, Folder } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeamDashboardPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: space, isLoading: spaceLoading } = useSpace(id);
  const { data: rollup, isLoading: rollupLoading } = useSpaceRollup(id);
  const { data: tree } = useSpaceTree(id);
  const { data: goals } = useGoals(id);

  const children = tree?.children?.map((c) => c.space) ?? [];
  const workstreams = children.filter((c) => c.space_type === "workstream" || !c.space_type);

  if (spaceLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Skeleton variant="rectangle" height="80px" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
              {space?.space_type ?? "Team"}
            </p>
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em] mt-1">
              {space?.name}
            </h1>
            {space?.description && (
              <p className="mt-2 text-sm text-neutral-500 max-w-2xl">{space.description}</p>
            )}
          </div>

          {rollupLoading ? (
            <Skeleton variant="rectangle" height="120px" />
          ) : (
            <div className="space-y-8">
              <RollupKPIs rollup={rollup} />

              {workstreams.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                    Workstreams
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workstreams.map((ws) => (
                      <Link key={ws.id} href={`/spaces/${ws.id}`}>
                        <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all p-5 group cursor-pointer">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-primary-50 flex items-center justify-center">
                              <Folder size={14} className="text-primary-500" />
                            </div>
                            <h3 className="text-base font-[family-name:var(--font-display)] text-neutral-800 group-hover:text-primary-600 transition-colors truncate">
                              {ws.name}
                            </h3>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>{ws.visibility}</span>
                            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Open <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {goals && goals.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                    Goals Driven by This Team
                  </h2>
                  <div className="space-y-2">
                    {goals.map((g) => (
                      <div key={g.id} className="bg-white rounded-[var(--radius-md)] border border-neutral-200/60 p-3 flex items-center justify-between">
                        <span className="text-sm text-neutral-700">{g.title}</span>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400">{g.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/spaces/[id]/team/page.tsx
git commit -m "feat: team dashboard page"
```

---

### Task 14: Programmes List & Detail Pages

**Files:**
- Create: `frontend/src/app/programmes/page.tsx`
- Create: `frontend/src/app/programmes/[id]/page.tsx`
- Modify: `frontend/src/components/common/Sidebar.tsx` — add Programmes link

- [ ] **Step 1: Create programmes list page**

```tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { useProgrammes, useCreateProgramme } from "@/hooks/useProgrammes";
import { ProgrammeCard } from "@/components/rollup/ProgrammeCard";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Plus, Target } from "lucide-react";

export default function ProgrammesPage() {
  const { data: programmes, isLoading } = useProgrammes();
  const createProgramme = useCreateProgramme();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProgramme.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        target_date: targetDate || undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setName("");
          setDescription("");
          setTargetDate("");
        },
      }
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
                Programmes
              </h1>
              <p className="mt-2 text-sm text-neutral-500 max-w-xl">
                Cross-cutting initiatives that span multiple teams and workstreams.
              </p>
            </div>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              New Programme
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangle" height="180px" />
              ))}
            </div>
          ) : !programmes || programmes.length === 0 ? (
            <div className="text-center py-20">
              <Target size={40} className="text-neutral-200 mx-auto mb-4" />
              <h3 className="text-lg font-[family-name:var(--font-display)] text-neutral-600 mb-2">
                No programmes yet
              </h3>
              <p className="text-sm text-neutral-400">
                Create a programme to group related work across teams.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programmes.map((p) => (
                <ProgrammeCard key={p.id} programme={p} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <Dialog
          open={true}
          onClose={() => setShowCreate(false)}
          title="Create Programme"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                loading={createProgramme.isPending}
                disabled={!name.trim()}
                type="submit"
                form="create-programme-form"
              >
                Create
              </Button>
            </>
          }
        >
          <form id="create-programme-form" onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Identity Platform 2026"
              required
              autoFocus
            />
            <Input
              multiline
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
              />
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create programme detail page**

```tsx
"use client";

import { use } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { useProgramme, useProgrammeSpaces, useLinkSpace, useUnlinkSpace } from "@/hooks/useProgrammes";
import { useProgrammeRollup } from "@/hooks/useRollup";
import { useSpaces } from "@/hooks/useSpaces";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { X } from "lucide-react";
import { useState } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProgrammeDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: programme, isLoading: progLoading } = useProgramme(id);
  const { data: rollup } = useProgrammeRollup(id);
  const { data: memberships } = useProgrammeSpaces(id);
  const { data: allSpaces } = useSpaces();
  const linkSpace = useLinkSpace(id);
  const unlinkSpace = useUnlinkSpace(id);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");

  const memberSpaceIds = new Set((memberships ?? []).map((m) => m.space_id));
  const availableSpaces = (allSpaces ?? []).filter((s) => !memberSpaceIds.has(s.id));
  const memberSpaces = (allSpaces ?? []).filter((s) => memberSpaceIds.has(s.id));

  function handleLink() {
    if (!selectedSpaceId) return;
    linkSpace.mutate({ space_id: selectedSpaceId, role: "contributes" });
    setSelectedSpaceId("");
  }

  if (progLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Skeleton variant="rectangle" height="120px" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
              Programme · {programme?.status}
            </p>
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em] mt-1">
              {programme?.name}
            </h1>
            {programme?.description && (
              <p className="mt-2 text-sm text-neutral-500 max-w-2xl">{programme.description}</p>
            )}
            {programme?.target_date && (
              <p className="mt-1 text-xs text-neutral-400">
                Target: {new Date(programme.target_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="space-y-8">
            <RollupKPIs rollup={rollup} />

            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                Member Spaces
              </h2>
              <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5 space-y-3">
                {memberSpaces.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic">No spaces linked yet.</p>
                ) : (
                  memberSpaces.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm text-neutral-700">{s.name}</p>
                        <p className="text-[10px] text-neutral-400">{s.space_type ?? "workstream"}</p>
                      </div>
                      <button
                        onClick={() => unlinkSpace.mutate(s.id)}
                        className="text-neutral-300 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}

                {availableSpaces.length > 0 && (
                  <div className="pt-3 border-t border-neutral-100 flex items-center gap-2">
                    <select
                      value={selectedSpaceId}
                      onChange={(e) => setSelectedSpaceId(e.target.value)}
                      className="flex-1 text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    >
                      <option value="">Select a space to link...</option>
                      {availableSpaces.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleLink} disabled={!selectedSpaceId || linkSpace.isPending}>
                      Link
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add Programmes link to Sidebar**

Read `frontend/src/components/common/Sidebar.tsx`. Add a link next to the Org link from Task 12:

```tsx
import { Target } from "lucide-react";

<Link href="/programmes" className="...existing classes...">
  <Target className="w-4 h-4" />
  <span>Programmes</span>
</Link>
```

- [ ] **Step 4: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/programmes/ frontend/src/components/common/Sidebar.tsx
git commit -m "feat: programmes list and detail pages"
```

---

## Summary

| Part | Tasks | What it delivers |
|------|-------|-----------------|
| A: DB & Space Types | 1–3 | Migration, space_type field, frontend type |
| B: Programmes Backend | 4–6 | Model, repo, service, handler, routes, frontend hooks |
| C: Rollup Backend | 7–9 | Service with Redis cache, refresh goroutine, handlers |
| D: Rollup Frontend | 10–11 | Types, API, hooks, reusable components |
| E: Pages | 12–14 | Org dashboard, team dashboard, programmes list + detail |
