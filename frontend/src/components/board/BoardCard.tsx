"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, User } from "lucide-react";
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

function getDaysInColumn(movedAt: string): number {
  const moved = new Date(movedAt);
  const now = new Date();
  return Math.floor((now.getTime() - moved.getTime()) / (1000 * 60 * 60 * 24));
}

function getAgingClass(days: number): string {
  if (days < 3) return "";
  if (days < 5) return "card-aging-mild";
  if (days < 10) return "card-aging-moderate";
  return "card-aging-severe";
}

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
  const daysInColumn = getDaysInColumn(card.moved_at);
  const agingClass = card.column_name !== "done" ? getAgingClass(daysInColumn) : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // dnd-kit prevents onClick if drag occurred (distance > 5px)
        // So if onClick fires, it was a click not a drag
        if (!isDragging) onClick?.(card);
      }}
      className={`${agingClass} bg-white border border-neutral-200/60 border-l-2 ${borderClass} rounded-[var(--radius-md)] cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isDragging
          ? "shadow-[var(--shadow-xl)] opacity-90 z-50"
          : "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-neutral-300/80"
      }`}
    >
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-medium text-neutral-800 leading-snug flex-1">
            {card.title}
          </p>
          {daysInColumn >= 3 && card.column_name !== "done" && (
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-amber-500 whitespace-nowrap">
              {daysInColumn}d
            </span>
          )}
        </div>
        {card.description && (
          <p className="mt-1 text-[13px] text-neutral-500 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {priority && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${priorityStyles[priority].className}`}>
              {priorityStyles[priority].label}
            </span>
          )}
          {card.labels?.map((label) => (
            <span key={label} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-primary-50 text-primary-700">
              {label}
            </span>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            {card.assignee_id && (
              <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                <User size={10} className="text-primary-600" />
              </span>
            )}
            {card.due_date && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                <Calendar size={10} />
                {new Date(card.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
