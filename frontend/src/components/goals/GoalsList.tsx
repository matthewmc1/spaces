"use client";

import { useState } from "react";
import { Target, Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/useGoals";
import type { Goal, GoalStatus } from "@/types/goal";

interface GoalsListProps {
  spaceId: string;
  open: boolean;
  onClose: () => void;
}

const statusConfig: Record<GoalStatus, { label: string; variant: "success" | "primary" | "default" }> = {
  active: { label: "Active", variant: "success" },
  achieved: { label: "Achieved", variant: "primary" },
  abandoned: { label: "Abandoned", variant: "default" },
};

function GoalItem({
  goal,
  spaceId,
}: {
  goal: Goal;
  spaceId: string;
}) {
  const updateGoal = useUpdateGoal(spaceId);
  const deleteGoal = useDeleteGoal(spaceId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateGoal.mutate({ goalId: goal.id, input: { status: e.target.value as GoalStatus } });
  }

  function handleDelete() {
    if (confirmDelete) {
      deleteGoal.mutate(goal.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  const { variant } = statusConfig[goal.status];

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-neutral-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-neutral-800 font-medium leading-snug truncate flex-1 min-w-0">
          {goal.title}
        </p>
        <button
          onClick={handleDelete}
          title={confirmDelete ? "Click again to confirm" : "Delete goal"}
          className={`flex-shrink-0 p-1 rounded-[var(--radius-sm)] transition-colors ${
            confirmDelete
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-neutral-400 hover:text-red-500 hover:bg-red-50"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={variant} dot size="sm">
          {statusConfig[goal.status].label}
        </Badge>
        <select
          value={goal.status}
          onChange={handleStatusChange}
          className="text-[11px] text-neutral-500 bg-transparent border border-neutral-200 rounded-[var(--radius-sm)] px-1.5 py-0.5 cursor-pointer hover:border-neutral-300 focus:outline-none focus:border-primary-400"
        >
          <option value="active">Active</option>
          <option value="achieved">Achieved</option>
          <option value="abandoned">Abandoned</option>
        </select>
        {goal.target_date && (
          <span className="text-[10px] text-neutral-400 ml-auto">
            {new Date(goal.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

export function GoalsList({ spaceId, open, onClose }: GoalsListProps) {
  const { data: goals, isLoading } = useGoals(spaceId);
  const createGoal = useCreateGoal(spaceId);
  const [newTitle, setNewTitle] = useState("");

  if (!open) return null;

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    createGoal.mutate({ title }, { onSuccess: () => setNewTitle("") });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <aside className="w-[320px] flex-shrink-0 bg-white border-l border-neutral-200 h-full overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-neutral-500" />
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-neutral-800 tracking-[-0.01em]">
            Goals
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded-[var(--radius-sm)] hover:bg-neutral-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New goal title…"
            className="flex-1 min-w-0 text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-1.5 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
          />
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
            loading={createGoal.isPending}
            disabled={!newTitle.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="px-5 py-2">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-neutral-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : !goals || goals.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-neutral-400">
            <Target className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">No goals yet</p>
            <p className="text-xs text-center">Add a goal above to track what this space is working toward.</p>
          </div>
        ) : (
          <div>
            {goals.map((goal) => (
              <GoalItem key={goal.id} goal={goal} spaceId={spaceId} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
