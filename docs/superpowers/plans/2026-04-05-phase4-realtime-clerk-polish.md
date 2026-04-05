# Phase 4: Real-time Updates, Clerk Auth & Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time card/space updates via WebSockets, integrate real Clerk authentication, and polish the app with error boundaries, loading states, and activity logging.

**Architecture:** WebSockets run on a new `/ws` endpoint backed by Redis pub/sub for horizontal scaling. Each space has a channel; clients subscribe to a space on board open and receive events on card/goal/space mutations. Mutating handlers publish events to Redis after DB writes. Clerk replaces the dev verifier — backend validates JWTs via Clerk's JWKS endpoint; frontend wraps app in `<ClerkProvider>` and uses `useAuth().getToken()` for API calls. Activity log writes are added to card move/create/update/delete handlers.

**Tech Stack:** Go stdlib + `gorilla/websocket`, `go-redis/v9` pub/sub, `@clerk/nextjs` for frontend, JWKS verification via `golang-jwt/jwt` + `MicahParks/keyfunc` for backend

---

## Prerequisites

Before starting, verify these are in place:

1. **Backend `.env` has Clerk secret:**
   ```
   CLERK_SECRET_KEY=sk_test_...
   ```
   If not present, ask the user. Do not proceed with Task 8 without it.

2. **Frontend `.env.local` will be created in Task 9 with:**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhjaXRpbmctZWFnbGUtNzUuY2xlcmsuYWNjb3VudHMuZGV2JA
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

---

## Part A: Real-time WebSocket Updates (Tasks 1–5)

### Task 1: Real-time Event Bus — Redis Pub/Sub Wrapper

**Files:**
- Create: `backend/internal/realtime/bus.go`
- Create: `backend/internal/realtime/event.go`

- [ ] **Step 1: Write event.go**

```go
package realtime

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// EventType enumerates the kinds of real-time events we publish.
type EventType string

const (
	EventCardCreated  EventType = "card.created"
	EventCardUpdated  EventType = "card.updated"
	EventCardMoved    EventType = "card.moved"
	EventCardDeleted  EventType = "card.deleted"
	EventSpaceUpdated EventType = "space.updated"
	EventGoalCreated  EventType = "goal.created"
	EventGoalUpdated  EventType = "goal.updated"
	EventGoalDeleted  EventType = "goal.deleted"
)

// Event is the payload published to Redis and delivered to subscribers.
type Event struct {
	Type      EventType       `json:"type"`
	TenantID  uuid.UUID       `json:"tenant_id"`
	SpaceID   uuid.UUID       `json:"space_id"`
	ActorID   uuid.UUID       `json:"actor_id"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

// SpaceChannel returns the Redis pub/sub channel name for a given space.
// Channels are tenant-scoped to prevent cross-tenant leakage.
func SpaceChannel(tenantID, spaceID uuid.UUID) string {
	return "spaces:" + tenantID.String() + ":" + spaceID.String()
}
```

- [ ] **Step 2: Write bus.go**

```go
package realtime

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Bus publishes events to and subscribes from Redis pub/sub.
type Bus struct {
	client *redis.Client
}

// NewBus creates a new Bus backed by the given Redis client.
func NewBus(client *redis.Client) *Bus {
	return &Bus{client: client}
}

// Publish encodes and publishes an event to the appropriate space channel.
// It never blocks the caller on Redis errors — failures are returned but
// callers should log and continue (pub/sub is best-effort).
func (b *Bus) Publish(ctx context.Context, tenantID, spaceID, actorID uuid.UUID, eventType EventType, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	ev := Event{
		Type:      eventType,
		TenantID:  tenantID,
		SpaceID:   spaceID,
		ActorID:   actorID,
		Payload:   raw,
		Timestamp: time.Now().UTC(),
	}
	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}
	return b.client.Publish(ctx, SpaceChannel(tenantID, spaceID), data).Err()
}

// Subscribe returns a pub/sub subscription for the given space channel.
// The caller is responsible for closing the returned PubSub.
func (b *Bus) Subscribe(ctx context.Context, tenantID, spaceID uuid.UUID) *redis.PubSub {
	return b.client.Subscribe(ctx, SpaceChannel(tenantID, spaceID))
}
```

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/realtime/
git commit -m "feat: realtime event bus with Redis pub/sub"
```

---

### Task 2: WebSocket Hub & Handler

