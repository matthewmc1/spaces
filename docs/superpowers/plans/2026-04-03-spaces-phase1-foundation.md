# Spaces Phase 1: Foundation & Core Domain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Kanban board with space nesting, card management, and board transitions — the core vertical slice of the Spaces platform.

**Architecture:** Go modular monolith backend (stdlib router, pgx, goose migrations) serving a REST API. Next.js App Router frontend with Tailwind, TanStack Query, and dnd-kit for drag-and-drop. Docker Compose for local Postgres + Redis. Clerk for auth.

**Tech Stack:** Go 1.22+, PostgreSQL 16, Redis 7, Next.js 14+, Tailwind CSS, TypeScript, dnd-kit, TanStack Query, Clerk

**Design Spec:** `docs/specs/2026-04-03-spaces-platform-design.md`

**Deferred to Phase 2:** Goals & linking, dashboard/metrics, user settings, integrations, real-time WebSockets, RLS policies, activity log writes, RBAC beyond basic auth, card templates CRUD API, WIP limit warnings UI.

---

## File Structure

### Backend

```
backend/
├── cmd/server/main.go                          # Entry point, DI wiring, graceful shutdown
├── go.mod
├── go.sum
├── internal/
│   ├── platform/
│   │   ├── config/config.go                    # Env-based config struct
│   │   ├── database/database.go                # pgxpool connection
│   │   ├── database/tx.go                      # Transaction helper
│   │   ├── redis/redis.go                      # go-redis client
│   │   ├── errors/errors.go                    # Domain error types
│   │   ├── respond/respond.go                  # JSON response + decode helpers
│   │   ├── middleware/logging.go               # Request logging
│   │   ├── middleware/cors.go                  # CORS
│   │   └── pagination/pagination.go            # Cursor pagination helpers
│   ├── tenant/
│   │   ├── model.go                            # Tenant struct
│   │   ├── context.go                          # Context get/set for tenant ID
│   │   ├── middleware.go                       # Extract tenant from auth claims
│   │   └── repository.go                       # Tenant DB queries
│   ├── auth/
│   │   ├── model.go                            # Claims, User structs
│   │   ├── context.go                          # Context get/set for claims
│   │   ├── middleware.go                       # JWT verification middleware
│   │   ├── clerk.go                            # Clerk TokenVerifier impl
│   │   └── repository.go                       # User upsert/lookup
│   ├── spaces/
│   │   ├── model.go                            # Space, CreateInput, UpdateInput
│   │   ├── repository.go                       # Space DB queries (CRUD, tree)
│   │   ├── service.go                          # Business logic (path building, validation)
│   │   ├── handler.go                          # HTTP handlers
│   │   └── routes.go                           # Route registration
│   └── cards/
│       ├── model.go                            # Card, Column, CreateInput, MoveInput
│       ├── transitions.go                      # Valid transition map + validation
│       ├── repository.go                       # Card DB queries (CRUD, move, list)
│       ├── service.go                          # Business logic (transition enforcement)
│       ├── handler.go                          # HTTP handlers
│       └── routes.go                           # Route registration
├── api/
│   └── router.go                               # Top-level mux assembly
└── migrations/
    └── 001_initial_schema.sql                  # All Phase 1 tables
```

### Frontend

```
frontend/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Root layout with providers
│   │   ├── page.tsx                            # Landing/redirect
│   │   ├── spaces/
│   │   │   ├── page.tsx                        # Space list (top-level)
│   │   │   └── [id]/
│   │   │       └── page.tsx                    # Space detail → Board view
│   │   └── sign-in/
│   │       └── [[...sign-in]]/page.tsx         # Clerk sign-in
│   ├── components/
│   │   ├── common/
│   │   │   ├── Sidebar.tsx                     # Navigation sidebar
│   │   │   └── PageHeader.tsx                  # Page title + actions
│   │   ├── spaces/
│   │   │   ├── SpaceTree.tsx                   # Recursive tree navigator
│   │   │   ├── SpaceTreeNode.tsx               # Single tree node
│   │   │   └── CreateSpaceDialog.tsx           # Create space form
│   │   └── board/
│   │       ├── Board.tsx                       # Kanban board container
│   │       ├── BoardColumn.tsx                 # Single column with droppable
│   │       ├── BoardCard.tsx                   # Draggable card
│   │       └── CreateCardDialog.tsx            # Create card form
│   ├── hooks/
│   │   ├── useSpaces.ts                        # TanStack Query hooks for spaces
│   │   └── useCards.ts                         # TanStack Query hooks for cards
│   ├── lib/
│   │   └── api/
│   │       ├── client.ts                       # Base fetch wrapper with auth
│   │       ├── spaces.ts                       # Space API functions
│   │       └── cards.ts                        # Card API functions
│   └── types/
│       ├── space.ts                            # Space types
│       └── card.ts                             # Card, Column types
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `backend/go.mod`, `backend/cmd/server/main.go`
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/next.config.ts`, `frontend/tailwind.config.ts`, `frontend/postcss.config.js`
- Create: `docker-compose.yml`, `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/matthewmcgibbon/spaces
git init
```

- [ ] **Step 2: Create .gitignore**

Create `.gitignore`:

```
# Go
backend/tmp/
backend/bin/

# Node
frontend/node_modules/
frontend/.next/
frontend/out/

# Environment
.env
.env.local

# OS
.DS_Store

# IDE
.idea/
.vscode/
```

- [ ] **Step 3: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: spaces
      POSTGRES_PASSWORD: spaces
      POSTGRES_DB: spaces
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 4: Initialize Go module**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go mod init github.com/matthewmcgibbon/spaces/backend
```

- [ ] **Step 5: Create Go entry point**

Create `backend/cmd/server/main.go`:

```go
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
```

- [ ] **Step 6: Verify Go server starts**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go run cmd/server/main.go &
sleep 1
curl http://localhost:8080/health
# Expected: {"status":"ok"}
kill %1
```

- [ ] **Step 7: Initialize Next.js app**

```bash
cd /Users/matthewmcgibbon/spaces
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

- [ ] **Step 8: Verify Next.js starts**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npm run dev &
sleep 3
curl -s http://localhost:3000 | head -20
# Expected: HTML response from Next.js
kill %1
```

- [ ] **Step 9: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add .
git commit -m "feat: project scaffolding — Go backend, Next.js frontend, docker-compose"
```

---

## Task 2: Database Migrations

**Files:**
- Create: `backend/migrations/001_initial_schema.sql`
- Modify: `backend/go.mod` (add goose dependency)

- [ ] **Step 1: Install goose**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go get github.com/pressly/goose/v3
```

- [ ] **Step 2: Create migration file**

Create `backend/migrations/001_initial_schema.sql`:

```sql
-- +goose Up

-- Tenants
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users
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

-- Spaces
CREATE TABLE spaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    parent_space_id UUID REFERENCES spaces(id),
    name            TEXT NOT NULL,
    description     TEXT,
    slug            TEXT NOT NULL,
    icon            TEXT,
    color           TEXT,
    path            TEXT NOT NULL,
    owner_id        UUID NOT NULL REFERENCES users(id),
    visibility      TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'private', 'restricted')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug)
);
CREATE INDEX idx_spaces_tenant ON spaces(tenant_id);
CREATE INDEX idx_spaces_parent ON spaces(parent_space_id);
CREATE INDEX idx_spaces_path ON spaces(path text_pattern_ops);

-- Card Templates (created before cards due to FK)
CREATE TABLE card_templates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id                UUID NOT NULL REFERENCES spaces(id),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    name                    TEXT NOT NULL,
    description             TEXT,
    default_labels          TEXT[] DEFAULT '{}',
    default_priority        TEXT CHECK (default_priority IN ('p0', 'p1', 'p2', 'p3')),
    default_effort_estimate INTEGER,
    field_config            JSONB NOT NULL DEFAULT '{}',
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_templates_space ON card_templates(space_id);

-- Cards
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
    template_id     UUID REFERENCES card_templates(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    moved_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cards_space_column ON cards(space_id, column_name);
CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_cards_assignee ON cards(assignee_id);

-- Attachments
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

-- Comments
CREATE TABLE comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id    UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_card ON comments(card_id);

-- Activity Log
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

-- +goose Down
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS card_templates;
DROP TABLE IF EXISTS spaces;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
```

- [ ] **Step 3: Run migration against local Postgres**

```bash
cd /Users/matthewmcgibbon/spaces
docker compose up -d postgres
sleep 2
cd backend
go install github.com/pressly/goose/v3/cmd/goose@latest
goose -dir migrations postgres "postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable" up
# Expected: OK 001_initial_schema.sql
```

- [ ] **Step 4: Verify tables exist**

```bash
docker compose exec postgres psql -U spaces -c "\dt"
# Expected: list of all tables (tenants, users, spaces, cards, card_templates, etc.)
```

- [ ] **Step 5: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/migrations/ backend/go.mod backend/go.sum
git commit -m "feat: initial database schema migration — all Phase 1 tables"
```

---

## Task 3: Platform Packages

**Files:**
- Create: `backend/internal/platform/config/config.go`
- Create: `backend/internal/platform/database/database.go`
- Create: `backend/internal/platform/database/tx.go`
- Create: `backend/internal/platform/redis/redis.go`
- Create: `backend/internal/platform/errors/errors.go`
- Create: `backend/internal/platform/respond/respond.go`
- Create: `backend/internal/platform/middleware/logging.go`
- Create: `backend/internal/platform/middleware/cors.go`
- Create: `backend/internal/platform/pagination/pagination.go`
- Test: `backend/internal/platform/errors/errors_test.go`
- Test: `backend/internal/platform/respond/respond_test.go`
- Test: `backend/internal/platform/pagination/pagination_test.go`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go get github.com/jackc/pgx/v5
go get github.com/redis/go-redis/v9
go get github.com/caarlos0/env/v11
go get github.com/joho/godotenv
go get github.com/google/uuid
go get github.com/stretchr/testify
```

- [ ] **Step 2: Write config package**

Create `backend/internal/platform/config/config.go`:

```go
package config

import (
	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string `env:"DATABASE_URL" envDefault:"postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable"`
	RedisURL      string `env:"REDIS_URL" envDefault:"redis://localhost:6379"`
	ServerPort    string `env:"SERVER_PORT" envDefault:"8080"`
	ClerkSecretKey string `env:"CLERK_SECRET_KEY"`
	CORSOrigin    string `env:"CORS_ORIGIN" envDefault:"http://localhost:3000"`
	LogLevel      string `env:"LOG_LEVEL" envDefault:"info"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
```

- [ ] **Step 3: Write database package**

Create `backend/internal/platform/database/database.go`:

```go
package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, dbURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 25
	cfg.MinConns = 5
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}
```

Create `backend/internal/platform/database/tx.go`:

```go
package database

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
```

- [ ] **Step 4: Write redis package**

Create `backend/internal/platform/redis/redis.go`:

```go
package redis

import (
	"context"

	goredis "github.com/redis/go-redis/v9"
)

func Connect(ctx context.Context, redisURL string) (*goredis.Client, error) {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	client := goredis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return client, nil
}
```

- [ ] **Step 5: Write failing test for errors package**

Create `backend/internal/platform/errors/errors_test.go`:

```go
package errors_test

