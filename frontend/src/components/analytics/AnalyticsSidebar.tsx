"use client";

import { X } from "lucide-react";
import { FlowSummary } from "./FlowSummary";
import { AlignmentHealth } from "./AlignmentHealth";
import { ColumnDistribution } from "./ColumnDistribution";
import { CycleTimeTrend } from "./CycleTimeTrend";
import { BottleneckAlert } from "./BottleneckAlert";

interface AnalyticsSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AnalyticsSidebar({ open, onClose }: AnalyticsSidebarProps) {
  if (!open) return null;

  return (
    <aside className="w-[320px] flex-shrink-0 bg-white border-l border-neutral-200 h-full overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <h2 className="text-base font-semibold text-neutral-800">Insights</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded-[var(--radius-sm)] hover:bg-neutral-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <FlowSummary />
        <AlignmentHealth />
        <ColumnDistribution />
        <CycleTimeTrend />
        <BottleneckAlert message="3 cards in Review for >5 days" />
      </div>
    </aside>
  );
}
