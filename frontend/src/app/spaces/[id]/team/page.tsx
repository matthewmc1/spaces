"use client";

import { use } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/common/Sidebar";
import { useSpace, useSpaceTree } from "@/hooks/useSpaces";
import { useSpaceRollup } from "@/hooks/useRollup";
import { useGoals } from "@/hooks/useGoals";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowRight, Folder } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeamDashboardPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: space, isLoading: spaceLoading } = useSpace(id);
  const { data: rollup, isLoading: rollupLoading } = useSpaceRollup(id);
  const { data: tree } = useSpaceTree(id);
  const { data: goals } = useGoals(id);

  const children = tree?.children?.map((c) => c.space) ?? [];
  const workstreams = children.filter((c) => c.space_type === "workstream" || !c.space_type);

  if (spaceLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Skeleton variant="rectangle" height="80px" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
              {space?.space_type ?? "Team"}
            </p>
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em] mt-1">
              {space?.name}
            </h1>
            {space?.description && (
              <p className="mt-2 text-sm text-neutral-500 max-w-2xl">{space.description}</p>
            )}
          </div>

          {rollupLoading ? (
            <Skeleton variant="rectangle" height="120px" />
          ) : (
            <div className="space-y-8">
              <RollupKPIs rollup={rollup} />

              {workstreams.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                    Workstreams
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workstreams.map((ws) => (
                      <Link key={ws.id} href={`/spaces/${ws.id}`}>
                        <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all p-5 group cursor-pointer">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-primary-50 flex items-center justify-center">
                              <Folder size={14} className="text-primary-500" />
                            </div>
                            <h3 className="text-base font-[family-name:var(--font-display)] text-neutral-800 group-hover:text-primary-600 transition-colors truncate">
                              {ws.name}
                            </h3>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>{ws.visibility}</span>
                            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Open <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {goals && goals.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                    Goals Driven by This Team
                  </h2>
                  <div className="space-y-2">
                    {goals.map((g) => (
                      <div key={g.id} className="bg-white rounded-[var(--radius-md)] border border-neutral-200/60 p-3 flex items-center justify-between">
                        <span className="text-sm text-neutral-700">{g.title}</span>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400">{g.status}</span>
                      </div>
                    ))}
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
