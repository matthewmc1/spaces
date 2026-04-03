"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Card } from "@/types/card";

interface BoardCardProps {
  card: Card;
}

const priorityStyles: Record<string, { label: string; className: string }> = {
  p0: { label: "P0", className: "bg-red-100 text-red-700 border-red-200" },
  p1: { label: "P1", className: "bg-orange-100 text-orange-700 border-orange-200" },
  p2: { label: "P2", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  p3: { label: "P3", className: "bg-gray-100 text-gray-600 border-gray-200" },
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-3 select-none ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
          tabIndex={-1}
          aria-label="Drag card"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug">
            {card.title}
          </p>
          {card.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {card.priority && priorityStyles[card.priority] && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${priorityStyles[card.priority].className}`}
              >
                {priorityStyles[card.priority].label}
              </span>
            )}
            {card.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100"
              >
                {label}
              </span>
            ))}
            {card.due_date && (
              <span className="text-xs text-gray-400 ml-auto">
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
  );
}
