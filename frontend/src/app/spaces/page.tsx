"use client";

import { Sidebar } from "@/components/common/Sidebar";
import { useAllSpaces } from "@/hooks/useSpaces";
import { useSpaceCardCounts } from "@/hooks/useCards";
import { SpaceDashboard } from "@/components/spaces/SpaceDashboard";

export default function SpacesPage() {
  const { data: spaces, isLoading } = useAllSpaces();
  const spaceIds = spaces?.map((s) => s.id) ?? [];
  const { data: cardsBySpace } = useSpaceCardCounts(spaceIds);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em]">
              Your Workspaces
            </h1>
            <p className="mt-2 text-sm text-neutral-500 max-w-xl">
              Overview of all programs and workstreams. Click a space to view its board.
            </p>
          </div>
          <SpaceDashboard
            spaces={spaces ?? []}
            isLoading={isLoading}
            cardsBySpace={cardsBySpace}
          />
        </div>
      </main>
    </div>
  );
}
