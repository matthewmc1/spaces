"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Building2, Layers, Users, Folder, Trash2, Plus, MoreHorizontal } from "lucide-react";
import { useDeleteSpace } from "@/hooks/useSpaces";
import { CreateSpaceDialog } from "./CreateSpaceDialog";
import type { Space, SpaceType } from "@/types/space";

const typeIcon: Record<SpaceType, typeof Folder> = {
  organization: Building2,
  department: Layers,
  team: Users,
  workstream: Folder,
};

const typeColor: Record<SpaceType, string> = {
  organization: "text-primary-500",
  department: "text-sky-500",
  team: "text-emerald-500",
  workstream: "text-neutral-400",
};

interface SpaceTreeNodeProps {
  space: Space;
  allSpaces: Space[];
  level: number;
  activeSpaceId?: string;
}

export function SpaceTreeNode({
  space,
  allSpaces,
  level,
  activeSpaceId,
}: SpaceTreeNodeProps) {
  const children = allSpaces.filter((s) => s.parent_space_id === space.id);
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(level < 3);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const deleteSpace = useDeleteSpace();

  const isActive = space.id === activeSpaceId;
  const indentPx = level * 14 + 8;
  const Icon = typeIcon[space.space_type] ?? Folder;
  const iconColor = typeColor[space.space_type] ?? "text-neutral-400";

  const handleDelete = () => {
    if (confirm(`Delete "${space.name}"? This cannot be undone.`)) {
      deleteSpace.mutate(space.id);
    }
    setShowMenu(false);
  };

  return (
    <div>
      <div
        className={`relative flex items-center gap-1 py-1.5 pr-2 rounded-[var(--radius-sm)] cursor-pointer group ${
          isActive
            ? "bg-primary-50 text-primary-700"
            : "hover:bg-neutral-50 text-neutral-600"
        }`}
        style={{ paddingLeft: `${indentPx}px` }}
      >
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-600 ${
            hasChildren ? "visible" : "invisible"
          }`}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <Link
          href={`/spaces/${space.id}`}
          className="flex items-center gap-2 flex-1 min-w-0 truncate"
        >
          <Icon size={13} className={`flex-shrink-0 ${iconColor}`} />
          <span className="text-[13px] truncate">
            {space.name}
          </span>
        </Link>

        {/* Actions menu — visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 text-neutral-300 hover:text-neutral-500 rounded transition-opacity"
        >
          <MoreHorizontal size={12} />
        </button>

        {showMenu && (
          <div className="absolute right-1 top-full mt-0.5 bg-white border border-neutral-200 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-30 py-1 w-36">
            <button
              onClick={() => { setShowCreate(true); setShowMenu(false); setExpanded(true); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Plus size={11} />
              Add child space
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={11} />
              Delete space
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div>
          {children.map((child) => (
            <SpaceTreeNode
              key={child.id}
              space={child}
              allSpaces={allSpaces}
              level={level + 1}
              activeSpaceId={activeSpaceId}
            />
          ))}
        </div>
      )}
      {showCreate && (
        <CreateSpaceDialog
          parentSpaceId={space.id}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
