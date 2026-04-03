"use client";

import { X } from "lucide-react";
import { FlowSummary } from "./FlowSummary";
import { AlignmentHealth } from "./AlignmentHealth";
import { ColumnDistribution } from "./ColumnDistribution";
import { CycleTimeTrend } from "./CycleTimeTrend";
import { BottleneckAlert } from "./BottleneckAlert";
import type { Card } from "@/types/card";

interface AnalyticsSidebarProps {
  open: boolean;
  onClose: () => void;
  cards?: Card[];
}

function computeBottleneckMessage(cards: Card[]): string | undefined {
  const columnCounts: Record<string, number> = {};
  for (const card of cards) {
    if (card.column_name === "done") continue;
    const movedAt = new Date(card.moved_at);
    const now = new Date();
    const days = Math.floor((now.getTime() - movedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 5) {
      columnCounts[card.column_name] = (columnCounts[card.column_name] || 0) + 1;
    }
  }
  const worst = Object.entries(columnCounts).sort((a, b) => b[1] - a[1])[0];
  if (!worst) return undefined;
  const colLabel = worst[0].replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${worst[1]} card${worst[1] > 1 ? "s" : ""} in ${colLabel} for >5 days`;
}

export function AnalyticsSidebar({ open, onClose, cards }: AnalyticsSidebarProps) {
  if (!open) return null;

  const bottleneckMessage = cards && cards.length > 0
    ? computeBottleneckMessage(cards)
    : "3 cards in Review for >5 days";

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
        <FlowSummary cards={cards} />
        <div className="border-t border-neutral-100" />
        <AlignmentHealth />
        <div className="border-t border-neutral-100" />
        <ColumnDistribution cards={cards} />
        <div className="border-t border-neutral-100" />
        <CycleTimeTrend />
        <div className="border-t border-neutral-100" />
        <BottleneckAlert message={bottleneckMessage} />
      </div>
    </aside>
  );
}
