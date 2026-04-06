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
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";
import { useCards, useMoveCard, useUpdateCard, useDeleteCard, cardsByColumn } from "@/hooks/useCards";
import { usePermissions } from "@/hooks/usePermissions";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { useRealtime } from "@/hooks/useRealtime";
import { BoardColumn } from "./BoardColumn";
import { BoardCard, CardOverlay } from "./BoardCard";
import { BoardHeader } from "./BoardHeader";
import { BoardGrouping, type GroupBy } from "./BoardGrouping";
import { ColumnConfigDropdown } from "./ColumnConfigDropdown";
import { TriageDrawer } from "./TriageDrawer";
import { CreateCardDialog } from "./CreateCardDialog";
import { CardDetailDialog } from "./CardDetailDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { GoalsList } from "@/components/goals/GoalsList";
import { SpaceSettingsPanel } from "@/components/spaces/SpaceSettingsPanel";

const COLUMN_IDS = new Set<string>(COLUMNS.map((c) => c.key));

// Custom collision: use rect intersection so crossing column boundaries triggers detection
const customCollision: CollisionDetection = (args) => {
  // rectIntersection detects when the dragged item's rectangle overlaps drop targets
  const rectCollisions = rectIntersection(args);

  if (rectCollisions.length === 0) {
    // Fallback to pointer-within for edge cases
    return pointerWithin(args);
  }

  // Prefer card hits (for positioning within column) over column hits (for end-of-list)
  const cardHit = rectCollisions.find((c) => !COLUMN_IDS.has(String(c.id)));
  if (cardHit) return [cardHit];

  // Otherwise use column hit
  const columnHit = rectCollisions.find((c) => COLUMN_IDS.has(String(c.id)));
  if (columnHit) return [columnHit];

  return rectCollisions;
};

interface BoardProps {
  spaceId: string;
  spaceName?: string;
  spaceDescription?: string;
  spaceType?: "organization" | "department" | "team" | "workstream";
  spaceWipLimits?: Record<string, number>;
  insightsOpen: boolean;
  onToggleInsights: () => void;
}

