"use client";

import Link from "next/link";
import type { Programme } from "@/types/programme";

interface ProgrammeCardProps {
  programme: Programme;
  completionPct?: number;
}

const statusStyles: Record<string, { dot: string; label: string }> = {
  active:    { dot: "bg-emerald-400", label: "Active" },
  paused:    { dot: "bg-amber-400",   label: "Paused" },
  completed: { dot: "bg-neutral-400", label: "Completed" },
};

export function ProgrammeCard({ programme, completionPct }: ProgrammeCardProps) {
  const status = statusStyles[programme.status] || statusStyles.active;
  const targetDate = programme.target_date
    ? new Date(programme.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <Link href={`/programmes/${programme.id}`}>
      <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all p-5 cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-[family-name:var(--font-display)] text-neutral-800 truncate">
            {programme.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{status.label}</span>
          </div>
        </div>
        {programme.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{programme.description}</p>
        )}
        {completionPct !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Progress</span>
              <span className="text-[11px] text-neutral-500">
                {Math.round(completionPct)}%
              </span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"
                style={{ width: `${Math.round(completionPct)}%` }}
              />
            </div>
          </div>
        )}
        {targetDate && (
          <p className="text-[10px] text-neutral-400">Target: {targetDate}</p>
        )}
      </div>
    </Link>
  );
}
