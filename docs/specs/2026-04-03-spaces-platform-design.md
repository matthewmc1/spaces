# Spaces Platform — Design Specification

**Date:** 2026-04-03
**Status:** Draft
**Author:** Design session with Claude

---

## 1. Overview

Spaces is a multi-tenant SaaS Kanban platform for strategic planning and organizational alignment. Each Space represents a program or workstream. Spaces nest flexibly (arbitrary depth), enabling roll-up of priorities, goals, and flow metrics from individual workstreams up to organizational level.

The core problem: teams, programs, and orgs need visibility into whether day-to-day work aligns with strategic goals — and where capacity is being spent vs. where it should be.

### Key Capabilities
- Kanban boards with a planning-focused flow (Inbox → triage → plan → execute → deliver)
- Flexible space nesting for org/program/team/workstream hierarchies
- Goal linking across all levels — cards and goals form a directed alignment graph
- Rollup dashboards showing goal alignment health and capacity/flow metrics
- Multi-tenant with role-based access control

### Tech Stack
- **Frontend:** Next.js (App Router) + Tailwind CSS, TypeScript
- **Backend:** Go modular monolith
- **Database:** PostgreSQL + Redis
- **Auth:** Third-party provider (Auth0 or Clerk), abstracted behind an interface
- **Real-time:** WebSockets backed by Redis Pub/Sub
- **Architecture:** Monorepo with `frontend/` and `backend/` directories

---

## 2. Project Structure

```
spaces/
├── frontend/                  # Next.js + Tailwind app
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components
│   │   │   ├── board/        # Kanban board, columns, cards
│   │   │   ├── dashboard/    # Rollup views, metrics
│   │   │   ├── goals/        # Goal linking UI
│   │   │   ├── spaces/       # Space navigation, nesting
│   │   │   └── common/       # Shared UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # API client, utils
│   │   └── types/            # TypeScript types (mirroring API)
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
├── backend/                   # Go modular monolith
│   ├── cmd/
│   │   └── server/           # Main entry point
│   ├── internal/
│   │   ├── spaces/           # Space CRUD, nesting, hierarchy
│   │   ├── cards/            # Card/work item management
│   │   ├── board/            # Board state, column transitions
│   │   ├── goals/            # Goals + linking graph
│   │   ├── metrics/          # Flow metrics, alignment health
│   │   ├── auth/             # Auth middleware (wraps 3rd party)
│   │   ├── tenant/           # Multi-tenant isolation
│   │   ├── settings/         # User settings/preferences
│   │   ├── integrations/     # GitHub/GitLab/CI integrations
│   │   └── platform/         # Shared: DB, Redis, config, errors
│   ├── api/                  # HTTP handlers, routes, middleware
│   ├── migrations/           # SQL migrations
│   └── go.mod
├── docs/                      # PRDs and design docs
│   ├── prd/
│   └── specs/
└── docker-compose.yml         # Local dev: Postgres + Redis
```

---

## 3. Data Model

### 3.1 Tenant
```sql
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 User
```sql
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    external_auth_id  TEXT NOT NULL UNIQUE,
    email             TEXT NOT NULL,
    name              TEXT NOT NULL,
    avatar_url        TEXT,
    role              TEXT NOT NULL DEFAULT 'member'
                      CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

### 3.3 Space (flexible nesting via adjacency list + materialized path)
```sql
CREATE TABLE spaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    parent_space_id UUID REFERENCES spaces(id),
    name            TEXT NOT NULL,
    description     TEXT,
    slug            TEXT NOT NULL,
    icon            TEXT,
    color           TEXT,
    path            TEXT NOT NULL,  -- materialized path e.g. '/org-id/program-id/team-id/'
    owner_id        UUID NOT NULL REFERENCES users(id),
    visibility      TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'private', 'restricted')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug)
);
CREATE INDEX idx_spaces_tenant ON spaces(tenant_id);
CREATE INDEX idx_spaces_parent ON spaces(parent_space_id);
CREATE INDEX idx_spaces_path ON spaces(path text_pattern_ops);  -- enables prefix LIKE queries
```

### 3.4 Goal
```sql
CREATE TABLE goals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    space_id    UUID NOT NULL REFERENCES spaces(id),
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'achieved', 'abandoned')),
    target_date DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_space ON goals(space_id);
```

### 3.5 Goal Link (alignment graph)
```sql
CREATE TABLE goal_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type     TEXT NOT NULL CHECK (source_type IN ('goal', 'card')),
    source_id       UUID NOT NULL,
    target_goal_id  UUID NOT NULL REFERENCES goals(id),
    link_type       TEXT NOT NULL DEFAULT 'supports'
                    CHECK (link_type IN ('supports', 'drives', 'blocks')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goal_links_source ON goal_links(source_type, source_id);
CREATE INDEX idx_goal_links_target ON goal_links(target_goal_id);
```

