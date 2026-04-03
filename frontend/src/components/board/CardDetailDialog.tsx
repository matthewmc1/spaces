"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Calendar,
  ArrowRight,
  ChevronDown,
  Plus,
  Link2,
  CheckSquare,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { Card, Column } from "@/types/card";
import { COLUMNS } from "@/types/card";
import { useGoals, useCreateGoalLink, useDeleteGoalLink } from "@/hooks/useGoals";
import type { Goal, GoalLink } from "@/types/goal";

interface CardDetailDialogProps {
  card: Card | null;
  spaceId: string;
  onClose: () => void;
  onUpdate?: (cardId: string, updates: Partial<Card>) => void;
  onMove?: (cardId: string, column: Column, position: number) => void;
  onDelete?: (cardId: string) => void;
}

interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

const PRIORITY_OPTIONS = [
  { value: "", label: "None" },
  { value: "p0", label: "P0 — Critical" },
  { value: "p1", label: "P1 — High" },
  { value: "p2", label: "P2 — Medium" },
  { value: "p3", label: "P3 — Low" },
];

const EFFORT_OPTIONS = [
  { value: "", label: "None" },
  { value: "1", label: "1 — Trivial" },
  { value: "2", label: "2 — Small" },
  { value: "3", label: "3 — Medium" },
  { value: "5", label: "5 — Large" },
  { value: "8", label: "8 — Very Large" },
];

const LINK_TYPE_OPTIONS: { value: GoalLink["link_type"]; label: string }[] = [
  { value: "supports", label: "Supports" },
  { value: "drives", label: "Drives" },
  { value: "blocks", label: "Blocks" },
];

