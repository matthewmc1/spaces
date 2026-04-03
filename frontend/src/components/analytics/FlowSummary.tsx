import { MetricCard } from "@/components/ui/MetricCard";

export function FlowSummary() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="In Flight" value={12} trend="up" trendValue="+3" />
      <MetricCard label="Cycle Time" value="4.2d" trend="down" trendValue="-0.8d" />
      <MetricCard label="Throughput" value="8/wk" trend="up" trendValue="+2" />
      <MetricCard label="Completion" value="73%" trend="flat" trendValue="0%" />
    </div>
  );
}
