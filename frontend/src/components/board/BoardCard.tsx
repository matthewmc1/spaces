"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, User } from "lucide-react";
import type { Card } from "@/types/card";

interface BoardCardProps {
  card: Card;
  onClick?: (card: Card) => void;
}

const priorityStyles: Record<
  string,
  { label: string; className: string; border: string }
> = {
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

/**
 * Static card content — used by both BoardCard (in-column) and CardOverlay (drag).
 * Extracted so both render identically.
 */
export function CardContent({ card }: { card: Card }) {
  const isDone = card.column_name === "done";
  const priority =
    card.priority && priorityStyles[card.priority] ? card.priority : null;
  const daysInColumn = getDaysInColumn(card.moved_at);

  return (
    <div className="p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[14px] font-medium leading-snug flex-1 ${
            isDone ? "line-through text-neutral-400" : "text-neutral-800"
          }`}
        >
          {card.title}
        </p>
        {daysInColumn >= 3 && !isDone && (
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-amber-500 whitespace-nowrap">
            {daysInColumn}d
          </span>
        )}
      </div>
      {card.description && (
        <p
          className={`mt-1 text-[13px] line-clamp-2 leading-relaxed ${
            isDone ? "line-through text-neutral-300" : "text-neutral-500"
          }`}
        >
          {card.description}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {priority && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${priorityStyles[priority].className} ${isDone ? "opacity-50" : ""}`}
          >
            {priorityStyles[priority].label}
          </span>
        )}
        {card.labels?.map((label) => (
          <span
            key={label}
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-primary-50 text-primary-700"
          >
            {label}
          </span>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          {card.assignee_id && (
            <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
              <User size={10} className="text-primary-600" />
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
            <CheckSquare size={10} />
            <span className="font-[family-name:var(--font-mono)]">0/0</span>
          </span>
          {card.due_date && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
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

/**
 * The drag overlay — rendered in DragOverlay, follows the cursor.
 * Elevated with shadow and slight rotation for "picked up" feel.
 */
export function CardOverlay({ card }: { card: Card }) {
  const isDone = card.column_name === "done";
  const priority =
    card.priority && priorityStyles[card.priority] ? card.priority : null;
  const borderClass = isDone
    ? "border-l-emerald-400"
    : priority
      ? priorityStyles[priority].border
      : "border-l-transparent";

  return (
    <div
      className={`bg-white border border-neutral-300 border-l-2 ${borderClass} rounded-[var(--radius-md)] shadow-[var(--shadow-xl)] rotate-[1.5deg] scale-[1.03] cursor-grabbing w-[260px]`}
    >
      <CardContent card={card} />
    </div>
  );
}

/**
 * In-column sortable card. When dragging, becomes a translucent placeholder.
 * Click fires only if the user didn't drag (PointerSensor distance > 8px = drag).
 */
export function BoardCard({ card, onClick }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { card },
    });

  const isDone = card.column_name === "done";
  const priority =
    card.priority && priorityStyles[card.priority] ? card.priority : null;
  const borderClass = isDone
    ? "border-l-emerald-400"
    : priority
      ? priorityStyles[priority].border
      : "border-l-transparent";
  const daysInColumn = getDaysInColumn(card.moved_at);
  const agingClass = !isDone ? getAgingClass(daysInColumn) : "";

  // Only apply vertical translation for reordering within same column.
  // Horizontal movement is handled entirely by DragOverlay.
  const style = {
    transform: transform
      ? `translate3d(0px, ${Math.round(transform.y)}px, 0px)`
      : undefined,
    transition: transition ?? undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onClick?.(card);
      }}
      className={`${agingClass} ${isDone ? "bg-neutral-50/70" : "bg-white"} border border-l-2 ${borderClass} rounded-[var(--radius-md)] select-none transition-shadow ${
        isDragging
          ? "opacity-30 border-dashed border-neutral-300 bg-neutral-100/50 shadow-none"
          : "border-neutral-200/60 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-neutral-300/80 cursor-grab active:cursor-grabbing"
      }`}
    >
      <CardContent card={card} />
    </div>
  );
}