### 3.6 Card
```sql
CREATE TABLE cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id        UUID NOT NULL REFERENCES spaces(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    description     TEXT,
    column_name     TEXT NOT NULL DEFAULT 'inbox'
                    CHECK (column_name IN ('inbox', 'icebox', 'freezer', 'planned',
                                           'in_progress', 'review', 'done')),
    position        DOUBLE PRECISION NOT NULL DEFAULT 0,
    assignee_id     UUID REFERENCES users(id),
    priority        TEXT CHECK (priority IN ('p0', 'p1', 'p2', 'p3')),
    effort_estimate INTEGER,
    due_date        DATE,
    labels          TEXT[] DEFAULT '{}',
    template_id     UUID,  -- FK to card_templates added after that table is created
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    moved_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cards_space_column ON cards(space_id, column_name);
CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_cards_assignee ON cards(assignee_id);
```

### 3.7 Card Template
```sql
CREATE TABLE card_templates (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id              UUID NOT NULL REFERENCES spaces(id),
    tenant_id             UUID NOT NULL REFERENCES tenants(id),
    name                  TEXT NOT NULL,
    description           TEXT,
    default_labels        TEXT[] DEFAULT '{}',
    default_priority      TEXT CHECK (default_priority IN ('p0', 'p1', 'p2', 'p3')),
    default_effort_estimate INTEGER,
    field_config          JSONB NOT NULL DEFAULT '{}',
    created_by            UUID NOT NULL REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_templates_space ON card_templates(space_id);

-- Add FK from cards to card_templates (after both tables exist)
ALTER TABLE cards ADD CONSTRAINT fk_cards_template
    FOREIGN KEY (template_id) REFERENCES card_templates(id);
```

### 3.8 Attachment
```sql
CREATE TABLE attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id      UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    url          TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes   BIGINT NOT NULL,
    uploaded_by  UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_card ON attachments(card_id);
```

### 3.9 Comment
```sql
CREATE TABLE comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id    UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_card ON comments(card_id);
```

### 3.10 Activity Log
```sql
CREATE TABLE activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    changes     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_tenant_time ON activities(tenant_id, created_at DESC);
```

### 3.11 User Settings
```sql
CREATE TABLE user_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    theme           TEXT NOT NULL DEFAULT 'system'
                    CHECK (theme IN ('light', 'dark', 'system')),
    default_space_id UUID REFERENCES spaces(id),  -- landing space after login
    notification_prefs JSONB NOT NULL DEFAULT '{
        "email_digest": "daily",
        "card_assigned": true,
        "card_mentioned": true,
        "card_moved": false,
        "goal_status_change": true
    }',
    board_prefs     JSONB NOT NULL DEFAULT '{
        "compact_mode": false,
        "show_labels": true,
        "show_priority": true,
        "show_assignee": true,
        "show_due_date": true
    }',
    timezone        TEXT NOT NULL DEFAULT 'UTC',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_settings_tenant ON user_settings(tenant_id);
```

**User settings API:**
- `GET /settings` — current user's settings
- `PUT /settings` — update settings (partial update via JSON merge)

### 3.12 Integrations

```sql
CREATE TABLE integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    space_id        UUID REFERENCES spaces(id),  -- NULL = tenant-wide
    provider        TEXT NOT NULL
                    CHECK (provider IN ('github', 'gitlab', 'bitbucket', 'jenkins', 'circleci')),
    name            TEXT NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}',  -- provider-specific: repo, org, webhook URL
    access_token    TEXT,  -- encrypted, provider OAuth token
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'error')),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX idx_integrations_space ON integrations(space_id);

CREATE TABLE card_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    integration_id  UUID NOT NULL REFERENCES integrations(id),
    external_type   TEXT NOT NULL
                    CHECK (external_type IN ('pull_request', 'issue', 'branch', 'build', 'commit')),
    external_id     TEXT NOT NULL,      -- e.g. PR number, build ID
    external_url    TEXT NOT NULL,       -- direct link to the resource
    title           TEXT,               -- cached title of the external resource
    status          TEXT,               -- e.g. 'open', 'merged', 'passing', 'failing'
    metadata        JSONB DEFAULT '{}', -- provider-specific: author, labels, checks
    last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_links_card ON card_links(card_id);
CREATE INDEX idx_card_links_integration ON card_links(integration_id);
```

**How integrations work:**