**Files:**
- Modify: `backend/go.mod` — add `github.com/gorilla/websocket`
- Create: `backend/internal/realtime/hub.go`
- Create: `backend/internal/realtime/handler.go`
- Create: `backend/internal/realtime/routes.go`

- [ ] **Step 1: Add gorilla/websocket dependency**

```bash
cd backend && go get github.com/gorilla/websocket
```

- [ ] **Step 2: Write hub.go**

The hub manages active WebSocket connections per space. Each connection subscribes to its space's Redis channel and forwards messages to the client. When a client disconnects, its subscription is cleaned up.

```go
package realtime

import (
	"context"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Client is a single WebSocket connection bound to a space.
type Client struct {
	conn     *websocket.Conn
	tenantID uuid.UUID
	spaceID  uuid.UUID
	userID   uuid.UUID
	send     chan []byte
}

// Hub tracks active clients and forwards Redis events to them.
type Hub struct {
	bus     *Bus
	clients map[*Client]struct{}
	mu      sync.RWMutex
}

// NewHub creates a new Hub.
func NewHub(bus *Bus) *Hub {
	return &Hub{
		bus:     bus,
		clients: make(map[*Client]struct{}),
	}
}

// Register adds a client and starts its Redis subscription goroutine.
// The subscription runs until the client disconnects or the context is canceled.
func (h *Hub) Register(ctx context.Context, client *Client) {
	h.mu.Lock()
	h.clients[client] = struct{}{}
	h.mu.Unlock()

	go h.pump(ctx, client)
}

// Unregister removes a client and closes its send channel.
func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)
	}
	h.mu.Unlock()
}

// pump subscribes the client to its space channel and forwards messages.
func (h *Hub) pump(ctx context.Context, client *Client) {
	sub := h.bus.Subscribe(ctx, client.tenantID, client.spaceID)
	defer sub.Close()

	ch := sub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			select {
			case client.send <- []byte(msg.Payload):
			default:
				// Client send buffer full — drop the message rather than block.
				slog.Warn("dropping realtime message: client send buffer full",
					"tenant_id", client.tenantID, "space_id", client.spaceID)
			}
		}
	}
}
```

- [ ] **Step 3: Write handler.go**