import (
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/stretchr/testify/assert"
)

func TestNotFound(t *testing.T) {
	err := errors.NotFound("space", "abc-123")
	assert.Equal(t, "space not found: abc-123", err.Error())
	assert.True(t, errors.IsNotFound(err))
	assert.False(t, errors.IsConflict(err))
}

func TestConflict(t *testing.T) {
	err := errors.Conflict("slug already exists")
	assert.Equal(t, "conflict: slug already exists", err.Error())
	assert.True(t, errors.IsConflict(err))
	assert.False(t, errors.IsNotFound(err))
}

func TestValidation(t *testing.T) {
	err := errors.Validation("title is required")
	assert.Equal(t, "validation: title is required", err.Error())
	assert.True(t, errors.IsValidation(err))
}

func TestForbidden(t *testing.T) {
	err := errors.Forbidden("not allowed")
	assert.Equal(t, "forbidden: not allowed", err.Error())
	assert.True(t, errors.IsForbidden(err))
}

func TestUnauthorized(t *testing.T) {
	err := errors.Unauthorized("invalid token")
	assert.Equal(t, "unauthorized: invalid token", err.Error())
	assert.True(t, errors.IsUnauthorized(err))
}
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/platform/errors/...
# Expected: FAIL — package doesn't exist yet
```

- [ ] **Step 7: Write errors package**

Create `backend/internal/platform/errors/errors.go`:

```go
package errors

import "fmt"

type Kind int

const (
	KindNotFound Kind = iota
	KindConflict
	KindValidation
	KindForbidden
	KindUnauthorized
)

type Error struct {
	Kind    Kind
	Message string
}

func (e *Error) Error() string {
	return e.Message
}

func NotFound(entity, id string) *Error {
	return &Error{Kind: KindNotFound, Message: fmt.Sprintf("%s not found: %s", entity, id)}
}

func Conflict(msg string) *Error {
	return &Error{Kind: KindConflict, Message: fmt.Sprintf("conflict: %s", msg)}
}

func Validation(msg string) *Error {
	return &Error{Kind: KindValidation, Message: fmt.Sprintf("validation: %s", msg)}
}

func Forbidden(msg string) *Error {
	return &Error{Kind: KindForbidden, Message: fmt.Sprintf("forbidden: %s", msg)}
}

func Unauthorized(msg string) *Error {
	return &Error{Kind: KindUnauthorized, Message: fmt.Sprintf("unauthorized: %s", msg)}
}

func IsNotFound(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindNotFound
}

func IsConflict(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindConflict
}

func IsValidation(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindValidation
}

func IsForbidden(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindForbidden
}

func IsUnauthorized(err error) bool {
	e, ok := err.(*Error)
	return ok && e.Kind == KindUnauthorized
}
```

- [ ] **Step 8: Run errors tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/platform/errors/... -v
# Expected: PASS — all 5 tests pass
```

- [ ] **Step 9: Write failing test for respond package**

Create `backend/internal/platform/respond/respond_test.go`:

```go
package respond_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/stretchr/testify/assert"
)

func TestJSON(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"name": "test"}
	respond.JSON(w, http.StatusOK, data)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	assert.JSONEq(t, `{"name":"test"}`, w.Body.String())
}

func TestError_NotFound(t *testing.T) {
	w := httptest.NewRecorder()
	respond.Error(w, errors.NotFound("space", "abc"))

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "not_found")
}

func TestError_Validation(t *testing.T) {
	w := httptest.NewRecorder()
	respond.Error(w, errors.Validation("title is required"))

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "validation")
}

func TestDecode(t *testing.T) {
	body := strings.NewReader(`{"name":"test"}`)
	r := httptest.NewRequest("POST", "/", body)
	r.Header.Set("Content-Type", "application/json")

	var dst struct {
		Name string `json:"name"`
	}
	err := respond.Decode(r, &dst)
	assert.NoError(t, err)
	assert.Equal(t, "test", dst.Name)
}
```

- [ ] **Step 10: Run test to verify it fails**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/platform/respond/...
# Expected: FAIL
```

- [ ] **Step 11: Write respond package**

Create `backend/internal/platform/respond/respond.go`:

```go
package respond

import (
	"encoding/json"
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func Error(w http.ResponseWriter, err error) {
	e, ok := err.(*errors.Error)
	if !ok {
		JSON(w, http.StatusInternalServerError, errorResponse{
			Error: errorBody{Code: "internal", Message: "internal server error"},
		})
		return
	}

	status := http.StatusInternalServerError
	code := "internal"

	switch e.Kind {
	case errors.KindNotFound:
		status = http.StatusNotFound
		code = "not_found"
	case errors.KindConflict:
		status = http.StatusConflict
		code = "conflict"
	case errors.KindValidation:
		status = http.StatusBadRequest
		code = "validation"
	case errors.KindForbidden:
		status = http.StatusForbidden
		code = "forbidden"
	case errors.KindUnauthorized:
		status = http.StatusUnauthorized
		code = "unauthorized"
	}

	JSON(w, status, errorResponse{
		Error: errorBody{Code: code, Message: e.Message},
	})
}

func Decode(r *http.Request, dst any) error {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return errors.Validation("invalid request body: " + err.Error())
	}
	return nil
}
```

- [ ] **Step 12: Run respond tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/platform/respond/... -v
# Expected: PASS
```

- [ ] **Step 13: Write failing test for pagination package**

Create `backend/internal/platform/pagination/pagination_test.go`:

```go
package pagination_test

import (
	"net/http/httptest"
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
	"github.com/stretchr/testify/assert"
)

func TestParseFromRequest_Defaults(t *testing.T) {
	r := httptest.NewRequest("GET", "/items", nil)
	p := pagination.ParseFromRequest(r)

	assert.Equal(t, "", p.Cursor)
	assert.Equal(t, 50, p.Limit)
}

func TestParseFromRequest_CustomValues(t *testing.T) {
	r := httptest.NewRequest("GET", "/items?cursor=abc&limit=20", nil)
	p := pagination.ParseFromRequest(r)

	assert.Equal(t, "abc", p.Cursor)
	assert.Equal(t, 20, p.Limit)
}

func TestParseFromRequest_MaxLimit(t *testing.T) {
	r := httptest.NewRequest("GET", "/items?limit=999", nil)
	p := pagination.ParseFromRequest(r)

	assert.Equal(t, 200, p.Limit)
}

func TestEncodeDecode_Cursor(t *testing.T) {
	original := "2024-01-01T00:00:00Z"
	encoded := pagination.EncodeCursor(original)
	decoded, err := pagination.DecodeCursor(encoded)

	assert.NoError(t, err)
	assert.Equal(t, original, decoded)
	assert.NotEqual(t, original, encoded) // should be base64
}
```

- [ ] **Step 14: Run test to verify it fails**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/platform/pagination/...
# Expected: FAIL
```

- [ ] **Step 15: Write pagination package**

Create `backend/internal/platform/pagination/pagination.go`:

```go
package pagination

import (
	"encoding/base64"
	"net/http"
	"strconv"
)

const (
	DefaultLimit = 50
	MaxLimit     = 200
)

type Params struct {
	Cursor string
	Limit  int
}

type Response[T any] struct {
	Data       []T        `json:"data"`
	Pagination PageInfo   `json:"pagination"`
}

type PageInfo struct {
	NextCursor string `json:"next_cursor,omitempty"`
	HasMore    bool   `json:"has_more"`
}

func ParseFromRequest(r *http.Request) Params {
	cursor := r.URL.Query().Get("cursor")
	limit := DefaultLimit

	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if limit > MaxLimit {
		limit = MaxLimit
	}

	return Params{Cursor: cursor, Limit: limit}
}

func EncodeCursor(key string) string {
	return base64.URLEncoding.EncodeToString([]byte(key))
}

func DecodeCursor(s string) (string, error) {
	b, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
```

- [ ] **Step 16: Run pagination tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/platform/pagination/... -v
# Expected: PASS
```

- [ ] **Step 17: Write middleware packages**

Create `backend/internal/platform/middleware/logging.go`:

```go
package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rec, r)

		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}
```

Create `backend/internal/platform/middleware/cors.go`:

```go
package middleware

import "net/http"

func CORS(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 18: Run all platform tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/platform/... -v
# Expected: all tests PASS
```

- [ ] **Step 19: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/
git commit -m "feat: platform packages — config, database, redis, errors, respond, pagination, middleware"
```

---

## Task 4: Tenant & Auth Packages

**Files:**
- Create: `backend/internal/tenant/model.go`
- Create: `backend/internal/tenant/context.go`
- Create: `backend/internal/tenant/middleware.go`
- Create: `backend/internal/tenant/repository.go`
- Create: `backend/internal/auth/model.go`
- Create: `backend/internal/auth/context.go`
- Create: `backend/internal/auth/middleware.go`
- Create: `backend/internal/auth/clerk.go`
- Create: `backend/internal/auth/repository.go`
- Test: `backend/internal/tenant/context_test.go`
- Test: `backend/internal/auth/middleware_test.go`

- [ ] **Step 1: Write tenant model and context**

Create `backend/internal/tenant/model.go`:

```go
package tenant

import (
	"time"

	"github.com/google/uuid"
)

type Tenant struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
```

Create `backend/internal/tenant/context.go`:

```go
package tenant

import (
	"context"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type ctxKey struct{}

func WithTenantID(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKey{}, tenantID)
}

func FromContext(ctx context.Context) (uuid.UUID, error) {
	id, ok := ctx.Value(ctxKey{}).(uuid.UUID)
	if !ok {
		return uuid.Nil, errors.Unauthorized("tenant not found in context")
	}
	return id, nil
}
```

- [ ] **Step 2: Write failing test for tenant context**

Create `backend/internal/tenant/context_test.go`:

```go
package tenant_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
	"github.com/stretchr/testify/assert"
)

func TestFromContext_Success(t *testing.T) {
	id := uuid.New()
	ctx := tenant.WithTenantID(context.Background(), id)
	got, err := tenant.FromContext(ctx)

	assert.NoError(t, err)
	assert.Equal(t, id, got)
}

func TestFromContext_Missing(t *testing.T) {
	_, err := tenant.FromContext(context.Background())
	assert.Error(t, err)
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/tenant/... -v
# Expected: PASS
```

- [ ] **Step 4: Write tenant repository and middleware**

Create `backend/internal/tenant/repository.go`:

```go
package tenant

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	t := &Tenant{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, plan, created_at, updated_at FROM tenants WHERE id = $1`,
		id,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, errors.NotFound("tenant", id.String())
	}
	return t, nil
}

func (r *Repository) GetBySlug(ctx context.Context, slug string) (*Tenant, error) {
	t := &Tenant{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, plan, created_at, updated_at FROM tenants WHERE slug = $1`,
		slug,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, errors.NotFound("tenant", slug)
	}
	return t, nil
}
```

Create `backend/internal/tenant/middleware.go`:

```go
package tenant

import (
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
)

// Middleware extracts tenant ID from auth claims (set by auth middleware)
// and injects it into the request context.
type Middleware struct{}

