import { MetricCard } from "@/components/ui/MetricCard";
import type { Card } from "@/types/card";

interface FlowSummaryProps {
  cards?: Card[];
}

const TOOLTIPS = {
  inFlight: "Cards currently in Planned, In Progress, or Review columns. Higher values may indicate too much WIP.",
  avgAge: "Average days cards have been in their current column (excluding Done). Lower is better — indicates faster flow.",
  done: "Total cards that have reached the Done column in this space.",
  completion: "Percentage of all cards that are Done. Calculated as Done / Total cards.",
};

export function FlowSummary({ cards }: FlowSummaryProps) {
  const activeColumns = ["planned", "in_progress", "review"];
  const allCards = cards || [];
  const total = allCards.length;
  const inFlight = allCards.filter((c) => activeColumns.includes(c.column_name)).length;
  const doneCards = allCards.filter((c) => c.column_name === "done");
  const throughput = doneCards.length;
  const completion = total > 0 ? Math.round((throughput / total) * 100) : 0;

  const now = new Date();
  const daysInColumn = allCards
    .filter((c) => c.column_name !== "done")
    .map((c) => {
      const moved = new Date(c.moved_at);
      return (now.getTime() - moved.getTime()) / (1000 * 60 * 60 * 24);
    });
  const avgDays =
    daysInColumn.length > 0
      ? (daysInColumn.reduce((a, b) => a + b, 0) / daysInColumn.length).toFixed(1)
      : "0";

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
        Flow Metrics
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="In Flight" value={inFlight} tooltip={TOOLTIPS.inFlight} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
        <MetricCard label="Avg Age" value={`${avgDays}d`} tooltip={TOOLTIPS.avgAge} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
        <MetricCard label="Done" value={throughput} tooltip={TOOLTIPS.done} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
        <MetricCard label="Completion" value={`${completion}%`} tooltip={TOOLTIPS.completion} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
      </div>
    </div>
  );
}
