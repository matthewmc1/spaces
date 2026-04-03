import { MetricCard } from "@/components/ui/MetricCard";
import type { Card } from "@/types/card";

interface FlowSummaryProps {
  cards?: Card[];
}

export function FlowSummary({ cards }: FlowSummaryProps) {
  if (!cards || cards.length === 0) {
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
          Flow Metrics
        </p>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="In Flight" value={12} trend="up" trendValue="+3" className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
          <MetricCard label="Cycle Time" value="4.2d" trend="down" trendValue="-0.8d" className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
          <MetricCard label="Throughput" value="8/wk" trend="up" trendValue="+2" className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
          <MetricCard label="Completion" value="73%" trend="flat" trendValue="0%" className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
        </div>
      </div>
    );
  }

  const activeColumns = ["planned", "in_progress", "review"];
  const inFlight = cards.filter((c) => activeColumns.includes(c.column_name)).length;
  const doneCards = cards.filter((c) => c.column_name === "done");
  const throughput = doneCards.length;
  const total = cards.length;
  const completion = total > 0 ? Math.round((throughput / total) * 100) : 0;

  const now = new Date();
  const daysInColumn = cards
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
        <MetricCard label="In Flight" value={inFlight} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
        <MetricCard label="Avg Age" value={`${avgDays}d`} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
        <MetricCard label="Done" value={throughput} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
        <MetricCard label="Completion" value={`${completion}%`} className="[&_span.text-2xl]:font-[family-name:var(--font-mono)]" />
      </div>
    </div>
  );
}
