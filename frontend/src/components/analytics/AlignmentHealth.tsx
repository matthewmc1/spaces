import { useState } from "react";
import { Info } from "lucide-react";
import type { AlignmentMetrics } from "@/types/metrics";

interface AlignmentHealthProps {
  alignment?: AlignmentMetrics;
}

export function AlignmentHealth({ alignment }: AlignmentHealthProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage = alignment != null ? Math.round(alignment.linked_pct) : 0;
  const linkedCount = alignment?.linked_count ?? 0;
  const totalInFlight = alignment?.total_in_flight ?? 0;
  const orphanedGoals = alignment?.orphaned_goals ?? [];
  const unlinkedHighPri = alignment?.unlinked_high_pri ?? [];

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
          <p>{linkedCount} of {totalInFlight} cards linked</p>
          {orphanedGoals.length > 0 && (
            <div className="text-xs text-rose-600 space-y-0.5">
              <p className="font-medium">Orphaned goals:</p>
              {orphanedGoals.map((g) => (
                <p key={g.id} className="truncate max-w-[140px]">{g.title}</p>
              ))}
            </div>
          )}
          {unlinkedHighPri.length > 0 && (
            <div className="text-xs text-amber-600 space-y-0.5">
              <p className="font-medium">Unlinked high-pri:</p>
              {unlinkedHighPri.map((c) => (
                <p key={c.id} className="truncate max-w-[140px] flex items-center gap-1">
                  <span className="bg-amber-100 text-amber-700 px-1 rounded text-[10px] font-medium shrink-0">{c.priority}</span>
                  {c.title}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      {showTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-neutral-800 text-white text-[11px] leading-relaxed rounded-[var(--radius-md)] shadow-lg">
          Measures what percentage of in-flight cards are linked to a goal. High alignment means work is clearly connected to strategic objectives.
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
