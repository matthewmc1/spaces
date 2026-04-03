"use client";

import Link from "next/link";
import { Folder, ArrowRight, BarChart3, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Space } from "@/types/space";
import { Skeleton } from "@/components/ui/Skeleton";

interface SpaceDashboardProps {
  spaces: Space[];
  isLoading: boolean;
}

// Mock metrics for demo — will be wired to real API later
function getMockMetrics(space: Space) {
  // Deterministic "random" based on space id
  const hash = space.id.charCodeAt(0) + space.id.charCodeAt(5);
  const total = 8 + (hash % 20);
  const done = Math.floor(total * (0.2 + (hash % 5) * 0.12));
  const inProgress = Math.floor((total - done) * 0.4);
  const backlog = total - done - inProgress;
  const cycleTime = (2 + (hash % 8)).toFixed(1);
  const completion = Math.round((done / total) * 100);
  const health: "on-track" | "at-risk" | "behind" = completion >= 60 ? "on-track" : completion >= 30 ? "at-risk" : "behind";

  return { total, done, inProgress, backlog, cycleTime, completion, health };
}

const healthConfig = {
  "on-track": { label: "On Track", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "at-risk": { label: "At Risk", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "behind": { label: "Needs Attention", dot: "bg-rose-400", badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

function SpaceCard({ space }: { space: Space }) {
  const metrics = getMockMetrics(space);
  const health = healthConfig[metrics.health];

  return (
    <Link href={`/spaces/${space.id}`}>
      <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all p-5 group cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-primary-50 flex items-center justify-center">
              <Folder size={16} className="text-primary-500" />
            </div>
            <div>
              <h3 className="text-base font-[family-name:var(--font-display)] text-neutral-800 group-hover:text-primary-600 transition-colors">
                {space.name}
              </h3>
              {space.description && (
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{space.description}</p>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${health.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
            {health.label}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Progress</span>
            <span className="text-[11px] font-[family-name:var(--font-mono)] text-neutral-500">{metrics.completion}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"
              style={{ width: `${metrics.completion}%` }}
            />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <BarChart3 size={10} className="text-neutral-300" />
              <span className="text-[9px] text-neutral-400 uppercase">Total</span>
            </div>
            <span className="text-sm font-[family-name:var(--font-mono)] font-medium text-neutral-700">{metrics.total}</span>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <AlertCircle size={10} className="text-neutral-300" />
              <span className="text-[9px] text-neutral-400 uppercase">Backlog</span>
            </div>
            <span className="text-sm font-[family-name:var(--font-mono)] font-medium text-neutral-700">{metrics.backlog}</span>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Clock size={10} className="text-neutral-300" />
              <span className="text-[9px] text-neutral-400 uppercase">Cycle</span>
            </div>
            <span className="text-sm font-[family-name:var(--font-mono)] font-medium text-neutral-700">{metrics.cycleTime}d</span>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <CheckCircle2 size={10} className="text-emerald-300" />
              <span className="text-[9px] text-neutral-400 uppercase">Done</span>
            </div>
            <span className="text-sm font-[family-name:var(--font-mono)] font-medium text-emerald-600">{metrics.done}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-[10px] text-neutral-400">{space.visibility}</span>
          <span className="text-[11px] text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            Open <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function FocusItem({ title, space, priority, status, daysStale }: {
  title: string; space: string; priority: string; status: string; daysStale?: number
}) {
  const prioColor = priority === "P0" ? "text-rose-600 bg-rose-50" : priority === "P1" ? "text-amber-600 bg-amber-50" : "text-neutral-500 bg-neutral-50";
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-neutral-50 last:border-0">
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${prioColor}`}>{priority}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700 truncate">{title}</p>
        <p className="text-[10px] text-neutral-400">{space} · {status}</p>
      </div>
      {daysStale && (
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-amber-500">{daysStale}d</span>
      )}
    </div>
  );
}

export function SpaceDashboard({ spaces, isLoading }: SpaceDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangle" height="240px" />
        ))}
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="text-center py-20">
        <Folder size={40} className="text-neutral-200 mx-auto mb-4" />
        <h3 className="text-lg font-[family-name:var(--font-display)] text-neutral-600 mb-2">No spaces yet</h3>
        <p className="text-sm text-neutral-400">Create your first space to get started.</p>
      </div>
    );
  }

  // Group by parent (root spaces are their own group)
  const rootSpaces = spaces.filter(s => !s.parent_space_id);
  const childSpaces = spaces.filter(s => s.parent_space_id);

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-neutral-200/60">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-neutral-800">{spaces.length}</span>
          <span className="text-xs text-neutral-400">spaces</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-emerald-600">
            {rootSpaces.filter(s => getMockMetrics(s).health === "on-track").length}
          </span>
          <span className="text-xs text-neutral-400">on track</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-amber-600">
            {rootSpaces.filter(s => getMockMetrics(s).health === "at-risk").length}
          </span>
          <span className="text-xs text-neutral-400">at risk</span>
        </div>
      </div>

      {/* My Focus Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-300">My Focus</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* High Priority Items */}
          <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <h3 className="text-sm font-[family-name:var(--font-display)] text-neutral-700">High Priority Across Workstreams</h3>
            </div>
            <div className="space-y-2">
              <FocusItem title="Implement SSO integration" space="Engineering" priority="P0" status="In Progress" />
              <FocusItem title="Design system token audit" space="Engineering" priority="P1" status="In Progress" />
              <FocusItem title="API rate limiting" space="Platform" priority="P1" status="Planned" />
            </div>
            <p className="text-[10px] text-neutral-300 mt-3 italic">Showing mock data — will be wired to real assignments</p>
          </div>

          {/* At Risk Items */}
          <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <h3 className="text-sm font-[family-name:var(--font-display)] text-neutral-700">At Risk in Your Team</h3>
            </div>
            <div className="space-y-2">
              <FocusItem title="Mobile responsive layout" space="Engineering" priority="P3" status="Review" daysStale={7} />
              <FocusItem title="Goal linking UI" space="Engineering" priority="P1" status="Ice Box" daysStale={5} />
            </div>
            <p className="text-[10px] text-neutral-300 mt-3 italic">Items stale for 5+ days in your team spaces</p>
          </div>
        </div>
      </div>

      {/* Space cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rootSpaces.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>

      {/* Child spaces (if any) */}
      {childSpaces.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-300 mb-3">
            Nested Spaces
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {childSpaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
