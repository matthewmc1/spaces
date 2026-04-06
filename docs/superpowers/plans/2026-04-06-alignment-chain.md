# Alignment Chain Visualization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual alignment chain that traces any card upward through goals to org-level objectives, and any goal downward to the cards that support it — answering "is this work aligned with company priorities?"

**Architecture:** A new backend endpoint `GET /goals/{id}/chain` traverses goal_links upward (goal → parent goal) and downward (goal ← cards/sub-goals). The frontend renders this as a vertical chain diagram in a slide-out panel accessible from card detail and goal views. Goals at each level show their space context so you can see the hierarchy: Card → Team Goal → Department Goal → Org Goal.

**Tech Stack:** Go stdlib + pgx, Next.js 16 + TanStack Query, Tailwind v4, SVG connector lines

---

### Task 1: Backend — Alignment Chain Endpoint

**Files:**
- Create: `backend/internal/goals/chain.go`
- Modify: `backend/internal/goals/handler.go` — add HandleGetChain
- Modify: `backend/internal/goals/routes.go` — add GET /goals/{id}/chain

- [ ] **Step 1: Write chain.go**

The chain walks goal_links in both directions from a given goal:
- **Upward:** find goal_links where `source_type='goal' AND source_id=thisGoal` → target is a parent goal. Recurse until no more parents.
- **Downward:** find goal_links where `target_goal_id=thisGoal` → sources are cards or sub-goals. One level only (direct supporters).

```go
package goals

import (
	"context"

	"github.com/google/uuid"
)

type ChainNode struct {
	ID         uuid.UUID   `json:"id"`
	Type       string      `json:"type"` // "goal" or "card"
	Title      string      `json:"title"`
	Status     string      `json:"status,omitempty"`
	SpaceID    uuid.UUID   `json:"space_id"`
	SpaceName  string      `json:"space_name"`
	SpaceType  string      `json:"space_type"`
	LinkType   string      `json:"link_type,omitempty"` // supports, drives, blocks
	Priority   string      `json:"priority,omitempty"`  // for cards
	ColumnName string      `json:"column_name,omitempty"` // for cards
	WorkType   string      `json:"work_type,omitempty"` // for cards
}

type AlignmentChain struct {
	Goal       ChainNode   `json:"goal"`       // the focal goal
	Ancestors  []ChainNode `json:"ancestors"`   // parent goals upward (nearest first)
	Supporters []ChainNode `json:"supporters"`  // cards and sub-goals that support this goal
}

// GetChain builds the alignment chain for a goal.
func (s *Service) GetChain(ctx context.Context, tenantID, goalID uuid.UUID) (*AlignmentChain, error) {
	// 1. Get the focal goal with space info
	goal, err := s.repo.GetByID(ctx, tenantID, goalID)
	if err != nil {
		return nil, err
	}

	chain := &AlignmentChain{}

	// Fetch space info for the focal goal
	focalSpace, _ := s.getSpaceInfo(ctx, tenantID, goal.SpaceID)
	chain.Goal = ChainNode{
		ID:        goal.ID,
		Type:      "goal",
		Title:     goal.Title,
		Status:    goal.Status,
		SpaceID:   goal.SpaceID,
		SpaceName: focalSpace.Name,
		SpaceType: focalSpace.SpaceType,
	}

	// 2. Walk upward: find parent goals (this goal links to parent via source_type='goal', source_id=thisGoal)
	chain.Ancestors = s.walkUp(ctx, tenantID, goalID)

	// 3. Walk downward: find supporters (cards/goals that link TO this goal)
	chain.Supporters = s.walkDown(ctx, tenantID, goalID)

	return chain, nil
}

type spaceInfo struct {
	Name      string
	SpaceType string
}

func (s *Service) getSpaceInfo(ctx context.Context, tenantID, spaceID uuid.UUID) (spaceInfo, error) {
	const q = `SELECT name, space_type FROM spaces WHERE id = $1 AND tenant_id = $2`
	var info spaceInfo
	err := s.repo.(*pgRepository).db.QueryRow(ctx, q, spaceID, tenantID).Scan(&info.Name, &info.SpaceType)
	return info, err
}
```

Wait — the service doesn't have direct DB access, only the repository. Let me add these queries to the repository instead.

Add to the Repository interface:
```go
GetChainUp(ctx context.Context, tenantID, goalID uuid.UUID) ([]ChainNode, error)
GetChainDown(ctx context.Context, tenantID, goalID uuid.UUID) ([]ChainNode, error)
GetGoalWithSpace(ctx context.Context, tenantID, goalID uuid.UUID) (*ChainNode, error)
```

