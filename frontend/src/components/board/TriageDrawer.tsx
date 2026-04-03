"use client";

import { X } from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import type { Card, Column } from "@/types/card";

const TRIAGE_COLUMNS: { key: Column; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "icebox", label: "Ice Box" },
  { key: "freezer", label: "Freezer" },
];

interface TriageDrawerProps {
  open: boolean;
  onClose: () => void;
  cardsByColumn: Record<Column, Card[]>;
  onAddCard?: () => void;
  onCardClick?: (card: Card) => void;
}

export function TriageDrawer({ open, onClose, cardsByColumn, onAddCard, onCardClick }: TriageDrawerProps) {
  if (!open) return null;
  return (
    <div className="flex-shrink-0 w-[320px] border-r border-neutral-200 bg-white overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-700">Triage</h3>
        <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-[var(--radius-sm)] hover:bg-neutral-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        {TRIAGE_COLUMNS.map(({ key, label }) => (
          <BoardColumn key={key} column={key} label={label} cards={cardsByColumn[key] || []} onAddCard={key === "inbox" ? onAddCard : undefined} onCardClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}