- **Setup:** Admin connects a GitHub/GitLab/etc. account at the tenant or space level via OAuth
- **Linking:** Cards can be linked to PRs, issues, branches, builds via the card detail panel
- **Auto-linking:** Webhook listener matches PR/commit descriptions containing card IDs (e.g., `SPACES-123`) and auto-creates card links
- **Status sync:** Webhooks update `card_links.status` in real-time (PR merged, build passing/failing)
- **Card display:** Card detail panel shows linked items with live status badges (green check for passing build, merge icon for merged PR, etc.)
- **Board view:** Cards with linked builds show a small status indicator (green/red/yellow dot)

**Integrations API:**
- `GET /integrations` — list tenant integrations
- `POST /integrations` — create integration (initiates OAuth)
- `PUT /integrations/:id` — update integration config
- `DELETE /integrations/:id` — remove integration
- `GET /cards/:id/links` — list external links on a card
- `POST /cards/:id/links` — manually link an external resource
- `DELETE /card-links/:id` — remove a link
- `POST /webhooks/:provider` — webhook endpoint for incoming events

---

## 4. Kanban Flow

### 4.1 Columns
| Column | Purpose |
|--------|---------|
| **Inbox** | Entry point — all new items land here |
| **Ice Box** | Good idea, needs more definition before planning |
| **Freezer** | Uncertain value, needs validation before proceeding |
| **Planned** | Defined, validated, and ready for work |
| **In Progress** | Actively being worked on |
| **Review** | Work complete, awaiting review/approval |
| **Done** | Delivered |

### 4.2 Valid Transitions
```
inbox     → icebox, freezer, planned
icebox    → planned, freezer
freezer   → icebox, planned
planned   → in_progress
in_progress → review, planned
review    → done, in_progress
done      → in_progress (reopen)
```

Invalid transitions are rejected by the API and visually blocked in the UI.

### 4.3 Board Behavior
- **WIP limits**: configurable per column per space (soft limits — warnings, not hard blocks)
- **Drag-and-drop**: cards can be reordered within a column and moved between valid columns
- **Position**: float-based ordering for efficient drag-and-drop without reindexing
- **Auto-timestamps**: `moved_at` updates on every column transition
- **Column policies** (optional): required fields before entering a column (e.g., assignee required before In Progress, linked goal required before Planned)

---

## 5. Goal Alignment & Rollup Dashboard

### 5.1 Goal Linking
- Goals exist at any level in the space hierarchy
- Cards and sub-goals link to parent goals via `goal_links` with relationship type (`supports`, `drives`, `blocks`)
- Forms a directed graph: Card → Goal → Parent Goal → Org Goal

### 5.2 Alignment Health Scoring
- **Linked %**: percentage of in-flight cards (Planned/In Progress/Review) linked to at least one goal
- **Goal coverage**: which goals have no supporting cards or sub-goals (orphaned goals)
- **Misalignment signals**: high-priority cards with no goal linkage; goals with no active work

### 5.3 Dashboard Panels

**Alignment Health:**
- Donut chart: linked vs. unlinked cards across the subtree
- Orphaned goals list (goals with no active supporting work)
- Unlinked high-priority cards (P0/P1 without goal links)
- Traffic light per goal: green (on track), amber (at risk), red (stalled)

**Capacity & Flow Metrics:**
- Cumulative flow diagram across the subtree
- Cycle time / lead time trends (line charts)
- WIP per column per space (heatmap for bottleneck visibility)
- Throughput by space (bar chart, filterable by period)

**Space Navigator:**
- Tree view of space hierarchy
- Each node shows: name, card counts by column, alignment score
- Click to drill into any space's board

### 5.4 Rollup Queries
- All rollup queries use the materialized path on `spaces` for efficient subtree selection
- Example: `WHERE spaces.path LIKE '/org-id/program-id/%'` to get all spaces under a program
- Metrics are computed on-demand (not pre-aggregated in v1) with Redis caching for expensive queries

---

## 6. API Design

### 6.1 Endpoints

**Auth:**
- `POST /auth/callback` — auth provider callback
- `GET /auth/me` — current user + tenant

**Spaces:**
- `GET /spaces` — list top-level spaces
- `GET /spaces/:id` — space detail + direct children
- `GET /spaces/:id/tree` — full subtree
- `POST /spaces` — create space
- `PUT /spaces/:id` — update space
- `DELETE /spaces/:id` — archive space

**Cards:**
- `GET /spaces/:id/cards?column=&cursor=&limit=` — list cards with filtering
- `POST /spaces/:id/cards` — create card (optionally from template)
- `PUT /cards/:id` — update card
- `PATCH /cards/:id/move` — move card (validates transitions)
- `DELETE /cards/:id` — archive card

**Goals:**
- `GET /spaces/:id/goals` — list goals
- `POST /spaces/:id/goals` — create goal
- `PUT /goals/:id` — update goal
- `POST /goals/:id/links` — create goal link
- `DELETE /goal-links/:id` — remove link

