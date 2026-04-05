# Phase 3: Auth Flows, Tenant Isolation & Integrations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the auth lifecycle (signup, org creation, /auth/me), harden RBAC with proper role management endpoints and frontend, and build the GitHub/GitLab integrations domain with webhook processing and card linking.

**Architecture:** Auth extends the existing `internal/auth/` domain with callback/me handlers and a signup service that creates tenants + users transactionally. RBAC gets admin-facing API endpoints and a frontend member management panel. Integrations is a new `internal/integrations/` domain with OAuth config storage, webhook ingestion, and card link management. Frontend gets org signup pages, member management, and integration setup.

**Tech Stack:** Go stdlib + pgx, Next.js 16 + TanStack Query, Tailwind v4, PostgreSQL 16

---

## Part A: Auth Lifecycle & Org Signup (Tasks 1–5)

### Task 1: Auth Endpoints — /auth/me and Signup Service

**Files:**
- Create: `backend/internal/auth/service.go`
- Create: `backend/internal/auth/handler.go`
- Create: `backend/internal/auth/routes.go`
- Modify: `backend/api/router.go` — add AuthHandler config + route registration
- Modify: `backend/cmd/server/main.go` — wire auth service/handler

- [ ] **Step 1: Write service.go**

Auth service handles user lookup and org+user creation:

```go
package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerrors "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

type SignupInput struct {
	OrgName  string `json:"org_name"`
	OrgSlug  string `json:"org_slug"`
	UserName string `json:"user_name"`
	Email    string `json:"email"`
}

type AuthService struct {
	db       *pgxpool.Pool
	userRepo *Repository
}

func NewAuthService(db *pgxpool.Pool, userRepo *Repository) *AuthService {
	return &AuthService{db: db, userRepo: userRepo}
}

// GetCurrentUser returns the authenticated user from claims.
func (s *AuthService) GetCurrentUser(ctx context.Context, claims *Claims) (*User, error) {
	return s.userRepo.GetByID(ctx, claims.TenantID, claims.UserID)
}

// Signup creates a new tenant and owner user in a single transaction.
func (s *AuthService) Signup(ctx context.Context, input SignupInput) (*User, error) {
	if input.OrgName == "" {
		return nil, domainerrors.Validation("org_name is required")
	}
	if input.OrgSlug == "" {
		return nil, domainerrors.Validation("org_slug is required")
	}
	if input.UserName == "" {
		return nil, domainerrors.Validation("user_name is required")
	}
	if input.Email == "" {
		return nil, domainerrors.Validation("email is required")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Create tenant
	var tenantID uuid.UUID
	err = tx.QueryRow(ctx,
		`INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
		input.OrgName, input.OrgSlug,
	).Scan(&tenantID)
	if err != nil {
		return nil, err
	}

	// Create owner user
	var user User
	err = tx.QueryRow(ctx,
		`INSERT INTO users (tenant_id, external_auth_id, email, name, role)
		 VALUES ($1, $2, $3, $4, 'owner')
		 RETURNING id, tenant_id, external_auth_id, email, name, avatar_url, role, created_at`,
		tenantID, "dev-"+input.Email, input.Email, input.UserName,
	).Scan(&user.ID, &user.TenantID, &user.ExternalAuthID, &user.Email,
		&user.Name, &user.AvatarURL, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &user, nil
}

