import { useState } from "react";
import { Info } from "lucide-react";
import type { Card } from "@/types/card";

interface AlignmentHealthProps {
  cards?: Card[];
}

export function AlignmentHealth({ cards }: AlignmentHealthProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const allCards = cards || [];
  const total = allCards.length;
  const withPriority = allCards.filter((c) => c.priority).length;
  const percentage = total > 0 ? Math.round((withPriority / total) * 100) : 0;
  const unlinked = total - withPriority;

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 80
      ? "text-emerald-500"
      : percentage >= 50
        ? "text-amber-500"
        : "text-rose-500";
  const strokeColor =
    percentage >= 80
      ? "stroke-emerald-500"
      : percentage >= 50
        ? "stroke-amber-500"
        : "stroke-rose-500";

  return (
    <div className="relative bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Alignment Health
        </p>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-neutral-300 hover:text-neutral-500 transition-colors"
        >
          <Info size={12} />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="36" fill="none"
              className={strokeColor}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-lg font-semibold font-mono ${color}`}>
            {percentage}%
          </span>
        </div>
        <div className="text-sm text-neutral-600 space-y-1">
          <p>{withPriority} of {total} cards prioritized</p>
          {unlinked > 0 && (
            <p className="text-amber-600 text-xs">{unlinked} cards without priority</p>
          )}
        </div>
      </div>
      {showTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-neutral-800 text-white text-[11px] leading-relaxed rounded-[var(--radius-md)] shadow-lg">
          Measures what percentage of cards have a priority assigned. High alignment means work is clearly triaged and nothing is falling through the cracks.
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
