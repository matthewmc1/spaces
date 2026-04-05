# Phase 5: Rollup Metrics, Teams & Programmes — Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Goal:** Enable org-level and team-level views of how work is progressing, how teams are aligned to priorities, and how cross-cutting programmes span the org hierarchy.

---

## 1. Overview

Phase 5 introduces three interlocking concepts on top of the existing Space hierarchy:

1. **Space types** — classify spaces as `organization`, `department`, `team`, or `workstream` so the UI can surface type-appropriate views
2. **Rollup metrics** — aggregate card and goal stats across a space and all its descendants via a materialized view + Redis cache
3. **Programmes** — cross-cutting work containers that group spaces from anywhere in the org tree, enabling metrics and goals for complex initiatives that span multiple teams

Phase 5 delivers two dashboards (Team + Org) and programme management, with the alignment chain view deferred to a later phase.

---

## 2. Data Model Changes

### 2.1 Space Type

```sql
ALTER TABLE spaces ADD COLUMN space_type TEXT NOT NULL DEFAULT 'workstream'
    CHECK (space_type IN ('organization', 'department', 'team', 'workstream'));
```

- Existing spaces default to `workstream`
- A backfill sets the first-created root space per tenant to `organization`
- Nesting is not enforced by type — the UI suggests but does not block arbitrary nesting

### 2.2 Programmes

```sql
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
```

### 2.3 Extended goal_links source_type

```sql
ALTER TABLE goal_links DROP CONSTRAINT goal_links_source_type_check;
ALTER TABLE goal_links ADD CONSTRAINT goal_links_source_type_check
    CHECK (source_type IN ('goal', 'card', 'programme'));
```

Programmes become valid link sources so a programme can support a higher-level goal.

---

## 3. Rollup Metrics Architecture

### 3.1 Materialized View

One tenant-agnostic view pre-computes per-space aggregates. The application filters by `tenant_id` and uses the materialized `path` column for subtree queries.

```sql
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
```

### 3.2 Refresh Strategy

- **Scheduled:** A Go goroutine runs `REFRESH MATERIALIZED VIEW CONCURRENTLY space_rollup_stats` every 5 minutes
- **Concurrent refresh** requires the unique index above, does not block reads
- **Redis cache** sits on top with 5-minute TTL, aligned with the view refresh cadence
- **Cache key:** `rollup:<tenant_id>:<space_id>` for hierarchy rollups, `rollup:programme:<tenant_id>:<programme_id>` for programme rollups
- **Cache fallback:** If Redis is unreachable, skip cache and query the view directly with a warning log

### 3.3 Rollup Query Patterns

**Hierarchy rollup** (a space + all descendants via materialized path):
```sql
SELECT * FROM space_rollup_stats
WHERE tenant_id = $1 AND path LIKE $2 || '%';
```
Go service sums the rows into a single `SpaceRollup` response.

**Programme rollup** (all member spaces, cross-cutting):
```sql
SELECT srs.*
FROM space_rollup_stats srs
JOIN programme_spaces ps ON ps.space_id = srs.space_id
WHERE srs.tenant_id = $1 AND ps.programme_id = $2;
```
Go service sums the rows into a `ProgrammeRollup` response.

---

## 4. Backend Architecture

### 4.1 New Packages

- **`internal/rollup/`** — read-only metrics aggregation
  - `model.go` — `SpaceRollup`, `ProgrammeRollup`, `SpaceRollupSummary` structs
  - `service.go` — `GetSpaceRollup`, `GetProgrammeRollup`, `GetOrgRollup` methods with Redis cache
  - `refresher.go` — `StartRefreshLoop(ctx)` goroutine, 5-minute ticker
  - `handler.go` — HTTP handlers
  - `routes.go` — route registration

- **`internal/programmes/`** — full CRUD domain
  - `model.go` — `Programme`, `ProgrammeSpace`, `CreateInput`, `UpdateInput`
  - `repository.go` — pgxpool-backed CRUD + space linkage
  - `service.go` — validation + delegation
  - `handler.go` — HTTP handlers
  - `routes.go` — route registration

### 4.2 API Endpoints

