"use client";

import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Calendar, ArrowRight } from "lucide-react";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";

interface CardDetailDialogProps {
  card: Card | null;
  onClose: () => void;
  onUpdate?: (cardId: string, updates: Partial<Card>) => void;
  onMove?: (cardId: string, column: Column, position: number) => void;
}

const priorityVariants: Record<string, "danger" | "warning" | "default"> = {
  p0: "danger",
  p1: "warning",
  p2: "warning",
  p3: "default",
};

export function CardDetailDialog({ card, onClose, onMove }: CardDetailDialogProps) {
  if (!card) return null;

  const currentColumn = COLUMNS.find(c => c.key === card.column_name);

  return (
    <Dialog open={!!card} onClose={onClose} title={card.title} maxWidth="lg">
      <div className="space-y-5">
        {/* Status row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Status</span>
            <Badge variant="primary" dot>{currentColumn?.label ?? card.column_name}</Badge>
          </div>
          {card.priority && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Priority</span>
              <Badge variant={priorityVariants[card.priority] ?? "default"}>
                {card.priority.toUpperCase()}
              </Badge>
            </div>
          )}
          {card.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-sm text-neutral-600">
                {new Date(card.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {card.description ? (
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-sm text-neutral-600 leading-relaxed">{card.description}</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-sm text-neutral-400 italic">No description</p>
          </div>
        )}

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Labels</p>
            <div className="flex gap-1.5 flex-wrap">
              {card.labels.map(label => (
                <Badge key={label} variant="primary">{label}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Move to column */}
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Move to</p>
          <div className="flex gap-2 flex-wrap">
            {COLUMNS.filter(c => c.key !== card.column_name).map(col => (
              <Button
                key={col.key}
                variant="secondary"
                size="sm"
                icon={<ArrowRight className="w-3 h-3" />}
                onClick={() => {
                  onMove?.(card.id, col.key as Column, Date.now());
                  onClose();
                }}
              >
                {col.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t border-neutral-100 pt-4">
          <div className="flex gap-6 text-xs text-neutral-400">
            <span>Created {new Date(card.created_at).toLocaleDateString()}</span>
            <span>Updated {new Date(card.updated_at).toLocaleDateString()}</span>
            {card.moved_at && <span>Moved {new Date(card.moved_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
