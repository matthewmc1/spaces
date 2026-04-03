interface AlignmentHealthProps {
  percentage?: number;
  linkedCount?: number;
  totalCount?: number;
  orphanedGoals?: number;
}

export function AlignmentHealth({
  percentage = 65,
  linkedCount = 8,
  totalCount = 12,
  orphanedGoals = 2,
}: AlignmentHealthProps) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 80
      ? "text-emerald-500"
      : percentage >= 50
        ? "text-amber-500"
        : "text-rose-500";
  const strokeColor =
    percentage >= 80
      ? "stroke-emerald-500"
      : percentage >= 50
        ? "stroke-amber-500"
        : "stroke-rose-500";

  return (
    <div className="bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
        Alignment Health
      </p>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              className={strokeColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center text-lg font-semibold font-mono ${color}`}
          >
            {percentage}%
          </span>
        </div>
        <div className="text-sm text-neutral-600 space-y-1">
          <p>
            {linkedCount} of {totalCount} cards linked
          </p>
          {orphanedGoals > 0 && (
            <p className="text-amber-600 text-xs">
              {orphanedGoals} orphaned goals
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
