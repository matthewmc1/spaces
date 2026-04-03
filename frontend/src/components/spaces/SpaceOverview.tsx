"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Target, TrendingUp, Users, Clock } from "lucide-react";
import type { Card } from "@/types/card";

interface SpaceOverviewProps {
  spaceName: string;
  spaceDescription?: string;
  cards?: Card[];
}

export function SpaceOverview({ spaceName, spaceDescription, cards = [] }: SpaceOverviewProps) {
  const [expanded, setExpanded] = useState(false);

  const totalCards = cards.length;
  const doneCards = cards.filter(c => c.column_name === "done").length;
  const inProgressCards = cards.filter(c => c.column_name === "in_progress").length;
  const reviewCards = cards.filter(c => c.column_name === "review").length;
  const plannedCards = cards.filter(c => c.column_name === "planned").length;
  const completionPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;

  // Program health based on completion and flow
  const healthStatus = completionPct >= 70 ? "On Track" : completionPct >= 40 ? "At Risk" : "Needs Attention";
  const healthColor = completionPct >= 70 ? "bg-emerald-100 text-emerald-700" : completionPct >= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  const healthDot = completionPct >= 70 ? "bg-emerald-400" : completionPct >= 40 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="mb-5 animate-fade-in-up">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-neutral-400 hover:text-neutral-600 transition-colors text-xs mb-3"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span className="uppercase tracking-[0.08em] font-medium">Program Overview</span>
      </button>

      {expanded && (
        <div className="grid grid-cols-4 gap-3 animate-fade-in-up">
          {/* Status card */}
          <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-neutral-400" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${healthDot}`} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${healthColor}`}>
                {healthStatus}
              </span>
            </div>
          </div>

          {/* Progress card */}
          <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-neutral-400" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-xs font-[family-name:var(--font-mono)] text-neutral-600">{completionPct}%</span>
            </div>
          </div>

          {/* Capacity card */}
          <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-neutral-400" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Active</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-[family-name:var(--font-mono)] font-medium text-neutral-800">{inProgressCards + reviewCards}</span>
              <span className="text-[11px] text-neutral-400">in flight</span>
            </div>
          </div>

          {/* Pipeline card */}
          <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-neutral-400" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Pipeline</span>
            </div>
            <div className="flex gap-2">
              <div className="text-center">
                <span className="block text-sm font-[family-name:var(--font-mono)] font-medium text-neutral-700">{plannedCards}</span>
                <span className="text-[9px] text-neutral-400">planned</span>
              </div>
              <div className="text-center">
                <span className="block text-sm font-[family-name:var(--font-mono)] font-medium text-neutral-700">{inProgressCards}</span>
                <span className="text-[9px] text-neutral-400">active</span>
              </div>
              <div className="text-center">
                <span className="block text-sm font-[family-name:var(--font-mono)] font-medium text-neutral-700">{reviewCards}</span>
                <span className="text-[9px] text-neutral-400">review</span>
              </div>
              <div className="text-center">
                <span className="block text-sm font-[family-name:var(--font-mono)] font-medium text-emerald-600">{doneCards}</span>
                <span className="text-[9px] text-neutral-400">done</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Narrative */}
      {expanded && spaceDescription && (
        <div className="mt-3 bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mb-1.5">About this space</p>
          <p className="text-sm text-neutral-600 leading-relaxed">{spaceDescription}</p>
        </div>
      )}
    </div>
  );
}