const LINK_TYPE_STYLES: Record<GoalLink["link_type"], { dot: string; bg: string; border: string; badge: string }> = {
  supports: { dot: "bg-emerald-400", bg: "bg-emerald-50/50", border: "border-emerald-100", badge: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  drives:   { dot: "bg-primary-400", bg: "bg-primary-50/50",  border: "border-primary-100",  badge: "text-primary-700 bg-primary-50 border-primary-200" },
  blocks:   { dot: "bg-rose-400",    bg: "bg-rose-50/50",     border: "border-rose-100",     badge: "text-rose-700 bg-rose-50 border-rose-200" },
};

export function CardDetailDialog({ card, spaceId, onClose, onUpdate, onMove, onDelete }: CardDetailDialogProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);
  const [goalLinkDropdownOpen, setGoalLinkDropdownOpen] = useState(false);
  const [goalLinkType, setGoalLinkType] = useState<GoalLink["link_type"]>("supports");
  const [localLinks, setLocalLinks] = useState<(GoalLink & { goalTitle: string })[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Inline editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [effort, setEffort] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelsText, setLabelsText] = useState("");

  const { data: goals } = useGoals(spaceId);
  const createLink = useCreateGoalLink(spaceId);
  const deleteLink = useDeleteGoalLink(spaceId);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || "");
      setPriority(card.priority || "");
      setEffort(card.effort_estimate?.toString() || "");
      setDueDate(card.due_date || "");
      setLabelsText(card.labels?.join(", ") || "");
      setConfirmDelete(false);
      setLocalLinks([]);
    }
  }, [card]);

  const saveField = useCallback(() => {
    if (!card || !onUpdate) return;
    const labels = labelsText.split(",").map((l) => l.trim()).filter(Boolean);
    onUpdate(card.id, {
      title: title.trim() || card.title,
      description: description.trim(),
      priority: (priority || undefined) as Card["priority"],
      effort_estimate: effort ? parseInt(effort, 10) : undefined,
      due_date: dueDate || undefined,
      labels,
    });
  }, [card, onUpdate, title, description, priority, effort, dueDate, labelsText]);

  if (!card) return null;

  const currentColumn = COLUMNS.find((c) => c.key === card.column_name);

  // Goals not already linked
  const linkedGoalIds = new Set(localLinks.map((l) => l.target_goal_id));
  const unlinkableGoals = (goals ?? []).filter((g) => !linkedGoalIds.has(g.id));

  function addSubtask() {
    const text = newSubtask.trim();
    if (!text) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setNewSubtask("");
  }

  function toggleSubtask(id: string) {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  }

  function removeSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  function addGoalLink(goal: Goal) {
    setGoalLinkDropdownOpen(false);
    createLink.mutate(
      {
        goalId: goal.id,
        input: {
          source_type: "card",
          source_id: card!.id,
          link_type: goalLinkType,
        },
      },
      {
        onSuccess: (newLink: GoalLink) => {
          setLocalLinks((prev) => [...prev, { ...newLink, goalTitle: goal.title }]);
        },
      }
    );
  }

  function removeGoalLink(linkId: string) {
    deleteLink.mutate(linkId, {
      onSuccess: () => {
        setLocalLinks((prev) => prev.filter((l) => l.id !== linkId));
      },
    });
  }

  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <Dialog open={!!card} onClose={onClose} title="" maxWidth="lg">
      <div className="space-y-5">
        {/* Title — inline editable */}
        <div className="flex items-start justify-between gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveField}
            className="flex-1 text-xl font-[family-name:var(--font-display)] font-semibold text-neutral-800 bg-transparent border-0 border-b border-transparent hover:border-neutral-200 focus:border-primary-400 focus:outline-none px-0 py-1 transition-colors"
          />
          {onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-rose-600">Delete?</span>
                <Button variant="danger" size="sm" onClick={() => { onDelete(card.id); onClose(); }}>Yes</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="shrink-0 p-1.5 text-neutral-300 hover:text-rose-500 rounded-[var(--radius-sm)] hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Inline fields grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Status</label>
            <Badge variant="primary" dot>{currentColumn?.label ?? card.column_name}</Badge>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Priority</label>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setTimeout(saveField, 0); }}
              className="w-full bg-white border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
            >
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Effort</label>
            <select
              value={effort}
              onChange={(e) => { setEffort(e.target.value); setTimeout(saveField, 0); }}
              className="w-full bg-white border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
            >
              {EFFORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => { setDueDate(e.target.value); setTimeout(saveField, 0); }}
              className="w-full bg-white border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Description — inline editable */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveField}
            rows={3}
            placeholder="Add a description..."
            className="w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-700 leading-relaxed placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 resize-none"
          />
        </div>

        {/* Labels — inline editable */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5 block">Labels</label>
          <input
            value={labelsText}
            onChange={(e) => setLabelsText(e.target.value)}
            onBlur={saveField}
            placeholder="bug, frontend, urgent..."
            className="w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
          />
          {labelsText && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {labelsText.split(",").map((l) => l.trim()).filter(Boolean).map((label) => (
                <Badge key={label} variant="primary">{label}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Subtasks</p>
            {subtasks.length > 0 && (
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-neutral-400">
                {doneCount}/{subtasks.length}
              </span>
            )}
          </div>
          {subtasks.length > 0 && (
            <div className="space-y-1 mb-2">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 group py-1 px-1.5 rounded-[var(--radius-sm)] hover:bg-neutral-50">
                  <button type="button" onClick={() => toggleSubtask(st.id)} className="flex items-center">
                    {st.done
                      ? <CheckSquare className="w-4 h-4 text-primary-500 shrink-0" />
                      : <Square className="w-4 h-4 text-neutral-300 shrink-0" />}
                  </button>
                  <span className={`flex-1 text-sm ${st.done ? "line-through text-neutral-400" : "text-neutral-700"}`}>
                    {st.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-rose-500 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
              placeholder="Add a subtask..."
              className="flex-1 text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 placeholder:text-neutral-300"
            />
            <Button variant="ghost" size="sm" icon={<Plus className="w-3 h-3" />} onClick={addSubtask}>Add</Button>
          </div>
        </div>

        {/* Goal Links */}
        <div>
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Goal Links</p>

          {localLinks.length > 0 && (
            <div className="space-y-1 mb-2">
              {localLinks.map((link) => {
                const style = LINK_TYPE_STYLES[link.link_type];
                return (
                  <div
                    key={link.id}
                    className={`flex items-center gap-2 group py-1 px-2 rounded-[var(--radius-sm)] border ${style.bg} ${style.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                    <span className="flex-1 text-sm text-neutral-700 truncate">{link.goalTitle}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${style.badge} shrink-0`}>
                      {link.link_type}
                    </span>
                    <button
                      onClick={() => removeGoalLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-rose-500 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-2">
              <select
                value={goalLinkType}
                onChange={(e) => setGoalLinkType(e.target.value as GoalLink["link_type"])}
                className="text-xs border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                {LINK_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                icon={<Link2 className="w-3 h-3" />}
                onClick={() => setGoalLinkDropdownOpen(!goalLinkDropdownOpen)}
                disabled={unlinkableGoals.length === 0}
              >
                Link goal
              </Button>
            </div>
            {goalLinkDropdownOpen && unlinkableGoals.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setGoalLinkDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1 max-h-48 overflow-y-auto min-w-[240px]">
                  {unlinkableGoals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => addGoalLink(goal)}
                      className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 truncate"
                    >
                      {goal.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Move to column */}
        <div>
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Move to</p>
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
            {card.moved_at && <span>Moved {new Date(card.moved_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
