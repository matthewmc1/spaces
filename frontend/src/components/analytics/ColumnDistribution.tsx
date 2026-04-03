import { COLUMNS, type Column } from "@/types/card";

interface ColumnDistributionProps {
  counts?: Record<Column, number>;
}

const segmentColors: Record<Column, string> = {
  inbox: "bg-slate-400",
  icebox: "bg-sky-400",
  freezer: "bg-blue-500",
  planned: "bg-teal-500",
  in_progress: "bg-amber-500",
  review: "bg-orange-400",
  done: "bg-emerald-500",
};

export function ColumnDistribution({ counts }: ColumnDistributionProps) {
  const data = counts || {
    inbox: 3,
    icebox: 2,
    freezer: 1,
    planned: 5,
    in_progress: 4,
    review: 2,
    done: 8,
  };
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  if (total === 0) return null;

  return (
    <div className="bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
        Distribution
      </p>
      <div className="flex h-6 rounded-full overflow-hidden">
        {COLUMNS.map(({ key }) => {
          const count = data[key] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              className={`${segmentColors[key]} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${key}: ${count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {COLUMNS.map(({ key, label }) => {
          const count = data[key] || 0;
          if (count === 0) return null;
          return (
            <span key={key} className="flex items-center gap-1 text-xs text-neutral-500">
              <span className={`w-2 h-2 rounded-full ${segmentColors[key]}`} />
              {label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