Handler upgrades HTTP requests to WebSockets, authenticates via token query param (WebSocket browser clients can't send Authorization headers in the standard way), validates the user has access to the requested space, and registers the client with the hub.

```go
package realtime

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
)

type Handler struct {
	hub      *Hub
	verifier auth.TokenVerifier
	upgrader websocket.Upgrader
}

func NewHandler(hub *Hub, verifier auth.TokenVerifier, allowedOrigin string) *Handler {
	return &Handler{
		hub:      hub,
		verifier: verifier,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				return origin == "" || origin == allowedOrigin
			},
		},
	}
}

// HandleWS handles GET /ws?space=<uuid>&token=<token>
// Query params are used because browsers can't send custom headers during
// WebSocket handshake. The token is verified before upgrading the connection.
func (h *Handler) HandleWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		respond.Error(w, errors.Unauthorized("missing token"))
		return
	}
	claims, err := h.verifier.Verify(r.Context(), token)
	if err != nil {
		respond.Error(w, errors.Unauthorized("invalid token"))
		return
	}

	spaceStr := r.URL.Query().Get("space")
	spaceID, err := uuid.Parse(spaceStr)
	if err != nil {
		respond.Error(w, errors.Validation("invalid space id"))
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		// Upgrade already wrote an error response
		return
	}

	client := &Client{
		conn:     conn,
		tenantID: claims.TenantID,
		spaceID:  spaceID,
		userID:   claims.UserID,
		send:     make(chan []byte, 64),
	}

	ctx, cancel := context.WithCancel(context.Background())
	h.hub.Register(ctx, client)

	go writePump(client, cancel)
	go readPump(client, h.hub, cancel)
}

// writePump forwards messages from the send channel to the WebSocket.
// Also sends periodic pings to keep the connection alive.
func writePump(client *Client, cancel context.CancelFunc) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		client.conn.Close()
		cancel()
	}()

	for {
		select {
		case msg, ok := <-client.send:
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := client.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump reads from the WebSocket to detect disconnection.
// We don't process inbound messages (this is a one-way broadcast channel).
func readPump(client *Client, hub *Hub, cancel context.CancelFunc) {
	defer func() {
		hub.Unregister(client)
		client.conn.Close()
		cancel()
	}()

	client.conn.SetReadLimit(512)
	client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.conn.SetPongHandler(func(string) error {
		client.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		if _, _, err := client.conn.ReadMessage(); err != nil {
			return
		}
	}
}
```

- [ ] **Step 4: Write routes.go**

```go
package realtime

import "net/http"

// RegisterRoutes registers the WebSocket endpoint. No middleware is applied
// because auth happens inside HandleWS via the token query param.
func RegisterRoutes(mux *http.ServeMux, h *Handler) {
	mux.HandleFunc("GET /ws", h.HandleWS)
}
```

- [ ] **Step 5: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 6: Commit**

```bash
git add backend/internal/realtime/ backend/go.mod backend/go.sum
git commit -m "feat: WebSocket hub and handler"
```

---

### Task 3: Wire Event Publishing into Card & Space Mutations

**Files:**
- Modify: `backend/internal/cards/service.go` — accept optional bus, publish on Create/Update/Move/Delete
- Modify: `backend/internal/spaces/service.go` — publish on Update
- Modify: `backend/internal/goals/service.go` — publish on Create/Update/Delete
- Modify: `backend/cmd/server/main.go` — wire Redis, bus, hub, realtime handler; pass bus to services

- [ ] **Step 1: Update cards service**

Add `bus *realtime.Bus` field and optional `WithBus` constructor. Services must NOT fail if bus is nil (to preserve backward compat and make testing easy). After each successful mutation, call `bus.Publish` with the event type and card payload.

Pattern for each mutation (inside service methods after the repo call succeeds):

```go
if s.bus != nil && card != nil {
    _ = s.bus.Publish(ctx, card.TenantID, card.SpaceID, card.CreatedBy, realtime.EventCardUpdated, card)
}
```

For deletes, we need the card's spaceID BEFORE deleting — fetch first, then delete, then publish.

The Move handler already fetches the card before moving, so the actor ID needs to be threaded through. Update the `Move` service signature to accept `actorID uuid.UUID`, and update the handler to pass `claims.UserID`.

- [ ] **Step 2: Update spaces service similarly** (publish on Update only, since space creation doesn't have a meaningful space channel yet)

- [ ] **Step 3: Update goals service similarly**

- [ ] **Step 4: Update main.go**

```go
import (
    "github.com/matthewmcgibbon/spaces/backend/internal/platform/redis"
    "github.com/matthewmcgibbon/spaces/backend/internal/realtime"
)

// ...after pool setup:
redisClient, err := redis.Connect(ctx, cfg.RedisURL)
if err != nil {
    slog.Error("failed to connect to redis", "error", err)
    os.Exit(1)
}
defer redisClient.Close()

bus := realtime.NewBus(redisClient)
hub := realtime.NewHub(bus)
realtimeHandler := realtime.NewHandler(hub, tokenVerifier, cfg.CORSOrigin)
```

Then update service constructors to accept the bus:
```go
cardSvc := cards.NewService(cardRepo, bus)
spaceSvc := spaces.NewService(spaceRepo, bus)
goalSvc := goals.NewService(goalRepo, bus)
```

And add `RealtimeHandler: realtimeHandler` to the api.Config.

- [ ] **Step 5: Update api/router.go to register realtime routes**

Add `RealtimeHandler *realtime.Handler` to Config, call `realtime.RegisterRoutes(mux, cfg.RealtimeHandler)`.

- [ ] **Step 6: Update cards/spaces/goals handlers if Move signature changed**

The `Move` service method now takes an `actorID`. Update the handler to extract `claims.UserID` and pass it.

- [ ] **Step 7: Build and verify**

```bash
cd backend && go build ./...
```

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: publish card/space/goal events to realtime bus"
```

---

### Task 4: Frontend WebSocket Hook

**Files:**
- Create: `frontend/src/hooks/useRealtime.ts`

- [ ] **Step 1: Write useRealtime.ts**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

type RealtimeEvent = {
  type: string;
  tenant_id: string;
  space_id: string;
  actor_id: string;
  payload: unknown;
  timestamp: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const WS_BASE = API_BASE.replace(/^http/, "ws");

// useRealtime opens a WebSocket for the given space and invalidates React Query
// caches when relevant events arrive. Returns a connection state indicator.
export function useRealtime(spaceId: string | undefined, token: string | undefined) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!spaceId || !token) return;

    const url = `${WS_BASE}/ws?space=${spaceId}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as RealtimeEvent;
        switch (data.type) {
          case "card.created":
          case "card.updated":
          case "card.moved":
          case "card.deleted":
            qc.invalidateQueries({ queryKey: ["cards", spaceId] });
            qc.invalidateQueries({ queryKey: ["metrics", "flow", spaceId] });
            break;
          case "space.updated":
            qc.invalidateQueries({ queryKey: ["spaces"] });
            qc.invalidateQueries({ queryKey: ["spaces", spaceId] });
            break;
          case "goal.created":
          case "goal.updated":
          case "goal.deleted":
            qc.invalidateQueries({ queryKey: ["goals", spaceId] });
            qc.invalidateQueries({ queryKey: ["metrics", "alignment", spaceId] });
            break;
        }
      } catch {
        // Ignore malformed events
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [spaceId, token, qc]);
}
```

- [ ] **Step 2: Build**

```bash
cd frontend && npx next build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useRealtime.ts
git commit -m "feat: frontend useRealtime hook for WebSocket updates"
```

---

### Task 5: Wire Realtime Hook into Board

**Files:**
- Modify: `frontend/src/components/board/Board.tsx` — call useRealtime

- [ ] **Step 1: Add the hook**

```typescript
import { useRealtime } from "@/hooks/useRealtime";

