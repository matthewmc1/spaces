"use client";

import { X } from "lucide-react";
import { FlowSummary } from "./FlowSummary";
import { AlignmentHealth } from "./AlignmentHealth";
import { ColumnDistribution } from "./ColumnDistribution";
import { CycleTimeTrend } from "./CycleTimeTrend";
import { BottleneckAlert } from "./BottleneckAlert";
import { useFlowMetrics, useAlignmentMetrics } from "@/hooks/useMetrics";
import type { Card } from "@/types/card";

interface AnalyticsSidebarProps {
  open: boolean;
  onClose: () => void;
  spaceId?: string;
  cards?: Card[];
}

export function AnalyticsSidebar({ open, onClose, spaceId, cards: _cards }: AnalyticsSidebarProps) {
  const { data: flowMetrics } = useFlowMetrics(spaceId ?? "");
  const { data: alignmentMetrics } = useAlignmentMetrics(spaceId ?? "");

  if (!open) return null;

  // Derive bottleneck from flowMetrics by_column: find the non-done/inbox column with most cards
  let bottleneckMessage: string | undefined;
  if (flowMetrics?.by_column) {
    const skipColumns = new Set(["done", "inbox"]);
    const entries = Object.entries(flowMetrics.by_column).filter(
      ([col]) => !skipColumns.has(col)
    );
    const worst = entries.sort((a, b) => b[1] - a[1])[0];
    if (worst && worst[1] > 0) {
      const colLabel = worst[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      bottleneckMessage = `${worst[1]} card${worst[1] > 1 ? "s" : ""} in ${colLabel}`;
    }
  }

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
        <FlowSummary flow={flowMetrics} />
        <div className="border-t border-neutral-100" />
        <AlignmentHealth alignment={alignmentMetrics} />
        <div className="border-t border-neutral-100" />
        <ColumnDistribution byColumn={flowMetrics?.by_column} />
        <div className="border-t border-neutral-100" />
        <CycleTimeTrend avgDays={flowMetrics?.avg_cycle_time_days} cumulativeFlow={flowMetrics?.cumulative_flow} />
        <div className="border-t border-neutral-100" />
        <BottleneckAlert message={bottleneckMessage} />
      </div>
    </aside>
  );
}
