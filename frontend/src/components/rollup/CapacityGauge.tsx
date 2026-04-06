"use client";

import { WORK_TYPES } from "@/types/flow";
import type { FlowDistribution } from "@/types/rollup";

interface CapacityGaugeProps {
  flow?: FlowDistribution;
  targets?: Record<string, number>;
}

export function CapacityGauge({ flow, targets }: CapacityGaugeProps) {
  if (!flow || !targets || Object.keys(targets).length === 0) return null;

  const items = WORK_TYPES.map((wt) => {
    const actual = flow[`${wt.key}_pct` as keyof FlowDistribution] as number ?? 0;
    const target = targets[wt.key] ?? 0;
    const diff = Math.abs(actual - target);
    const status = diff <= 5 ? "on-target" : diff <= 15 ? "drifting" : "misaligned";
    return { ...wt, actual, target, diff, status };
  }).filter((item) => item.target > 0 || item.actual > 0);

  if (items.length === 0) return null;

  const statusColor = {
    "on-target": "text-emerald-600",
    drifting: "text-amber-600",
    misaligned: "text-rose-600",
  };

  const barColor = {
    "on-target": "bg-emerald-500",
    drifting: "bg-amber-500",
    misaligned: "bg-rose-500",
  };

  return (
    <div className="bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
        Capacity Allocation
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-600">{item.label}</span>
              <span className={`text-[10px] font-[family-name:var(--font-mono)] ${statusColor[item.status as keyof typeof statusColor]}`}>
                {Math.round(item.actual)}% / {item.target}% target
              </span>
            </div>
            <div className="relative h-3 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor[item.status as keyof typeof barColor]} transition-all rounded-full`}
                style={{ width: `${Math.min(item.actual, 100)}%` }}
              />
              {item.target > 0 && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-neutral-800"
                  style={{ left: `${item.target}%` }}
                  title={`Target: ${item.target}%`}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