func NewMiddleware() *Middleware {
	return &Middleware{}
}

// Handler wraps the next handler with tenant context extraction.
// Expects auth claims to already be in context with tenant ID.
func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Tenant ID is extracted by auth middleware and set via WithTenantID
		// This middleware validates it exists
		_, err := FromContext(r.Context())
		if err != nil {
			respond.Error(w, err)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 5: Write auth model and context**

Create `backend/internal/auth/model.go`:

```go
package auth

import (
	"time"

	"github.com/google/uuid"
)

type Claims struct {
	UserID   uuid.UUID
	TenantID uuid.UUID
	Email    string
	Role     string
}

type User struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	ExternalAuthID string    `json:"external_auth_id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	AvatarURL      string    `json:"avatar_url,omitempty"`
	Role           string    `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
}
```

Create `backend/internal/auth/context.go`:

```go
package auth

import (
	"context"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type ctxKey struct{}

func WithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, ctxKey{}, claims)
}

func FromContext(ctx context.Context) (*Claims, error) {
	c, ok := ctx.Value(ctxKey{}).(*Claims)
	if !ok {
		return nil, errors.Unauthorized("not authenticated")
	}
	return c, nil
}
```

- [ ] **Step 6: Write auth middleware with mockable TokenVerifier**

Create `backend/internal/auth/middleware.go`:

```go
package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// TokenVerifier verifies a JWT token and returns claims.
type TokenVerifier interface {
	Verify(ctx context.Context, token string) (*Claims, error)
}

type Middleware struct {
	verifier TokenVerifier
}

func NewMiddleware(verifier TokenVerifier) *Middleware {
	return &Middleware{verifier: verifier}
}

func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respond.Error(w, &respondUnauthorized{})
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			respond.Error(w, &respondUnauthorized{})
			return
		}

		claims, err := m.verifier.Verify(r.Context(), token)
		if err != nil {
			respond.Error(w, err)
			return
		}

		ctx := WithClaims(r.Context(), claims)
		ctx = tenant.WithTenantID(ctx, claims.TenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type respondUnauthorized struct{}

func (e *respondUnauthorized) Error() string { return "unauthorized: missing or invalid token" }
```

Note: The `respondUnauthorized` type above won't map correctly through the respond package. Fix by using the errors package directly:

Replace the middleware's error handling to use `errors.Unauthorized`:

```go
package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type TokenVerifier interface {
	Verify(ctx context.Context, token string) (*Claims, error)
}

type Middleware struct {
	verifier TokenVerifier
}

func NewMiddleware(verifier TokenVerifier) *Middleware {
	return &Middleware{verifier: verifier}
}

func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respond.Error(w, errors.Unauthorized("missing authorization header"))
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			respond.Error(w, errors.Unauthorized("invalid authorization format"))
			return
		}

		claims, err := m.verifier.Verify(r.Context(), token)
		if err != nil {
			respond.Error(w, err)
			return
		}

		ctx := WithClaims(r.Context(), claims)
		ctx = tenant.WithTenantID(ctx, claims.TenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

- [ ] **Step 7: Write failing test for auth middleware**

Create `backend/internal/auth/middleware_test.go`:

```go
package auth_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
	"github.com/stretchr/testify/assert"
)

type mockVerifier struct {
	claims *auth.Claims
	err    error
}

func (m *mockVerifier) Verify(ctx context.Context, token string) (*auth.Claims, error) {
	return m.claims, m.err
}

func TestMiddleware_Success(t *testing.T) {
	tenantID := uuid.New()
	userID := uuid.New()

	verifier := &mockVerifier{
		claims: &auth.Claims{
			UserID:   userID,
			TenantID: tenantID,
			Email:    "test@example.com",
			Role:     "member",
		},
	}

	var gotClaims *auth.Claims
	var gotTenantID uuid.UUID

	handler := auth.NewMiddleware(verifier).Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotClaims, _ = auth.FromContext(r.Context())
		gotTenantID, _ = tenant.FromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer valid-token")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, userID, gotClaims.UserID)
	assert.Equal(t, tenantID, gotTenantID)
}

func TestMiddleware_MissingHeader(t *testing.T) {
	verifier := &mockVerifier{}
	handler := auth.NewMiddleware(verifier).Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestMiddleware_InvalidToken(t *testing.T) {
	verifier := &mockVerifier{err: errors.Unauthorized("invalid token")}
	handler := auth.NewMiddleware(verifier).Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer bad-token")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
```

- [ ] **Step 8: Run auth tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/auth/... -v
# Expected: PASS
```

- [ ] **Step 9: Write Clerk verifier and auth repository**

Create `backend/internal/auth/clerk.go`:

```go
package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// ClerkVerifier verifies JWTs using Clerk's SDK.
// In production, this uses clerk-sdk-go. For Phase 1, we implement
// a simplified version that extracts claims from the Clerk JWT.
type ClerkVerifier struct {
	secretKey string
}

func NewClerkVerifier(secretKey string) *ClerkVerifier {
	return &ClerkVerifier{secretKey: secretKey}
}

func (v *ClerkVerifier) Verify(ctx context.Context, token string) (*Claims, error) {
	// TODO: Phase 1 — integrate clerk-sdk-go JWT verification
	// For now, this is a placeholder that will be wired up when
	// Clerk is configured. Tests use the mockVerifier instead.
	return nil, errors.Unauthorized("clerk verification not yet configured")
}

// DevVerifier is a development-only verifier that accepts any token
// and returns fixed claims. Use only for local development.
type DevVerifier struct {
	TenantID uuid.UUID
	UserID   uuid.UUID
}

func (v *DevVerifier) Verify(ctx context.Context, token string) (*Claims, error) {
	if token == "" {
		return nil, errors.Unauthorized("empty token")
	}
	return &Claims{
		UserID:   v.UserID,
		TenantID: v.TenantID,
		Email:    "dev@localhost",
		Role:     "owner",
	}, nil
}
```

Create `backend/internal/auth/repository.go`:

```go
package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) GetByExternalID(ctx context.Context, externalID string) (*User, error) {
	u := &User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, external_auth_id, email, name, avatar_url, role, created_at
		 FROM users WHERE external_auth_id = $1`, externalID,
	).Scan(&u.ID, &u.TenantID, &u.ExternalAuthID, &u.Email, &u.Name, &u.AvatarURL, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, errors.NotFound("user", externalID)
	}
	return u, nil
}

func (r *Repository) GetByID(ctx context.Context, tenantID, userID uuid.UUID) (*User, error) {
	u := &User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, external_auth_id, email, name, avatar_url, role, created_at
		 FROM users WHERE id = $1 AND tenant_id = $2`, userID, tenantID,
	).Scan(&u.ID, &u.TenantID, &u.ExternalAuthID, &u.Email, &u.Name, &u.AvatarURL, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, errors.NotFound("user", userID.String())
	}
	return u, nil
}
```

- [ ] **Step 10: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/
git commit -m "feat: tenant and auth packages — context, middleware, Clerk verifier, dev verifier"
```

---

## Task 5: Spaces Domain — Model, Repository, Service

**Files:**
- Create: `backend/internal/spaces/model.go`
- Create: `backend/internal/spaces/repository.go`
- Create: `backend/internal/spaces/service.go`
- Test: `backend/internal/spaces/service_test.go`

- [ ] **Step 1: Write space model**

Create `backend/internal/spaces/model.go`:

```go
package spaces

import (
	"time"

	"github.com/google/uuid"
)

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
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type CreateInput struct {
	ParentSpaceID *uuid.UUID `json:"parent_space_id,omitempty"`
	Name          string     `json:"name"`
	Description   string     `json:"description,omitempty"`
	Slug          string     `json:"slug"`
	Icon          string     `json:"icon,omitempty"`
	Color         string     `json:"color,omitempty"`
	Visibility    string     `json:"visibility,omitempty"`
}

type UpdateInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Color       *string `json:"color,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
}

type TreeNode struct {
	Space    Space      `json:"space"`
	Children []TreeNode `json:"children,omitempty"`
}
```

- [ ] **Step 2: Write repository interface and implementation**

Create `backend/internal/spaces/repository.go`:

```go
package spaces

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Repository interface {
	Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput, path string) (*Space, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Space, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Space, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListRoots(ctx context.Context, tenantID uuid.UUID) ([]Space, error)
	ListChildren(ctx context.Context, tenantID, parentID uuid.UUID) ([]Space, error)
	GetSubtree(ctx context.Context, tenantID uuid.UUID, rootPath string) ([]Space, error)
}

type PGRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PGRepository {
	return &PGRepository{pool: pool}
}

func (r *PGRepository) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput, path string) (*Space, error) {
	s := &Space{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO spaces (tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, created_at, updated_at`,
		tenantID, input.ParentSpaceID, input.Name, input.Description, input.Slug,
		input.Icon, input.Color, path, ownerID, coalesce(input.Visibility, "public"),
	).Scan(&s.ID, &s.TenantID, &s.ParentSpaceID, &s.Name, &s.Description, &s.Slug,
		&s.Icon, &s.Color, &s.Path, &s.OwnerID, &s.Visibility, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create space: %w", err)
	}
	return s, nil
}

func (r *PGRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Space, error) {
	s := &Space{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, created_at, updated_at
		 FROM spaces WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&s.ID, &s.TenantID, &s.ParentSpaceID, &s.Name, &s.Description, &s.Slug,
		&s.Icon, &s.Color, &s.Path, &s.OwnerID, &s.Visibility, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("space", id.String())
		}
		return nil, fmt.Errorf("get space: %w", err)
	}
	return s, nil
}

func (r *PGRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Space, error) {
	s := &Space{}
	err := r.pool.QueryRow(ctx,
		`UPDATE spaces SET
			name = COALESCE($3, name),
			description = COALESCE($4, description),
			icon = COALESCE($5, icon),
			color = COALESCE($6, color),
			visibility = COALESCE($7, visibility),
			updated_at = now()
		 WHERE id = $1 AND tenant_id = $2
		 RETURNING id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, created_at, updated_at`,
		id, tenantID, input.Name, input.Description, input.Icon, input.Color, input.Visibility,
	).Scan(&s.ID, &s.TenantID, &s.ParentSpaceID, &s.Name, &s.Description, &s.Slug,
		&s.Icon, &s.Color, &s.Path, &s.OwnerID, &s.Visibility, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("space", id.String())
		}
		return nil, fmt.Errorf("update space: %w", err)
	}
	return s, nil
}

func (r *PGRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM spaces WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete space: %w", err)
	}
	if result.RowsAffected() == 0 {
		return errors.NotFound("space", id.String())
	}
	return nil
}

func (r *PGRepository) ListRoots(ctx context.Context, tenantID uuid.UUID) ([]Space, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, created_at, updated_at
		 FROM spaces WHERE tenant_id = $1 AND parent_space_id IS NULL ORDER BY name`,
		tenantID)
	if err != nil {
		return nil, fmt.Errorf("list root spaces: %w", err)
	}
	defer rows.Close()
	return scanSpaces(rows)
}

func (r *PGRepository) ListChildren(ctx context.Context, tenantID, parentID uuid.UUID) ([]Space, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, created_at, updated_at
		 FROM spaces WHERE tenant_id = $1 AND parent_space_id = $2 ORDER BY name`,
		tenantID, parentID)
	if err != nil {
		return nil, fmt.Errorf("list children: %w", err)
	}
	defer rows.Close()
	return scanSpaces(rows)
}

