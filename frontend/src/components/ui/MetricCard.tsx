import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  down: { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
  flat: { icon: Minus, color: "text-neutral-400", bg: "bg-neutral-50" },
};

export function MetricCard({ label, value, trend, trendValue, className = "" }: MetricCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;
  return (
    <div className={`bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4 ${className}`}>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-semibold font-mono text-neutral-800">{value}</span>
        {trendInfo && trendValue && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded-full ${trendInfo.bg} ${trendInfo.color}`}>
            <trendInfo.icon className="w-3 h-3" />
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
