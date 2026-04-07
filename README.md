# Spaces

**The operating system for engineering teams.**

Spaces is an engineering operating system that gives leaders portfolio-level visibility across teams, programmes, and workstreams — while protecting the autonomy teams need to move fast. Built on proven frameworks from Klaus Leopold (Flight Levels), Mik Kersten (Flow Framework), and Dominica DeGrandis (Making Work Visible).

## The Problem

Engineering leaders managing 50–70+ people across client delivery, platform work, and organizational change face a cognitive load problem. Work lives in silos. Prioritization happens by opinion, not data. Nobody can answer "is our daily work aligned with strategic goals?" without a 2-hour meeting.

## How Spaces Solves It

### Flight Level 3: Portfolio Board
Every active programme, team, and initiative appears on a single board with health scoring (green/amber/red), WIP limits, and uniform metrics. When someone wants to add something and the board is full, the conversation shifts from "can we do this?" to "which existing item should we pause?"

### Flow Framework Classification
Every card is classified as Feature, Defect, Risk, or Debt. Flow distribution charts show where capacity *actually* goes — and capacity allocation gauges compare it against targets. This is the "saying no with data" tool.

### Alignment Chains
Cards link to goals. Goals link to parent goals. The alignment chain traces any piece of work upward from a team workstream through department objectives to org-level strategy. Orphaned goals and unlinked high-priority cards surface instantly.

### Org → Department → Team → Workstream
Nested spaces mirror the real org structure. Each level has its own board, metrics, and goals. Everything rolls up — a team lead sees their workstreams, a department head sees their teams, an exec sees the portfolio.

### Cross-Cutting Programmes
Initiatives that span multiple teams (like "Identity Platform 2026") are programmes that aggregate metrics from spaces anywhere in the org tree. No more managing cross-team work in spreadsheets.

## Features

| Feature | Description |
|---------|-------------|
| **Kanban Boards** | 7-column flow (Inbox → Ice Box → Freezer → Planned → In Progress → Review → Done) with validated transitions |
| **WIP Limits** | Configurable per column per space, visual warnings when at/over capacity |
| **Work Type Classification** | Feature / Defect / Risk / Debt per card (Flow Framework) |
| **Flow Distribution** | Stacked bar showing actual capacity split by work type |
| **Capacity Allocation** | Target vs actual gauge per work type with drift detection |
| **Goals & Alignment** | Goal CRUD, card-to-goal linking, alignment chain visualization |
| **Rollup Metrics** | Materialized view aggregating cards/goals across nested spaces, Redis-cached |
| **Portfolio Board** | Health-grouped items (red → amber → green) with org-level KPIs and WIP badge |
| **Programmes** | Cross-cutting initiatives grouping spaces from anywhere in the org tree |
| **Team Dashboard** | Per-team rollup with workstreams, goals, and programme memberships |
| **Org Dashboard** | Org-wide rollup with department breakdown and programme status |
| **Real-time Updates** | WebSocket via Redis pub/sub — card moves, goal changes, space updates broadcast live |
| **Integrations** | GitHub/GitLab webhook processing, card-to-PR/issue linking |
| **RBAC** | Role-based access (owner/admin/member/viewer) at tenant and space levels |
| **Activity Logging** | Audit trail on all card, space, and goal mutations |
| **Clerk Auth** | JWT verification via JWKS, auto-provisioning on first login |
| **Settings** | Board preferences, notification prefs, theme, timezone |
| **Mobile Responsive** | Collapsible sidebar, horizontal scroll boards, responsive settings |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, TanStack Query v5, dnd-kit, @clerk/nextjs |
| **Backend** | Go 1.25, stdlib HTTP router, pgx v5, gorilla/websocket |
| **Database** | PostgreSQL 16 (materialized views, JSONB) + Redis 7 (pub/sub, cache) |
| **Auth** | Clerk (JWKS verification, auto-provisioning resolver) |
| **Typography** | Instrument Serif (display headings), IBM Plex Mono (body/UI default) |

## Getting Started

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker (for PostgreSQL + Redis)

### Quick Start

```bash
# 1. Start databases
docker compose up -d

# 2. Start backend
cd backend
cp .env.example .env  # add your Clerk keys
go run cmd/server/main.go

# 3. Start frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local  # add your Clerk publishable key
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Seed Demo Data

```bash
# For the dev tenant
docker exec -i spaces-postgres-1 psql -U spaces -d spaces < backend/migrations/seed_phase5_demo.sql

# For a Clerk-authenticated tenant
./backend/migrations/seed_phase5_for_tenant.sh <tenant_id> <user_id>
```

### Environment Variables

**Backend (`backend/.env`):**

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `CORS_ORIGIN` | `http://localhost:3000` | Frontend origin for CORS |
| `CLERK_SECRET_KEY` | — | Clerk secret key (omit for dev-token mode) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | — | Clerk publishable key (shared with frontend) |

**Frontend (`frontend/.env.local`):**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:8080`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `CLERK_SECRET_KEY` | Clerk secret (for server-side middleware) |

## Project Structure

```
spaces/
├── backend/
│   ├── cmd/server/             # Entry point
│   ├── internal/
│   │   ├── platform/           # Config, database, errors, middleware, Redis
│   │   ├── auth/               # Clerk JWT + DevVerifier + resolver
│   │   ├── tenant/             # Multi-tenant isolation
│   │   ├── rbac/               # Role-based access control
│   │   ├── spaces/             # Space CRUD + nesting + hierarchy
│   │   ├── cards/              # Card CRUD + board transitions
│   │   ├── goals/              # Goals + alignment chain
│   │   ├── metrics/            # Per-space flow + alignment metrics
│   │   ├── rollup/             # Materialized view rollups + portfolio
│   │   ├── programmes/         # Cross-cutting programmes
│   │   ├── integrations/       # GitHub/GitLab + webhooks
│   │   ├── settings/           # User preferences
│   │   ├── activity/           # Audit logging
│   │   └── realtime/           # WebSocket hub + Redis pub/sub
│   ├── api/                    # HTTP router
│   └── migrations/             # SQL migrations (goose)
├── frontend/
│   └── src/
│       ├── app/                # Pages: /, /spaces, /org, /portfolio, /programmes, /settings
│       ├── components/
│       │   ├── ui/             # Design system
│       │   ├── board/          # Kanban board + card detail (tabbed)
│       │   ├── spaces/         # Space tree, dashboard, settings panel
│       │   ├── goals/          # Goals panel, alignment chain
│       │   ├── analytics/      # Insights sidebar widgets
│       │   ├── rollup/         # KPIs, breakdown, flow distribution, capacity gauge
│       │   ├── portfolio/      # Portfolio card, WIP badge
│       │   └── landing/        # Marketing page
│       ├── hooks/              # TanStack Query hooks
│       ├── lib/api/            # API client with Clerk token bridge
│       └── types/              # TypeScript types
├── docs/
│   ├── specs/                  # Design specifications
│   ├── superpowers/plans/      # Implementation plans
│   └── compass_artifact.md     # Compass framework reference
└── docker-compose.yml
```

## Inspired By

- **Klaus Leopold** — *Rethinking Agile* (Flight Levels)
- **Dominica DeGrandis** — *Making Work Visible* (WIP discipline, five thieves of time)
- **Mik Kersten** — *Project to Product* (Flow Framework, flow distribution)
- **Will Larson** — *The Engineering Executive's Primer* (org tooling, meeting structures)
- **Don Reinertsen** — *Principles of Product Development Flow* (WSJF, economic prioritization)
- **Tom DeMarco** — *Slack* (the case against full utilization)

## License

MIT
