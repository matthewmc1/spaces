"use client";

import { use, useState } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { useProgramme, useProgrammeSpaces, useLinkSpace, useUnlinkSpace } from "@/hooks/useProgrammes";
import { useProgrammeRollup } from "@/hooks/useRollup";
import { useSpaces } from "@/hooks/useSpaces";
import { RollupKPIs } from "@/components/rollup/RollupKPIs";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { X } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProgrammeDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: programme, isLoading: progLoading } = useProgramme(id);
  const { data: rollup } = useProgrammeRollup(id);
  const { data: memberships } = useProgrammeSpaces(id);
  const { data: allSpaces } = useSpaces();
  const linkSpace = useLinkSpace(id);
  const unlinkSpace = useUnlinkSpace(id);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");

  const memberSpaceIds = new Set((memberships ?? []).map((m) => m.space_id));
  const availableSpaces = (allSpaces ?? []).filter((s) => !memberSpaceIds.has(s.id));
  const memberSpaces = (allSpaces ?? []).filter((s) => memberSpaceIds.has(s.id));

  function handleLink() {
    if (!selectedSpaceId) return;
    linkSpace.mutate({ space_id: selectedSpaceId, role: "contributes" });
    setSelectedSpaceId("");
  }

  if (progLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Skeleton variant="rectangle" height="120px" />
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
              Programme · {programme?.status}
            </p>
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-neutral-800 tracking-[-0.02em] mt-1">
              {programme?.name}
            </h1>
            {programme?.description && (
              <p className="mt-2 text-sm text-neutral-500 max-w-2xl">{programme.description}</p>
            )}
            {programme?.target_date && (
              <p className="mt-1 text-xs text-neutral-400">
                Target: {new Date(programme.target_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="space-y-8">
            <RollupKPIs rollup={rollup} />

            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-4">
                Member Spaces
              </h2>
              <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200/60 shadow-[var(--shadow-sm)] p-5 space-y-3">
                {memberSpaces.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic">No spaces linked yet.</p>
                ) : (
                  memberSpaces.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm text-neutral-700">{s.name}</p>
                        <p className="text-[10px] text-neutral-400">{s.space_type ?? "workstream"}</p>
                      </div>
                      <button
                        onClick={() => unlinkSpace.mutate(s.id)}
                        className="text-neutral-300 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}

                {availableSpaces.length > 0 && (
                  <div className="pt-3 border-t border-neutral-100 flex items-center gap-2">
                    <select
                      value={selectedSpaceId}
                      onChange={(e) => setSelectedSpaceId(e.target.value)}
                      className="flex-1 text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    >
                      <option value="">Select a space to link...</option>
                      {availableSpaces.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleLink} disabled={!selectedSpaceId || linkSpace.isPending}>
                      Link
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
