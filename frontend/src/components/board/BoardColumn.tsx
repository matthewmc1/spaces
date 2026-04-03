"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";
import { Badge } from "@/components/ui/Badge";
import { BoardCard } from "./BoardCard";

interface BoardColumnProps {
  column: Column;
  label: string;
  cards: Card[];
  onAddCard?: () => void;
}

const ADD_CARD_COLUMNS: Column[] = ["inbox"];

export function BoardColumn({ column, label, cards, onAddCard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { column },
  });

  const colConfig = COLUMNS.find((c) => c.key === column);

  return (
    <div
      className={`flex flex-col rounded-[var(--radius-lg)] border-t-[3px] w-[280px] flex-shrink-0 ${
        colConfig?.borderColor ?? "border-t-neutral-300"
      } ${colConfig?.bgColor ?? "bg-neutral-50"} ${
        isOver ? "ring-2 ring-primary-300 ring-inset" : ""
      } transition-all`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-neutral-700">{label}</span>
          <Badge variant="default" className="font-mono">
            {cards.length}
          </Badge>
        </div>
        {ADD_CARD_COLUMNS.includes(column) && onAddCard && (
          <button
            onClick={onAddCard}
            className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded p-0.5 transition-colors"
            aria-label="Add card"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex flex-col space-y-2 p-2 overflow-y-auto min-h-[120px] ${
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
            <div className="w-full border-2 border-dashed border-neutral-200 rounded-[var(--radius-md)] py-6 flex items-center justify-center">
              <span className="text-xs text-neutral-400">No cards</span>
            </div>
          ) : (
            cards.map((card) => (
              <BoardCard key={card.id} card={card} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
