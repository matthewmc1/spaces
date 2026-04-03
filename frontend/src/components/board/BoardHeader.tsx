"use client";

import { Button } from "@/components/ui/Button";
import { Inbox, PanelRight } from "lucide-react";

interface BoardHeaderProps {
  spaceName: string;
  spaceDescription?: string;
  triageOpen: boolean;
  onToggleTriage: () => void;
  insightsOpen: boolean;
  onToggleInsights: () => void;
  columnConfigSlot: React.ReactNode;
  groupingSlot?: React.ReactNode;
  totalCards?: number;
  totalColumns?: number;
}

export function BoardHeader({
  spaceName,
  spaceDescription,
  triageOpen,
  onToggleTriage,
  insightsOpen,
  onToggleInsights,
  columnConfigSlot,
  groupingSlot,
  totalCards,
  totalColumns,
}: BoardHeaderProps) {
  return (
    <div className="flex items-start justify-between pb-4 border-b border-neutral-200/60 mb-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-neutral-800 tracking-[-0.02em]">
          {spaceName}
        </h1>
        {spaceDescription && (
          <p className="text-sm text-neutral-500 mt-1">{spaceDescription}</p>
        )}
        {totalCards != null && totalColumns != null && (
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-neutral-400 mt-1.5 tabular-nums">
            {totalCards} items across {totalColumns} columns
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={triageOpen ? "secondary" : "ghost"}
          size="sm"
          icon={<Inbox className="w-4 h-4" />}
          onClick={onToggleTriage}
        >
          Triage
        </Button>
        {columnConfigSlot}
        {groupingSlot}
        <Button
          variant={insightsOpen ? "secondary" : "ghost"}
          size="sm"
          icon={<PanelRight className="w-4 h-4" />}
          onClick={onToggleInsights}
        >
          Insights
        </Button>
      </div>
    </div>
  );
}
