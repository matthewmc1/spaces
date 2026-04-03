"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  ArrowRight,
  User,
  Users,
  ChevronDown,
  Plus,
  Link2,
  CheckSquare,
  Square,
} from "lucide-react";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";

interface CardDetailDialogProps {
  card: Card | null;
  onClose: () => void;
  onUpdate?: (cardId: string, updates: Partial<Card>) => void;
  onMove?: (cardId: string, column: Column, position: number) => void;
}

interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

const priorityVariants: Record<string, "danger" | "warning" | "default"> = {
  p0: "danger",
  p1: "warning",
  p2: "warning",
  p3: "default",
};

export function CardDetailDialog({ card, onClose, onMove }: CardDetailDialogProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);

  if (!card) return null;

  const currentColumn = COLUMNS.find((c) => c.key === card.column_name);

  function addSubtask() {
    const text = newSubtask.trim();
    if (!text) return;
    setSubtasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false },
    ]);
    setNewSubtask("");
  }

  function toggleSubtask(id: string) {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  }

  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <Dialog open={!!card} onClose={onClose} title={card.title} maxWidth="lg">
      <div className="space-y-5">
        {/* Status row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Status</span>
            <Badge variant="primary" dot>
              {currentColumn?.label ?? card.column_name}
            </Badge>
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
                {new Date(card.due_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Owner & Team */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Owner</span>
            {card.assignee_id ? (
              <span className="text-sm text-neutral-700 font-medium">
                {card.assignee_id}
              </span>
            ) : (
              <span className="text-sm text-neutral-400 italic">Unassigned</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Team</span>
            <span className="text-sm text-neutral-400 italic">No team</span>
          </div>
        </div>

        {/* Description */}
        {card.description ? (
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
              Description
            </p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {card.description}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
              Description
            </p>
            <p className="text-sm text-neutral-400 italic">No description</p>
          </div>
        )}

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
              Labels
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {card.labels.map((label) => (
                <Badge key={label} variant="primary">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Subtasks */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-neutral-400 uppercase tracking-wider">
              Subtasks
            </p>
            {subtasks.length > 0 && (
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-neutral-400">
                {doneCount}/{subtasks.length}
              </span>
            )}
          </div>
          {subtasks.length > 0 && (
            <div className="space-y-1 mb-2">
              {subtasks.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleSubtask(st.id)}
                  className="flex items-center gap-2 w-full text-left py-1 px-1.5 rounded-[var(--radius-sm)] hover:bg-neutral-50 transition-colors"
                >
                  {st.done ? (
                    <CheckSquare className="w-4 h-4 text-primary-500 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-300 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${st.done ? "line-through text-neutral-400" : "text-neutral-700"}`}
                  >
                    {st.text}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSubtask();
              }}
              placeholder="Add a subtask..."
              className="flex-1 text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 placeholder:text-neutral-300"
            />
            <Button variant="ghost" size="sm" icon={<Plus className="w-3 h-3" />} onClick={addSubtask}>
              Add
            </Button>
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
            Dependencies
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-neutral-400 italic flex-1">
              No dependencies
            </p>
            <Button variant="ghost" size="sm" icon={<Link2 className="w-3 h-3" />} disabled>
              Link dependency
            </Button>
            <Badge variant="default" size="sm">
              Coming soon
            </Badge>
          </div>
        </div>

        {/* Move to column — dropdown */}
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
            Move to
          </p>
          <div className="relative inline-block">
            <Button
              variant="secondary"
              size="sm"
              iconRight={<ChevronDown className="w-3 h-3" />}
              onClick={() => setMoveDropdownOpen((v) => !v)}
            >
              {currentColumn?.label ?? card.column_name}
            </Button>
            {moveDropdownOpen && (
              <div className="absolute z-10 mt-1 left-0 bg-white border border-neutral-200 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1 min-w-[160px]">
                {COLUMNS.filter((c) => c.key !== card.column_name).map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    onClick={() => {
                      onMove?.(card.id, col.key as Column, Date.now());
                      setMoveDropdownOpen(false);
                      onClose();
                    }}
                  >
                    <ArrowRight className="w-3 h-3 text-neutral-400" />
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t border-neutral-100 pt-4">
          <div className="flex gap-6 text-xs text-neutral-400">
            <span>Created {new Date(card.created_at).toLocaleDateString()}</span>
            <span>Updated {new Date(card.updated_at).toLocaleDateString()}</span>
            {card.moved_at && (
              <span>Moved {new Date(card.moved_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
