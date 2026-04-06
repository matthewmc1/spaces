# Compass: Work Types, WIP Limits & Portfolio Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Spaces into an engineering operating system aligned with the Compass framework — adding Flow Framework work type classification, WIP limits per column, flow distribution metrics, capacity allocation tracking, and a Flight Level 3 portfolio board view.

**Architecture:** Work types and WIP limits are card/space-level fields added via migration. The portfolio board is a new frontend page that renders programmes + key initiatives as a kanban with WIP-limited decision columns. Flow distribution metrics extend the existing rollup service to compute capacity split by work type. Capacity allocation adds target percentages to spaces that the dashboard compares against actual flow.

**Tech Stack:** Go stdlib + pgx, Next.js 16 + TanStack Query, Tailwind v4, PostgreSQL 16

---

## Part A: Work Types & WIP Limits (Tasks 1–5)

### Task 1: Database Migration — Work Types & WIP Config

**Files:**
- Create: `backend/migrations/009_work_types_wip.sql`

- [ ] **Step 1: Write migration**

```sql
-- +goose Up

-- 1. Add work_type to cards (Mik Kersten's Flow Framework classification)
ALTER TABLE cards ADD COLUMN work_type TEXT NOT NULL DEFAULT 'feature'
    CHECK (work_type IN ('feature', 'defect', 'risk', 'debt'));

-- 2. Add WIP limits and capacity allocation config to spaces
-- wip_limits: JSON mapping column_name → max count, e.g. {"in_progress": 5, "review": 3}
-- capacity_targets: JSON mapping work_type → target percentage, e.g. {"feature": 65, "debt": 15, "risk": 10, "defect": 10}
ALTER TABLE spaces ADD COLUMN wip_limits JSONB NOT NULL DEFAULT '{}';
ALTER TABLE spaces ADD COLUMN capacity_targets JSONB NOT NULL DEFAULT '{}';

-- 3. Refresh materialized view to include work_type in aggregations
DROP MATERIALIZED VIEW IF EXISTS space_rollup_stats;

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
    COUNT(DISTINCT gl.source_id) FILTER (WHERE gl.source_type = 'card') AS linked_cards,
    -- Flow distribution counts by work type
    COUNT(*) FILTER (WHERE c.work_type = 'feature') AS feature_count,
    COUNT(*) FILTER (WHERE c.work_type = 'defect') AS defect_count,
    COUNT(*) FILTER (WHERE c.work_type = 'risk') AS risk_count,
    COUNT(*) FILTER (WHERE c.work_type = 'debt') AS debt_count
FROM spaces s
LEFT JOIN cards c ON c.space_id = s.id AND c.tenant_id = s.tenant_id
LEFT JOIN goals g ON g.space_id = s.id AND g.tenant_id = s.tenant_id
LEFT JOIN goal_links gl ON gl.target_goal_id = g.id
GROUP BY s.id;

CREATE UNIQUE INDEX idx_space_rollup_stats_space ON space_rollup_stats(space_id);
CREATE INDEX idx_space_rollup_stats_path ON space_rollup_stats(tenant_id, path text_pattern_ops);

-- +goose Down
DROP MATERIALIZED VIEW IF EXISTS space_rollup_stats;
-- Recreate the old view without work_type columns (would need the original CREATE here)
ALTER TABLE spaces DROP COLUMN IF EXISTS capacity_targets;
ALTER TABLE spaces DROP COLUMN IF EXISTS wip_limits;
ALTER TABLE cards DROP COLUMN IF EXISTS work_type;
```

- [ ] **Step 2: Apply Up portions to DB** (run each ALTER/DROP/CREATE via separate `-c` commands to avoid executing the Down section)
- [ ] **Step 3: Update seed data to include diverse work types**

