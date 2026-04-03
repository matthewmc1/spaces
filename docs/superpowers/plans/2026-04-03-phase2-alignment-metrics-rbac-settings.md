# Phase 2: Alignment, Metrics, RBAC & User Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build goals & alignment graph, capacity/flow metrics API + dashboard, RBAC enforcement, and user settings — completing the strategic layer of Spaces.

**Architecture:** Goals are a new backend domain (`internal/goals/`) with CRUD + linking. Metrics is a read-only domain (`internal/metrics/`) that queries across spaces using materialized paths. RBAC adds a `role_assignments` table and middleware. User settings adds a `settings` domain. Frontend gets new pages (`/spaces/[id]/goals`, `/settings`) and enhanced dashboard widgets.

**Tech Stack:** Go stdlib + pgx, Next.js 16 + TanStack Query, Tailwind v4, PostgreSQL 16

---

## Part A: Goals & Alignment (Tasks 1–6)

### Task 1: Goals Database Migration

**Files:**
- Create: `backend/migrations/004_goals_and_links.sql`

- [ ] **Step 1: Write the migration**

```sql
-- +goose Up

CREATE TABLE goals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    space_id    UUID NOT NULL REFERENCES spaces(id),
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'achieved', 'abandoned')),
    target_date DATE,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_space ON goals(space_id);
CREATE INDEX idx_goals_tenant ON goals(tenant_id);

CREATE TABLE goal_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    source_type     TEXT NOT NULL CHECK (source_type IN ('goal', 'card')),
    source_id       UUID NOT NULL,
    target_goal_id  UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    link_type       TEXT NOT NULL DEFAULT 'supports'
                    CHECK (link_type IN ('supports', 'drives', 'blocks')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_type, source_id, target_goal_id)
);
CREATE INDEX idx_goal_links_source ON goal_links(source_type, source_id);
CREATE INDEX idx_goal_links_target ON goal_links(target_goal_id);
CREATE INDEX idx_goal_links_tenant ON goal_links(tenant_id);

-- +goose Down
DROP TABLE IF EXISTS goal_links;
DROP TABLE IF EXISTS goals;
```

- [ ] **Step 2: Apply migration**

```bash
docker exec -i spaces-postgres-1 psql -U spaces -d spaces < backend/migrations/004_goals_and_links.sql
```

Verify with: `docker exec spaces-postgres-1 psql -U spaces -d spaces -c "\dt goals; \dt goal_links;"`

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/004_goals_and_links.sql
git commit -m "feat: add goals and goal_links tables"
```

---

### Task 2: Goals Backend Domain — Model & Repository

**Files:**
- Create: `backend/internal/goals/model.go`
- Create: `backend/internal/goals/repository.go`

- [ ] **Step 1: Write model.go**

```go
package goals

import (
	"time"
	"github.com/google/uuid"
)

type Goal struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	SpaceID     uuid.UUID  `json:"space_id"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Status      string     `json:"status"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
	CreatedBy   uuid.UUID  `json:"created_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateInput struct {
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type UpdateInput struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	Status      *string    `json:"status,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
}