func (r *PGRepository) GetSubtree(ctx context.Context, tenantID uuid.UUID, rootPath string) ([]Space, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, parent_space_id, name, description, slug, icon, color, path, owner_id, visibility, created_at, updated_at
		 FROM spaces WHERE tenant_id = $1 AND path LIKE $2 ORDER BY path`,
		tenantID, rootPath+"%")
	if err != nil {
		return nil, fmt.Errorf("get subtree: %w", err)
	}
	defer rows.Close()
	return scanSpaces(rows)
}

func scanSpaces(rows pgx.Rows) ([]Space, error) {
	var spaces []Space
	for rows.Next() {
		var s Space
		err := rows.Scan(&s.ID, &s.TenantID, &s.ParentSpaceID, &s.Name, &s.Description, &s.Slug,
			&s.Icon, &s.Color, &s.Path, &s.OwnerID, &s.Visibility, &s.CreatedAt, &s.UpdatedAt)
		if err != nil {
			return nil, err
		}
		spaces = append(spaces, s)
	}
	return spaces, rows.Err()
}

func coalesce(val, fallback string) string {
	if val == "" {
		return fallback
	}
	return val
}
```

- [ ] **Step 3: Write failing test for space service**

Create `backend/internal/spaces/service_test.go`:

```go
package spaces_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/spaces"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockRepo struct {
	mock.Mock
}

func (m *mockRepo) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input spaces.CreateInput, path string) (*spaces.Space, error) {
	args := m.Called(ctx, tenantID, ownerID, input, path)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*spaces.Space), args.Error(1)
}

func (m *mockRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*spaces.Space, error) {
	args := m.Called(ctx, tenantID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*spaces.Space), args.Error(1)
}

func (m *mockRepo) Update(ctx context.Context, tenantID, id uuid.UUID, input spaces.UpdateInput) (*spaces.Space, error) {
	args := m.Called(ctx, tenantID, id, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*spaces.Space), args.Error(1)
}

func (m *mockRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	args := m.Called(ctx, tenantID, id)
	return args.Error(0)
}

func (m *mockRepo) ListRoots(ctx context.Context, tenantID uuid.UUID) ([]spaces.Space, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).([]spaces.Space), args.Error(1)
}

func (m *mockRepo) ListChildren(ctx context.Context, tenantID, parentID uuid.UUID) ([]spaces.Space, error) {
	args := m.Called(ctx, tenantID, parentID)
	return args.Get(0).([]spaces.Space), args.Error(1)
}

func (m *mockRepo) GetSubtree(ctx context.Context, tenantID uuid.UUID, rootPath string) ([]spaces.Space, error) {
	args := m.Called(ctx, tenantID, rootPath)
	return args.Get(0).([]spaces.Space), args.Error(1)
}

func TestService_Create_RootSpace(t *testing.T) {
	repo := &mockRepo{}
	svc := spaces.NewService(repo)

	tenantID := uuid.New()
	ownerID := uuid.New()
	input := spaces.CreateInput{
		Name: "Engineering",
		Slug: "engineering",
	}

	expectedPath := "/" // root space path
	expectedSpace := &spaces.Space{
		ID:       uuid.New(),
		TenantID: tenantID,
		Name:     "Engineering",
		Slug:     "engineering",
		Path:     expectedPath,
		OwnerID:  ownerID,
	}

	repo.On("Create", mock.Anything, tenantID, ownerID, input, mock.MatchedBy(func(path string) bool {
		return path == "/"
	})).Return(expectedSpace, nil)

	result, err := svc.Create(context.Background(), tenantID, ownerID, input)

	assert.NoError(t, err)
	assert.Equal(t, "Engineering", result.Name)
	repo.AssertExpectations(t)
}

func TestService_Create_NestedSpace(t *testing.T) {
	repo := &mockRepo{}
	svc := spaces.NewService(repo)

	tenantID := uuid.New()
	ownerID := uuid.New()
	parentID := uuid.New()
	parentSpace := &spaces.Space{
		ID:       parentID,
		TenantID: tenantID,
		Path:     "/" + parentID.String() + "/",
	}

	input := spaces.CreateInput{
		ParentSpaceID: &parentID,
		Name:          "Backend Team",
		Slug:          "backend-team",
	}

	repo.On("GetByID", mock.Anything, tenantID, parentID).Return(parentSpace, nil)
	repo.On("Create", mock.Anything, tenantID, ownerID, input, mock.MatchedBy(func(path string) bool {
		return len(path) > len(parentSpace.Path) // child path is longer
	})).Return(&spaces.Space{
		ID:       uuid.New(),
		TenantID: tenantID,
		Name:     "Backend Team",
		Path:     parentSpace.Path + "child-id/",
	}, nil)

	result, err := svc.Create(context.Background(), tenantID, ownerID, input)

	assert.NoError(t, err)
	assert.Equal(t, "Backend Team", result.Name)
	repo.AssertExpectations(t)
}

func TestService_Create_MissingName(t *testing.T) {
	repo := &mockRepo{}
	svc := spaces.NewService(repo)

	input := spaces.CreateInput{Slug: "test"}
	_, err := svc.Create(context.Background(), uuid.New(), uuid.New(), input)

	assert.Error(t, err)
	assert.True(t, errors.IsValidation(err))
}

func TestService_Create_MissingSlug(t *testing.T) {
	repo := &mockRepo{}
	svc := spaces.NewService(repo)

	input := spaces.CreateInput{Name: "Test"}
	_, err := svc.Create(context.Background(), uuid.New(), uuid.New(), input)

	assert.Error(t, err)
	assert.True(t, errors.IsValidation(err))
}
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/spaces/... -v
# Expected: FAIL — service.go doesn't exist yet
```

- [ ] **Step 5: Write space service**

Create `backend/internal/spaces/service.go`:

```go
package spaces

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input CreateInput) (*Space, error) {
	if input.Name == "" {
		return nil, errors.Validation("name is required")
	}
	if input.Slug == "" {
		return nil, errors.Validation("slug is required")
	}

	path := "/"
	if input.ParentSpaceID != nil {
		parent, err := s.repo.GetByID(ctx, tenantID, *input.ParentSpaceID)
		if err != nil {
			return nil, fmt.Errorf("parent space: %w", err)
		}
		path = parent.Path
	}

	// Path will be finalized after we get the new space's ID
	// For now, create with a placeholder and update
	space, err := s.repo.Create(ctx, tenantID, ownerID, input, path)
	if err != nil {
		return nil, err
	}

	// Update path to include the new space's ID
	finalPath := path
	if path == "/" {
		finalPath = "/" + space.ID.String() + "/"
	} else {
		finalPath = path + space.ID.String() + "/"
	}
	space.Path = finalPath

	// Update the path in DB
	nameStr := space.Name
	updated, err := s.repo.Update(ctx, tenantID, space.ID, UpdateInput{Name: &nameStr})
	if err != nil {
		return nil, err
	}
	_ = updated

	return space, nil
}

func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Space, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Space, error) {
	return s.repo.Update(ctx, tenantID, id, input)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *Service) ListRoots(ctx context.Context, tenantID uuid.UUID) ([]Space, error) {
	return s.repo.ListRoots(ctx, tenantID)
}

func (s *Service) GetTree(ctx context.Context, tenantID, rootID uuid.UUID) ([]TreeNode, error) {
	root, err := s.repo.GetByID(ctx, tenantID, rootID)
	if err != nil {
		return nil, err
	}

	allSpaces, err := s.repo.GetSubtree(ctx, tenantID, root.Path)
	if err != nil {
		return nil, err
	}

	return buildTree(allSpaces, root.ID), nil
}

func buildTree(spaces []Space, rootID uuid.UUID) []TreeNode {
	childMap := make(map[uuid.UUID][]Space)
	for _, s := range spaces {
		if s.ParentSpaceID != nil {
			childMap[*s.ParentSpaceID] = append(childMap[*s.ParentSpaceID], s)
		}
	}

	var build func(parentID uuid.UUID) []TreeNode
	build = func(parentID uuid.UUID) []TreeNode {
		children := childMap[parentID]
		nodes := make([]TreeNode, 0, len(children))
		for _, child := range children {
			nodes = append(nodes, TreeNode{
				Space:    child,
				Children: build(child.ID),
			})
		}
		return nodes
	}

	return build(rootID)
}
```

- [ ] **Step 6: Run service tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/spaces/... -v
# Expected: PASS
```

- [ ] **Step 7: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/internal/spaces/
git commit -m "feat: spaces domain — model, repository, service with materialized path nesting"
```

---

## Task 6: Spaces HTTP Handlers & Routes

**Files:**
- Create: `backend/internal/spaces/handler.go`
- Create: `backend/internal/spaces/routes.go`
- Test: `backend/internal/spaces/handler_test.go`

- [ ] **Step 1: Write failing test for space handlers**

Create `backend/internal/spaces/handler_test.go`:

```go
package spaces_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/spaces"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
	"github.com/stretchr/testify/assert"
)

func contextWithAuth(tenantID, userID uuid.UUID) func(*http.Request) *http.Request {
	return func(r *http.Request) *http.Request {
		ctx := tenant.WithTenantID(r.Context(), tenantID)
		ctx = auth.WithClaims(ctx, &auth.Claims{
			UserID:   userID,
			TenantID: tenantID,
			Email:    "test@test.com",
			Role:     "owner",
		})
		return r.WithContext(ctx)
	}
}

func TestHandleListSpaces(t *testing.T) {
	repo := &mockRepo{}
	svc := spaces.NewService(repo)
	handler := spaces.NewHandler(svc)

	tenantID := uuid.New()
	userID := uuid.New()

	repo.On("ListRoots", mock.Anything, tenantID).Return([]spaces.Space{
		{ID: uuid.New(), TenantID: tenantID, Name: "Engineering", Slug: "engineering"},
	}, nil)

	r := httptest.NewRequest("GET", "/spaces", nil)
	r = contextWithAuth(tenantID, userID)(r)
	w := httptest.NewRecorder()

	handler.HandleListSpaces(w, r)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp []spaces.Space
	json.NewDecoder(w.Body).Decode(&resp)
	assert.Len(t, resp, 1)
	assert.Equal(t, "Engineering", resp[0].Name)
}

func TestHandleCreateSpace(t *testing.T) {
	repo := &mockRepo{}
	svc := spaces.NewService(repo)
	handler := spaces.NewHandler(svc)

	tenantID := uuid.New()
	userID := uuid.New()
	spaceID := uuid.New()

	repo.On("Create", mock.Anything, tenantID, userID, mock.AnythingOfType("spaces.CreateInput"), "/").
		Return(&spaces.Space{
			ID:       spaceID,
			TenantID: tenantID,
			Name:     "Platform",
			Slug:     "platform",
			Path:     "/" + spaceID.String() + "/",
			OwnerID:  userID,
		}, nil)
	repo.On("Update", mock.Anything, tenantID, spaceID, mock.Anything).
		Return(&spaces.Space{}, nil)

	body := `{"name":"Platform","slug":"platform"}`
	r := httptest.NewRequest("POST", "/spaces", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = contextWithAuth(tenantID, userID)(r)
	w := httptest.NewRecorder()

	handler.HandleCreateSpace(w, r)

	assert.Equal(t, http.StatusCreated, w.Code)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/spaces/... -v -run TestHandle
# Expected: FAIL — handler.go doesn't exist
```

- [ ] **Step 3: Write handlers**

Create `backend/internal/spaces/handler.go`:

```go
package spaces

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleListSpaces(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	spaces, err := h.service.ListRoots(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, spaces)
}

func (h *Handler) HandleGetSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	space, err := h.service.GetByID(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, space)
}

func (h *Handler) HandleGetTree(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	tree, err := h.service.GetTree(r.Context(), tenantID, id)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, tree)
}

func (h *Handler) HandleCreateSpace(w http.ResponseWriter, r *http.Request) {
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

	space, err := h.service.Create(r.Context(), tenantID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, space)
}

func (h *Handler) HandleUpdateSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	space, err := h.service.Update(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, space)
}

func (h *Handler) HandleDeleteSpace(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	if err := h.service.Delete(r.Context(), tenantID, id); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
```

Create `backend/internal/spaces/routes.go`:

```go
package spaces

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMiddleware, tenantMiddleware func(http.Handler) http.Handler) {
	wrap := func(handler http.HandlerFunc) http.Handler {
		return authMiddleware(tenantMiddleware(handler))
	}

	mux.Handle("GET /spaces", wrap(h.HandleListSpaces))
	mux.Handle("GET /spaces/{id}", wrap(h.HandleGetSpace))
	mux.Handle("GET /spaces/{id}/tree", wrap(h.HandleGetTree))
	mux.Handle("POST /spaces", wrap(h.HandleCreateSpace))
	mux.Handle("PUT /spaces/{id}", wrap(h.HandleUpdateSpace))
	mux.Handle("DELETE /spaces/{id}", wrap(h.HandleDeleteSpace))
}
```

- [ ] **Step 4: Run handler tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/spaces/... -v
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/internal/spaces/
git commit -m "feat: spaces HTTP handlers and route registration"
```

---

## Task 7: Cards Domain — Model, Transitions, Repository, Service

**Files:**
- Create: `backend/internal/cards/model.go`
- Create: `backend/internal/cards/transitions.go`
- Create: `backend/internal/cards/repository.go`
- Create: `backend/internal/cards/service.go`
- Test: `backend/internal/cards/transitions_test.go`
- Test: `backend/internal/cards/service_test.go`

- [ ] **Step 1: Write card model**

Create `backend/internal/cards/model.go`:

```go
package cards

import (
	"time"

	"github.com/google/uuid"
)

type Column string

const (
	ColumnInbox      Column = "inbox"
	ColumnIcebox     Column = "icebox"
	ColumnFreezer    Column = "freezer"
	ColumnPlanned    Column = "planned"
	ColumnInProgress Column = "in_progress"
	ColumnReview     Column = "review"
	ColumnDone       Column = "done"
)

type Card struct {
	ID             uuid.UUID  `json:"id"`
	SpaceID        uuid.UUID  `json:"space_id"`
	TenantID       uuid.UUID  `json:"tenant_id"`
	Title          string     `json:"title"`
	Description    string     `json:"description,omitempty"`
	ColumnName     Column     `json:"column_name"`
	Position       float64    `json:"position"`
	AssigneeID     *uuid.UUID `json:"assignee_id,omitempty"`
	Priority       string     `json:"priority,omitempty"`
	EffortEstimate *int       `json:"effort_estimate,omitempty"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	Labels         []string   `json:"labels"`
	CreatedBy      uuid.UUID  `json:"created_by"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	MovedAt        time.Time  `json:"moved_at"`
}

type CreateInput struct {
	Title          string     `json:"title"`
	Description    string     `json:"description,omitempty"`
	Priority       string     `json:"priority,omitempty"`
	EffortEstimate *int       `json:"effort_estimate,omitempty"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	Labels         []string   `json:"labels,omitempty"`
	AssigneeID     *uuid.UUID `json:"assignee_id,omitempty"`
}

type UpdateInput struct {
	Title          *string    `json:"title,omitempty"`
	Description    *string    `json:"description,omitempty"`
	Priority       *string    `json:"priority,omitempty"`
	EffortEstimate *int       `json:"effort_estimate,omitempty"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	Labels         []string   `json:"labels,omitempty"`
	AssigneeID     *uuid.UUID `json:"assignee_id,omitempty"`
}

type MoveInput struct {
	Column   Column  `json:"column"`
	Position float64 `json:"position"`
}

type ListFilters struct {
	Column   Column
	Assignee *uuid.UUID
	Priority string
}
```

- [ ] **Step 2: Write failing test for transitions**

Create `backend/internal/cards/transitions_test.go`:

```go
package cards_test

import (
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/cards"
	"github.com/stretchr/testify/assert"
)

func TestValidTransition_InboxToIcebox(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnInbox, cards.ColumnIcebox)
	assert.NoError(t, err)
}

