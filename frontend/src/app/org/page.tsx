"use client";

import { Sidebar } from "@/components/common/Sidebar";
import { useOrgRollup } from "@/hooks/useRollup";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useAllSpaces } from "@/hooks/useSpaces";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { DepartmentBreakdown } from "@/components/rollup/DepartmentBreakdown";
import { ProgrammeCard } from "@/components/rollup/ProgrammeCard";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrgDashboardPage() {
  const { data: rollup, isLoading } = useOrgRollup();
  const { data: programmes } = useProgrammes();
  const { data: spaces } = useAllSpaces();

  const spaceNames: Record<string, string> = {};
  (spaces ?? []).forEach((s) => { spaceNames[s.id] = s.name; });

  const activeProgrammes = (programmes ?? []).filter((p) => p.status === "active");

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
              Organization Dashboard
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Rolled-up metrics across all teams, workstreams, and programmes.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton variant="rectangle" height="100px" />
              <Skeleton variant="rectangle" height="240px" />
            </div>
          ) : (
            <div className="space-y-8">
              <RollupKPIs rollup={rollup} />

              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                  Team Breakdown
                </h2>
                <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5">
                  <DepartmentBreakdown
                    children={rollup?.child_breakdown}
                    spaceNames={spaceNames}
                  />
                </div>
              </section>

              {activeProgrammes.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                    Active Programmes
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeProgrammes.map((p) => (
                      <ProgrammeCard key={p.id} programme={p} />
                    ))}
                  </div>
                </section>
              )}

              {rollup && rollup.high_pri_open > 0 && (
                <section>
                  <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-4">
                    <p className="text-sm text-amber-800">
                      <strong>{rollup.high_pri_open}</strong> high-priority cards are still open across the org.
                    </p>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
