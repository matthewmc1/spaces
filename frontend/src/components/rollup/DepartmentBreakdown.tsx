"use client";

import type { SpaceRollupSummary } from "@/types/rollup";

interface DepartmentBreakdownProps {
  children?: SpaceRollupSummary[];
  spaceNames: Record<string, string>;
}

export function DepartmentBreakdown({ children, spaceNames }: DepartmentBreakdownProps) {
  const items = (children ?? [])
    .filter((c) => c.space_type === "department" || c.space_type === "team")
    .sort((a, b) => b.completion_pct - a.completion_pct)
    .slice(0, 10);

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic">No department or team breakdown available.</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const name = spaceNames[item.space_id] || item.space_id.slice(0, 8);
        const barColor =
          item.completion_pct >= 70
            ? "bg-emerald-500"
            : item.completion_pct >= 40
              ? "bg-amber-500"
              : "bg-rose-500";
        return (
          <div key={item.space_id} className="flex items-center gap-3">
            <span className="text-xs text-neutral-600 truncate w-32">{name}</span>
            <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all`}
                style={{ width: `${Math.round(item.completion_pct)}%` }}
              />
            </div>
            <span className="text-[11px] font-[family-name:var(--font-mono)] text-neutral-500 w-10 text-right">
              {Math.round(item.completion_pct)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