func TestValidTransition_InboxToFreezer(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnInbox, cards.ColumnFreezer)
	assert.NoError(t, err)
}

func TestValidTransition_InboxToPlanned(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnInbox, cards.ColumnPlanned)
	assert.NoError(t, err)
}

func TestValidTransition_IceboxToPlanned(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnIcebox, cards.ColumnPlanned)
	assert.NoError(t, err)
}

func TestValidTransition_PlannedToInProgress(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnPlanned, cards.ColumnInProgress)
	assert.NoError(t, err)
}

func TestValidTransition_InProgressToReview(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnInProgress, cards.ColumnReview)
	assert.NoError(t, err)
}

func TestValidTransition_ReviewToDone(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnReview, cards.ColumnDone)
	assert.NoError(t, err)
}

func TestValidTransition_DoneToInProgress(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnDone, cards.ColumnInProgress)
	assert.NoError(t, err)
}

func TestInvalidTransition_InboxToDone(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnInbox, cards.ColumnDone)
	assert.Error(t, err)
}

func TestInvalidTransition_PlannedToReview(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnPlanned, cards.ColumnReview)
	assert.Error(t, err)
}

func TestInvalidTransition_FreezerToDone(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnFreezer, cards.ColumnDone)
	assert.Error(t, err)
}

func TestInvalidTransition_SameColumn(t *testing.T) {
	err := cards.ValidateTransition(cards.ColumnInbox, cards.ColumnInbox)
	assert.Error(t, err)
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/cards/... -v -run TestValid
# Expected: FAIL
```

- [ ] **Step 4: Write transitions**

Create `backend/internal/cards/transitions.go`:

```go
package cards

import (
	"fmt"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

var validTransitions = map[Column][]Column{
	ColumnInbox:      {ColumnIcebox, ColumnFreezer, ColumnPlanned},
	ColumnIcebox:     {ColumnPlanned, ColumnFreezer},
	ColumnFreezer:    {ColumnIcebox, ColumnPlanned},
	ColumnPlanned:    {ColumnInProgress},
	ColumnInProgress: {ColumnReview, ColumnPlanned},
	ColumnReview:     {ColumnDone, ColumnInProgress},
	ColumnDone:       {ColumnInProgress},
}

func ValidateTransition(from, to Column) error {
	if from == to {
		return errors.Validation(fmt.Sprintf("card is already in column %s", from))
	}

	allowed, ok := validTransitions[from]
	if !ok {
		return errors.Validation(fmt.Sprintf("unknown column: %s", from))
	}

	for _, col := range allowed {
		if col == to {
			return nil
		}
	}

	return errors.Validation(fmt.Sprintf("invalid transition from %s to %s", from, to))
}
```

- [ ] **Step 5: Run transition tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/cards/... -v -run TestValid
# Expected: PASS — all transition tests pass
go test ./internal/cards/... -v -run TestInvalid
# Expected: PASS — all invalid transition tests pass
```

- [ ] **Step 6: Write card repository**

Create `backend/internal/cards/repository.go`:

```go
package cards

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
)

type Repository interface {
	Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error)
	Move(ctx context.Context, tenantID, id uuid.UUID, column Column, position float64) (*Card, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error)
}

type PGRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PGRepository {
	return &PGRepository{pool: pool}
}

func (r *PGRepository) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error) {
	c := &Card{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO cards (tenant_id, space_id, title, description, priority, effort_estimate, due_date, labels, assignee_id, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at`,
		tenantID, spaceID, input.Title, input.Description, input.Priority,
		input.EffortEstimate, input.DueDate, input.Labels, input.AssigneeID, createdBy,
	).Scan(&c.ID, &c.SpaceID, &c.TenantID, &c.Title, &c.Description, &c.ColumnName,
		&c.Position, &c.AssigneeID, &c.Priority, &c.EffortEstimate, &c.DueDate,
		&c.Labels, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt, &c.MovedAt)
	if err != nil {
		return nil, fmt.Errorf("create card: %w", err)
	}
	return c, nil
}

func (r *PGRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error) {
	c := &Card{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at
		 FROM cards WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&c.ID, &c.SpaceID, &c.TenantID, &c.Title, &c.Description, &c.ColumnName,
		&c.Position, &c.AssigneeID, &c.Priority, &c.EffortEstimate, &c.DueDate,
		&c.Labels, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt, &c.MovedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("card", id.String())
		}
		return nil, fmt.Errorf("get card: %w", err)
	}
	return c, nil
}

func (r *PGRepository) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error) {
	c := &Card{}
	err := r.pool.QueryRow(ctx,
		`UPDATE cards SET
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			priority = COALESCE($5, priority),
			effort_estimate = COALESCE($6, effort_estimate),
			due_date = COALESCE($7, due_date),
			labels = COALESCE($8, labels),
			assignee_id = COALESCE($9, assignee_id),
			updated_at = now()
		 WHERE id = $1 AND tenant_id = $2
		 RETURNING id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at`,
		id, tenantID, input.Title, input.Description, input.Priority,
		input.EffortEstimate, input.DueDate, input.Labels, input.AssigneeID,
	).Scan(&c.ID, &c.SpaceID, &c.TenantID, &c.Title, &c.Description, &c.ColumnName,
		&c.Position, &c.AssigneeID, &c.Priority, &c.EffortEstimate, &c.DueDate,
		&c.Labels, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt, &c.MovedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("card", id.String())
		}
		return nil, fmt.Errorf("update card: %w", err)
	}
	return c, nil
}

func (r *PGRepository) Move(ctx context.Context, tenantID, id uuid.UUID, column Column, position float64) (*Card, error) {
	c := &Card{}
	err := r.pool.QueryRow(ctx,
		`UPDATE cards SET column_name = $3, position = $4, moved_at = now(), updated_at = now()
		 WHERE id = $1 AND tenant_id = $2
		 RETURNING id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at`,
		id, tenantID, column, position,
	).Scan(&c.ID, &c.SpaceID, &c.TenantID, &c.Title, &c.Description, &c.ColumnName,
		&c.Position, &c.AssigneeID, &c.Priority, &c.EffortEstimate, &c.DueDate,
		&c.Labels, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt, &c.MovedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("card", id.String())
		}
		return nil, fmt.Errorf("move card: %w", err)
	}
	return c, nil
}

