"use client";

import { MetricCard } from "@/components/ui/MetricCard";
import type { SpaceRollup, ProgrammeRollup } from "@/types/rollup";

interface RollupKPIsProps {
  rollup?: SpaceRollup | ProgrammeRollup;
}

export function RollupKPIs({ rollup }: RollupKPIsProps) {
  const inFlight = rollup?.in_flight ?? 0;
  const cycle = rollup?.avg_cycle_days ?? 0;
  const completion = rollup?.completion_pct ?? 0;
  const alignment = rollup?.alignment_pct ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        label="In Flight"
        value={inFlight}
        tooltip="Cards in Planned, In Progress, or Review across all descendant spaces."
      />
      <MetricCard
        label="Avg Cycle"
        value={`${cycle.toFixed(1)}d`}
        tooltip="Average age of in-flight cards across all descendant spaces."
      />
      <MetricCard
        label="Completion"
        value={`${Math.round(completion)}%`}
        tooltip="Percentage of cards that are Done across the rolled-up scope."
      />
      <MetricCard
        label="Alignment"
        value={`${Math.round(alignment)}%`}
        tooltip="Percentage of in-flight cards linked to at least one goal."
      />
    </div>
  );
}