// InviteUser creates a new user in an existing tenant.
func (s *AuthService) InviteUser(ctx context.Context, tenantID uuid.UUID, name, email, role string) (*User, error) {
	if name == "" {
		return nil, domainerrors.Validation("name is required")
	}
	if email == "" {
		return nil, domainerrors.Validation("email is required")
	}

	var user User
	err := s.db.QueryRow(ctx,
		`INSERT INTO users (tenant_id, external_auth_id, email, name, role)
		 VALUES ($1, $2, $3, $4, COALESCE(NULLIF($5,''), 'member'))
		 RETURNING id, tenant_id, external_auth_id, email, name, avatar_url, role, created_at`,
		tenantID, "dev-"+email, email, name, role,
	).Scan(&user.ID, &user.TenantID, &user.ExternalAuthID, &user.Email,
		&user.Name, &user.AvatarURL, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// ListUsers returns all users in a tenant.
func (s *AuthService) ListUsers(ctx context.Context, tenantID uuid.UUID) ([]User, error) {
	const q = `
		SELECT id, tenant_id, external_auth_id, email, name, avatar_url, role, created_at
		FROM users WHERE tenant_id = $1 ORDER BY name`
	rows, err := s.db.Query(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}
```

Note: `scanUser` already exists in `repository.go` but takes `pgx.Row`. We need to ensure it also works with `pgx.Rows` — since `pgx.Rows` implements the `pgx.Row` interface via each row iteration, the existing `scanUser` should work. Verify during implementation.

- [ ] **Step 2: Write handler.go**

```go
package auth

import (
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

type AuthHandler struct {
	svc *AuthService
}

func NewAuthHandler(svc *AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// HandleMe returns the current authenticated user.
func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	claims, err := FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	user, err := h.svc.GetCurrentUser(r.Context(), claims)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, user)
}

// HandleSignup creates a new org + owner user.
func (h *AuthHandler) HandleSignup(w http.ResponseWriter, r *http.Request) {
	var input SignupInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	user, err := h.svc.Signup(r.Context(), input)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, user)
}

// HandleInviteUser adds a user to the current tenant.
func (h *AuthHandler) HandleInviteUser(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	var input struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}
	user, err := h.svc.InviteUser(r.Context(), tenantID, input.Name, input.Email, input.Role)
	if err != nil {
		respond.Error(w, err)
		return
	}
	respond.JSON(w, http.StatusCreated, user)
}

// HandleListUsers lists all users in the current tenant.
func (h *AuthHandler) HandleListUsers(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}
	users, err := h.svc.ListUsers(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}
	if users == nil {
		users = []User{}
	}
	respond.JSON(w, http.StatusOK, users)
}
```

- [ ] **Step 3: Write routes.go**

```go
package auth

import "net/http"