Implement in repository.go:
- `GetGoalWithSpace`: JOIN goals with spaces to get space name and type
- `GetChainUp`: recursive CTE walking goal_links where source_type='goal' upward
- `GetChainDown`: simple query on goal_links where target_goal_id = goalID, joining back to goals/cards for details

The service's `GetChain` then just calls these 3 methods and assembles.

- [ ] **Step 2: Add handler**

```go
func (h *Handler) HandleGetChain(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil { respond.Error(w, err); return }
	goalID, err := uuid.Parse(r.PathValue("id"))
	if err != nil { respond.Error(w, errors.Validation("invalid goal id")); return }
	chain, err := h.svc.GetChain(r.Context(), tenantID, goalID)
	if err != nil { respond.Error(w, err); return }
	respond.JSON(w, http.StatusOK, chain)
}
```

- [ ] **Step 3: Add route**

```go
mux.Handle("GET /goals/{id}/chain", read(h.HandleGetChain))
```

- [ ] **Step 4: Build and commit**

```bash
cd backend && go build ./...
git commit -m "feat: alignment chain endpoint — GET /goals/{id}/chain"
```

---

### Task 2: Backend — Card Alignment Lookup

**Files:**
- Modify: `backend/internal/goals/handler.go` — add HandleGetCardAlignment
- Modify: `backend/internal/goals/routes.go` — add GET /cards/{id}/alignment

Given a card ID, find all goals it's linked to and return the chain for each. This lets the card detail dialog show "this card supports Goal X which supports Org Goal Y".

- [ ] **Step 1: Add service method**

```go
// GetCardAlignment returns the alignment chains for all goals a card supports.
func (s *Service) GetCardAlignment(ctx context.Context, tenantID, cardID uuid.UUID) ([]AlignmentChain, error) {
	links, err := s.repo.ListLinksBySource(ctx, tenantID, "card", cardID)
	if err != nil {
		return nil, err
	}
	var chains []AlignmentChain
	for _, link := range links {
		chain, err := s.GetChain(ctx, tenantID, link.TargetGoalID)
		if err != nil {
			continue // best-effort — skip broken chains
		}
		chains = append(chains, *chain)
	}
	if chains == nil {
		chains = []AlignmentChain{}
	}
	return chains, nil
}
```

- [ ] **Step 2: Add handler and route**

Handler: `HandleGetCardAlignment` — extracts card ID from path `{id}`, calls service
Route: `GET /cards/{id}/alignment` — read access

- [ ] **Step 3: Build and commit**

---

### Task 3: Frontend — Types, API, Hooks

**Files:**
- Modify: `frontend/src/types/goal.ts` — add ChainNode, AlignmentChain types
- Modify: `frontend/src/lib/api/goals.ts` — add getGoalChain, getCardAlignment
- Modify: `frontend/src/hooks/useGoals.ts` — add useGoalChain, useCardAlignment

- [ ] **Step 1: Add types**

```typescript
export interface ChainNode {
  id: string;
  type: "goal" | "card";
  title: string;
  status?: string;
  space_id: string;
  space_name: string;
  space_type: string;
  link_type?: string;
  priority?: string;
  column_name?: string;
  work_type?: string;
}

export interface AlignmentChain {
  goal: ChainNode;
  ancestors: ChainNode[];
  supporters: ChainNode[];
}
```

- [ ] **Step 2: Add API functions**

```typescript
export function getGoalChain(goalId: string): Promise<AlignmentChain> {
  return apiFetch<AlignmentChain>(`/goals/${goalId}/chain`);
}

export function getCardAlignment(cardId: string): Promise<AlignmentChain[]> {
  return apiFetch<AlignmentChain[]>(`/cards/${cardId}/alignment`);
}
```

- [ ] **Step 3: Add hooks**

```typescript
export function useGoalChain(goalId: string) {
  return useQuery({
    queryKey: ["goals", goalId, "chain"],
    queryFn: () => getGoalChain(goalId),
    enabled: !!goalId,
  });
}

export function useCardAlignment(cardId: string) {
  return useQuery({
    queryKey: ["cards", cardId, "alignment"],
    queryFn: () => getCardAlignment(cardId),
    enabled: !!cardId,
  });
}
```

- [ ] **Step 4: Build and commit**

---

### Task 4: Alignment Chain Component

**Files:**
- Create: `frontend/src/components/goals/AlignmentChain.tsx`

A vertical chain visualization showing the alignment path from org goal down to cards. Each node is a box connected by vertical lines. The focal goal is highlighted.

