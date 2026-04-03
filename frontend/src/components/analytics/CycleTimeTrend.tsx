import { useState } from "react";
import { Info } from "lucide-react";
import type { Card } from "@/types/card";

interface CycleTimeTrendProps {
  cards?: Card[];
}

function computeCycleData(cards: Card[]) {
  const now = new Date();
  const activeCards = cards.filter(c => c.column_name !== "done" && c.column_name !== "inbox");

  if (activeCards.length === 0) return { data: [], currentValue: "0d" };

  // Bucket cards by week of moved_at to approximate a trend
  const weekBuckets: Record<number, number[]> = {};
  for (const card of activeCards) {
    const moved = new Date(card.moved_at);
    const daysAgo = Math.floor((now.getTime() - moved.getTime()) / (1000 * 60 * 60 * 24));
    const ageDays = (now.getTime() - moved.getTime()) / (1000 * 60 * 60 * 24);
    const weekIndex = Math.min(Math.floor(daysAgo / 7), 3); // 4 weeks max
    if (!weekBuckets[weekIndex]) weekBuckets[weekIndex] = [];
    weekBuckets[weekIndex].push(ageDays);
  }

  const data: number[] = [];
  for (let w = 3; w >= 0; w--) {
    const bucket = weekBuckets[w] || [];
    const avg = bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0;
    data.push(Math.round(avg * 10) / 10);
  }

  const allDays = activeCards.map(c => (now.getTime() - new Date(c.moved_at).getTime()) / (1000 * 60 * 60 * 24));
  const currentAvg = (allDays.reduce((a, b) => a + b, 0) / allDays.length).toFixed(1);

  return { data, currentValue: `${currentAvg}d` };
}

export function CycleTimeTrend({ cards }: CycleTimeTrendProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { data, currentValue } = cards && cards.length > 0
    ? computeCycleData(cards)
    : { data: [0], currentValue: "0d" };

  const max = data.length > 0 ? Math.max(...data) : 1;
  const min = data.length > 0 ? Math.min(...data) : 0;
  const range = max - min || 1;
  const height = 48;
  const width = 100;

  const points = data.length > 1
    ? data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        return `${x},${y}`;
      }).join(" ")
    : `0,${height / 2} ${width},${height / 2}`;

  return (
    <div className="relative bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Cycle Time
        </p>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-neutral-300 hover:text-neutral-500 transition-colors"
        >
          <Info size={12} />
        </button>
      </div>
      <p className="text-xl font-semibold font-mono text-neutral-800 mt-1">
        {currentValue}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full mt-2"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-[10px] text-neutral-400 text-right mt-0.5">
        Last 4 weeks
      </p>
      {showTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-neutral-800 text-white text-[11px] leading-relaxed rounded-[var(--radius-md)] shadow-lg">
          Average days active cards have spent in their current column. Trend shows weekly averages over the last 4 weeks. Lower and decreasing values indicate healthy flow.
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
