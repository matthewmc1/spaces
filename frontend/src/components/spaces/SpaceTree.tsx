"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useSpaces } from "@/hooks/useSpaces";
import { SpaceTreeNode } from "./SpaceTreeNode";
import { CreateSpaceDialog } from "./CreateSpaceDialog";

interface SpaceTreeProps {
  activeSpaceId?: string;
}

export function SpaceTree({ activeSpaceId }: SpaceTreeProps) {
  const { data: spaces, isLoading } = useSpaces();
  const [showCreate, setShowCreate] = useState(false);

  const rootSpaces = spaces?.filter((s) => !s.parent_space_id) ?? [];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-[family-name:var(--font-sans)] font-semibold text-neutral-300 uppercase tracking-[0.1em]">
          Spaces
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Create space"
        >
          <Plus size={16} />
        </button>
      </div>

      {isLoading && (
        <div className="px-3 py-2 text-sm text-neutral-400">Loading...</div>
      )}

      {!isLoading && rootSpaces.length === 0 && (
        <div className="px-3 py-4 text-sm text-neutral-400 text-center">
          No spaces yet. Create one to get started.
        </div>
      )}

      {!isLoading && rootSpaces.length > 0 && (
        <div className="px-1">
          {rootSpaces.map((space) => (
            <SpaceTreeNode
              key={space.id}
              space={space}
              allSpaces={spaces ?? []}
              level={0}
              activeSpaceId={activeSpaceId}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSpaceDialog onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
