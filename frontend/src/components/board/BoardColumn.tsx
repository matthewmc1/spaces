"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";
import { BoardCard } from "./BoardCard";

interface BoardColumnProps {
  column: Column;
  label: string;
  cards: Card[];
  onAddCard?: () => void;
  onCardClick?: (card: Card) => void;
}

const ADD_CARD_COLUMNS: Column[] = ["inbox"];

export function BoardColumn({ column, label, cards, onAddCard, onCardClick }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { column },
  });

  const colConfig = COLUMNS.find((c) => c.key === column);

  return (
    <div
      className={`flex flex-col rounded-[var(--radius-lg)] border-t-2 w-[280px] flex-shrink-0 bg-neutral-50/80 ${
        colConfig?.borderColor ?? "border-t-neutral-300"
      } ${
        isOver ? "ring-2 ring-primary-300 ring-inset" : ""
      } transition-all`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/60">
        <div className="flex items-center gap-2.5">
          <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-neutral-700 tracking-[-0.01em]">
            {label}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-neutral-400 tabular-nums">
            {cards.length}
          </span>
        </div>
        {ADD_CARD_COLUMNS.includes(column) && onAddCard && (
          <button
            onClick={onAddCard}
            className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/60 rounded-[var(--radius-sm)] p-0.5 transition-colors"
            aria-label="Add card"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 px-2.5 py-2.5 overflow-y-auto min-h-[160px] ${
          cards.length === 0
            ? "items-center justify-center"
            : ""
        }`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 ? (
            <div className="w-full border border-dashed border-neutral-200 rounded-[var(--radius-md)] py-8 flex flex-col items-center justify-center gap-1.5">
              <Plus size={14} className="text-neutral-300" />
              <span className="text-[11px] text-neutral-400">Drop items here</span>
            </div>
          ) : (
            cards.map((card) => (
              <BoardCard key={card.id} card={card} onClick={onCardClick} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
