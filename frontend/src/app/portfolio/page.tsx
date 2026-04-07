"use client";

import { Sidebar } from "@/components/common/Sidebar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useOrgRollup } from "@/hooks/useRollup";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { PortfolioWIPBadge } from "@/components/portfolio/PortfolioWIPBadge";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PortfolioPage() {
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: orgRollup } = useOrgRollup();

  const redItems = (portfolio?.items ?? []).filter((i) => i.health === "red");
  const amberItems = (portfolio?.items ?? []).filter((i) => i.health === "amber");
  const greenItems = (portfolio?.items ?? []).filter((i) => i.health === "green");

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
                Portfolio
              </h1>
              <p className="mt-2 text-sm text-neutral-500 max-w-xl">
                Flight Level 3 — all active initiatives, programmes, and key workstreams at a glance.
              </p>
            </div>
            {portfolio && (
              <PortfolioWIPBadge current={portfolio.wip_current} limit={portfolio.wip_limit} />
            )}
          </div>

          <RollupKPIs rollup={orgRollup} />

          {isLoading ? (
            <Skeleton variant="rectangle" height="200px" className="mt-8" />
          ) : (
            <div className="mt-8 space-y-6">
              {redItems.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-500 mb-3">
                    Needs Attention ({redItems.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {redItems.map((i) => <PortfolioCard key={i.id} item={i} />)}
                  </div>
                </section>
              )}
              {amberItems.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-500 mb-3">
                    At Risk ({amberItems.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {amberItems.map((i) => <PortfolioCard key={i.id} item={i} />)}
                  </div>
                </section>
              )}
              {greenItems.length > 0 && (
                <section>
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-500 mb-3">
                    On Track ({greenItems.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {greenItems.map((i) => <PortfolioCard key={i.id} item={i} />)}
                  </div>
                </section>
              )}

              {(portfolio?.items ?? []).length === 0 && (
                <div className="text-center py-16">
                  <p className="text-neutral-400 text-sm">No portfolio items yet. Create programmes or department/team spaces to see them here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
