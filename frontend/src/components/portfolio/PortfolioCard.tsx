"use client";

import type { PortfolioItem } from "@/types/portfolio";

const healthColors: Record<string, { bg: string; border: string; dot: string }> = {
  green: { bg: "bg-emerald-50/50", border: "border-l-emerald-500", dot: "bg-emerald-500" },
  amber: { bg: "bg-amber-50/50",   border: "border-l-amber-500",   dot: "bg-amber-500" },
  red:   { bg: "bg-rose-50/50",    border: "border-l-rose-500",    dot: "bg-rose-500" },
};

export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const h = healthColors[item.health] ?? healthColors.green;
  const targetDate = item.target_date
    ? new Date(item.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className={`bg-white ${h.bg} border ${h.border} border-l-4 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${h.dot}`} />
          <h3 className="text-sm font-[family-name:var(--font-display)] font-semibold text-neutral-800 truncate">
            {item.name}
          </h3>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-neutral-400 shrink-0 ml-2">
          {item.item_type === "programme" ? "Programme" : item.space_type}
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px] font-[family-name:var(--font-mono)] text-neutral-500">
        <span>{item.in_flight} in flight</span>
        <span>{Math.round(item.completion_pct)}% done</span>
        <span>{Math.round(item.alignment_pct)}% aligned</span>
        {item.high_pri_open > 0 && (
          <span className="text-rose-600">{item.high_pri_open} P0/P1</span>
        )}
      </div>
      {targetDate && (
        <p className="text-[10px] text-neutral-400 mt-2">Target: {targetDate}</p>
      )}
      <div className="mt-2">
        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"
            style={{ width: `${Math.round(item.completion_pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