func RegisterRoutes(mux *http.ServeMux, h *AuthHandler, authMW, tenantMW func(http.Handler) http.Handler, requireAdmin func(http.Handler) http.Handler) {
	authed := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(fn))
	}
	admin := func(fn http.HandlerFunc) http.Handler {
		return authMW(tenantMW(requireAdmin(fn)))
	}

	// Public — no auth required for signup
	mux.HandleFunc("POST /auth/signup", h.HandleSignup)

	// Authenticated
	mux.Handle("GET /auth/me", authed(h.HandleMe))
	mux.Handle("GET /auth/users", authed(h.HandleListUsers))
	mux.Handle("POST /auth/users", admin(h.HandleInviteUser))
}
```

- [ ] **Step 4: Wire into router.go and main.go**

router.go: Add `AuthHandler *auth.AuthHandler` to Config, call `auth.RegisterRoutes(mux, cfg.AuthHandler, authMW, tenantMW, requireAdmin)`

main.go: `authRepo := auth.NewRepository(pool)`, `authSvc := auth.NewAuthService(pool, authRepo)`, `authHandler := auth.NewAuthHandler(authSvc)`

- [ ] **Step 5: Build and test**

```bash
cd backend && go build ./...
curl -s http://localhost:8080/auth/me -H "Authorization: Bearer dev-token"
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: auth endpoints — /auth/me, signup, invite, list users"
```

---

### Task 2: RBAC Management API

**Files:**
- Create: `backend/internal/rbac/handler.go`
- Create: `backend/internal/rbac/routes.go`
- Modify: `backend/api/router.go` — add RBACHandler
- Modify: `backend/cmd/server/main.go` — wire RBAC handler

Expose RBAC management endpoints for admins:
- `GET /spaces/{id}/members` — list role assignments for a space
- `POST /spaces/{id}/members` — assign role to user for space
- `DELETE /role-assignments/{id}` — revoke a role assignment
- `GET /members` — list tenant-level role assignments

- [ ] **Step 1: Write handler.go and routes.go** following existing domain patterns
- [ ] **Step 2: Wire into router and main**
- [ ] **Step 3: Build and test**
- [ ] **Step 4: Commit**

---

### Task 3: Auth Frontend — Types, API, Hooks

**Files:**
- Create: `frontend/src/types/auth.ts`
- Create: `frontend/src/lib/api/auth.ts`
- Create: `frontend/src/hooks/useAuth.ts`

Types: `AuthUser` (id, tenant_id, email, name, avatar_url, role), `SignupInput`, `InviteUserInput`

API: `getMe()`, `signup(input)`, `inviteUser(input)`, `listUsers()`

Hooks: `useCurrentUser()`, `useSignup()`, `useInviteUser()`, `useUsers()`

- [ ] **Step 1: Create all 3 files**
- [ ] **Step 2: Build and commit**

---

### Task 4: Org Signup Page

**Files:**
- Create: `frontend/src/app/signup/page.tsx`

Simple signup form: org name, org slug, your name, your email. Calls `useSignup()`, on success redirects to `/spaces`.

- [ ] **Step 1: Create signup page with form**
- [ ] **Step 2: Build and commit**

---

### Task 5: Member Management Panel

**Files:**
- Create: `frontend/src/components/settings/MembersList.tsx`
- Modify: `frontend/src/app/settings/page.tsx` — add Members section

A "Members" section on the settings page showing:
- List of org members with name, email, role badge
- Invite form: name + email + role select
- Role change dropdown per member (admin only)
- Uses `useUsers()`, `useInviteUser()` hooks

- [ ] **Step 1: Create MembersList component**
- [ ] **Step 2: Add to settings page**
- [ ] **Step 3: Build and commit**

---

## Part B: Integrations (Tasks 6–12)

### Task 6: Integrations Database Migration

**Files:**
- Create: `backend/migrations/007_integrations.sql`

- [ ] **Step 1: Write migration**

```sql
-- +goose Up

CREATE TABLE integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    space_id        UUID REFERENCES spaces(id),
    provider        TEXT NOT NULL
                    CHECK (provider IN ('github', 'gitlab')),
    name            TEXT NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}',
    access_token    TEXT,
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
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    external_type   TEXT NOT NULL
                    CHECK (external_type IN ('pull_request', 'issue', 'branch', 'build', 'commit')),
    external_id     TEXT NOT NULL,
    external_url    TEXT NOT NULL,
    title           TEXT,
    status          TEXT,
    metadata        JSONB DEFAULT '{}',
    last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_links_card ON card_links(card_id);
CREATE INDEX idx_card_links_integration ON card_links(integration_id);
CREATE INDEX idx_card_links_tenant ON card_links(tenant_id);

