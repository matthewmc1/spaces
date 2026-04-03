"use client";

import { useState } from "react";
import Link from "next/link";
import { Folder, ArrowRight, BarChart3, Clock, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import type { Space, SpaceStatus } from "@/types/space";
import type { Card } from "@/types/card";
import { COLUMNS } from "@/types/card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUpdateSpace } from "@/hooks/useSpaces";
import { usePermissions } from "@/hooks/usePermissions";

interface SpaceDashboardProps {
  spaces: Space[];
  isLoading: boolean;
  cardsBySpace?: Record<string, Card[]>;
}

function getMetrics(cards?: Card[]) {
  if (!cards || cards.length === 0) {
    return { total: 0, done: 0, inProgress: 0, backlog: 0, cycleTime: "—", completion: 0 };
  }
  const total = cards.length;
  const done = cards.filter(c => c.column_name === "done").length;
  const inProgress = cards.filter(c => c.column_name === "in_progress" || c.column_name === "review").length;
  const backlog = cards.filter(c => ["inbox", "icebox", "freezer", "planned"].includes(c.column_name)).length;

  const inFlight = cards.filter(c => ["planned", "in_progress", "review"].includes(c.column_name));
  let cycleTime = "—";
  if (inFlight.length > 0) {
    const now = Date.now();
    const avgDays = inFlight.reduce((sum, c) => sum + (now - new Date(c.moved_at).getTime()) / (1000 * 60 * 60 * 24), 0) / inFlight.length;
    cycleTime = avgDays.toFixed(1);
  }

  const completion = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, inProgress, backlog, cycleTime, completion };
}

const statusConfig: Record<SpaceStatus, { label: string; dot: string; badge: string }> = {
  on_track: { label: "On Track", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  at_risk: { label: "At Risk", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  behind: { label: "Behind", dot: "bg-rose-400", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  paused: { label: "Paused", dot: "bg-neutral-400", badge: "bg-neutral-50 text-neutral-600 border-neutral-200" },
};

const STATUS_OPTIONS: SpaceStatus[] = ["on_track", "at_risk", "behind", "paused"];

const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  COLUMNS.map(c => [c.key, c.label])
);

function StatusDropdown({ space }: { space: Space }) {
  const [open, setOpen] = useState(false);
  const updateSpace = useUpdateSpace(space.id);
  const current = statusConfig[space.status] || statusConfig.on_track;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${current.badge} hover:ring-1 hover:ring-neutral-200 transition-all`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
        <ChevronDown size={8} className="opacity-50" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-[var(--radius-md)] border border-neutral-200 shadow-[var(--shadow-md)] py-1 min-w-[120px]">
            {STATUS_OPTIONS.map(status => {
              const cfg = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateSpace.mutate({ status });
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-50 transition-colors ${space.status === status ? "font-medium" : ""}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SpaceCard({ space, cards }: { space: Space; cards?: Card[] }) {
  const metrics = getMetrics(cards);
  const perms = usePermissions();
  const current = statusConfig[space.status] || statusConfig.on_track;

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
          {perms.canEdit ? (
            <StatusDropdown space={space} />
          ) : (
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${current.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
              {current.label}
            </span>
          )}
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

function FocusItem({ card, spaceName }: { card: Card; spaceName: string }) {
  const prioLabel = card.priority ? card.priority.toUpperCase() : "—";
  const prioColor = card.priority === "p0" ? "text-rose-600 bg-rose-50" : card.priority === "p1" ? "text-amber-600 bg-amber-50" : "text-neutral-500 bg-neutral-50";
  const columnLabel = COLUMN_LABELS[card.column_name] || card.column_name;
  const daysInColumn = Math.floor((Date.now() - new Date(card.moved_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-neutral-50 last:border-0">
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${prioColor}`}>{prioLabel}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700 truncate">{card.title}</p>
        <p className="text-[10px] text-neutral-400">{spaceName} · {columnLabel}</p>
      </div>
      {daysInColumn > 0 && (
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-amber-500">{daysInColumn}d</span>
      )}
    </div>
  );
}