export function Board({
  spaceId,
  spaceName = "",
  spaceDescription,
  spaceType,
  spaceWipLimits,
  insightsOpen,
  onToggleInsights,
}: BoardProps) {
  const perms = usePermissions();
  const { data: cards, isLoading } = useCards(spaceId);
  const moveCard = useMoveCard(spaceId);
  const updateCard = useUpdateCard(spaceId);
  const deleteCard = useDeleteCard(spaceId);
  const { visible, toggle, showAll } = useColumnVisibility(spaceId);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [overColumn, setOverColumn] = useState<Column | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  // Real-time updates. Uses "dev-token" until Clerk auth is wired in Task 11.
  useRealtime(spaceId, "dev-token");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const grouped = useMemo(() => cardsByColumn(cards ?? []), [cards]);

  const visibleColumns = COLUMNS.filter((col) => visible.includes(col.key));

  const totalCards = cards?.length ?? 0;
  const totalColumns = visibleColumns.length;

  function onDragStart(event: DragStartEvent) {
    const card = event.active.data.current?.card as Card | undefined;
    if (card) setActiveCard(card);
  }

  function onDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) { setOverColumn(null); return; }

    const overCard = over.data.current?.card as Card | undefined;
    if (overCard) {
      setOverColumn(overCard.column_name);
    } else if (COLUMN_IDS.has(String(over.id))) {
      setOverColumn(over.id as Column);
    } else {
      setOverColumn(null);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const currentActive = activeCard;
    setActiveCard(null);
    setOverColumn(null);

    const { active, over } = event;
    if (!over || !currentActive) return;

    const draggedCard = active.data.current?.card as Card | undefined;
    if (!draggedCard) return;

    // Determine target column
    let targetColumn: Column;
    const overCard = over.data.current?.card as Card | undefined;

    if (overCard) {
      // Dropped on a card — use that card's column
      targetColumn = overCard.column_name;
    } else if (COLUMN_IDS.has(String(over.id))) {
      // Dropped on a column droppable
      targetColumn = over.id as Column;
    } else {
      return; // Unknown drop target
    }

    // Calculate position
    const targetCards = grouped[targetColumn] || [];

    let position: number;
    if (overCard && overCard.id !== draggedCard.id) {
      const overIndex = targetCards.findIndex((c) => c.id === overCard.id);
      const prev = overIndex > 0 ? targetCards[overIndex - 1] : null;
      const next = targetCards[overIndex] ?? null;

      if (prev && next) {
        position = (prev.position + next.position) / 2;
      } else if (prev) {
        position = prev.position + 1000;
      } else if (next) {
        position = next.position / 2;
      } else {
        position = 1000;
      }
    } else {
      // Dropped on column — go to end
      const lastCard = targetCards
        .filter((c) => c.id !== draggedCard.id)
        .at(-1);
      position = lastCard ? lastCard.position + 1000 : 1000;
    }

    // Skip if no actual change
    if (
      draggedCard.column_name === targetColumn &&
      Math.abs(draggedCard.position - position) < 0.001
    ) {
      return;
    }

    moveCard.mutate({
      cardId: draggedCard.id,
      input: { column: targetColumn, position },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rectangle" height="40px" width="300px" />
        <div className="flex gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="rectangle"
              width="280px"
              height="200px"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <BoardHeader
        spaceId={spaceId}
        spaceName={spaceName}
        spaceDescription={spaceDescription}
        spaceType={spaceType}
        triageOpen={triageOpen}
        onToggleTriage={() => setTriageOpen(!triageOpen)}
        insightsOpen={insightsOpen}
        onToggleInsights={onToggleInsights}
        goalsOpen={goalsOpen}
        onToggleGoals={() => setGoalsOpen(!goalsOpen)}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen(!settingsOpen)}
        onAddCard={() => setShowCreateCard(true)}
        totalCards={totalCards}
        totalColumns={totalColumns}
        canEdit={perms.canEdit}
        columnConfigSlot={
          <ColumnConfigDropdown
            visible={visible}
            onToggle={toggle}
            onShowAll={showAll}
          />
        }
        groupingSlot={
          <BoardGrouping value={groupBy} onChange={setGroupBy} />
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={customCollision}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          <TriageDrawer
            open={triageOpen}
            onClose={() => setTriageOpen(false)}
            cardsByColumn={grouped}
            onAddCard={perms.canEdit ? () => setShowCreateCard(true) : undefined}
            onCardClick={setSelectedCard}
          />

          <div className="board-surface relative flex gap-5 overflow-x-auto flex-1 pb-4">
            {visibleColumns.map(({ key, label }) => (
              <BoardColumn
                key={key}
                column={key}
                label={label}
                cards={grouped[key]}
                onAddCard={
                  perms.canEdit && key === "inbox"
                    ? () => setShowCreateCard(true)
                    : undefined
                }
                onCardClick={setSelectedCard}
                isTargeted={overColumn === key && activeCard?.column_name !== key}
                groupBy={groupBy}
                wipLimit={spaceWipLimits?.[key]}
              />
            ))}
          </div>

          <GoalsList
            spaceId={spaceId}
            open={goalsOpen}
            onClose={() => setGoalsOpen(false)}
          />
          <SpaceSettingsPanel
            spaceId={spaceId}
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}>
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        card={selectedCard}
        spaceId={spaceId}
        onClose={() => setSelectedCard(null)}
        onUpdate={perms.canEdit ? (cardId, updates) =>
          updateCard.mutate({ cardId, input: updates }) : undefined}
        onMove={perms.canEdit ? (id, col, pos) =>
          moveCard.mutate({
            cardId: id,
            input: { column: col, position: pos },
          }) : undefined}
        onDelete={perms.canAdmin ? (cardId) => deleteCard.mutate(cardId) : undefined}
      />

      {perms.canEdit && showCreateCard && (
        <CreateCardDialog
          spaceId={spaceId}
          onClose={() => setShowCreateCard(false)}
        />
      )}
    </>
  );
}