**Metrics:**
- `GET /spaces/:id/metrics/flow` — flow metrics for subtree
- `GET /spaces/:id/metrics/alignment` — alignment health for subtree

**Templates:**
- `GET /spaces/:id/templates` — list templates
- `POST /spaces/:id/templates` — create template

**User Settings:**
- `GET /settings` — current user's settings
- `PUT /settings` — update settings (JSON merge patch)

**Integrations:**
- `GET /integrations` — list tenant integrations
- `POST /integrations` — create integration (initiates OAuth)
- `PUT /integrations/:id` — update integration config
- `DELETE /integrations/:id` — remove integration
- `GET /cards/:id/links` — list external links on a card
- `POST /cards/:id/links` — manually link external resource
- `DELETE /card-links/:id` — remove link
- `POST /webhooks/:provider` — incoming webhook endpoint (GitHub, GitLab, CI)

### 6.2 Pagination
Cursor-based pagination for all list endpoints:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJ...",
    "has_more": true
  }
}
```
- Default limit: 50, max: 200
- Cursor encodes last item's sort key (opaque, base64-encoded)
- Filtering via query params: column, assignee, priority, labels, goal linkage
- Sorting: position, created_at, updated_at, priority, due_date
- Offset-based only for dashboard aggregations

### 6.3 Real-Time (WebSockets)
- Client subscribes to space channel on board view
- Events: `card.moved`, `card.created`, `card.updated`, `card.deleted`
- Redis Pub/Sub backs broadcast (horizontal scaling support)
- Frontend: optimistic updates, reconcile on server confirmation

### 6.4 API Client
- TypeScript types mirroring Go API response types
- Thin fetch-based client in `frontend/src/lib/api/` with auth headers
- Types can be auto-generated from OpenAPI spec (future improvement)

---

## 7. Security

### 7.1 Multi-Tenant Isolation
- Every DB query includes `tenant_id` in WHERE — enforced at repository layer
- Row-Level Security (RLS) in Postgres as defense-in-depth
- Tenant ID extracted from JWT, injected into request context — never from user input

### 7.2 RBAC
Tenant-level roles with optional space-level overrides:

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| Manage tenant settings | Y | | | |
| Create/delete spaces | Y | Y | | |
| Manage space members | Y | Y | | |
| Create/edit cards | Y | Y | Y | |
| Move cards | Y | Y | Y | |
| Create/edit goals | Y | Y | Y | |
| View board & dashboard | Y | Y | Y | Y |
| Comment | Y | Y | Y | Y |

### 7.3 API Security
- Rate limiting per tenant (Redis-backed, token bucket algorithm)
- Input validation on all endpoints (Go struct tags + custom validators)
- CORS configured for frontend origin only
- CSRF protection on state-changing requests
- SQL injection prevention via parameterized queries (pgx)
- XSS prevention via React default escaping + sanitized rich text

### 7.4 Data Security
- TLS in transit everywhere
- Encryption at rest (Postgres disk-level or TDE)
- Sensitive fields (auth tokens) never logged
- Activity log provides full audit trail

---

## 8. Testing Strategy

### 8.1 Backend (Go)
- **Unit tests** per module — mock DB at repository boundary
- **Integration tests** against real Postgres (testcontainers or docker-compose test DB)
- **API tests** — HTTP handler tests with test server, real DB
- **Coverage target:** 80%+ on business logic

### 8.2 Frontend (TypeScript)
- **Component tests** with React Testing Library — board interactions, card CRUD
- **Integration tests** — API client against mock server (MSW)
- **E2E tests** with Playwright — full flow: create space → add cards → move through columns → verify dashboard

### 8.3 CI Pipeline
- Go: tests + golangci-lint
- TypeScript: tests + ESLint + type check
- E2E: Playwright against docker-compose environment
- All tests must pass before merge

---

## 9. Verification Plan

To verify the implementation end-to-end:

1. **Local setup**: `docker-compose up` starts Postgres + Redis; Go server starts; Next.js dev server starts
2. **Auth flow**: Sign up / sign in via auth provider → redirected back → user created in DB
3. **Space creation**: Create org-level space → create nested team space → verify tree view
4. **Board flow**: Create card in Inbox → triage to Ice Box → promote to Planned → move through In Progress → Review → Done
5. **Goal linking**: Create org-level goal → create space-level goal linked to it → link cards to space-level goal → verify alignment dashboard shows connections
6. **Real-time**: Open board in two browser tabs → move card in one → verify update appears in the other
7. **Rollup**: Navigate to org-level space → verify dashboard shows aggregated metrics from all nested spaces
8. **RBAC**: Test with viewer role → verify cannot create/move cards; test with member → verify can create/move but not delete spaces
9. **Multi-tenant**: Create two tenants → verify data isolation (tenant A cannot see tenant B's spaces)