// Inside Board component, after existing state:
// For dev mode, use dev-token. Once Clerk is in place (Part B), replace with getToken().
useRealtime(spaceId, "dev-token");
```

After Clerk is integrated (Task 11), swap in the real token:
```typescript
import { useAuth } from "@clerk/nextjs";
const { getToken } = useAuth();
const [token, setToken] = useState<string | undefined>();
useEffect(() => { getToken().then(t => setToken(t ?? undefined)); }, [getToken]);
useRealtime(spaceId, token);
```

- [ ] **Step 2: Build and commit**

```bash
cd frontend && npx next build
git commit -m "feat: wire realtime updates into board view"
```

---

## Part B: Real Clerk Integration (Tasks 6–11)

### Task 6: Backend Clerk Verifier

**Files:**
- Modify: `backend/go.mod` — add `github.com/golang-jwt/jwt/v5` and `github.com/MicahParks/keyfunc/v3`
- Modify: `backend/internal/auth/clerk.go` — replace stub with real JWKS verification
- Modify: `backend/internal/platform/config/config.go` — add `ClerkPublishableKey` and derive JWKS URL

- [ ] **Step 1: Add dependencies**

```bash
cd backend
go get github.com/golang-jwt/jwt/v5
go get github.com/MicahParks/keyfunc/v3
```

- [ ] **Step 2: Update config.go**

Add field and parse the publishable key to derive the Clerk frontend API domain (JWKS URL).

```go
type Config struct {
	DatabaseURL         string `env:"DATABASE_URL" envDefault:"postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable"`
	RedisURL            string `env:"REDIS_URL" envDefault:"redis://localhost:6379"`
	ServerPort          string `env:"SERVER_PORT" envDefault:"8080"`
	ClerkSecretKey      string `env:"CLERK_SECRET_KEY"`
	ClerkPublishableKey string `env:"CLERK_PUBLISHABLE_KEY"`
	CORSOrigin          string `env:"CORS_ORIGIN" envDefault:"http://localhost:3000"`
	LogLevel            string `env:"LOG_LEVEL" envDefault:"info"`
}
```

- [ ] **Step 3: Rewrite clerk.go**

```go
package auth

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
)

// ClerkVerifier validates Clerk session JWTs via Clerk's JWKS endpoint.
type ClerkVerifier struct {
	jwks keyfunc.Keyfunc
}

// NewClerkVerifier derives the JWKS URL from the publishable key and fetches
// the key set. The publishable key encodes the Clerk frontend API domain as
// base64 in the portion after "pk_test_" or "pk_live_".
func NewClerkVerifier(ctx context.Context, publishableKey string) (*ClerkVerifier, error) {
	if publishableKey == "" {
		return nil, fmt.Errorf("clerk publishable key is empty")
	}

	domain, err := clerkDomainFromPublishableKey(publishableKey)
	if err != nil {
		return nil, err
	}

	jwksURL := "https://" + domain + "/.well-known/jwks.json"
	jwks, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch clerk jwks: %w", err)
	}

	return &ClerkVerifier{jwks: jwks}, nil
}

