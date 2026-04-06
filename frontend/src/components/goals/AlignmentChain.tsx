"use client";

import type { AlignmentChain as AlignmentChainType, ChainNode } from "@/types/goal";
import { WORK_TYPES } from "@/types/flow";
import { Target, FileText, ArrowDown, Building2, Users, Layers, Folder } from "lucide-react";

interface AlignmentChainProps {
  chains: AlignmentChainType[];
}

const spaceTypeIcon: Record<string, typeof Target> = {
  organization: Building2,
  department: Layers,
  team: Users,
  workstream: Folder,
};

function ChainNodeCard({ node, isFocal }: { node: ChainNode; isFocal?: boolean }) {
  const Icon = node.type === "goal" ? Target : FileText;
  const SpaceIcon = spaceTypeIcon[node.space_type] ?? Folder;
  const workTypeInfo = node.work_type ? WORK_TYPES.find((wt) => wt.key === node.work_type) : null;

  return (
    <div className={`relative rounded-[var(--radius-md)] border p-3 ${
      isFocal
        ? "bg-primary-50 border-primary-300 ring-2 ring-primary-200"
        : "bg-white border-neutral-200"
    }`}>
      <div className="flex items-start gap-2">
        <Icon size={14} className={isFocal ? "text-primary-600 mt-0.5" : "text-neutral-400 mt-0.5"} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isFocal ? "text-primary-800" : "text-neutral-800"}`}>
            {node.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1">
              <SpaceIcon size={10} className="text-neutral-400" />
              <span className="text-[10px] text-neutral-400">{node.space_name}</span>
            </div>
            {node.status && (
              <span className="text-[10px] text-neutral-400 uppercase">{node.status}</span>
            )}
            {node.link_type && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-100 text-neutral-500">{node.link_type}</span>
            )}
            {node.column_name && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-100 text-neutral-500">
                {node.column_name.replace("_", " ")}
              </span>
            )}
            {workTypeInfo && (
              <span className={`text-[9px] px-1 py-0.5 rounded ${workTypeInfo.bgColor} ${workTypeInfo.color}`}>
                {workTypeInfo.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="w-px h-3 bg-neutral-300" />
        <ArrowDown size={10} className="text-neutral-300" />
        <div className="w-px h-3 bg-neutral-300" />
      </div>
    </div>
  );
}

export function AlignmentChainView({ chains }: AlignmentChainProps) {
  if (chains.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic">
        No alignment chain — this item is not linked to any goals.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {chains.map((chain, idx) => (
        <div key={idx}>
          {/* Ancestors (top-level first — reverse since API returns nearest-first) */}
          {[...chain.ancestors].reverse().map((node) => (
            <div key={node.id}>
              <ChainNodeCard node={node} />
              <Connector />
            </div>
          ))}

          {/* Focal goal */}
          <ChainNodeCard node={chain.goal} isFocal />

          {/* Supporters */}
          {chain.supporters.length > 0 && (
            <>
              <Connector />
              <div className="space-y-2 pl-4 border-l-2 border-neutral-200 ml-3">
                {chain.supporters.map((node) => (
                  <ChainNodeCard key={node.id} node={node} />
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
