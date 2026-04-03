import { MetricCard } from "@/components/ui/MetricCard";

export function FlowSummary() {
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
