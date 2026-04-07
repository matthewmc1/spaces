"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Inbox, PanelRight, Plus, Settings2, Target, LayoutDashboard } from "lucide-react";
import type { SpaceType } from "@/types/space";

interface BoardHeaderProps {
  spaceId: string;
  spaceName: string;
  spaceDescription?: string;
  spaceType?: SpaceType;
  triageOpen: boolean;
  onToggleTriage: () => void;
  insightsOpen: boolean;
  onToggleInsights: () => void;
  goalsOpen: boolean;
  onToggleGoals: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onAddCard: () => void;
  columnConfigSlot: React.ReactNode;
  groupingSlot?: React.ReactNode;
  totalCards?: number;
  totalColumns?: number;
  canEdit?: boolean;
}

const spaceTypeBadge: Record<SpaceType, { label: string; color: string }> = {
  organization: { label: "Organization", color: "bg-primary-50 text-primary-700 border-primary-200" },
  department:   { label: "Department",   color: "bg-sky-50 text-sky-700 border-sky-200" },
  team:         { label: "Team",         color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  workstream:   { label: "Workstream",   color: "bg-neutral-50 text-neutral-600 border-neutral-200" },
};

export function BoardHeader({
  spaceId,
  spaceName,
  spaceDescription,
  spaceType,
  triageOpen,
  onToggleTriage,
  insightsOpen,
  onToggleInsights,
  goalsOpen,
  onToggleGoals,
  settingsOpen,
  onToggleSettings,
  onAddCard,
  columnConfigSlot,
  groupingSlot,
  totalCards,
  totalColumns,
  canEdit = true,
}: BoardHeaderProps) {
  const badge = spaceType ? spaceTypeBadge[spaceType] : undefined;
  const showTeamLink = spaceType === "team" || spaceType === "department" || spaceType === "organization";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-neutral-200/60 mb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {badge && (
            <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-neutral-800 tracking-[-0.02em]">
          {spaceName}
        </h1>
        {spaceDescription && (
          <p className="text-sm text-neutral-500 mt-1">{spaceDescription}</p>
        )}
        {totalCards != null && totalColumns != null && (
          <p className="text-[11px] text-neutral-400 mt-1.5 tabular-nums">
            {totalCards} items across {totalColumns} columns
          </p>
        )}
      </div>
      <div className="flex items-center flex-wrap gap-2">
        {showTeamLink && (
          <Link href={`/spaces/${spaceId}/team`}>
            <Button variant="ghost" size="sm" icon={<LayoutDashboard className="w-4 h-4" />}>
              Team View
            </Button>
          </Link>
        )}
        {canEdit && (
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={onAddCard}
          >
            Add Card
          </Button>
        )}
        <div className="w-px h-5 bg-neutral-200" />
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
          variant={goalsOpen ? "secondary" : "ghost"}
          size="sm"
          icon={<Target className="w-4 h-4" />}
          onClick={onToggleGoals}
        >
          Goals
        </Button>
        <Button
          variant={settingsOpen ? "secondary" : "ghost"}
          size="sm"
          icon={<Settings2 className="w-4 h-4" />}
          onClick={onToggleSettings}
        >
          Settings
        </Button>
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
