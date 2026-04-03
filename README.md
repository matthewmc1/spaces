# Spaces

**Strategic alignment, visible everywhere.**

Spaces is a multi-tenant SaaS Kanban platform for strategic planning and organizational alignment. Each space represents a program or workstream. Spaces nest flexibly, enabling roll-up of priorities, goals, and flow metrics from individual workstreams up to the organizational level.

## Why Spaces?

Teams, programs, and organizations need visibility into whether day-to-day work aligns with strategic goals — and where capacity is being spent versus where it should be.

Spaces solves this with:
- **Flexible hierarchies** — nest spaces within spaces to mirror your org structure
- **Planning-focused flow** — Inbox → Triage (Ice Box / Freezer) → Planned → In Progress → Review → Done
- **Goal alignment** — link work to goals at any level, see alignment health at a glance
- **Flow metrics** — cycle time, throughput, bottleneck detection, and capacity insights
- **Enterprise-grade** — multi-tenant isolation, RBAC, audit logging, SSO-ready

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS v4, TanStack Query, dnd-kit |
| **Backend** | Go 1.22+, stdlib HTTP router, pgx |
| **Database** | PostgreSQL 16 + Redis 7 |
| **Auth** | Clerk (abstracted behind TokenVerifier interface) |
| **Typography** | Instrument Serif, DM Sans, IBM Plex Mono |

## Getting Started

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker (for PostgreSQL + Redis)

### Quick Start

```bash
# 1. Start databases
docker compose up -d

# 2. Run migrations
cd backend
go install github.com/pressly/goose/v3/cmd/goose@latest
goose -dir migrations postgres "postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable" up

# 3. Start backend
CORS_ORIGIN=http://localhost:3000 go run cmd/server/main.go

# 4. Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `CORS_ORIGIN` | `http://localhost:3000` | Frontend origin for CORS |
| `CLERK_SECRET_KEY` | — | Clerk auth (omit for dev mode) |
| `NEXT_PUBLIC_SHOW_LANDING` | `false` | Show marketing landing page at `/` |

## Project Structure

```
spaces/
├── backend/                    # Go API server
│   ├── cmd/server/             # Entry point
│   ├── internal/
│   │   ├── platform/           # Shared: config, database, errors, middleware
│   │   ├── auth/               # JWT auth with Clerk
│   │   ├── tenant/             # Multi-tenant isolation
│   │   ├── spaces/             # Space CRUD + nesting
│   │   └── cards/              # Card CRUD + board transitions
│   ├── api/                    # HTTP router
│   └── migrations/             # SQL migrations (goose)
├── frontend/                   # Next.js app
│   └── src/
│       ├── app/                # Pages (App Router)
│       ├── components/
│       │   ├── ui/             # Design system (Button, Badge, Card, etc.)
│       │   ├── board/          # Kanban board components
│       │   ├── spaces/         # Space tree, overview, dashboard
│       │   ├── analytics/      # Insights sidebar widgets
│       │   └── landing/        # Marketing landing page
│       ├── hooks/              # TanStack Query hooks
│       ├── lib/api/            # API client
│       └── types/              # TypeScript types
├── docs/
│   ├── specs/                  # Design specifications
│   └── superpowers/plans/      # Implementation plans
└── docker-compose.yml
```

## Kanban Flow

```
Inbox → Ice Box (needs definition)
      → Freezer (needs validation)
      → Planned (ready for work)
          → In Progress
              → Review
                  → Done
```

Invalid transitions are rejected by the API. Cards visually degrade when stale in a column for 3+ days.

## Design System

The UI uses a custom design token system with three distinctive typefaces:
- **Instrument Serif** — display headings, editorial feel
- **DM Sans** — body text, warm and readable
- **IBM Plex Mono** — metrics and data values

Primary palette: Teal/Emerald with warm slate neutrals.

## License

MIT