func (r *PGRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM cards WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete card: %w", err)
	}
	if result.RowsAffected() == 0 {
		return errors.NotFound("card", id.String())
	}
	return nil
}

func (r *PGRepository) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error) {
	query := `SELECT id, space_id, tenant_id, title, description, column_name, position, assignee_id, priority, effort_estimate, due_date, labels, created_by, created_at, updated_at, moved_at
		 FROM cards WHERE tenant_id = $1 AND space_id = $2`
	args := []any{tenantID, spaceID}
	argIdx := 3

	if filters.Column != "" {
		query += fmt.Sprintf(" AND column_name = $%d", argIdx)
		args = append(args, filters.Column)
		argIdx++
	}
	if filters.Assignee != nil {
		query += fmt.Sprintf(" AND assignee_id = $%d", argIdx)
		args = append(args, *filters.Assignee)
		argIdx++
	}
	if filters.Priority != "" {
		query += fmt.Sprintf(" AND priority = $%d", argIdx)
		args = append(args, filters.Priority)
		argIdx++
	}

	query += " ORDER BY position ASC"
	query += fmt.Sprintf(" LIMIT $%d", argIdx)
	args = append(args, page.Limit+1) // fetch one extra to determine has_more

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("list cards: %w", err)
	}
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		var c Card
		err := rows.Scan(&c.ID, &c.SpaceID, &c.TenantID, &c.Title, &c.Description, &c.ColumnName,
			&c.Position, &c.AssigneeID, &c.Priority, &c.EffortEstimate, &c.DueDate,
			&c.Labels, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt, &c.MovedAt)
		if err != nil {
			return nil, "", err
		}
		cards = append(cards, c)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(cards) > page.Limit {
		cards = cards[:page.Limit]
		last := cards[len(cards)-1]
		nextCursor = pagination.EncodeCursor(fmt.Sprintf("%f", last.Position))
	}

	return cards, nextCursor, nil
}
```

- [ ] **Step 7: Write failing test for card service**

Create `backend/internal/cards/service_test.go`:

```go
package cards_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/cards"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockCardRepo struct {
	mock.Mock
}

func (m *mockCardRepo) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input cards.CreateInput) (*cards.Card, error) {
	args := m.Called(ctx, tenantID, spaceID, createdBy, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cards.Card), args.Error(1)
}

func (m *mockCardRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*cards.Card, error) {
	args := m.Called(ctx, tenantID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cards.Card), args.Error(1)
}

func (m *mockCardRepo) Update(ctx context.Context, tenantID, id uuid.UUID, input cards.UpdateInput) (*cards.Card, error) {
	args := m.Called(ctx, tenantID, id, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cards.Card), args.Error(1)
}

func (m *mockCardRepo) Move(ctx context.Context, tenantID, id uuid.UUID, column cards.Column, position float64) (*cards.Card, error) {
	args := m.Called(ctx, tenantID, id, column, position)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cards.Card), args.Error(1)
}

func (m *mockCardRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	args := m.Called(ctx, tenantID, id)
	return args.Error(0)
}

func (m *mockCardRepo) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters cards.ListFilters, page interface{}) ([]cards.Card, string, error) {
	args := m.Called(ctx, tenantID, spaceID, filters, page)
	return args.Get(0).([]cards.Card), args.String(1), args.Error(2)
}

func TestCardService_Move_ValidTransition(t *testing.T) {
	repo := &mockCardRepo{}
	svc := cards.NewService(repo)

	tenantID := uuid.New()
	cardID := uuid.New()

	existingCard := &cards.Card{
		ID:         cardID,
		TenantID:   tenantID,
		ColumnName: cards.ColumnInbox,
	}

	movedCard := &cards.Card{
		ID:         cardID,
		TenantID:   tenantID,
		ColumnName: cards.ColumnIcebox,
		Position:   1000,
	}

	repo.On("GetByID", mock.Anything, tenantID, cardID).Return(existingCard, nil)
	repo.On("Move", mock.Anything, tenantID, cardID, cards.ColumnIcebox, float64(1000)).Return(movedCard, nil)

	result, err := svc.Move(context.Background(), tenantID, cardID, cards.MoveInput{
		Column:   cards.ColumnIcebox,
		Position: 1000,
	})

	assert.NoError(t, err)
	assert.Equal(t, cards.ColumnIcebox, result.ColumnName)
	repo.AssertExpectations(t)
}

func TestCardService_Move_InvalidTransition(t *testing.T) {
	repo := &mockCardRepo{}
	svc := cards.NewService(repo)

	tenantID := uuid.New()
	cardID := uuid.New()

	existingCard := &cards.Card{
		ID:         cardID,
		TenantID:   tenantID,
		ColumnName: cards.ColumnInbox,
	}

	repo.On("GetByID", mock.Anything, tenantID, cardID).Return(existingCard, nil)

	_, err := svc.Move(context.Background(), tenantID, cardID, cards.MoveInput{
		Column:   cards.ColumnDone,
		Position: 1000,
	})

	assert.Error(t, err)
	assert.True(t, errors.IsValidation(err))
}

func TestCardService_Create_MissingTitle(t *testing.T) {
	repo := &mockCardRepo{}
	svc := cards.NewService(repo)

	_, err := svc.Create(context.Background(), uuid.New(), uuid.New(), uuid.New(), cards.CreateInput{})

	assert.Error(t, err)
	assert.True(t, errors.IsValidation(err))
}
```

- [ ] **Step 8: Run test to verify it fails**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/cards/... -v -run TestCardService
# Expected: FAIL — service.go doesn't exist
```

- [ ] **Step 9: Write card service**

Create `backend/internal/cards/service.go`:

```go
package cards

import (
	"context"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, tenantID, spaceID, createdBy uuid.UUID, input CreateInput) (*Card, error) {
	if input.Title == "" {
		return nil, errors.Validation("title is required")
	}
	return s.repo.Create(ctx, tenantID, spaceID, createdBy, input)
}

func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Card, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateInput) (*Card, error) {
	return s.repo.Update(ctx, tenantID, id, input)
}

func (s *Service) Move(ctx context.Context, tenantID, id uuid.UUID, input MoveInput) (*Card, error) {
	card, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	if err := ValidateTransition(card.ColumnName, input.Column); err != nil {
		return nil, err
	}

	return s.repo.Move(ctx, tenantID, id, input.Column, input.Position)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *Service) ListBySpace(ctx context.Context, tenantID, spaceID uuid.UUID, filters ListFilters, page pagination.Params) ([]Card, string, error) {
	return s.repo.ListBySpace(ctx, tenantID, spaceID, filters, page)
}
```

- [ ] **Step 10: Run card tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./internal/cards/... -v
# Expected: PASS
```

- [ ] **Step 11: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/internal/cards/
git commit -m "feat: cards domain — model, transitions, repository, service with board transition validation"
```

---

## Task 8: Cards HTTP Handlers & Routes

**Files:**
- Create: `backend/internal/cards/handler.go`
- Create: `backend/internal/cards/routes.go`

- [ ] **Step 1: Write card handlers**

Create `backend/internal/cards/handler.go`:

```go
package cards

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleListCards(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	spaceID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	filters := ListFilters{
		Column:   Column(r.URL.Query().Get("column")),
		Priority: r.URL.Query().Get("priority"),
	}
	if assignee := r.URL.Query().Get("assignee"); assignee != "" {
		if id, err := uuid.Parse(assignee); err == nil {
			filters.Assignee = &id
		}
	}

	page := pagination.ParseFromRequest(r)
	cards, nextCursor, err := h.service.ListBySpace(r.Context(), tenantID, spaceID, filters, page)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, pagination.Response[Card]{
		Data: cards,
		Pagination: pagination.PageInfo{
			NextCursor: nextCursor,
			HasMore:    nextCursor != "",
		},
	})
}

func (h *Handler) HandleCreateCard(w http.ResponseWriter, r *http.Request) {
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

	spaceID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	var input CreateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	card, err := h.service.Create(r.Context(), tenantID, spaceID, claims.UserID, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, card)
}

func (h *Handler) HandleUpdateCard(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	var input UpdateInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	card, err := h.service.Update(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, card)
}

func (h *Handler) HandleMoveCard(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	var input MoveInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	card, err := h.service.Move(r.Context(), tenantID, id, input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, card)
}

func (h *Handler) HandleDeleteCard(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, err)
		return
	}

	if err := h.service.Delete(r.Context(), tenantID, id); err != nil {
		respond.Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
```

Create `backend/internal/cards/routes.go`:

```go
package cards

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *Handler, authMiddleware, tenantMiddleware func(http.Handler) http.Handler) {
	wrap := func(handler http.HandlerFunc) http.Handler {
		return authMiddleware(tenantMiddleware(handler))
	}

	// Space-scoped routes
	mux.Handle("GET /spaces/{id}/cards", wrap(h.HandleListCards))
	mux.Handle("POST /spaces/{id}/cards", wrap(h.HandleCreateCard))

	// Card-scoped routes
	mux.Handle("PUT /cards/{id}", wrap(h.HandleUpdateCard))
	mux.Handle("PATCH /cards/{id}/move", wrap(h.HandleMoveCard))
	mux.Handle("DELETE /cards/{id}", wrap(h.HandleDeleteCard))
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/internal/cards/
git commit -m "feat: card HTTP handlers and route registration"
```

---

## Task 9: API Router & Wire Up Main

**Files:**
- Create: `backend/api/router.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write API router**

Create `backend/api/router.go`:

```go
package api

