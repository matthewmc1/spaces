import { MetricCard } from "@/components/ui/MetricCard";
import type { FlowMetrics } from "@/types/metrics";

interface FlowSummaryProps {
  flow?: FlowMetrics;
}

const TOOLTIPS = {
  inFlight: "Cards currently in Planned, In Progress, or Review columns. Higher values may indicate too much WIP.",
  avgAge: "Average days cards have been in their current column (excluding Done). Lower is better — indicates faster flow.",
  done: "Total cards that have reached the Done column in this space.",
  completion: "Percentage of all cards that are Done. Calculated as Done / Total cards.",
};

export function FlowSummary({ flow }: FlowSummaryProps) {
  const inFlight = flow?.in_flight ?? 0;
  const avgDays = flow != null ? flow.avg_cycle_time_days.toFixed(1) : "0";
  const throughput = flow?.throughput ?? 0;
  const completion = flow != null ? Math.round(flow.completion_pct) : 0;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
        Flow Metrics
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="In Flight" value={inFlight} tooltip={TOOLTIPS.inFlight} />
        <MetricCard label="Avg Age" value={`${avgDays}d`} tooltip={TOOLTIPS.avgAge} />
        <MetricCard label="Done" value={throughput} tooltip={TOOLTIPS.done} />
        <MetricCard label="Completion" value={`${completion}%`} tooltip={TOOLTIPS.completion} />
      </div>
    </div>
  );
}