```sql
-- Backfill existing cards with realistic work types
UPDATE cards SET work_type = 'defect' WHERE title ILIKE '%bug%' OR title ILIKE '%fix%' OR title ILIKE '%edge case%';
UPDATE cards SET work_type = 'debt' WHERE title ILIKE '%decommission%' OR title ILIKE '%documentation%' OR title ILIKE '%SLO%' OR title ILIKE '%audit%';
UPDATE cards SET work_type = 'risk' WHERE title ILIKE '%security%' OR title ILIKE '%compliance%' OR title ILIKE '%fraud%' OR title ILIKE '%3DS%';
-- Everything else stays 'feature' (the default)

-- Set capacity targets on team-type spaces
UPDATE spaces SET capacity_targets = '{"feature": 65, "debt": 15, "risk": 10, "defect": 10}'
WHERE space_type IN ('team', 'department', 'organization');

-- Set WIP limits on workstream spaces
UPDATE spaces SET wip_limits = '{"in_progress": 3, "review": 2}'
WHERE space_type = 'workstream';
```

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/009_work_types_wip.sql
git commit -m "feat: migration for work types, WIP limits, capacity targets"
```

---

### Task 2: Backend — Card Work Type Field

**Files:**
- Modify: `backend/internal/cards/model.go` — add `WorkType string` to Card, CreateInput
- Modify: `backend/internal/cards/repository.go` — add `work_type` to INSERT/SELECT/UPDATE/scan
- Modify: `backend/internal/spaces/model.go` — add `WipLimits` and `CapacityTargets` (both `json.RawMessage`) to Space, CreateInput, UpdateInput
- Modify: `backend/internal/spaces/repository.go` — add both JSONB columns to INSERT/SELECT/UPDATE/scan

- [ ] **Step 1: Update cards model and repository**

Add to Card struct: `WorkType string \`json:"work_type"\``
Add to CreateInput: `WorkType string \`json:"work_type,omitempty"\``
Add to UpdateInput: `WorkType *string \`json:"work_type,omitempty"\``

In repository, add `work_type` column to all SELECT/RETURNING/INSERT queries. In Create, default empty work_type to 'feature': `COALESCE(NULLIF($N, ''), 'feature')`. In scanCard/scanCardFromRows, add `&c.WorkType` scan field after `&c.Labels`.

- [ ] **Step 2: Update spaces model and repository**

Add to Space struct:
```go
WipLimits       json.RawMessage `json:"wip_limits"`
CapacityTargets json.RawMessage `json:"capacity_targets"`
```

Add to UpdateInput:
```go
WipLimits       *json.RawMessage `json:"wip_limits,omitempty"`
CapacityTargets *json.RawMessage `json:"capacity_targets,omitempty"`
```

Update all SELECT/RETURNING/INSERT/UPDATE queries and scan functions to include these two JSONB columns (after `space_type`, before `status`). Use `COALESCE(wip_limits, '{}')` and `COALESCE(capacity_targets, '{}')` in SELECTs.

- [ ] **Step 3: Build and test**

```bash
cd backend && go build ./... && go test ./...
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: work_type on cards, wip_limits and capacity_targets on spaces"
```

---

### Task 3: Frontend — Work Type & WIP Types

**Files:**
- Modify: `frontend/src/types/card.ts` — add `work_type` to Card, CreateCardInput
- Modify: `frontend/src/types/space.ts` — add `wip_limits` and `capacity_targets` to Space, UpdateSpaceInput
- Create: `frontend/src/types/flow.ts` — work type constants and colors

- [ ] **Step 1: Update card types**

Add to Card interface: `work_type: WorkType;`
Add to CreateCardInput: `work_type?: WorkType;`
Add type: `export type WorkType = "feature" | "defect" | "risk" | "debt";`

- [ ] **Step 2: Update space types**

Add to Space: `wip_limits: Record<string, number>; capacity_targets: Record<string, number>;`
Add to UpdateSpaceInput: `wip_limits?: Record<string, number>; capacity_targets?: Record<string, number>;`

- [ ] **Step 3: Create flow.ts**

```typescript
export type WorkType = "feature" | "defect" | "risk" | "debt";

export const WORK_TYPES: { key: WorkType; label: string; color: string; bgColor: string }[] = [
  { key: "feature", label: "Feature", color: "text-primary-700", bgColor: "bg-primary-50" },
  { key: "defect",  label: "Defect",  color: "text-rose-700",    bgColor: "bg-rose-50" },
  { key: "risk",    label: "Risk",    color: "text-amber-700",   bgColor: "bg-amber-50" },
  { key: "debt",    label: "Debt",    color: "text-neutral-700",  bgColor: "bg-neutral-100" },
];
```

- [ ] **Step 4: Build and commit**

---

### Task 4: Work Type Selector in Card Create & Detail

**Files:**
- Modify: `frontend/src/components/board/CreateCardDialog.tsx` — add work type select
- Modify: `frontend/src/components/board/CardDetailDialog.tsx` — add work type inline edit
- Modify: `frontend/src/components/board/BoardCard.tsx` — show work type indicator

