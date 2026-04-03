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
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-neutral-800 tracking-[-0.01em]">
            Insights
          </h2>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-neutral-400 mt-0.5">
            Last updated: just now
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded-[var(--radius-sm)] hover:bg-neutral-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 py-5 space-y-5">
        <FlowSummary />
        <div className="border-t border-neutral-100" />
        <AlignmentHealth />
        <div className="border-t border-neutral-100" />
        <ColumnDistribution />
        <div className="border-t border-neutral-100" />
        <CycleTimeTrend />
        <div className="border-t border-neutral-100" />
        <BottleneckAlert message="3 cards in Review for >5 days" />
      </div>
    </aside>
  );
}
