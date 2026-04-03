"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Folder, Trash2, MoreHorizontal } from "lucide-react";
import { useDeleteSpace } from "@/hooks/useSpaces";
import type { Space } from "@/types/space";

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
  const [expanded, setExpanded] = useState(level < 2);
  const [showMenu, setShowMenu] = useState(false);
  const deleteSpace = useDeleteSpace();

  const isActive = space.id === activeSpaceId;
  const indentPx = level * 16 + 8;

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
          <Folder
            size={13}
            className="flex-shrink-0"
            style={{ color: space.color ?? "#94a3b8" }}
          />
          <span className="text-[13px] font-[family-name:var(--font-display)] truncate">
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
          <div className="absolute right-1 top-full mt-0.5 bg-white border border-neutral-200 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-30 py-1 w-32">
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
      {hasChildren && expanded && (
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
    </div>
  );
}
