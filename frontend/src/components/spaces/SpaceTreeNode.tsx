"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";
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
  const children = allSpaces.filter(
    (s) => s.parent_space_id === space.id
  );
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(level < 2);

  const isActive = space.id === activeSpaceId;
  const indentPx = level * 16 + 8;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 pr-2 rounded cursor-pointer group ${
          isActive
            ? "bg-primary-100 text-primary-700"
            : "hover:bg-neutral-100 text-neutral-700"
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
          {expanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
        <Link
          href={`/spaces/${space.id}`}
          className="flex items-center gap-2 flex-1 min-w-0 text-sm font-medium truncate"
        >
          <Folder
            size={14}
            className="flex-shrink-0"
            style={{ color: space.color ?? "#94a3b8" }}
          />
          <span className="truncate">{space.name}</span>
        </Link>
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