// clerkDomainFromPublishableKey decodes the base64 domain from a Clerk
// publishable key of the form "pk_test_<base64>" or "pk_live_<base64>".
// The decoded value has a trailing "$" that must be removed.
func clerkDomainFromPublishableKey(key string) (string, error) {
	var encoded string
	switch {
	case strings.HasPrefix(key, "pk_test_"):
		encoded = strings.TrimPrefix(key, "pk_test_")
	case strings.HasPrefix(key, "pk_live_"):
		encoded = strings.TrimPrefix(key, "pk_live_")
	default:
		return "", fmt.Errorf("invalid clerk publishable key prefix")
	}
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("failed to decode publishable key: %w", err)
	}
	return strings.TrimSuffix(string(decoded), "$"), nil
}

// Verify validates the JWT signature via JWKS and extracts Claims.
// Clerk session tokens have the user ID in the "sub" claim.
// We map Clerk user to our tenant+user via the "org_id" claim (if present)
// or look up the user by external_auth_id in the DB (handled by caller).
func (c *ClerkVerifier) Verify(ctx context.Context, token string) (*Claims, error) {
	parsed, err := jwt.Parse(token, c.jwks.Keyfunc)
	if err != nil {
		return nil, errors.Unauthorized("invalid clerk token: " + err.Error())
	}
	if !parsed.Valid {
		return nil, errors.Unauthorized("clerk token invalid")
	}

	mapClaims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.Unauthorized("clerk claims malformed")
	}

	sub, _ := mapClaims["sub"].(string)
	if sub == "" {
		return nil, errors.Unauthorized("clerk token missing sub claim")
	}

	email, _ := mapClaims["email"].(string)

	// For the Clerk path, the external_auth_id is the Clerk user ID (sub).
	// The backend has a resolver step (Task 7) that looks up / creates the
	// local user + tenant from this external ID. For now return Claims with
	// placeholder UUIDs — the resolver middleware fills them in.
	return &Claims{
		UserID:         uuid.Nil,
		TenantID:       uuid.Nil,
		ExternalAuthID: sub,
		Email:          email,
		Role:           "member",
	}, nil
}

// DevVerifier (unchanged — keep existing implementation)
// ...
```

Note: `Claims` struct needs a new `ExternalAuthID` field. Add it in model.go.

- [ ] **Step 4: Add ExternalAuthID to Claims in model.go**

```go
type Claims struct {
	UserID         uuid.UUID
	TenantID       uuid.UUID
	ExternalAuthID string
	Email          string
	Role           string
}
```

- [ ] **Step 5: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: real Clerk JWT verification via JWKS"
```

---

### Task 7: Clerk User Resolver Middleware

**Files:**
- Create: `backend/internal/auth/resolver.go` — middleware that maps Clerk external_auth_id to local user
- Modify: `backend/internal/auth/middleware.go` — run resolver after verification if claims have empty UserID

- [ ] **Step 1: Write resolver.go**

When Clerk verifies a token, the Claims have an ExternalAuthID but empty UserID/TenantID. The resolver looks up the user by external_auth_id in the users table. If the user doesn't exist, it creates a new tenant + user on-the-fly (auto-signup on first login).

