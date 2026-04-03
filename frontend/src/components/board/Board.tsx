"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";
import { useCards, useMoveCard, cardsByColumn } from "@/hooks/useCards";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { BoardColumn } from "./BoardColumn";
import { BoardCard } from "./BoardCard";
import { BoardHeader } from "./BoardHeader";
import { ColumnConfigDropdown } from "./ColumnConfigDropdown";
import { TriageDrawer } from "./TriageDrawer";
import { CreateCardDialog } from "./CreateCardDialog";
import { CardDetailDialog } from "./CardDetailDialog";
import { Skeleton } from "@/components/ui/Skeleton";

interface BoardProps {
  spaceId: string;
  spaceName?: string;
  spaceDescription?: string;
  insightsOpen: boolean;
  onToggleInsights: () => void;
}

export function Board({
  spaceId,
  spaceName = "",
  spaceDescription,
  insightsOpen,
  onToggleInsights,
}: BoardProps) {
  const { data: cards, isLoading } = useCards(spaceId);
  const moveCard = useMoveCard(spaceId);
  const { visible, toggle, showAll } = useColumnVisibility(spaceId);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
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

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);

    const { active, over } = event;
    if (!over) return;

    const draggedCard = active.data.current?.card as Card | undefined;
    if (!draggedCard) return;

    let targetColumn: Column;
    const overCard = over.data.current?.card as Card | undefined;
    if (overCard) {
      targetColumn = overCard.column_name;
    } else {
      targetColumn = over.id as Column;
    }

    const targetCards = grouped[targetColumn];

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
      const lastCard = targetCards
        .filter((c) => c.id !== draggedCard.id)
        .at(-1);
      position = lastCard ? lastCard.position + 1000 : 1000;
    }

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
            <Skeleton key={i} variant="rectangle" width="280px" height="200px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <BoardHeader
        spaceName={spaceName}
        spaceDescription={spaceDescription}
        triageOpen={triageOpen}
        onToggleTriage={() => setTriageOpen(!triageOpen)}
        insightsOpen={insightsOpen}
        onToggleInsights={onToggleInsights}
        totalCards={totalCards}
        totalColumns={totalColumns}
        columnConfigSlot={
          <ColumnConfigDropdown
            visible={visible}
            onToggle={toggle}
            onShowAll={showAll}
          />
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          <TriageDrawer
            open={triageOpen}
            onClose={() => setTriageOpen(false)}
            cardsByColumn={grouped}
            onAddCard={() => setShowCreateCard(true)}
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
                  key === "inbox" ? () => setShowCreateCard(true) : undefined
                }
                onCardClick={setSelectedCard}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? <BoardCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onMove={(id, col, pos) => moveCard.mutate({ cardId: id, input: { column: col, position: pos } })}
      />

      {showCreateCard && (
        <CreateCardDialog
          spaceId={spaceId}
          onClose={() => setShowCreateCard(false)}
        />
      )}
    </>
  );
}
