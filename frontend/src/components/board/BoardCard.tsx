"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Card } from "@/types/card";

interface BoardCardProps {
  card: Card;
}

const priorityStyles: Record<string, { label: string; className: string; stripe: string }> = {
  p0: { label: "P0", className: "bg-rose-50 text-rose-700 border-rose-200", stripe: "bg-red-500" },
  p1: { label: "P1", className: "bg-amber-50 text-amber-700 border-amber-200", stripe: "bg-amber-500" },
  p2: { label: "P2", className: "bg-yellow-50 text-yellow-700 border-yellow-200", stripe: "bg-yellow-400" },
  p3: { label: "P3", className: "bg-neutral-100 text-neutral-600 border-neutral-200", stripe: "bg-neutral-300" },
};

export function BoardCard({ card }: BoardCardProps) {
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
  const stripeColor = priority ? priorityStyles[priority].stripe : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-lift overflow-hidden bg-white border rounded-[var(--radius-md)] transition-all select-none ${
        isDragging
          ? "shadow-[var(--shadow-xl)] opacity-90 border-neutral-300"
          : "shadow-[var(--shadow-sm)] border-neutral-200 hover:shadow-[var(--shadow-md)] hover:border-neutral-300"
      }`}
    >
      <div className="flex">
        {/* Priority stripe */}
        <div
          className={`w-[3px] flex-shrink-0 ${stripeColor ?? ""}`}
          style={!stripeColor ? { backgroundColor: "transparent" } : undefined}
        />
        {/* Card content */}
        <div className="flex items-start gap-2 p-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing flex-shrink-0"
            tabIndex={-1}
            aria-label="Drag card"
          >
            <GripVertical size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-800 leading-snug">
              {card.title}
            </p>
            {card.description && (
              <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                {card.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {priority && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${priorityStyles[priority].className}`}
                >
                  {priorityStyles[priority].label}
                </span>
              )}
              {card.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700"
                >
                  {label}
                </span>
              ))}
              {card.due_date && (
                <span className="text-xs text-neutral-400 ml-auto">
                  {new Date(card.due_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