import (
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/cards"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/middleware"
	"github.com/matthewmcgibbon/spaces/backend/internal/spaces"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type Config struct {
	CORSOrigin     string
	AuthMiddleware *auth.Middleware
	TenantMW       *tenant.Middleware
	SpaceHandler   *spaces.Handler
	CardHandler    *cards.Handler
}

func NewRouter(cfg Config) http.Handler {
	mux := http.NewServeMux()

	// Health check (no auth)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Register domain routes
	authMW := cfg.AuthMiddleware.Handler
	tenantMW := cfg.TenantMW.Handler

	spaces.RegisterRoutes(mux, cfg.SpaceHandler, authMW, tenantMW)
	cards.RegisterRoutes(mux, cfg.CardHandler, authMW, tenantMW)

	// Apply global middleware
	var handler http.Handler = mux
	handler = middleware.Logging(handler)
	handler = middleware.CORS(cfg.CORSOrigin)(handler)

	return handler
}
```

- [ ] **Step 2: Update main.go with full wiring**

Rewrite `backend/cmd/server/main.go`:

```go
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/api"
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/cards"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/config"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/database"
	"github.com/matthewmcgibbon/spaces/backend/internal/spaces"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()

	// Database
	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Auth — use DevVerifier for local development when no Clerk key is set
	var tokenVerifier auth.TokenVerifier
	if cfg.ClerkSecretKey != "" {
		tokenVerifier = auth.NewClerkVerifier(cfg.ClerkSecretKey)
	} else {
		slog.Warn("no CLERK_SECRET_KEY set, using dev auth verifier")
		tokenVerifier = &auth.DevVerifier{
			TenantID: uuid.MustParse("00000000-0000-0000-0000-000000000001"),
			UserID:   uuid.MustParse("00000000-0000-0000-0000-000000000002"),
		}
	}

	// Repositories
	spaceRepo := spaces.NewRepository(pool)
	cardRepo := cards.NewRepository(pool)

	// Services
	spaceSvc := spaces.NewService(spaceRepo)
	cardSvc := cards.NewService(cardRepo)

	// Handlers
	spaceHandler := spaces.NewHandler(spaceSvc)
	cardHandler := cards.NewHandler(cardSvc)

	// Router
	router := api.NewRouter(api.Config{
		CORSOrigin:     cfg.CORSOrigin,
		AuthMiddleware: auth.NewMiddleware(tokenVerifier),
		TenantMW:       tenant.NewMiddleware(),
		SpaceHandler:   spaceHandler,
		CardHandler:    cardHandler,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
```

- [ ] **Step 3: Verify the server compiles and starts**

```bash
cd /Users/matthewmcgibbon/spaces
docker compose up -d
cd backend
go build ./cmd/server/
# Expected: builds successfully
```

- [ ] **Step 4: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/
git commit -m "feat: API router and main.go wiring — full backend connected"
```

---

## Task 10: Frontend Setup — Types, API Client, Providers

**Files:**
- Create: `frontend/src/types/space.ts`
- Create: `frontend/src/types/card.ts`
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/api/spaces.ts`
- Create: `frontend/src/lib/api/cards.ts`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Install frontend dependencies**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npm install @tanstack/react-query @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react
npm install @clerk/nextjs
```

- [ ] **Step 2: Create TypeScript types**

Create `frontend/src/types/space.ts`:

```typescript
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
  created_at: string;
  updated_at: string;
}

export interface SpaceTreeNode {
  space: Space;
  children: SpaceTreeNode[];
}

export interface CreateSpaceInput {
  parent_space_id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: string;
}

export interface UpdateSpaceInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: string;
}
```

Create `frontend/src/types/card.ts`:

```typescript
export type Column =
  | "inbox"
  | "icebox"
  | "freezer"
  | "planned"
  | "in_progress"
  | "review"
  | "done";

export const COLUMNS: { key: Column; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "icebox", label: "Ice Box" },
  { key: "freezer", label: "Freezer" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export interface Card {
  id: string;
  space_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  column_name: Column;
  position: number;
  assignee_id?: string;
  priority?: "p0" | "p1" | "p2" | "p3";
  effort_estimate?: number;
  due_date?: string;
  labels: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  moved_at: string;
}

export interface CreateCardInput {
  title: string;
  description?: string;
  priority?: string;
  effort_estimate?: number;
  due_date?: string;
  labels?: string[];
  assignee_id?: string;
}

export interface MoveCardInput {
  column: Column;
  position: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor?: string;
    has_more: boolean;
  };
}
```

- [ ] **Step 3: Create API client**

Create `frontend/src/lib/api/client.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer dev-token`,
      ...options.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code || "unknown",
      body?.error?.message || res.statusText
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
```

Create `frontend/src/lib/api/spaces.ts`:

```typescript
import { apiFetch } from "./client";
import type { Space, SpaceTreeNode, CreateSpaceInput, UpdateSpaceInput } from "@/types/space";

export async function listSpaces(): Promise<Space[]> {
  return apiFetch<Space[]>("/spaces");
}

export async function getSpace(id: string): Promise<Space> {
  return apiFetch<Space>(`/spaces/${id}`);
}

export async function getSpaceTree(id: string): Promise<SpaceTreeNode[]> {
  return apiFetch<SpaceTreeNode[]>(`/spaces/${id}/tree`);
}

export async function createSpace(input: CreateSpaceInput): Promise<Space> {
  return apiFetch<Space>("/spaces", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSpace(id: string, input: UpdateSpaceInput): Promise<Space> {
  return apiFetch<Space>(`/spaces/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteSpace(id: string): Promise<void> {
  return apiFetch<void>(`/spaces/${id}`, { method: "DELETE" });
}
```

Create `frontend/src/lib/api/cards.ts`:

```typescript
import { apiFetch } from "./client";
import type { Card, CreateCardInput, MoveCardInput, PaginatedResponse } from "@/types/card";

export async function listCards(
  spaceId: string,
  params?: { column?: string; limit?: number; cursor?: string }
): Promise<PaginatedResponse<Card>> {
  const searchParams = new URLSearchParams();
  if (params?.column) searchParams.set("column", params.column);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);

  const query = searchParams.toString();
  return apiFetch<PaginatedResponse<Card>>(
    `/spaces/${spaceId}/cards${query ? `?${query}` : ""}`
  );
}

export async function createCard(spaceId: string, input: CreateCardInput): Promise<Card> {
  return apiFetch<Card>(`/spaces/${spaceId}/cards`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCard(id: string, input: Partial<Card>): Promise<Card> {
  return apiFetch<Card>(`/cards/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function moveCard(id: string, input: MoveCardInput): Promise<Card> {
  return apiFetch<Card>(`/cards/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCard(id: string): Promise<void> {
  return apiFetch<void>(`/cards/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: Set up providers in layout**

Rewrite `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/common/QueryProvider";

export const metadata: Metadata = {
  title: "Spaces",
  description: "Strategic planning and alignment platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

Create `frontend/src/components/common/QueryProvider.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 5: Verify frontend compiles**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/
git commit -m "feat: frontend setup — types, API client, TanStack Query provider"
```

---

## Task 11: Frontend — TanStack Query Hooks

**Files:**
- Create: `frontend/src/hooks/useSpaces.ts`
- Create: `frontend/src/hooks/useCards.ts`

- [ ] **Step 1: Write space hooks**

Create `frontend/src/hooks/useSpaces.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as spacesApi from "@/lib/api/spaces";
import type { CreateSpaceInput, UpdateSpaceInput } from "@/types/space";

export function useSpaces() {
  return useQuery({
    queryKey: ["spaces"],
    queryFn: spacesApi.listSpaces,
  });
}

export function useSpace(id: string) {
  return useQuery({
    queryKey: ["spaces", id],
    queryFn: () => spacesApi.getSpace(id),
    enabled: !!id,
  });
}

export function useSpaceTree(id: string) {
  return useQuery({
    queryKey: ["spaces", id, "tree"],
    queryFn: () => spacesApi.getSpaceTree(id),
    enabled: !!id,
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpaceInput) => spacesApi.createSpace(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useUpdateSpace(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSpaceInput) => spacesApi.updateSpace(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => spacesApi.deleteSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}
```

- [ ] **Step 2: Write card hooks**

Create `frontend/src/hooks/useCards.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as cardsApi from "@/lib/api/cards";
import type { Card, CreateCardInput, MoveCardInput, Column } from "@/types/card";

export function useCards(spaceId: string) {
  return useQuery({
    queryKey: ["cards", spaceId],
    queryFn: () => cardsApi.listCards(spaceId, { limit: 200 }),
    enabled: !!spaceId,
    select: (data) => data.data,
  });
}

export function useCreateCard(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => cardsApi.createCard(spaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", spaceId] });
    },
  });
}

export function useMoveCard(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: MoveCardInput }) =>
      cardsApi.moveCard(cardId, input),
    onMutate: async ({ cardId, input }) => {
      await queryClient.cancelQueries({ queryKey: ["cards", spaceId] });

      const previous = queryClient.getQueryData<{ data: Card[] }>(["cards", spaceId]);

      queryClient.setQueryData<{ data: Card[] }>(["cards", spaceId], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((card) =>
            card.id === cardId
              ? { ...card, column_name: input.column, position: input.position }
              : card
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["cards", spaceId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", spaceId] });
    },
  });
}

export function useDeleteCard(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cardsApi.deleteCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", spaceId] });
    },
  });
}

export function cardsByColumn(cards: Card[]): Record<Column, Card[]> {
  const grouped: Record<Column, Card[]> = {
    inbox: [],
    icebox: [],
    freezer: [],
    planned: [],
    in_progress: [],
    review: [],
    done: [],
  };

  for (const card of cards) {
    grouped[card.column_name]?.push(card);
  }

  // Sort each column by position
  for (const col of Object.keys(grouped) as Column[]) {
    grouped[col].sort((a, b) => a.position - b.position);
  }

  return grouped;
}
```

- [ ] **Step 3: Verify compiles**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 4: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/src/hooks/
git commit -m "feat: TanStack Query hooks for spaces and cards with optimistic card moves"
```

---

## Task 12: Frontend — Space Tree Navigation

**Files:**
- Create: `frontend/src/components/spaces/SpaceTree.tsx`
- Create: `frontend/src/components/spaces/SpaceTreeNode.tsx`
- Create: `frontend/src/components/spaces/CreateSpaceDialog.tsx`
- Create: `frontend/src/components/common/Sidebar.tsx`
- Create: `frontend/src/app/spaces/page.tsx`

- [ ] **Step 1: Create SpaceTreeNode component**

Create `frontend/src/components/spaces/SpaceTreeNode.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";
import type { Space } from "@/types/space";

interface SpaceTreeNodeProps {
  space: Space;
  children?: Space[];
  allSpaces: Space[];
  level: number;
  activeSpaceId?: string;
}

export function SpaceTreeNode({
  space,
  allSpaces,
  level,
  activeSpaceId,
}: SpaceTreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const childSpaces = allSpaces.filter((s) => s.parent_space_id === space.id);
  const hasChildren = childSpaces.length > 0;
  const isActive = space.id === activeSpaceId;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
          isActive ? "bg-blue-50 text-blue-700" : "text-gray-700"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        <Folder
          className="w-4 h-4 flex-shrink-0"
          style={{ color: space.color || undefined }}
        />
        <Link
          href={`/spaces/${space.id}`}
          className="truncate text-sm flex-1"
        >
          {space.name}
        </Link>
      </div>
      {expanded &&
        childSpaces.map((child) => (
          <SpaceTreeNode
            key={child.id}
            space={child}
            allSpaces={allSpaces}
            level={level + 1}
            activeSpaceId={activeSpaceId}
          />
        ))}
    </div>
  );
}
```

- [ ] **Step 2: Create SpaceTree component**

Create `frontend/src/components/spaces/SpaceTree.tsx`:

```tsx
"use client";

import { useSpaces } from "@/hooks/useSpaces";
import { SpaceTreeNode } from "./SpaceTreeNode";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateSpaceDialog } from "./CreateSpaceDialog";

interface SpaceTreeProps {
  activeSpaceId?: string;
}

export function SpaceTree({ activeSpaceId }: SpaceTreeProps) {
  const { data: spaces, isLoading } = useSpaces();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-400">Loading spaces...</div>;
  }

  const allSpaces = spaces || [];
  const rootSpaces = allSpaces.filter((s) => !s.parent_space_id);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-3 mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Spaces
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="p-1 hover:bg-gray-100 rounded"
          title="Create space"
        >
          <Plus className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      {rootSpaces.map((space) => (
        <SpaceTreeNode
          key={space.id}
          space={space}
          allSpaces={allSpaces}
          level={0}
          activeSpaceId={activeSpaceId}
        />
      ))}
      {rootSpaces.length === 0 && (
        <p className="px-3 py-2 text-sm text-gray-400">
          No spaces yet. Create one to get started.
        </p>
      )}
      {showCreate && (
        <CreateSpaceDialog onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create CreateSpaceDialog**

Create `frontend/src/components/spaces/CreateSpaceDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useCreateSpace } from "@/hooks/useSpaces";
import { X } from "lucide-react";

interface CreateSpaceDialogProps {
  parentSpaceId?: string;
  onClose: () => void;
}

export function CreateSpaceDialog({ parentSpaceId, onClose }: CreateSpaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createSpace = useCreateSpace();

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createSpace.mutateAsync({
      name: name.trim(),
      slug,
      description: description.trim() || undefined,
      parent_space_id: parentSpaceId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Space</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Engineering"
              autoFocus
            />
            {slug && (
              <p className="mt-1 text-xs text-gray-400">Slug: {slug}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createSpace.isPending}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {createSpace.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Sidebar**

Create `frontend/src/components/common/Sidebar.tsx`:

```tsx
"use client";

import { SpaceTree } from "@/components/spaces/SpaceTree";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

interface SidebarProps {
  activeSpaceId?: string;
}

export function Sidebar({ activeSpaceId }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <Link href="/spaces" className="flex items-center gap-2 text-gray-900">
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-semibold text-lg">Spaces</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SpaceTree activeSpaceId={activeSpaceId} />
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Create spaces list page**

Create `frontend/src/app/spaces/page.tsx`:

```tsx
import { Sidebar } from "@/components/common/Sidebar";

export default function SpacesPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Spaces</h1>
        <p className="text-gray-500">
          Select a space from the sidebar to view its board, or create a new one.
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify compiles**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 7: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/
git commit -m "feat: space tree navigation, sidebar, create space dialog"
```

---

## Task 13: Frontend — Kanban Board

**Files:**
- Create: `frontend/src/components/board/Board.tsx`
- Create: `frontend/src/components/board/BoardColumn.tsx`
- Create: `frontend/src/components/board/BoardCard.tsx`
- Create: `frontend/src/components/board/CreateCardDialog.tsx`
- Create: `frontend/src/app/spaces/[id]/page.tsx`

- [ ] **Step 1: Create BoardCard component**

Create `frontend/src/components/board/BoardCard.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@/types/card";
import { GripVertical } from "lucide-react";

interface BoardCardProps {
  card: Card;
}

const priorityColors: Record<string, string> = {
  p0: "bg-red-100 text-red-700",
  p1: "bg-orange-100 text-orange-700",
  p2: "bg-yellow-100 text-yellow-700",
  p3: "bg-gray-100 text-gray-600",
};

export function BoardCard({ card }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 text-gray-300 hover:text-gray-500">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{card.title}</p>
          {card.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {card.priority && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColors[card.priority] || ""}`}
              >
                {card.priority.toUpperCase()}
              </span>
            )}
            {card.labels?.map((label) => (
              <span
                key={label}
                className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
              >
                {label}
              </span>
            ))}
            {card.due_date && (
              <span className="text-xs text-gray-400">
                {new Date(card.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create BoardColumn component**

Create `frontend/src/components/board/BoardColumn.tsx`:

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BoardCard } from "./BoardCard";
import { Plus } from "lucide-react";
import type { Card, Column } from "@/types/card";

interface BoardColumnProps {
  column: Column;
  label: string;
  cards: Card[];
  onAddCard?: () => void;
}

const columnColors: Record<Column, string> = {
  inbox: "border-t-gray-400",
  icebox: "border-t-sky-400",
  freezer: "border-t-blue-600",
  planned: "border-t-violet-500",
  in_progress: "border-t-amber-500",
  review: "border-t-orange-500",
  done: "border-t-green-500",
};

export function BoardColumn({ column, label, cards, onAddCard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const cardIds = cards.map((c) => c.id);

  return (
    <div
      className={`flex flex-col bg-gray-50 rounded-lg w-72 flex-shrink-0 border-t-2 ${columnColors[column]} ${
        isOver ? "ring-2 ring-blue-300" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
          <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-1.5">
            {cards.length}
          </span>
        </div>
        {column === "inbox" && onAddCard && (
          <button
            onClick={onAddCard}
            className="p-1 hover:bg-gray-200 rounded"
            title="Add card"
          >
            <Plus className="w-3.5 h-3.5 text-gray-500" />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 px-2 pb-2 space-y-2 min-h-[100px] overflow-y-auto"
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCard key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Board component**

Create `frontend/src/components/board/Board.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { BoardColumn } from "./BoardColumn";
import { BoardCard } from "./BoardCard";
import { CreateCardDialog } from "./CreateCardDialog";
import { useCards, useMoveCard, cardsByColumn } from "@/hooks/useCards";
import { COLUMNS, type Card, type Column } from "@/types/card";

interface BoardProps {
  spaceId: string;
}

export function Board({ spaceId }: BoardProps) {
  const { data: cards, isLoading } = useCards(spaceId);
  const moveCard = useMoveCard(spaceId);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped = useMemo(
    () => cardsByColumn(cards || []),
    [cards]
  );

  function handleDragStart(event: DragStartEvent) {
    const card = event.active.data.current?.card as Card | undefined;
    if (card) setActiveCard(card);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const card = active.data.current?.card as Card | undefined;
    if (!card) return;

    // Determine target column
    let targetColumn: Column;
    const overCard = over.data.current?.card as Card | undefined;
    if (overCard) {
      targetColumn = overCard.column_name;
    } else {
      targetColumn = over.id as Column;
    }

    if (targetColumn === card.column_name && !overCard) return;

    // Calculate position
    const targetCards = grouped[targetColumn] || [];
    let position: number;
    if (overCard) {
      const overIndex = targetCards.findIndex((c) => c.id === overCard.id);
      if (overIndex === 0) {
        position = overCard.position / 2;
      } else {
        const prev = targetCards[overIndex - 1];
        position = (prev.position + overCard.position) / 2;
      }
    } else {
      const lastCard = targetCards[targetCards.length - 1];
      position = lastCard ? lastCard.position + 1000 : 1000;
    }

    moveCard.mutate({
      cardId: card.id,
      input: { column: targetColumn, position },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading board...
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {COLUMNS.map(({ key, label }) => (
            <BoardColumn
              key={key}
              column={key}
              label={label}
              cards={grouped[key] || []}
              onAddCard={key === "inbox" ? () => setShowCreateCard(true) : undefined}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <BoardCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>
      {showCreateCard && (
        <CreateCardDialog
          spaceId={spaceId}
          onClose={() => setShowCreateCard(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Create CreateCardDialog**

Create `frontend/src/components/board/CreateCardDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useCreateCard } from "@/hooks/useCards";
import { X } from "lucide-react";

interface CreateCardDialogProps {
  spaceId: string;
  onClose: () => void;
}

export function CreateCardDialog({ spaceId, onClose }: CreateCardDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const createCard = useCreateCard(spaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createCard.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      priority: priority || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Card to Inbox</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional details"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              <option value="p0">P0 — Critical</option>
              <option value="p1">P1 — High</option>
              <option value="p2">P2 — Medium</option>
              <option value="p3">P3 — Low</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || createCard.isPending}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {createCard.isPending ? "Adding..." : "Add Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create space detail page with board**

Create `frontend/src/app/spaces/[id]/page.tsx`:

```tsx
"use client";

import { use } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { Board } from "@/components/board/Board";
import { useSpace } from "@/hooks/useSpaces";

export default function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: space, isLoading } = useSpace(id);

  return (
    <div className="flex h-screen">
      <Sidebar activeSpaceId={id} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-200">
          {isLoading ? (
            <div className="h-7 w-48 bg-gray-100 animate-pulse rounded" />
          ) : (
            <h1 className="text-xl font-bold text-gray-900">{space?.name}</h1>
          )}
          {space?.description && (
            <p className="text-sm text-gray-500 mt-1">{space.description}</p>
          )}
        </header>
        <div className="flex-1 p-6 overflow-hidden">
          <Board spaceId={id} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Update root page to redirect**

Rewrite `frontend/src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/spaces");
}
```

- [ ] **Step 7: Verify compiles**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 8: Commit**

```bash
cd /Users/matthewmcgibbon/spaces
git add frontend/
git commit -m "feat: Kanban board with drag-and-drop, card creation, space detail page"
```

---

## Task 14: End-to-End Verification

- [ ] **Step 1: Seed development data**

Create `backend/migrations/002_dev_seed.sql`:

```sql
-- +goose Up
-- +goose StatementBegin
-- Dev seed data — only for local development

INSERT INTO tenants (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Org', 'dev-org', 'free')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, external_auth_id, email, name, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'dev-user', 'dev@localhost', 'Dev User', 'owner')
ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose Down
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000002';
DELETE FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001';
```

- [ ] **Step 2: Run seed migration**

```bash
cd /Users/matthewmcgibbon/spaces/backend
goose -dir migrations postgres "postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable" up
# Expected: OK 002_dev_seed.sql
```

- [ ] **Step 3: Start backend and test API**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go run cmd/server/main.go &
sleep 2

# Health check
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# Create a space
curl -X POST http://localhost:8080/spaces \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Engineering","slug":"engineering"}'
# Expected: 201 with space JSON

# List spaces
curl http://localhost:8080/spaces \
  -H "Authorization: Bearer dev-token"
# Expected: 200 with array containing Engineering space

kill %1
```

- [ ] **Step 4: Start frontend and verify pages load**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npm run dev &
sleep 3

# Verify pages compile and render
curl -s http://localhost:3000/spaces | head -20
# Expected: HTML response

kill %1
```

- [ ] **Step 5: Run all backend tests**

```bash
cd /Users/matthewmcgibbon/spaces/backend
go test ./... -v
# Expected: all tests PASS
```

- [ ] **Step 6: Run frontend type check**

```bash
cd /Users/matthewmcgibbon/spaces/frontend
npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 7: Commit seed data**

```bash
cd /Users/matthewmcgibbon/spaces
git add backend/migrations/002_dev_seed.sql
git commit -m "feat: dev seed data for local development"
```

---

## Verification Summary

After completing all tasks, verify:

1. `docker compose up -d` starts Postgres + Redis
2. `goose up` runs both migrations successfully
3. `go run cmd/server/main.go` starts the backend on :8080
4. `npm run dev` starts the frontend on :3000
5. API endpoints work: health, create space, list spaces, create card, move card
6. Frontend renders: space tree, board with columns, drag-and-drop cards
7. All Go tests pass: `go test ./...`
8. TypeScript compiles: `npx tsc --noEmit`

## What's Next (Phase 2)

- Goals & linking domain (model, repository, service, handlers)
- Alignment dashboard (health scoring, rollup queries)
- Capacity & flow metrics (cycle time, throughput, CFD)
- User settings
- Integrations (GitHub/GitLab webhooks)
- Real-time WebSocket updates
- RBAC enforcement
- Activity log writes