```tsx
"use client";

import type { AlignmentChain as AlignmentChainType, ChainNode } from "@/types/goal";
import { WORK_TYPES } from "@/types/flow";
import { Target, FileText, ArrowDown, Building2, Users, Layers, Folder } from "lucide-react";

interface AlignmentChainProps {
  chains: AlignmentChainType[];
}

const spaceTypeIcon: Record<string, typeof Target> = {
  organization: Building2,
  department: Layers,
  team: Users,
  workstream: Folder,
};

function ChainNodeCard({ node, isFocal }: { node: ChainNode; isFocal?: boolean }) {
  const Icon = node.type === "goal" ? Target : FileText;
  const SpaceIcon = spaceTypeIcon[node.space_type] ?? Folder;
  const workTypeInfo = node.work_type ? WORK_TYPES.find((wt) => wt.key === node.work_type) : null;

  return (
    <div className={`relative rounded-[var(--radius-md)] border p-3 ${
      isFocal
        ? "bg-primary-50 border-primary-300 ring-2 ring-primary-200"
        : "bg-white border-neutral-200"
    }`}>
      <div className="flex items-start gap-2">
        <Icon size={14} className={isFocal ? "text-primary-600 mt-0.5" : "text-neutral-400 mt-0.5"} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isFocal ? "text-primary-800" : "text-neutral-800"}`}>
            {node.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <SpaceIcon size={10} className="text-neutral-400" />
            <span className="text-[10px] text-neutral-400">{node.space_name}</span>
            {node.status && (
              <span className="text-[10px] text-neutral-400 uppercase">{node.status}</span>
            )}
            {node.link_type && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-100 text-neutral-500">{node.link_type}</span>
            )}
            {workTypeInfo && (
              <span className={`text-[9px] px-1 py-0.5 rounded ${workTypeInfo.bgColor} ${workTypeInfo.color}`}>
                {workTypeInfo.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="w-px h-3 bg-neutral-300" />
        <ArrowDown size={10} className="text-neutral-300" />
        <div className="w-px h-3 bg-neutral-300" />
      </div>
    </div>
  );
}

export function AlignmentChainView({ chains }: AlignmentChainProps) {
  if (chains.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic">
        No alignment chain — this item is not linked to any goals.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {chains.map((chain, idx) => (
        <div key={idx} className="space-y-0">
          {/* Ancestors (top-level first) */}
          {[...chain.ancestors].reverse().map((node) => (
            <div key={node.id}>
              <ChainNodeCard node={node} />
              <Connector />
            </div>
          ))}

          {/* Focal goal */}
          <ChainNodeCard node={chain.goal} isFocal />

          {/* Supporters */}
          {chain.supporters.length > 0 && (
            <>
              <Connector />
              <div className="space-y-2 pl-4 border-l-2 border-neutral-200 ml-3">
                {chain.supporters.map((node) => (
                  <ChainNodeCard key={node.id} node={node} />
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 1: Create the component file**
- [ ] **Step 2: Build and commit**

---

### Task 5: Wire Alignment Chain into Card Detail and Goal Panel

**Files:**
- Modify: `frontend/src/components/board/CardDetailDialog.tsx` — add "Alignment" section using useCardAlignment
- Modify: `frontend/src/components/goals/GoalsList.tsx` — show chain on goal click/expand

- [ ] **Step 1: CardDetailDialog — add Alignment section**

After the "Goal Links" section, add an "Alignment Chain" section:

```tsx
import { useCardAlignment } from "@/hooks/useGoals";
import { AlignmentChainView } from "@/components/goals/AlignmentChain";

// Inside the component, after other hooks:
const { data: alignment } = useCardAlignment(card?.id ?? "");

// In the JSX, after Goal Links section:
<div>
  <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Alignment Chain</p>
  <AlignmentChainView chains={alignment ?? []} />
</div>
```

- [ ] **Step 2: GoalsList — show chain inline when a goal is expanded**

Add a toggle state per goal. When clicked, fetch and display the chain. Use `useGoalChain(selectedGoalId)` and render `<AlignmentChainView chains={chain ? [chain] : []} />`.

- [ ] **Step 3: Build and commit**

---

## Summary

| Task | What it delivers |
|------|-----------------|
| 1 | Backend endpoint `GET /goals/{id}/chain` with recursive upward walk + downward supporters |
| 2 | Backend endpoint `GET /cards/{id}/alignment` returning chains for all goals a card supports |
| 3 | Frontend types, API functions, React Query hooks for both endpoints |
| 4 | `AlignmentChainView` component — vertical chain with org goal → team goal → card hierarchy |
| 5 | Wired into CardDetailDialog and GoalsList for discovery from both entry points |
