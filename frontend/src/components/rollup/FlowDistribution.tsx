"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { WORK_TYPES } from "@/types/flow";
import type { FlowDistribution as FlowDistributionType } from "@/types/rollup";

interface FlowDistributionProps {
  flow?: FlowDistributionType;
}

const colors: Record<string, string> = {
  feature: "#14b8a6",
  defect: "#f43f5e",
  risk: "#f59e0b",
  debt: "#6b7280",
};

export function FlowDistributionChart({ flow }: FlowDistributionProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!flow) return null;

  const total = flow.feature_count + flow.defect_count + flow.risk_count + flow.debt_count;
  if (total === 0) return null;

  const segments = [
    { key: "feature", count: flow.feature_count, pct: flow.feature_pct, color: colors.feature },
    { key: "defect", count: flow.defect_count, pct: flow.defect_pct, color: colors.defect },
    { key: "risk", count: flow.risk_count, pct: flow.risk_pct, color: colors.risk },
    { key: "debt", count: flow.debt_count, pct: flow.debt_pct, color: colors.debt },
  ].filter((s) => s.count > 0);

  return (
    <div className="relative bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Flow Distribution
        </p>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-neutral-300 hover:text-neutral-500 transition-colors"
        >
          <Info size={12} />
        </button>
      </div>

      <div className="flex h-6 rounded-full overflow-hidden mb-3">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            className="transition-all"
            title={`${WORK_TYPES.find((wt) => wt.key === s.key)?.label}: ${s.count} (${Math.round(s.pct)}%)`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => {
          const info = WORK_TYPES.find((wt) => wt.key === s.key);
          return (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-neutral-600">{info?.label}</span>
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-neutral-400">
                {Math.round(s.pct)}%
              </span>
            </div>
          );
        })}
      </div>

      {showTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 px-3 py-2 bg-neutral-800 text-white text-[11px] leading-relaxed rounded-[var(--radius-md)] shadow-lg">
          How capacity is distributed across work types (Mik Kersten&apos;s Flow Framework). A healthy org allocates ~65% to Features, ~15% to Debt, ~10% to Risk, ~10% to Defects.
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