- [ ] **Step 1: CreateCardDialog** — add a Select for work type (Feature/Defect/Risk/Debt) between priority and effort fields
- [ ] **Step 2: CardDetailDialog** — add work type inline dropdown in the 4-column grid alongside priority, effort, due date
- [ ] **Step 3: BoardCard** — add a small colored dot or tag showing work type on each card (compact, using WORK_TYPES colors)
- [ ] **Step 4: Build and commit**

---

### Task 5: WIP Limit Warnings on Board Columns

**Files:**
- Modify: `frontend/src/components/board/BoardColumn.tsx` — accept `wipLimit` prop, show count/limit badge, visual warning when at or over limit
- Modify: `frontend/src/components/board/Board.tsx` — read space's `wip_limits` and pass per-column limits to BoardColumn

- [ ] **Step 1: Read current BoardColumn.tsx and Board.tsx**
- [ ] **Step 2: Update BoardColumn** — accept optional `wipLimit: number` prop. In the column header, show card count and if wipLimit is set, render a badge like "3/5" (green when under, amber when at, red when over). When over limit, add a subtle red border-top or background tint to the column header.
- [ ] **Step 3: Update Board.tsx** — fetch the current space's data (it's already available via `useSpace` in the parent page). Pass `space.wip_limits[column.key]` to each BoardColumn as the `wipLimit` prop. If the space has no wip_limits for that column, don't pass it (undefined = no limit).
- [ ] **Step 4: Build and commit**

---

## Part B: Flow Distribution & Capacity Metrics (Tasks 6–8)

### Task 6: Rollup Service — Flow Distribution

**Files:**
- Modify: `backend/internal/rollup/model.go` — add flow distribution fields to SpaceRollup
- Modify: `backend/internal/rollup/service.go` — read new columns from materialized view, compute distribution percentages

- [ ] **Step 1: Update SpaceRollup model**

Add fields:
```go
type FlowDistribution struct {
    FeatureCount int     `json:"feature_count"`
    DefectCount  int     `json:"defect_count"`
    RiskCount    int     `json:"risk_count"`
    DebtCount    int     `json:"debt_count"`
    FeaturePct   float64 `json:"feature_pct"`
    DefectPct    float64 `json:"defect_pct"`
    RiskPct      float64 `json:"risk_pct"`
    DebtPct      float64 `json:"debt_pct"`
}
```

Add `FlowDistribution FlowDistribution \`json:"flow_distribution"\`` to SpaceRollup and ProgrammeRollup.

- [ ] **Step 2: Update service.go** — read `feature_count`, `defect_count`, `risk_count`, `debt_count` from the materialized view rows. Sum them in the rollup loop. After the loop, compute percentages (count / total_cards * 100).

- [ ] **Step 3: Build and commit**

---

### Task 7: Flow Distribution Frontend Widget

**Files:**
- Modify: `frontend/src/types/rollup.ts` — add FlowDistribution to SpaceRollup
- Create: `frontend/src/components/rollup/FlowDistribution.tsx` — horizontal stacked bar showing feature/defect/risk/debt split
- Create: `frontend/src/components/rollup/CapacityGauge.tsx` — shows actual vs target capacity allocation per work type
- Modify: `frontend/src/app/org/page.tsx` — add both widgets
- Modify: `frontend/src/app/spaces/[id]/team/page.tsx` — add both widgets

- [ ] **Step 1: Update rollup types** with FlowDistribution interface matching the backend response

- [ ] **Step 2: Create FlowDistribution.tsx**

A horizontal stacked bar chart (like ColumnDistribution but for work types). Each segment colored per WORK_TYPES. Below the bar, show labels with counts and percentages. Tooltip explaining: "Shows how capacity is distributed across Features, Defects, Risk, and Debt (Mik Kersten's Flow Framework)."

- [ ] **Step 3: Create CapacityGauge.tsx**

For each work type, show a row with: label, actual % bar, target % marker (a thin line on the bar), and actual/target numbers. Colors: green if actual is within ±5% of target, amber if 5-15% off, red if >15% off. This is the "saying no with data" visualization — shows at a glance where capacity is over/under-allocated.

Props: `{ flowDistribution?: FlowDistribution; capacityTargets?: Record<string, number> }`

