"use client";

import { useState } from "react";
import { useCreateCard } from "@/hooks/useCards";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { WORK_TYPES } from "@/types/flow";
import type { WorkType } from "@/types/card";

interface CreateCardDialogProps {
  spaceId: string;
  onClose: () => void;
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

export function CreateCardDialog({ spaceId, onClose }: CreateCardDialogProps) {
  const createCard = useCreateCard(spaceId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [workType, setWorkType] = useState<string>("feature");
  const [effort, setEffort] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelsText, setLabelsText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const labels = labelsText
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    createCard.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority || undefined,
        effort_estimate: effort ? parseInt(effort, 10) : undefined,
        due_date: dueDate || undefined,
        labels: labels.length > 0 ? labels : undefined,
        work_type: workType as WorkType,
      },
      { onSuccess: onClose }
    );
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Add Card to Inbox"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={createCard.isPending} disabled={!title.trim()} type="submit" form="create-card-form">
            Add Card
          </Button>
        </>
      }
    >
      <form id="create-card-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter card title..."
          autoFocus
          required
          disabled={createCard.isPending}
        />
        <Input
          multiline
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
          disabled={createCard.isPending}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={PRIORITY_OPTIONS}
          />
          <Select
            label="Work Type"
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
            options={WORK_TYPES.map((wt) => ({ value: wt.key, label: wt.label }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Effort"
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
            options={EFFORT_OPTIONS}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-[var(--radius-md)] px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
              disabled={createCard.isPending}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Labels"
            value={labelsText}
            onChange={(e) => setLabelsText(e.target.value)}
            placeholder="bug, frontend, ..."
            disabled={createCard.isPending}
          />
        </div>
      </form>
    </Dialog>
  );
}
