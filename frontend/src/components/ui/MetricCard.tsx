import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  tooltip?: string;
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  down: { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
  flat: { icon: Minus, color: "text-neutral-400", bg: "bg-neutral-50" },
};

export function MetricCard({ label, value, trend, trendValue, tooltip, className = "" }: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const trendInfo = trend ? trendConfig[trend] : null;
  return (
    <div className={`relative bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
        {tooltip && (
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-neutral-300 hover:text-neutral-500 transition-colors"
          >
            <Info size={12} />
          </button>
        )}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-semibold font-mono text-neutral-800">{value}</span>
        {trendInfo && trendValue && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded-full ${trendInfo.bg} ${trendInfo.color}`}>
            <trendInfo.icon className="w-3 h-3" />
            {trendValue}
          </span>
        )}
      </div>
      {showTooltip && tooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 bg-neutral-800 text-white text-[11px] leading-relaxed rounded-[var(--radius-md)] shadow-lg">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