- [ ] **Step 4: Add widgets to org and team dashboard pages**
- [ ] **Step 5: Build and commit**

---

### Task 8: WIP Limits Config UI in Space Settings

**Files:**
- Create: `frontend/src/components/spaces/SpaceSettingsPanel.tsx` — inline panel for configuring WIP limits and capacity targets
- Modify: `frontend/src/components/board/BoardHeader.tsx` — add "Space Settings" button (gear icon)
- Modify: `frontend/src/components/board/Board.tsx` — toggle space settings panel

- [ ] **Step 1: Create SpaceSettingsPanel.tsx**

A slide-in right panel (like AnalyticsSidebar). Shows:
- **WIP Limits** section: for each visible column, a number input setting the max cards. Save on blur via `useUpdateSpace`.
- **Capacity Targets** section: four number inputs for feature/defect/risk/debt target percentages. Must sum to 100 (show warning if not). Save on blur.
- Close button.

- [ ] **Step 2: Add gear button to BoardHeader** — opens the settings panel
- [ ] **Step 3: Wire into Board.tsx** — state toggle, render panel
- [ ] **Step 4: Build and commit**

---

## Part C: Portfolio Board (Tasks 9–11)

### Task 9: Portfolio Board Backend — Aggregate View

**Files:**
- Create: `backend/internal/rollup/portfolio.go` — portfolio-level query returning all active programmes + top-level spaces as "portfolio items" with health status

- [ ] **Step 1: Write portfolio.go**

```go
package rollup

import (
    "context"
    "github.com/google/uuid"
)

type PortfolioItem struct {
    ID           uuid.UUID `json:"id"`
    Name         string    `json:"name"`
    ItemType     string    `json:"item_type"` // "programme" or "space"
    Status       string    `json:"status"`
    SpaceType    string    `json:"space_type,omitempty"`
    TotalCards   int       `json:"total_cards"`
    DoneCards    int       `json:"done_cards"`
    InFlight     int       `json:"in_flight"`
    HighPriOpen  int       `json:"high_pri_open"`
    Completion   float64   `json:"completion_pct"`
    AlignmentPct float64   `json:"alignment_pct"`
    OwnerID      uuid.UUID `json:"owner_id"`
    TargetDate   *string   `json:"target_date,omitempty"`
    Health       string    `json:"health"` // "green", "amber", "red"
}

type PortfolioResult struct {
    Items []PortfolioItem `json:"items"`
    WIPLimit int          `json:"wip_limit"`
    WIPCurrent int        `json:"wip_current"`
}
```

Add `GetPortfolio(ctx, tenantID)` method to Service that:
1. Queries all active programmes with their rollup stats (via programme_spaces join)
2. Queries top-level department/team spaces with their rollup stats
3. Computes health: green (completion > 50% and no high-pri cards aging > 7d), amber (completion 25-50% or some aging), red (completion < 25% or many aging high-pri)
4. Returns sorted by health (red first, then amber, then green)

- [ ] **Step 2: Add handler endpoint** `GET /portfolio` returning PortfolioResult
- [ ] **Step 3: Wire into router.go** — add route
- [ ] **Step 4: Build and commit**

---

### Task 10: Portfolio Frontend — Types & Hooks

**Files:**
- Create: `frontend/src/types/portfolio.ts`
- Create: `frontend/src/lib/api/portfolio.ts`
- Create: `frontend/src/hooks/usePortfolio.ts`

- [ ] **Step 1: Types**

```typescript
export interface PortfolioItem {
  id: string;
  name: string;
  item_type: "programme" | "space";
  status: string;
  space_type?: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  high_pri_open: number;
  completion_pct: number;
  alignment_pct: number;
  owner_id: string;
  target_date?: string;
  health: "green" | "amber" | "red";
}

export interface PortfolioResult {
  items: PortfolioItem[];
  wip_limit: number;
  wip_current: number;
}
```

- [ ] **Step 2: API + Hook** — `getPortfolio()` → `GET /portfolio`, `usePortfolio()` hook with 60s staleTime
- [ ] **Step 3: Build and commit**

---

### Task 11: Portfolio Board Page

**Files:**
- Create: `frontend/src/app/portfolio/page.tsx`
- Create: `frontend/src/components/portfolio/PortfolioCard.tsx` — a card representing a programme or initiative
- Create: `frontend/src/components/portfolio/PortfolioWIPBadge.tsx` — WIP current/limit indicator
- Modify: `frontend/src/components/common/Sidebar.tsx` — add Portfolio link

