"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";
import { BoardCard } from "./BoardCard";

import type { GroupBy } from "./BoardGrouping";

interface BoardColumnProps {
  column: Column;
  label: string;
  cards: Card[];
  onAddCard?: () => void;
  onCardClick?: (card: Card) => void;
  isTargeted?: boolean;
  groupBy?: GroupBy;
  wipLimit?: number;
}

const ADD_CARD_COLUMNS: Column[] = ["inbox"];

export function BoardColumn({ column, label, cards, onAddCard, onCardClick, isTargeted, groupBy, wipLimit }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { column },
  });

  const colConfig = COLUMNS.find((c) => c.key === column);
  const isOverWip = wipLimit != null && cards.length > wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-[var(--radius-lg)] border-t-2 w-[280px] flex-shrink-0 bg-neutral-50/80 ${
        colConfig?.borderColor ?? "border-t-neutral-300"
      } ${
        isOver ? "ring-2 ring-primary-300 ring-inset" : ""
      } ${
        isTargeted ? "ring-2 ring-primary-400 bg-primary-50/30" : ""
      } transition-all`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-neutral-200/60 rounded-t-[var(--radius-lg)] ${
        isOverWip ? "bg-rose-50/60 animate-pulse" : ""
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-neutral-700 tracking-[-0.01em]">
            {label}
          </span>
          <span className="text-[11px] text-neutral-400 tabular-nums">
            {cards.length}
          </span>
          {wipLimit != null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              cards.length > wipLimit
                ? "bg-rose-100 text-rose-700"
                : cards.length === wipLimit
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-50 text-emerald-600"
            }`}>
              {cards.length}/{wipLimit}
            </span>
          )}
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
        className={`flex flex-col gap-2 px-2.5 py-2.5 overflow-y-auto min-h-[160px] flex-1 transition-all duration-200 ${
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
          ) : groupBy === "priority" ? (
            <PriorityGroups cards={cards} onCardClick={onCardClick} />
          ) : groupBy === "assignee" ? (
            <AssigneeGroups cards={cards} onCardClick={onCardClick} />
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

function PriorityGroups({ cards, onCardClick }: { cards: Card[]; onCardClick?: (card: Card) => void }) {
  const groups = [
    { key: "p0", label: "Critical", color: "text-rose-500" },
    { key: "p1", label: "High", color: "text-amber-500" },
    { key: "p2", label: "Medium", color: "text-yellow-600" },
    { key: "p3", label: "Low", color: "text-neutral-400" },
    { key: "none", label: "No priority", color: "text-neutral-300" },
  ];

  return (
    <>
      {groups.map(({ key, label, color }) => {
        const groupCards = cards.filter(c =>
          key === "none" ? !c.priority : c.priority === key
        );
        if (groupCards.length === 0) return null;
        return (
          <div key={key} className="mb-2">
            <div className="flex items-center gap-1.5 px-1 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")}`} />
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">{label}</span>
              <span className="text-[10px] text-neutral-300">{groupCards.length}</span>
            </div>
            {groupCards.map(card => (
              <div key={card.id} className="mb-1.5">
                <BoardCard card={card} onClick={onCardClick} />
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function AssigneeGroups({ cards, onCardClick }: { cards: Card[]; onCardClick?: (card: Card) => void }) {
  const assigned = cards.filter(c => c.assignee_id);
  const unassigned = cards.filter(c => !c.assignee_id);

  return (
    <>
      {assigned.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Assigned</span>
            <span className="text-[10px] text-neutral-300">{assigned.length}</span>
          </div>
          {assigned.map(card => (
            <div key={card.id} className="mb-1.5">
              <BoardCard card={card} onClick={onCardClick} />
            </div>
          ))}
        </div>
      )}
      {unassigned.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Unassigned</span>
            <span className="text-[10px] text-neutral-300">{unassigned.length}</span>
          </div>
          {unassigned.map(card => (
            <div key={card.id} className="mb-1.5">
              <BoardCard card={card} onClick={onCardClick} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
