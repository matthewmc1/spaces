"use client";

import { useState } from "react";
import { useCreateSpace } from "@/hooks/useSpaces";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { SpaceType } from "@/types/space";

const SPACE_TYPE_OPTIONS = [
  { value: "workstream", label: "Workstream — a piece of work" },
  { value: "team", label: "Team — a group of people" },
  { value: "department", label: "Department — a group of teams" },
  { value: "organization", label: "Organization — the top-level" },
];

interface CreateSpaceDialogProps {
  parentSpaceId?: string;
  onClose: () => void;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateSpaceDialog({
  parentSpaceId,
  onClose,
}: CreateSpaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spaceType, setSpaceType] = useState<SpaceType>(parentSpaceId ? "workstream" : "team");
  const createSpace = useCreateSpace();

  const slug = toSlug(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createSpace.mutateAsync({
      name: name.trim(),
      slug,
      description: description.trim() || undefined,
      parent_space_id: parentSpaceId,
      space_type: spaceType,
    });
    onClose();
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Create Space"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={createSpace.isPending} disabled={!name.trim()} type="submit" form="create-space-form">Create</Button>
        </>
      }
    >
      <form id="create-space-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Space"
          disabled={createSpace.isPending}
          hint={slug ? `Slug: ${slug}` : undefined}
        />
        <Select
          label="Type"
          value={spaceType}
          onChange={(e) => setSpaceType(e.target.value as SpaceType)}
          options={SPACE_TYPE_OPTIONS}
        />
        <Input
          multiline
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
          disabled={createSpace.isPending}
        />
      </form>
    </Dialog>
  );
}