- [ ] **Step 1: Create PortfolioCard.tsx**

```tsx
"use client";

import type { PortfolioItem } from "@/types/portfolio";

const healthColors: Record<string, { bg: string; border: string; dot: string }> = {
  green: { bg: "bg-emerald-50/50", border: "border-l-emerald-500", dot: "bg-emerald-500" },
  amber: { bg: "bg-amber-50/50",   border: "border-l-amber-500",   dot: "bg-amber-500" },
  red:   { bg: "bg-rose-50/50",    border: "border-l-rose-500",    dot: "bg-rose-500" },
};

export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const h = healthColors[item.health] ?? healthColors.green;
  const targetDate = item.target_date
    ? new Date(item.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className={`bg-white ${h.bg} border ${h.border} border-l-4 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${h.dot}`} />
          <h3 className="text-sm font-[family-name:var(--font-display)] font-semibold text-neutral-800 truncate">
            {item.name}
          </h3>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-neutral-400 shrink-0 ml-2">
          {item.item_type === "programme" ? "Programme" : item.space_type}
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px] font-[family-name:var(--font-mono)] text-neutral-500">
        <span>{item.in_flight} in flight</span>
        <span>{Math.round(item.completion_pct)}% done</span>
        <span>{Math.round(item.alignment_pct)}% aligned</span>
        {item.high_pri_open > 0 && (
          <span className="text-rose-600">{item.high_pri_open} P0/P1</span>
        )}
      </div>
      {targetDate && (
        <p className="text-[10px] text-neutral-400 mt-2">Target: {targetDate}</p>
      )}
      <div className="mt-2">
        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"
            style={{ width: `${Math.round(item.completion_pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PortfolioWIPBadge.tsx**

Shows "X / Y active" where X is current WIP and Y is the limit. Red if over, amber if at, green if under.

- [ ] **Step 3: Create portfolio page**

```tsx
"use client";

import { Sidebar } from "@/components/common/Sidebar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useOrgRollup } from "@/hooks/useRollup";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { PortfolioWIPBadge } from "@/components/portfolio/PortfolioWIPBadge";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PortfolioPage() {
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: orgRollup } = useOrgRollup();

  const greenItems = (portfolio?.items ?? []).filter((i) => i.health === "green");
  const amberItems = (portfolio?.items ?? []).filter((i) => i.health === "amber");
  const redItems = (portfolio?.items ?? []).filter((i) => i.health === "red");

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
                Portfolio
              </h1>
              <p className="mt-2 text-sm text-neutral-500 max-w-xl">
                Flight Level 3 — all active initiatives, programmes, and key workstreams at a glance.
              </p>
            </div>
            {portfolio && (
              <PortfolioWIPBadge current={portfolio.wip_current} limit={portfolio.wip_limit} />
            )}
          </div>

          <RollupKPIs rollup={orgRollup} />

          {isLoading ? (
            <Skeleton variant="rectangle" height="200px" className="mt-8" />
          ) : (
            <div className="mt-8 space-y-6">
              {redItems.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-500 mb-3">
                    Needs Attention ({redItems.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {redItems.map((i) => <PortfolioCard key={i.id} item={i} />)}
                  </div>
                </section>
              )}
              {amberItems.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-500 mb-3">
                    At Risk ({amberItems.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {amberItems.map((i) => <PortfolioCard key={i.id} item={i} />)}
                  </div>
                </section>
              )}
              {greenItems.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-500 mb-3">
                    On Track ({greenItems.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {greenItems.map((i) => <PortfolioCard key={i.id} item={i} />)}
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

- [ ] **Step 4: Add Portfolio link to Sidebar** — use `Briefcase` icon from lucide-react, placed between Organization and Programmes

- [ ] **Step 5: Build and commit**

---

## Summary

| Part | Tasks | What it delivers |
|------|-------|-----------------|
| A: Work Types & WIP | 1–5 | Flow Framework card classification, WIP limit config per space, visual limit warnings on board columns |
| B: Flow Distribution | 6–8 | Capacity split by work type in rollup metrics, actual-vs-target gauge, space settings panel for WIP + capacity config |
| C: Portfolio Board | 9–11 | FL3 portfolio page grouping items by health (red/amber/green), WIP badge, org-level KPIs, portfolio card components |
