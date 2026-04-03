"use client";

import { useState } from "react";
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
import { BoardColumn } from "./BoardColumn";
import { BoardCard } from "./BoardCard";
import { CreateCardDialog } from "./CreateCardDialog";

interface BoardProps {
  spaceId: string;
}

export function Board({ spaceId }: BoardProps) {
  const { data: cards, isLoading } = useCards(spaceId);
  const moveCard = useMoveCard(spaceId);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const grouped = cardsByColumn(cards ?? []);

  function onDragStart(event: DragStartEvent) {
    const card = event.active.data.current?.card as Card | undefined;
    if (card) {
      setActiveCard(card);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);

    const { active, over } = event;
    if (!over) return;

    const draggedCard = active.data.current?.card as Card | undefined;
    if (!draggedCard) return;

    // Determine target column: either the over item's card column or the over id as Column
    let targetColumn: Column;
    const overCard = over.data.current?.card as Card | undefined;
    if (overCard) {
      targetColumn = overCard.column_name;
    } else {
      targetColumn = over.id as Column;
    }

    // Calculate position
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
      // Drop on column droppable (end of list)
      const lastCard = targetCards.filter((c) => c.id !== draggedCard.id).at(-1);
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
      <div className="flex gap-4 p-4 overflow-x-auto">
        {COLUMNS.map(({ key }) => (
          <div
            key={key}
            className="w-64 flex-shrink-0 h-48 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 p-4 overflow-x-auto h-full">
          {COLUMNS.map(({ key, label }) => (
            <BoardColumn
              key={key}
              column={key}
              label={label}
              cards={grouped[key]}
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
