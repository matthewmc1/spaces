"use client";

import { use } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { Board } from "@/components/board/Board";
import { useSpace } from "@/hooks/useSpaces";

export default function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: space, isLoading } = useSpace(id);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar activeSpaceId={id} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {space?.name ?? "Space"}
              </h1>
              {space?.description && (
                <p className="mt-0.5 text-sm text-gray-500">{space.description}</p>
              )}
            </div>
          )}
        </header>

        {/* Board */}
        <main className="flex-1 overflow-auto">
          <Board spaceId={id} />
        </main>
      </div>
    </div>
  );
}
