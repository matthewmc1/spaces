"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { DailySnapshot } from "@/types/metrics";

interface CumulativeFlowDiagramProps {
  cumulativeFlow?: DailySnapshot[];
}

// Stack order bottom to top
const STACK_ORDER = [
  "done",
  "review",
  "in_progress",
  "planned",
  "freezer",
  "icebox",
  "inbox",
] as const;

const COLORS: Record<string, string> = {
  done: "#10b981",
  review: "#f97316",
  in_progress: "#f59e0b",
  planned: "#14b8a6",
  freezer: "#3b82f6",
  icebox: "#38bdf8",
  inbox: "#94a3b8",
};

const LABELS: Record<string, string> = {
  done: "Done",
  review: "Review",
  in_progress: "In Progress",
  planned: "Planned",
  freezer: "Freezer",
  icebox: "Icebox",
  inbox: "Inbox",
};

const VIEW_W = 280;
const VIEW_H = 120;
const PAD_LEFT = 0;
const PAD_RIGHT = 0;
const PAD_TOP = 4;
const PAD_BOTTOM = 4;
const CHART_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const CHART_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CumulativeFlowDiagram({ cumulativeFlow }: CumulativeFlowDiagramProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!cumulativeFlow || cumulativeFlow.length === 0) return null;

  const snapshots = cumulativeFlow;
  const n = snapshots.length;

  // Compute stacked values per day
  // stacked[dayIndex][colKey] = cumulative height up to and including that col
  const stackedTops: Array<Record<string, number>> = snapshots.map((snap) => {
    let cumSum = 0;
    const tops: Record<string, number> = {};
    for (const col of STACK_ORDER) {
      cumSum += snap.columns[col] ?? 0;
      tops[col] = cumSum;
    }
    return tops;
  });

  const maxTotal = Math.max(...stackedTops.map((t) => t["inbox"] ?? 0), 1);

  // Map a (dayIndex, stackedValue) to SVG coords
  function xOf(i: number): number {
    return PAD_LEFT + (n === 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W);
  }
  function yOf(v: number): number {
    return PAD_TOP + CHART_H - (v / maxTotal) * CHART_H;
  }

  // Build path for each band: top edge left→right, then bottom edge right→left
  function buildPath(col: string, belowCol: string | null): string {
    const topPoints = snapshots.map((_, i) => {
      const x = xOf(i);
      const y = yOf(stackedTops[i][col] ?? 0);
      return `${x},${y}`;
    });

    const bottomPoints = snapshots.map((_, i) => {
      const idx = n - 1 - i;
      const x = xOf(idx);
      const below = belowCol != null ? (stackedTops[idx][belowCol] ?? 0) : 0;
      const y = yOf(below);
      return `${x},${y}`;
    });

    return `M ${topPoints[0]} L ${topPoints.slice(1).join(" L ")} L ${bottomPoints[0]} L ${bottomPoints.slice(1).join(" L ")} Z`;
  }

  const dateStart = formatDate(snapshots[0].date);
  const dateEnd = formatDate(snapshots[n - 1].date);

  // Only show columns that have any data
  const visibleCols = STACK_ORDER.filter((col) =>
    snapshots.some((s) => (s.columns[col] ?? 0) > 0)
  );

  return (
    <div className="relative bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Cumulative Flow
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {dateStart} – {dateEnd}
          </p>
        </div>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-neutral-300 hover:text-neutral-500 transition-colors"
        >
          <Info size={12} />
        </button>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full mt-2"
        preserveAspectRatio="none"
      >
        {STACK_ORDER.map((col, idx) => {
          const belowCol = idx > 0 ? STACK_ORDER[idx - 1] : null;
          return (
            <path
              key={col}
              d={buildPath(col, belowCol)}
              fill={COLORS[col]}
              fillOpacity={0.7}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {visibleCols.map((col) => (
          <span key={col} className="flex items-center gap-1 text-[10px] text-neutral-500">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[col], opacity: 0.85 }}
            />
            {LABELS[col]}
          </span>
        ))}
      </div>

      {showTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 px-3 py-2 bg-neutral-800 text-white text-[11px] leading-relaxed rounded-[var(--radius-md)] shadow-lg">
          Shows how cards are distributed across columns over time. A widening band indicates growing WIP in that stage.
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
