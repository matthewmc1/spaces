"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Card, Column } from "@/types/card";
import { BoardCard } from "./BoardCard";

interface BoardColumnProps {
  column: Column;
  label: string;
  cards: Card[];
  onAddCard?: () => void;
}

const columnBorderColors: Record<Column, string> = {
  inbox: "border-t-gray-400",
  icebox: "border-t-sky-400",
  freezer: "border-t-blue-500",
  planned: "border-t-violet-500",
  in_progress: "border-t-amber-500",
  review: "border-t-orange-500",
  done: "border-t-green-500",
};

export function BoardColumn({ column, label, cards, onAddCard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { column },
  });

  return (
    <div
      className={`flex flex-col bg-gray-50 rounded-lg border-t-4 ${columnBorderColors[column]} ${
        isOver ? "ring-2 ring-blue-300 ring-inset" : ""
      } transition-all w-64 flex-shrink-0`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 font-medium leading-none">
            {cards.length}
          </span>
        </div>
        {column === "inbox" && onAddCard && (
          <button
            onClick={onAddCard}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded p-0.5 transition-colors"
            aria-label="Add card"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 p-2 overflow-y-auto"
        style={{ minHeight: "100px" }}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <BoardCard key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