-- +goose Down
DROP TABLE IF EXISTS card_links;
DROP TABLE IF EXISTS integrations;
```

- [ ] **Step 2: Apply and commit**

---

### Task 7: Integrations Backend — Model & Repository

**Files:**
- Create: `backend/internal/integrations/model.go`
- Create: `backend/internal/integrations/repository.go`

Models: `Integration`, `CardLink`, `CreateIntegrationInput`, `UpdateIntegrationInput`, `CreateCardLinkInput`

Repository: full CRUD for integrations (tenant-scoped), CRUD for card_links, `ListByCard`, `ListByIntegration`, `GetByProvider` (for webhook routing)

- [ ] **Step 1: Write model.go and repository.go**
- [ ] **Step 2: Build and commit**

---

### Task 8: Integrations Backend — Service, Handler, Routes

**Files:**
- Create: `backend/internal/integrations/service.go`
- Create: `backend/internal/integrations/handler.go`
- Create: `backend/internal/integrations/routes.go`
- Modify: `backend/api/router.go` — add IntegrationsHandler
- Modify: `backend/cmd/server/main.go` — wire integrations

Endpoints:
- `GET /integrations` — list tenant integrations
- `POST /integrations` — create integration
- `PUT /integrations/{id}` — update integration
- `DELETE /integrations/{id}` — delete integration
- `GET /cards/{id}/links` — list external links on a card
- `POST /cards/{id}/links` — manually link external resource
- `DELETE /card-links/{id}` — remove link

- [ ] **Step 1: Write service, handler, routes**
- [ ] **Step 2: Wire into router and main**
- [ ] **Step 3: Build and test**
- [ ] **Step 4: Commit**

---

### Task 9: Webhook Handler

**Files:**
- Create: `backend/internal/integrations/webhook.go`
- Modify: `backend/internal/integrations/routes.go` — add webhook route

Webhook endpoint: `POST /webhooks/{provider}`

- Accepts GitHub/GitLab webhook payloads
- For GitHub: parses push, pull_request, and issues events
- Extracts card references from PR/commit descriptions (pattern: `SPACES-<uuid-prefix>` or card title matches)
- Auto-creates card_links when matches found
- Updates card_link status on PR merge/close events
- No auth middleware (webhooks are unauthenticated) — verify via provider signature later

- [ ] **Step 1: Write webhook.go with GitHub event parsing**
- [ ] **Step 2: Add `POST /webhooks/{provider}` route (no auth middleware)**
- [ ] **Step 3: Build and test**
- [ ] **Step 4: Commit**

---

### Task 10: Integrations Frontend — Types, API, Hooks

**Files:**
- Create: `frontend/src/types/integration.ts`
- Create: `frontend/src/lib/api/integrations.ts`
- Create: `frontend/src/hooks/useIntegrations.ts`

Types: `Integration`, `CardLink`, `CreateIntegrationInput`, `CreateCardLinkInput`

API/hooks for all CRUD operations + card link management

- [ ] **Step 1: Create all 3 files**
- [ ] **Step 2: Build and commit**

---

### Task 11: Integration Setup Page

**Files:**
- Create: `frontend/src/app/settings/integrations/page.tsx`
- Modify: `frontend/src/app/settings/page.tsx` — add link to integrations sub-page
- Modify: `frontend/src/components/common/Sidebar.tsx` — add Integrations nav item

Settings sub-page showing:
- List of configured integrations with provider icon, name, status badge
- "Add Integration" form: provider select (GitHub/GitLab), name, repository/org config
- Edit/delete per integration
- Status indicator (active/inactive/error)

- [ ] **Step 1: Create integrations settings page**
- [ ] **Step 2: Add navigation links**
- [ ] **Step 3: Build and commit**

---

### Task 12: Card Links in Card Detail

**Files:**
- Modify: `frontend/src/components/board/CardDetailDialog.tsx` — add "Linked Resources" section
- Create: `frontend/src/hooks/useCardLinks.ts` — hooks for card link CRUD

Add a "Linked Resources" section in CardDetailDialog showing:
- List of linked PRs/issues/builds with status badges and external links
- "Link Resource" button to manually link a PR/issue by URL
- Delete button per link
- Status indicators: open (blue), merged (purple), closed (neutral), passing (green), failing (red)

- [ ] **Step 1: Create useCardLinks hook**
- [ ] **Step 2: Add linked resources section to CardDetailDialog**
- [ ] **Step 3: Build and commit**

---

## Summary

| Part | Tasks | What it delivers |
|------|-------|-----------------|
| A: Auth & RBAC | 1–5 | /auth/me, org signup, user invite, member management, RBAC admin API |
| B: Integrations | 6–12 | GitHub/GitLab integration setup, webhook processing, card linking, UI |
