"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";
import type { Card } from "@/types/card";

interface BoardCardProps {
  card: Card;
  onClick?: (card: Card) => void;
}

const priorityStyles: Record<string, { label: string; className: string; border: string }> = {
  p0: { label: "P0", className: "bg-rose-50 text-rose-600 border-rose-200", border: "border-l-red-500" },
  p1: { label: "P1", className: "bg-amber-50 text-amber-600 border-amber-200", border: "border-l-amber-500" },
  p2: { label: "P2", className: "bg-yellow-50 text-yellow-600 border-yellow-200", border: "border-l-yellow-400" },
  p3: { label: "P3", className: "bg-neutral-50 text-neutral-500 border-neutral-200", border: "border-l-neutral-300" },
};

export function BoardCard({ card, onClick }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = card.priority && priorityStyles[card.priority] ? card.priority : null;
  const borderClass = priority ? priorityStyles[priority].border : "border-l-transparent";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-neutral-200/60 border-l-2 ${borderClass} rounded-[var(--radius-md)] transition-all select-none ${
        isDragging
          ? "shadow-[var(--shadow-xl)] opacity-90 border-neutral-300"
          : "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-neutral-300/80"
      }`}
      onClick={() => onClick?.(card)}
    >
      {/* Drag handle strip at top */}
      <div
        {...attributes}
        {...listeners}
        className="h-1.5 cursor-grab active:cursor-grabbing bg-neutral-100/50 rounded-t-[var(--radius-md)] hover:bg-neutral-200/50 transition-colors"
      />
      {/* Card content - clickable */}
      <div className="p-2.5">
        <p className="text-[14px] font-medium text-neutral-800 leading-snug">
          {card.title}
        </p>
        {card.description && (
          <p className="mt-1 text-[13px] text-neutral-500 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {priority && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${priorityStyles[priority].className}`}
            >
              {priorityStyles[priority].label}
            </span>
          )}
          {card.labels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-primary-50 text-primary-700"
            >
              {label}
            </span>
          ))}
          {card.due_date && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 ml-auto">
              <Calendar size={10} />
              {new Date(card.due_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