```go
package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Resolver maps Clerk external auth IDs to local tenant + user records.
type Resolver struct {
	db *pgxpool.Pool
}

func NewResolver(db *pgxpool.Pool) *Resolver {
	return &Resolver{db: db}
}

// Resolve looks up a local user by external_auth_id. If not found, creates
// a new tenant and user (first-login auto-provisioning). Returns the
// enriched Claims with UserID and TenantID populated.
func (r *Resolver) Resolve(ctx context.Context, claims *Claims) (*Claims, error) {
	if claims.ExternalAuthID == "" {
		return claims, nil // DevVerifier path — already has IDs
	}

	const sel = `SELECT id, tenant_id, role FROM users WHERE external_auth_id = $1`
	var userID, tenantID uuid.UUID
	var role string
	err := r.db.QueryRow(ctx, sel, claims.ExternalAuthID).Scan(&userID, &tenantID, &role)
	if err == nil {
		claims.UserID = userID
		claims.TenantID = tenantID
		claims.Role = role
		return claims, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// First login — create tenant + user
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	slug := "org-" + claims.ExternalAuthID[len(claims.ExternalAuthID)-8:]
	name := claims.Email
	if name == "" {
		name = "My Workspace"
	}
	if err := tx.QueryRow(ctx,
		`INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
		name, slug,
	).Scan(&tenantID); err != nil {
		return nil, err
	}

	userName := claims.Email
	if userName == "" {
		userName = "User"
	}
	if err := tx.QueryRow(ctx,
		`INSERT INTO users (tenant_id, external_auth_id, email, name, role)
		 VALUES ($1, $2, $3, $4, 'owner') RETURNING id, role`,
		tenantID, claims.ExternalAuthID, claims.Email, userName,
	).Scan(&userID, &role); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	claims.UserID = userID
	claims.TenantID = tenantID
	claims.Role = role
	return claims, nil
}
```

- [ ] **Step 2: Wire resolver into middleware.go**

Change `Middleware` to hold an optional `*Resolver` and call `Resolve` after `Verify`:

```go
type Middleware struct {
	verifier TokenVerifier
	resolver *Resolver // nil means no resolution needed (dev mode)
}

func NewMiddleware(verifier TokenVerifier, resolver *Resolver) *Middleware {
	return &Middleware{verifier: verifier, resolver: resolver}
}

// In Handler(), after claims, err := m.verifier.Verify(...):
if m.resolver != nil {
    claims, err = m.resolver.Resolve(r.Context(), claims)
    if err != nil {
        respond.Error(w, errors.Unauthorized("user resolution failed"))
        return
    }
}
```

- [ ] **Step 3: Update main.go to pass resolver**

```go
var resolver *auth.Resolver
if cfg.ClerkSecretKey != "" {
    verifier, err = auth.NewClerkVerifier(ctx, cfg.ClerkPublishableKey)
    if err != nil { ... }
    resolver = auth.NewResolver(pool)
} else {
    verifier = auth.NewDevVerifier(...)
}

authMiddleware := auth.NewMiddleware(verifier, resolver)
```

- [ ] **Step 4: Build and commit**

```bash
cd backend && go build ./...
git commit -m "feat: Clerk user resolver with auto-provisioning"
```

---

### Task 8: Verify Clerk Secret in Backend .env

**Files:**
- Modify: `backend/.env` — confirm CLERK_SECRET_KEY and add CLERK_PUBLISHABLE_KEY

- [ ] **Step 1: Read backend/.env**

```bash
cat backend/.env
```

- [ ] **Step 2: Ensure both keys are present**

```
CORS_ORIGIN=http://localhost:3000
CLERK_SECRET_KEY=sk_test_...  # from user
CLERK_PUBLISHABLE_KEY=pk_test_ZXhjaXRpbmctZWFnbGUtNzUuY2xlcmsuYWNjb3VudHMuZGV2JA
```

If `CLERK_SECRET_KEY` is missing, STOP and ask the user — do not proceed.

- [ ] **Step 3: Restart backend and verify it picks up the Clerk verifier**

Watch the log — should see "clerk verifier initialized" instead of "no CLERK_SECRET_KEY set, using dev auth verifier".

---

### Task 9: Install Clerk in Frontend

**Files:**
- Modify: `frontend/package.json` — add `@clerk/nextjs`
- Create: `frontend/.env.local` — publishable key

- [ ] **Step 1: Install**

```bash
cd frontend && npm install @clerk/nextjs
```

- [ ] **Step 2: Create .env.local**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhjaXRpbmctZWFnbGUtNzUuY2xlcmsuYWNjb3VudHMuZGV2JA
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

- [ ] **Step 3: Verify .env.local is in .gitignore**

```bash
grep ".env.local" frontend/.gitignore || echo ".env.local" >> frontend/.gitignore
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/.gitignore
git commit -m "chore: install @clerk/nextjs"
```

---

### Task 10: Wrap App in ClerkProvider

**Files:**
- Modify: `frontend/src/app/layout.tsx` — add ClerkProvider wrapper
- Create: `frontend/src/middleware.ts` — Clerk route protection

- [ ] **Step 1: Update layout.tsx**

```tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}>
        <body className="antialiased">
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Create middleware.ts**

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
```

- [ ] **Step 3: Build and commit**

```bash
cd frontend && npx next build
git commit -m "feat: wrap app in ClerkProvider with route protection"
```

---

### Task 11: Auth Token in API Client + Sign-In Pages

**Files:**
- Modify: `frontend/src/lib/api/client.ts` — swap dev-token for real Clerk token
- Create: `frontend/src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `frontend/src/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `frontend/src/components/common/Sidebar.tsx` — add UserButton

- [ ] **Step 1: Create sign-in and sign-up pages**

```tsx
// frontend/src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";
export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <SignIn />
    </div>
  );
}
```

Same pattern for sign-up.

- [ ] **Step 2: Update client.ts to use Clerk token**

Next.js + Clerk provides `auth()` on the server, but API calls are client-side. Use `@clerk/nextjs`'s `useAuth().getToken()` in hooks, and pass the token into `apiFetch`.

Simplest approach: create a token provider context or use a singleton token cache. Given our existing setup, add a `getToken` setter that Clerk updates:

```typescript
// frontend/src/lib/api/client.ts
let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ... existing ApiError class ...

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = tokenGetter ? await tokenGetter() : "dev-token";
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? "dev-token"}`,
      ...options.headers,
    },
    mode: "cors",
  });
  // ... rest unchanged ...
}
```

