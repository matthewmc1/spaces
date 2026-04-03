interface CycleTimeTrendProps {
  data?: number[];
  currentValue?: string;
}

export function CycleTimeTrend({
  data = [5.2, 4.8, 5.1, 4.5, 4.2, 3.9, 4.1, 4.0, 3.8, 4.2],
  currentValue = "4.2 days",
}: CycleTimeTrendProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 48;
  const width = 100;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white border border-neutral-200 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
        Cycle Time
      </p>
      <p className="text-xl font-semibold font-mono text-neutral-800 mt-1">
        {currentValue}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full mt-2"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-[10px] text-neutral-400 text-right mt-0.5">
        Last 30 days
      </p>
    </div>
  );
}
