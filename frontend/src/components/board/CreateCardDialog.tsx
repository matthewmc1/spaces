"use client";

import { useState } from "react";
import { useCreateCard } from "@/hooks/useCards";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

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

export function CreateCardDialog({ spaceId, onClose }: CreateCardDialogProps) {
  const createCard = useCreateCard(spaceId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    createCard.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority || undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
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
          <Button loading={createCard.isPending} disabled={!title.trim()} type="submit" form="create-card-form">Add Card</Button>
        </>
      }
    >
      <form id="create-card-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter card title..."
          autoFocus
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
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={PRIORITY_OPTIONS}
        />
      </form>
    </Dialog>
  );
}