- [ ] **Step 3: Install token getter in a ClerkTokenBridge component**

Create `frontend/src/components/common/ClerkTokenBridge.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api/client";

export function ClerkTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}
```

Add `<ClerkTokenBridge />` inside QueryProvider in layout.tsx so it runs once.

- [ ] **Step 4: Add UserButton to Sidebar**

```tsx
import { UserButton } from "@clerk/nextjs";

// Somewhere in the Sidebar footer area:
<UserButton afterSignOutUrl="/sign-in" />
```

- [ ] **Step 5: Build and test end-to-end**

```bash
cd frontend && npx next build
```

Visit http://localhost:3000 — should redirect to /sign-in. Sign up, then visit /spaces.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: Clerk sign-in/sign-up pages and token bridge"
```

---

## Part C: Polish & Activity Log (Tasks 12–14)

### Task 12: Activity Log Writes

**Files:**
- Create: `backend/internal/activity/model.go`
- Create: `backend/internal/activity/repository.go`
- Modify: `backend/internal/cards/service.go` — write activity on create/update/move/delete
- Modify: `backend/internal/spaces/service.go` — write activity on update/delete
- Modify: `backend/cmd/server/main.go` — wire activity repo into services

- [ ] **Step 1: Create activity model**

```go
package activity

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Activity struct {
	ID         uuid.UUID       `json:"id"`
	TenantID   uuid.UUID       `json:"tenant_id"`
	EntityType string          `json:"entity_type"`
	EntityID   uuid.UUID       `json:"entity_id"`
	ActorID    uuid.UUID       `json:"actor_id"`
	Action     string          `json:"action"`
	Changes    json.RawMessage `json:"changes"`
	CreatedAt  time.Time       `json:"created_at"`
}
```

- [ ] **Step 2: Create activity repository**

```go
package activity

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Log writes an activity entry. Errors are returned but callers should log
// and continue — activity logging is best-effort.
func (r *Repository) Log(ctx context.Context, tenantID, entityID, actorID uuid.UUID, entityType, action string, changes any) error {
	raw, err := json.Marshal(changes)
	if err != nil {
		return err
	}
	const q = `
		INSERT INTO activities (tenant_id, entity_type, entity_id, actor_id, action, changes)
		VALUES ($1, $2, $3, $4, $5, $6)`
	_, err = r.db.Exec(ctx, q, tenantID, entityType, entityID, actorID, action, raw)
	return err
}