type GoalLink struct {
	ID           uuid.UUID `json:"id"`
	TenantID     uuid.UUID `json:"tenant_id"`
	SourceType   string    `json:"source_type"`
	SourceID     uuid.UUID `json:"source_id"`
	TargetGoalID uuid.UUID `json:"target_goal_id"`
	LinkType     string    `json:"link_type"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateLinkInput struct {
	SourceType string    `json:"source_type"`
	SourceID   uuid.UUID `json:"source_id"`
	LinkType   string    `json:"link_type"`
}
```

- [ ] **Step 2: Write repository.go**

```go
package goals

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Repository interface {
	Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Goal, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Goal, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Goal, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Goal, error)

	CreateLink(ctx context.Context, tenantID, goalID uuid.UUID, input CreateLinkInput) (*GoalLink, error)
	DeleteLink(ctx context.Context, tenantID, linkID uuid.UUID) error
	ListLinksByGoal(ctx context.Context, tenantID, goalID uuid.UUID) ([]GoalLink, error)
	ListLinksBySource(ctx context.Context, tenantID uuid.UUID, sourceType string, sourceID uuid.UUID) ([]GoalLink, error)
	CountLinkedCards(ctx context.Context, tenantID, spaceID uuid.UUID) (linked int, total int, err error)
}

type pgRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Goal, error) {
	const q = `
		INSERT INTO goals (tenant_id, space_id, title, description, target_date, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at`

	row := r.db.QueryRow(ctx, q, tenantID, spaceID, input.Title, input.Description, input.TargetDate, createdBy)
	return scanGoal(row)
}

func (r *pgRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Goal, error) {
	const q = `
		SELECT id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at
		FROM goals WHERE id = $1 AND tenant_id = $2`

	row := r.db.QueryRow(ctx, q, id, tenantID)
	g, err := scanGoal(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("goal", id.String())
		}
		return nil, err
	}
	return g, nil
}

func (r *pgRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Goal, error) {
	const q = `
		UPDATE goals SET
			title       = COALESCE($3, title),
			description = COALESCE($4, description),
			status      = COALESCE($5, status),
			target_date = COALESCE($6, target_date),
			updated_at  = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at`

	row := r.db.QueryRow(ctx, q, id, tenantID, input.Title, input.Description, input.Status, input.TargetDate)
	g, err := scanGoal(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.NotFound("goal", id.String())
		}
		return nil, err
	}
	return g, nil
}

func (r *pgRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	const q = `DELETE FROM goals WHERE id = $1 AND tenant_id = $2`
	result, err := r.db.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("goal", id.String())
	}
	return nil
}

func (r *pgRepository) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Goal, error) {
	const q = `
		SELECT id, tenant_id, space_id, title, description, status, target_date, created_by, created_at, updated_at
		FROM goals WHERE tenant_id = $1 AND space_id = $2
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, q, tenantID, spaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var goals []Goal
	for rows.Next() {
		g, err := scanGoalFromRows(rows)
		if err != nil {
			return nil, err
		}
		goals = append(goals, *g)
	}
	return goals, rows.Err()
}

func (r *pgRepository) CreateLink(ctx context.Context, tenantID, goalID uuid.UUID, input CreateLinkInput) (*GoalLink, error) {
	const q = `
		INSERT INTO goal_links (tenant_id, source_type, source_id, target_goal_id, link_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, tenant_id, source_type, source_id, target_goal_id, link_type, created_at`

	var gl GoalLink
	err := r.db.QueryRow(ctx, q, tenantID, input.SourceType, input.SourceID, goalID, input.LinkType).Scan(
		&gl.ID, &gl.TenantID, &gl.SourceType, &gl.SourceID, &gl.TargetGoalID, &gl.LinkType, &gl.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &gl, nil
}

func (r *pgRepository) DeleteLink(ctx context.Context, tenantID, linkID uuid.UUID) error {
	const q = `DELETE FROM goal_links WHERE id = $1 AND tenant_id = $2`
	result, err := r.db.Exec(ctx, q, linkID, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainerrors.NotFound("goal_link", linkID.String())
	}
	return nil
}

func (r *pgRepository) ListLinksByGoal(ctx context.Context, tenantID, goalID uuid.UUID) ([]GoalLink, error) {
	const q = `
		SELECT id, tenant_id, source_type, source_id, target_goal_id, link_type, created_at
		FROM goal_links WHERE tenant_id = $1 AND target_goal_id = $2
		ORDER BY created_at`

	rows, err := r.db.Query(ctx, q, tenantID, goalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []GoalLink
	for rows.Next() {
		var gl GoalLink
		if err := rows.Scan(&gl.ID, &gl.TenantID, &gl.SourceType, &gl.SourceID, &gl.TargetGoalID, &gl.LinkType, &gl.CreatedAt); err != nil {
			return nil, err
		}
		links = append(links, gl)
	}
	return links, rows.Err()
}

func (r *pgRepository) ListLinksBySource(ctx context.Context, tenantID uuid.UUID, sourceType string, sourceID uuid.UUID) ([]GoalLink, error) {
	const q = `
		SELECT id, tenant_id, source_type, source_id, target_goal_id, link_type, created_at
		FROM goal_links WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3
		ORDER BY created_at`

	rows, err := r.db.Query(ctx, q, tenantID, sourceType, sourceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []GoalLink
	for rows.Next() {
		var gl GoalLink
		if err := rows.Scan(&gl.ID, &gl.TenantID, &gl.SourceType, &gl.SourceID, &gl.TargetGoalID, &gl.LinkType, &gl.CreatedAt); err != nil {
			return nil, err
		}
		links = append(links, gl)
	}
	return links, rows.Err()
}

func (r *pgRepository) CountLinkedCards(ctx context.Context, tenantID, spaceID uuid.UUID) (int, int, error) {
	const q = `
		SELECT
			COUNT(*) AS total,
			COUNT(gl.id) AS linked
		FROM cards c
		LEFT JOIN goal_links gl ON gl.source_type = 'card' AND gl.source_id = c.id
		WHERE c.tenant_id = $1 AND c.space_id = $2
			AND c.column_name IN ('planned', 'in_progress', 'review')`

	var total, linked int
	err := r.db.QueryRow(ctx, q, tenantID, spaceID).Scan(&total, &linked)
	return linked, total, err
}

func scanGoal(row pgx.Row) (*Goal, error) {
	var g Goal
	err := row.Scan(&g.ID, &g.TenantID, &g.SpaceID, &g.Title, &g.Description, &g.Status, &g.TargetDate, &g.CreatedBy, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func scanGoalFromRows(rows pgx.Rows) (*Goal, error) {
	var g Goal
	err := rows.Scan(&g.ID, &g.TenantID, &g.SpaceID, &g.Title, &g.Description, &g.Status, &g.TargetDate, &g.CreatedBy, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/goals/
git commit -m "feat: goals domain — model and repository"
```

---

### Task 3: Goals Backend — Service, Handler & Routes

**Files:**
- Create: `backend/internal/goals/service.go`
- Create: `backend/internal/goals/handler.go`
- Create: `backend/internal/goals/routes.go`
- Modify: `backend/api/router.go` — add goals config + route registration
- Modify: `backend/cmd/server/main.go` — wire goals dependencies

- [ ] **Step 1: Write service.go**

```go
package goals

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

func (s *Service) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Goal, error) {
	if input.Title == "" {
		return nil, domainerrors.Validation("title is required")
	}
	return s.repo.Create(ctx, tenantID, spaceID, createdBy, input)
}

func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Goal, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Goal, error) {
	if input.Status != nil {
		switch *input.Status {
		case "active", "achieved", "abandoned":
		default:
			return nil, domainerrors.Validation("invalid status: must be active, achieved, or abandoned")
		}
	}
	return s.repo.Update(ctx, tenantID, id, input)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *Service) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID) ([]Goal, error) {
	return s.repo.ListBySpace(ctx, tenantID, spaceID)
}

func (s *Service) CreateLink(ctx context.Context, tenantID, goalID uuid.UUID, input CreateLinkInput) (*GoalLink, error) {
	if input.SourceType != "card" && input.SourceType != "goal" {
		return nil, domainerrors.Validation("source_type must be 'card' or 'goal'")
	}
	if input.SourceID == uuid.Nil {
		return nil, domainerrors.Validation("source_id is required")
	}
	return s.repo.CreateLink(ctx, tenantID, goalID, input)
}

func (s *Service) DeleteLink(ctx context.Context, tenantID, linkID uuid.UUID) error {
	return s.repo.DeleteLink(ctx, tenantID, linkID)
}

func (s *Service) ListLinksByGoal(ctx context.Context, tenantID, goalID uuid.UUID) ([]GoalLink, error) {
	return s.repo.ListLinksByGoal(ctx, tenantID, goalID)
}

func (s *Service) CountLinkedCards(ctx context.Context, tenantID, spaceID uuid.UUID) (int, int, error) {
	return s.repo.CountLinkedCards(ctx, tenantID, spaceID)
}
```

- [ ] **Step 2: Write handler.go**

```go
package goals

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

func (h *Handler) HandleListGoals(w http.ResponseWriter, r *http.Request) {
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
	goals, err := h.svc.ListBySpace(r.Context(), tenantID, spaceID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if goals == nil {
		goals = []Goal{}
	}
	respond.JSON(w, http.StatusOK, goals)
}

func (h *Handler) HandleCreateGoal(w http.ResponseWriter, r *http.Request) {
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
	goal, err := h.svc.Create(r.Context(), tenantID, spaceID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, goal)
}

func (h *Handler) HandleUpdateGoal(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid goal id"))
		return
	}
	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	goal, err := h.svc.Update(r.Context(), tenantID, goalID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, goal)
}

func (h *Handler) HandleDeleteGoal(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid goal id"))
		return
	}
	if err := h.svc.Delete(r.Context(), tenantID, goalID); err != nil {
		respond.Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleCreateLink(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid goal id"))
		return
	}
	var input CreateLinkInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	link, err := h.svc.CreateLink(r.Context(), tenantID, goalID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, link)
}

func (h *Handler) HandleDeleteLink(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	linkID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, errors.Validation("invalid link id"))
		return
	}
	if err := h.svc.DeleteLink(r.Context(), tenantID, linkID); err != nil {
		respond.Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 3: Write routes.go**

```go
package goals

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMW, tenantMW func(http.Handler) http.Handler) {
	wrap := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}

	mux.Handle("GET /spaces/{id}/goals", wrap(h.HandleListGoals))
	mux.Handle("POST /spaces/{id}/goals", wrap(h.HandleCreateGoal))
	mux.Handle("PUT /goals/{id}", wrap(h.HandleUpdateGoal))
	mux.Handle("DELETE /goals/{id}", wrap(h.HandleDeleteGoal))
	mux.Handle("POST /goals/{id}/links", wrap(h.HandleCreateLink))
	mux.Handle("DELETE /goal-links/{id}", wrap(h.HandleDeleteLink))
}
```

- [ ] **Step 4: Update router.go** — add `GoalHandler *goals.Handler` to `Config`, register routes

- [ ] **Step 5: Update main.go** — create `goals.NewRepository(pool)`, `goals.NewService(repo)`, `goals.NewHandler(svc)`, pass to router config

- [ ] **Step 6: Build and test**

```bash
cd backend && go build ./...
# Start server, then:
curl -s -X POST http://localhost:8080/spaces/<space-id>/goals \
  -H "Content-Type: application/json" -H "Authorization: Bearer dev-token" \
  -d '{"title":"Ship Phase 2"}'
```

- [ ] **Step 7: Commit**

```bash
git add backend/internal/goals/ backend/api/router.go backend/cmd/server/main.go
git commit -m "feat: goals domain — service, handler, routes"
```

---

### Task 4: Goals Frontend — Types, API, Hooks

**Files:**
- Create: `frontend/src/types/goal.ts`
- Create: `frontend/src/lib/api/goals.ts`
- Create: `frontend/src/hooks/useGoals.ts`

- [ ] **Step 1: Write types/goal.ts**

```typescript
export type GoalStatus = "active" | "achieved" | "abandoned";

export interface Goal {
  id: string;
  tenant_id: string;
  space_id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  target_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GoalLink {
  id: string;
  tenant_id: string;
  source_type: "card" | "goal";
  source_id: string;
  target_goal_id: string;
  link_type: "supports" | "drives" | "blocks";
  created_at: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  target_date?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: GoalStatus;
  target_date?: string;
}

export interface CreateGoalLinkInput {
  source_type: "card" | "goal";
  source_id: string;
  link_type: "supports" | "drives" | "blocks";
}
```

- [ ] **Step 2: Write lib/api/goals.ts**

```typescript
import { apiFetch } from "./client";
import type { Goal, GoalLink, CreateGoalInput, UpdateGoalInput, CreateGoalLinkInput } from "@/types/goal";

export function listGoals(spaceId: string): Promise<Goal[]> {
  return apiFetch<Goal[]>(`/spaces/${spaceId}/goals`);
}

export function createGoal(spaceId: string, input: CreateGoalInput): Promise<Goal> {
  return apiFetch<Goal>(`/spaces/${spaceId}/goals`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGoal(goalId: string, input: UpdateGoalInput): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${goalId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteGoal(goalId: string): Promise<void> {
  return apiFetch<void>(`/goals/${goalId}`, { method: "DELETE" });
}

export function createGoalLink(goalId: string, input: CreateGoalLinkInput): Promise<GoalLink> {
  return apiFetch<GoalLink>(`/goals/${goalId}/links`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteGoalLink(linkId: string): Promise<void> {
  return apiFetch<void>(`/goal-links/${linkId}`, { method: "DELETE" });
}
```

- [ ] **Step 3: Write hooks/useGoals.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listGoals, createGoal, updateGoal, deleteGoal, createGoalLink, deleteGoalLink } from "@/lib/api/goals";
import type { CreateGoalInput, UpdateGoalInput, CreateGoalLinkInput } from "@/types/goal";

export function useGoals(spaceId: string) {
  return useQuery({
    queryKey: ["goals", spaceId],
    queryFn: () => listGoals(spaceId),
    enabled: !!spaceId,
  });
}

export function useCreateGoal(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(spaceId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useUpdateGoal(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: UpdateGoalInput }) =>
      updateGoal(goalId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useDeleteGoal(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useCreateGoalLink(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: CreateGoalLinkInput }) =>
      createGoalLink(goalId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useDeleteGoalLink(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => deleteGoalLink(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/goal.ts frontend/src/lib/api/goals.ts frontend/src/hooks/useGoals.ts
git commit -m "feat: goals frontend — types, API client, hooks"
```

---

### Task 5: Goals Frontend — Goals Panel in Space Board

**Files:**
- Create: `frontend/src/components/goals/GoalsList.tsx` — goals panel with inline CRUD
- Modify: `frontend/src/components/board/BoardHeader.tsx` — add Goals toggle button
- Modify: `frontend/src/components/board/Board.tsx` — add goals panel state + render
- Modify: `frontend/src/app/spaces/[id]/page.tsx` — pass goals data

Build a collapsible goals panel (similar to AnalyticsSidebar) that shows on the right side with:
- List of goals with status badges (active/achieved/abandoned)
- Inline create form at top
- Click goal to expand: shows linked cards, link type, delete button
- Status toggle dropdown on each goal

- [ ] **Step 1: Create GoalsList.tsx** — full component with CRUD, link display, status editing
- [ ] **Step 2: Add "Goals" button to BoardHeader** — next to Insights button
- [ ] **Step 3: Wire GoalsList into Board.tsx** — conditional render like AnalyticsSidebar
- [ ] **Step 4: Build and verify**
- [ ] **Step 5: Commit**

---

### Task 6: Goal Linking in Card Detail

**Files:**
- Modify: `frontend/src/components/board/CardDetailDialog.tsx` — replace placeholder dependencies section with real goal linking
- Modify: `frontend/src/app/spaces/[id]/page.tsx` — pass goals to Board for linking

Replace the current in-memory dependency system in CardDetailDialog with real goal links:
- Dropdown to select a goal from the space
- Link type selector (supports/drives/blocks)
- Display linked goals with remove button
- Uses `useCreateGoalLink` and `useDeleteGoalLink` hooks

- [ ] **Step 1: Update CardDetailDialog** — add goal linking section using real API
- [ ] **Step 2: Build and verify**
- [ ] **Step 3: Commit**

---

## Part B: Metrics API & Dashboard (Tasks 7–10)

### Task 7: Metrics Backend — Flow & Alignment API

**Files:**
- Create: `backend/internal/metrics/service.go`
- Create: `backend/internal/metrics/handler.go`
- Create: `backend/internal/metrics/routes.go`
- Modify: `backend/api/router.go` — add metrics config
- Modify: `backend/cmd/server/main.go` — wire metrics

- [ ] **Step 1: Write service.go**

Metrics service with methods:
- `FlowMetrics(ctx, tenantID, spaceID)` — returns: cards by column, in-flight count, avg cycle time, throughput (done count), completion %, WIP per column, cumulative flow data (daily snapshots from `moved_at` timestamps)
- `AlignmentMetrics(ctx, tenantID, spaceID)` — returns: linked %, orphaned goals, unlinked P0/P1 cards

```go
package metrics

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FlowResult struct {
	InFlight      int                `json:"in_flight"`
	AvgCycleTime  float64            `json:"avg_cycle_time_days"`
	Throughput    int                `json:"throughput"`
	Completion    float64            `json:"completion_pct"`
	ByColumn      map[string]int     `json:"by_column"`
	CumulativeFlow []DailySnapshot   `json:"cumulative_flow"`
}

type DailySnapshot struct {
	Date    string         `json:"date"`
	Columns map[string]int `json:"columns"`
}

type AlignmentResult struct {
	LinkedPct       float64          `json:"linked_pct"`
	LinkedCount     int              `json:"linked_count"`
	TotalInFlight   int              `json:"total_in_flight"`
	OrphanedGoals   []OrphanedGoal   `json:"orphaned_goals"`
	UnlinkedHighPri []UnlinkedCard   `json:"unlinked_high_pri"`
}

type OrphanedGoal struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}

type UnlinkedCard struct {
	ID       uuid.UUID `json:"id"`
	Title    string    `json:"title"`
	Priority string    `json:"priority"`
}

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}
```

Then implement `FlowMetrics` querying cards by column counts, computing avg days from `moved_at`, and building daily snapshots for last 30 days. Implement `AlignmentMetrics` using a LEFT JOIN from cards to goal_links to find unlinked cards, and query goals with no active links.

- [ ] **Step 2: Write handler.go** — `HandleFlowMetrics` and `HandleAlignmentMetrics`, both take space ID from path
- [ ] **Step 3: Write routes.go** — register `GET /spaces/{id}/metrics/flow` and `GET /spaces/{id}/metrics/alignment`
- [ ] **Step 4: Wire into router.go and main.go**
- [ ] **Step 5: Build and test with curl**
- [ ] **Step 6: Commit**

---

### Task 8: Metrics Frontend — Types, API, Hooks

**Files:**
- Create: `frontend/src/types/metrics.ts`
- Create: `frontend/src/lib/api/metrics.ts`
- Create: `frontend/src/hooks/useMetrics.ts`

- [ ] **Step 1: Write types matching backend FlowResult and AlignmentResult**
- [ ] **Step 2: Write API functions: `getFlowMetrics(spaceId)`, `getAlignmentMetrics(spaceId)`**
- [ ] **Step 3: Write hooks: `useFlowMetrics(spaceId)`, `useAlignmentMetrics(spaceId)`**
- [ ] **Step 4: Commit**

---

### Task 9: Enhanced Analytics Sidebar — Real Metrics API

**Files:**
- Modify: `frontend/src/components/analytics/FlowSummary.tsx` — use `useFlowMetrics` hook
- Modify: `frontend/src/components/analytics/AlignmentHealth.tsx` — use `useAlignmentMetrics` hook
- Modify: `frontend/src/components/analytics/CycleTimeTrend.tsx` — use flow metrics cumulative data
- Modify: `frontend/src/components/analytics/ColumnDistribution.tsx` — use flow metrics by_column
- Modify: `frontend/src/components/analytics/AnalyticsSidebar.tsx` — pass spaceId, remove cards prop dependency

Update all analytics widgets to fetch from the server-computed metrics API instead of client-side card computation. This ensures metrics are consistent and can later support subtree rollups.

- [ ] **Step 1: Update AnalyticsSidebar** — accept `spaceId` prop, fetch metrics via hooks
- [ ] **Step 2: Update FlowSummary** — render from `FlowResult`
- [ ] **Step 3: Update AlignmentHealth** — render from `AlignmentResult` with orphaned goals list
- [ ] **Step 4: Update CycleTimeTrend** — use cumulative flow daily snapshots
- [ ] **Step 5: Update ColumnDistribution** — use by_column from flow metrics
- [ ] **Step 6: Build and verify**
- [ ] **Step 7: Commit**

---

### Task 10: Cumulative Flow Diagram Widget

**Files:**
- Create: `frontend/src/components/analytics/CumulativeFlowDiagram.tsx`
- Modify: `frontend/src/components/analytics/AnalyticsSidebar.tsx` — add CFD widget

Build a stacked area chart (SVG) showing card counts per column over last 30 days. Uses the `cumulative_flow` data from the flow metrics API.

- [ ] **Step 1: Create CumulativeFlowDiagram component** — SVG stacked area chart with column colors
- [ ] **Step 2: Add to AnalyticsSidebar** between ColumnDistribution and BottleneckAlert
- [ ] **Step 3: Build and verify**
- [ ] **Step 4: Commit**

---

## Part C: RBAC (Tasks 11–14)

### Task 11: RBAC Database Migration

**Files:**
- Create: `backend/migrations/005_role_assignments.sql`

- [ ] **Step 1: Write migration**

```sql
-- +goose Up

CREATE TABLE role_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id),
    user_id    UUID NOT NULL REFERENCES users(id),
    space_id   UUID REFERENCES spaces(id),  -- NULL = tenant-wide role
    role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, space_id)
);
CREATE INDEX idx_role_assignments_user ON role_assignments(user_id);
CREATE INDEX idx_role_assignments_space ON role_assignments(space_id);

-- +goose Down
DROP TABLE IF EXISTS role_assignments;
```

- [ ] **Step 2: Apply migration and commit**

---

### Task 12: RBAC Backend — Repository & Service

**Files:**
- Create: `backend/internal/rbac/model.go`
- Create: `backend/internal/rbac/repository.go`
- Create: `backend/internal/rbac/service.go`

Model with `RoleAssignment` struct. Repository with `Assign`, `Revoke`, `GetRole(tenantID, userID, spaceID)`, `ListBySpace`. Service with `CheckPermission(ctx, tenantID, userID, spaceID, requiredRole)` — checks space-level role first, falls back to tenant-level role from `users.role`.

- [ ] **Step 1: Write model, repository, service**
- [ ] **Step 2: Build and commit**

---

### Task 13: RBAC Middleware

**Files:**
- Create: `backend/internal/rbac/middleware.go`
- Modify: `backend/internal/spaces/routes.go` — wrap mutating routes with RBAC
- Modify: `backend/internal/cards/routes.go` — wrap mutating routes with RBAC
- Modify: `backend/internal/goals/routes.go` — wrap mutating routes with RBAC

Middleware factory: `RequireRole(svc, role)` returns middleware that checks the authenticated user has at least the given role for the space in the request path.

- Read endpoints (GET) → require `viewer` or above
- Create/Update endpoints → require `member` or above
- Delete endpoints → require `admin` or above
- Space management → require `owner`

- [ ] **Step 1: Write middleware.go**
- [ ] **Step 2: Update routes to use RBAC middleware**
- [ ] **Step 3: Wire into main.go and router.go**
- [ ] **Step 4: Build and test**
- [ ] **Step 5: Commit**

---

### Task 14: RBAC Frontend — Permission-Aware UI

**Files:**
- Create: `frontend/src/hooks/usePermissions.ts`
- Modify: `frontend/src/components/board/Board.tsx` — hide mutating actions for viewers
- Modify: `frontend/src/components/spaces/SpaceDashboard.tsx` — hide create button for viewers

Simple approach: the `/auth/me` or space detail response includes the user's effective role. Use a hook to check permissions and conditionally render create/edit/delete controls.

- [ ] **Step 1: Create usePermissions hook**
- [ ] **Step 2: Guard UI elements**
- [ ] **Step 3: Commit**

---

## Part D: User Settings (Tasks 15–17)

### Task 15: User Settings Backend

**Files:**
- Create: `backend/migrations/006_user_settings.sql`
- Create: `backend/internal/settings/model.go`
- Create: `backend/internal/settings/repository.go`
- Create: `backend/internal/settings/service.go`
- Create: `backend/internal/settings/handler.go`
- Create: `backend/internal/settings/routes.go`
- Modify: `backend/api/router.go` and `backend/cmd/server/main.go`

Uses the `user_settings` table from the spec. Two endpoints:
- `GET /settings` — returns current user's settings (auto-creates default if not exists)
- `PUT /settings` — partial update via JSON merge

- [ ] **Step 1: Write migration**
- [ ] **Step 2: Write model, repository, service, handler, routes**
- [ ] **Step 3: Wire into router and main**
- [ ] **Step 4: Build and test**
- [ ] **Step 5: Commit**

---

### Task 16: User Settings Frontend — Types, API, Hooks

**Files:**
- Create: `frontend/src/types/settings.ts`
- Create: `frontend/src/lib/api/settings.ts`
- Create: `frontend/src/hooks/useSettings.ts`

- [ ] **Step 1: Write types, API, hooks**
- [ ] **Step 2: Commit**

---

### Task 17: Settings Page

**Files:**
- Create: `frontend/src/app/settings/page.tsx`
- Modify: `frontend/src/components/common/Sidebar.tsx` — add Settings link

Build a settings page with sections:
- **Profile** — display name, email (read-only from auth)
- **Board Preferences** — compact mode, show labels/priority/assignee/due date toggles
- **Notifications** — email digest frequency, card assigned, mentioned, moved toggles
- **Default Space** — dropdown to pick landing space

- [ ] **Step 1: Create settings page with form sections**
- [ ] **Step 2: Add settings link to sidebar**
- [ ] **Step 3: Build and verify**
- [ ] **Step 4: Commit and push**

---

## Summary

| Part | Tasks | What it delivers |
|------|-------|-----------------|
| A: Goals & Alignment | 1–6 | Goal CRUD, linking graph, goal panel in board, card-to-goal links |
| B: Metrics | 7–10 | Server-computed flow + alignment metrics, enhanced analytics sidebar, CFD |
| C: RBAC | 11–14 | Role assignments, permission middleware, permission-aware UI |
| D: User Settings | 15–17 | Settings CRUD, settings page, board preferences |
