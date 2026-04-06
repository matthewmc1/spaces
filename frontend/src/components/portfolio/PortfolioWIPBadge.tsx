"use client";

interface PortfolioWIPBadgeProps {
  current: number;
  limit: number;
}

export function PortfolioWIPBadge({ current, limit }: PortfolioWIPBadgeProps) {
  const isOver = current > limit;
  const isAt = current === limit;

  const color = isOver
    ? "bg-rose-100 text-rose-700 border-rose-200"
    : isAt
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${color}`}>
      <span>{current} / {limit}</span>
      <span className="text-[10px] font-[family-name:var(--font-sans)] font-normal opacity-70">
        active items
      </span>
    </div>
  );
}