**Rollup (all read-only, require `viewer` role):**
- `GET /spaces/{id}/rollup` — space rollup (hierarchy)
- `GET /org/rollup` — org-level rollup (finds the tenant's `organization` root space)
- `GET /programmes/{id}/rollup` — programme rollup (cross-cutting)

**Programmes:**
- `GET /programmes` — list tenant programmes (viewer)
- `GET /programmes/{id}` — get single programme (viewer)
- `POST /programmes` — create (admin)
- `PUT /programmes/{id}` — update (admin)
- `DELETE /programmes/{id}` — delete (admin)
- `GET /programmes/{id}/spaces` — list member spaces (viewer)
- `POST /programmes/{id}/spaces` — link space (admin), body: `{ space_id, role }`
- `DELETE /programmes/{id}/spaces/{spaceId}` — unlink (admin)

### 4.3 Migration

`008_phase5_rollup_teams_programmes.sql` creates:
1. `space_type` column on spaces
2. `programmes` table
3. `programme_spaces` table
4. Updated `goal_links` CHECK constraint
5. `space_rollup_stats` materialized view + indexes
6. Backfill: set first `parent_space_id IS NULL` space per tenant to `organization`

---

## 5. Frontend Architecture

### 5.1 New Pages

| Route | Purpose |
|-------|---------|
| `/org` | Org rollup dashboard — top KPIs, dept/team breakdown, programmes, top goals |
| `/spaces/[id]/team` | Team dashboard — members, workstreams, goals, programmes, activity |
| `/programmes` | Programmes list grid |
| `/programmes/[id]` | Programme detail — member spaces, rollup, goals |

Each route is gated by the existing Clerk-protected proxy middleware.

### 5.2 New Components

- `rollup/RollupKPIs.tsx` — reusable KPI strip (in-flight, cycle, completion, alignment)
- `rollup/WorkstreamGrid.tsx` — grid of workstream cards
- `rollup/ProgrammeCard.tsx` — compact programme card with status + progress
- `rollup/DepartmentBreakdown.tsx` — horizontal bar chart by team/department
- `programmes/CreateProgrammeDialog.tsx` — programme creation form
- `programmes/LinkSpaceDialog.tsx` — link a space to a programme

### 5.3 New Types, API Clients, Hooks

- `types/rollup.ts` — `SpaceRollup`, `ProgrammeRollup`, `SpaceRollupSummary`
- `types/programme.ts` — `Programme`, `ProgrammeSpace`, CRUD inputs
- `lib/api/rollup.ts`, `lib/api/programmes.ts`
- `hooks/useRollup.ts` — `useSpaceRollup`, `useOrgRollup`, `useProgrammeRollup`
- `hooks/useProgrammes.ts` — full CRUD hooks

### 5.4 Navigation Changes

Sidebar gains two links:
- **Org Dashboard** → `/org`
- **Programmes** → `/programmes`

The existing space list in the sidebar stays unchanged.

---

## 6. Team Dashboard Layout

- **Header:** team name, member avatars (via `role_assignments`), owner, edit button
- **KPIs row:** 4-up: In Flight, Cycle Time, Completion %, Alignment %
- **Workstreams section:** grid of child space cards, each with mini-metrics and drill-in
- **Goals section:** list of goals driven by this team (goals with `space_id` in the team's subtree)
- **Programmes section:** programmes this team contributes to or owns
- **Activity feed:** recent activities from `activities` table filtered to this team's entities

---

## 7. Org Rollup Dashboard Layout

- **Header:** org name, period selector (last 7/30/90 days — client-side filter for now)
- **KPIs row:** Total in flight, Done (period), Avg cycle, Alignment %
- **Department/Team breakdown:** horizontal bar chart, sorted by health
- **Programmes section:** active programme cards with status, owner, progress, target date
- **Top goals:** top 5 active org-level goals with supporting card counts
- **Alerts row:** orphaned goals, unlinked P0/P1 cards (actionable signals)

---

## 8. Permissions

All new endpoints use the existing auth + tenant + RBAC middleware chain:
- Rollup reads: `viewer` or above
- Programme CRUD: `admin` or above
- Space linking to programme: `admin` or above (acts on the programme)

---

## 9. Testing

- **Backend:** unit tests for rollup aggregation sum logic, programme repository CRUD, materialized view refresh loop smoke test
- **Frontend:** existing TanStack Query hooks pattern — no new test infra
- **Manual QA:** create a test tenant with 3 teams × 2 workstreams × 20 cards, link two workstreams to a programme, verify metrics match hand-computed values

---

## 10. Scope Boundaries (Out of Scope for Phase 5)

- Alignment chain visualization (deferred to a later phase — backend data is available via existing `goal_links` endpoints)
- Time-windowed metrics with historical snapshots (metric period selector is client-side filter over current data only)
- Cross-programme dependency graphs
- Programme-level RBAC (programmes inherit tenant-level admin for now)
- Activity feed filtering UI beyond "this team" scope