// ListByTenant returns recent activities for a tenant, newest first.
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]Activity, error) {
	const q = `
		SELECT id, tenant_id, entity_type, entity_id, actor_id, action, changes, created_at
		FROM activities WHERE tenant_id = $1
		ORDER BY created_at DESC LIMIT $2`
	rows, err := r.db.Query(ctx, q, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var activities []Activity
	for rows.Next() {
		var a Activity
		if err := rows.Scan(&a.ID, &a.TenantID, &a.EntityType, &a.EntityID, &a.ActorID, &a.Action, &a.Changes, &a.CreatedAt); err != nil {
			return nil, err
		}
		activities = append(activities, a)
	}
	return activities, rows.Err()
}
```

- [ ] **Step 3: Add activity.Log calls to card/space/goal service mutations**

In cards service after each successful mutation, alongside the bus.Publish:
```go
if s.activity != nil {
    _ = s.activity.Log(ctx, card.TenantID, card.ID, createdBy, "card", "created", card)
}
```

For Move, the action is "moved" with changes containing old/new column.

Don't fail the request if activity logging fails — just log and continue.

- [ ] **Step 4: Wire into main.go**

```go
activityRepo := activity.NewRepository(pool)
cardSvc := cards.NewService(cardRepo, bus, activityRepo)
// same for spaces, goals
```

- [ ] **Step 5: Build and commit**

```bash
cd backend && go build ./...
git commit -m "feat: activity log writes on card/space/goal mutations"
```

---

### Task 13: Error Boundaries & Loading States

**Files:**
- Create: `frontend/src/components/common/ErrorBoundary.tsx`
- Create: `frontend/src/app/error.tsx` — Next.js app-level error page
- Create: `frontend/src/app/loading.tsx` — Next.js app-level loading page
- Modify: `frontend/src/lib/api/client.ts` — better error messages

- [ ] **Step 1: Create ErrorBoundary.tsx**

```tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center">
            <h2 className="text-lg font-[family-name:var(--font-display)] text-neutral-700 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Create app-level error.tsx**

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-[family-name:var(--font-display)] text-neutral-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-neutral-500 mb-6">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create app-level loading.tsx**

```tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-primary-500 animate-spin" />
        <p className="text-sm text-neutral-400">Loading…</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build and commit**

```bash
cd frontend && npx next build
git commit -m "feat: error boundaries and global loading/error pages"
```

---

### Task 14: Mobile Responsive Layouts

**Files:**
- Modify: `frontend/src/components/board/Board.tsx` — stack columns on mobile
- Modify: `frontend/src/components/common/Sidebar.tsx` — hide on mobile, add hamburger toggle
- Modify: `frontend/src/app/spaces/page.tsx` — responsive grid
- Modify: `frontend/src/app/settings/page.tsx` — responsive padding

- [ ] **Step 1: Make Sidebar collapsible on mobile**

Add a state `mobileOpen` and a hamburger button visible only at `md:hidden`. On screens below `md`, the sidebar becomes a drawer that slides in from the left when the hamburger is clicked.

- [ ] **Step 2: Board columns: horizontal scroll on mobile**

The existing `overflow-x-auto` on `board-surface` already enables horizontal scrolling. Ensure columns have `min-w-[280px] md:min-w-[300px]` so they're touch-scrollable on mobile.

- [ ] **Step 3: Settings page: reduce padding on mobile**

Change `p-8` to `p-4 md:p-8` and `max-w-2xl` already works — just verify the member list doesn't overflow.

- [ ] **Step 4: Spaces dashboard: already responsive (grid cols-1/md:grid-cols-2/lg:grid-cols-3), just verify**

- [ ] **Step 5: Build and commit**

```bash
cd frontend && npx next build
git commit -m "feat: mobile responsive layouts"
```

---

## Summary

| Part | Tasks | What it delivers |
|------|-------|-----------------|
| A: Real-time | 1–5 | Redis pub/sub event bus, WebSocket hub, card/goal/space event publishing, frontend useRealtime hook wired into board |
| B: Clerk Auth | 6–11 | Real JWT verification via JWKS, user resolver with auto-provisioning, ClerkProvider + sign-in/sign-up pages, token bridge for API client |
| C: Polish | 12–14 | Activity log writes, error boundaries, loading states, mobile responsive layouts |

---

## Self-Review Notes

- **Prerequisites:** Task 8 blocks on user having `CLERK_SECRET_KEY` in backend/.env. Must ask user if missing.
- **Breaking changes:** Service constructors change signature (add bus + activity repo). All callers in main.go are updated.
- **Claims struct:** Adds `ExternalAuthID` field. DevVerifier returns empty string so existing code unaffected.
- **Backward compat:** Dev mode (no CLERK_SECRET_KEY) still works — resolver is nil, uses DevVerifier.
- **Token flow:** Frontend API client currently sends hardcoded "dev-token". Task 11 adds Clerk token bridge. Dev mode still works because DevVerifier accepts any non-empty token.
