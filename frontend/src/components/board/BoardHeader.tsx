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
}

export function BoardHeader({
  spaceName,
  spaceDescription,
  triageOpen,
  onToggleTriage,
  insightsOpen,
  onToggleInsights,
  columnConfigSlot,
}: BoardHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-800">{spaceName}</h1>
        {spaceDescription && (
          <p className="text-sm text-neutral-500 mt-0.5">{spaceDescription}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant={triageOpen ? "secondary" : "ghost"}
          size="sm"
          icon={<Inbox className="w-4 h-4" />}
          onClick={onToggleTriage}
        >
          Triage
        </Button>
        {columnConfigSlot}
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