function getHighPriorityCards(cardsBySpace: Record<string, Card[]>, spaces: Space[]): { card: Card; spaceName: string }[] {
  const spaceNames = Object.fromEntries(spaces.map(s => [s.id, s.name]));
  const items: { card: Card; spaceName: string }[] = [];

  for (const [spaceId, cards] of Object.entries(cardsBySpace)) {
    for (const card of cards) {
      if ((card.priority === "p0" || card.priority === "p1") && card.column_name !== "done") {
        items.push({ card, spaceName: spaceNames[spaceId] || "Unknown" });
      }
    }
  }

  // Sort: P0 first, then by how long in column (descending)
  items.sort((a, b) => {
    if (a.card.priority !== b.card.priority) return (a.card.priority || "p3") < (b.card.priority || "p3") ? -1 : 1;
    return new Date(a.card.moved_at).getTime() - new Date(b.card.moved_at).getTime();
  });

  return items.slice(0, 5);
}

function getStaleCards(cardsBySpace: Record<string, Card[]>, spaces: Space[], staleDays: number = 5): { card: Card; spaceName: string }[] {
  const spaceNames = Object.fromEntries(spaces.map(s => [s.id, s.name]));
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  const items: { card: Card; spaceName: string }[] = [];

  for (const [spaceId, cards] of Object.entries(cardsBySpace)) {
    for (const card of cards) {
      if (card.column_name !== "done" && card.column_name !== "inbox" && new Date(card.moved_at).getTime() < cutoff) {
        items.push({ card, spaceName: spaceNames[spaceId] || "Unknown" });
      }
    }
  }

  // Oldest first
  items.sort((a, b) => new Date(a.card.moved_at).getTime() - new Date(b.card.moved_at).getTime());
  return items.slice(0, 5);
}

export function SpaceDashboard({ spaces, isLoading, cardsBySpace }: SpaceDashboardProps) {
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

  const rootSpaces = spaces.filter(s => !s.parent_space_id);
  const childSpaces = spaces.filter(s => s.parent_space_id);

  const highPriority = cardsBySpace ? getHighPriorityCards(cardsBySpace, spaces) : [];
  const staleItems = cardsBySpace ? getStaleCards(cardsBySpace, spaces) : [];

  const totalCards = cardsBySpace ? Object.values(cardsBySpace).reduce((sum, cards) => sum + cards.length, 0) : 0;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-neutral-200/60">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-neutral-800">{spaces.length}</span>
          <span className="text-xs text-neutral-400">spaces</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-neutral-600">{totalCards}</span>
          <span className="text-xs text-neutral-400">cards</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-emerald-600">
            {spaces.filter(s => s.status === "on_track").length}
          </span>
          <span className="text-xs text-neutral-400">on track</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-[family-name:var(--font-mono)] font-semibold text-amber-600">
            {spaces.filter(s => s.status === "at_risk").length}
          </span>
          <span className="text-xs text-neutral-400">at risk</span>
        </div>
      </div>

      {/* My Focus Section */}
      {(highPriority.length > 0 || staleItems.length > 0) && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-300">My Focus</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* High Priority Items */}
            {highPriority.length > 0 && (
              <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <h3 className="text-sm font-[family-name:var(--font-display)] text-neutral-700">High Priority Across Workstreams</h3>
                </div>
                <div className="space-y-2">
                  {highPriority.map(({ card, spaceName }) => (
                    <FocusItem key={card.id} card={card} spaceName={spaceName} />
                  ))}
                </div>
              </div>
            )}

            {/* Stale / At Risk Items */}
            {staleItems.length > 0 && (
              <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <h3 className="text-sm font-[family-name:var(--font-display)] text-neutral-700">Stale Items (5+ days)</h3>
                </div>
                <div className="space-y-2">
                  {staleItems.map(({ card, spaceName }) => (
                    <FocusItem key={card.id} card={card} spaceName={spaceName} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Space cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rootSpaces.map((space) => (
          <SpaceCard key={space.id} space={space} cards={cardsBySpace?.[space.id]} />
        ))}
      </div>

      {/* Child spaces */}
      {childSpaces.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-300 mb-3">
            Nested Spaces
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {childSpaces.map((space) => (
              <SpaceCard key={space.id} space={space} cards={cardsBySpace?.[space.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
