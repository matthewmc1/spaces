"use client";

import { use, useState } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { Board } from "@/components/board/Board";
import { SpaceOverview } from "@/components/spaces/SpaceOverview";
import { AnalyticsSidebar } from "@/components/analytics/AnalyticsSidebar";
import { useSpace } from "@/hooks/useSpaces";
import { useCards } from "@/hooks/useCards";

export default function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: space } = useSpace(id);
  const { data: cards } = useCards(id);
  const [insightsOpen, setInsightsOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar activeSpaceId={id} />

      <main className="relative flex flex-col flex-1 min-w-0 overflow-hidden p-6 animate-fade-in-up">
        <SpaceOverview
          spaceName={space?.name ?? ""}
          spaceDescription={space?.description}
          cards={cards}
        />
        <Board
          spaceId={id}
          spaceName={space?.name}
          spaceDescription={space?.description}
          insightsOpen={insightsOpen}
          onToggleInsights={() => setInsightsOpen(!insightsOpen)}
        />
      </main>

      <AnalyticsSidebar
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        spaceId={id}
        cards={cards}
      />
    </div>
  );
}
