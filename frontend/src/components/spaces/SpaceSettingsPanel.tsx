"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSpace, useUpdateSpace } from "@/hooks/useSpaces";
import { COLUMNS } from "@/types/card";
import { WORK_TYPES } from "@/types/flow";

interface SpaceSettingsPanelProps {
  spaceId: string;
  open: boolean;
  onClose: () => void;
}

export function SpaceSettingsPanel({ spaceId, open, onClose }: SpaceSettingsPanelProps) {
  const { data: space } = useSpace(spaceId);
  const updateSpace = useUpdateSpace(spaceId);
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [capacityTargets, setCapacityTargets] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (space) {
      setWipLimits(space.wip_limits ?? {});
      setCapacityTargets(space.capacity_targets ?? {});
    }
  }, [space]);

  if (!open) return null;

  function saveWip(newLimits: Record<string, number>) {
    setWipLimits(newLimits);
    updateSpace.mutate({ wip_limits: newLimits }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  }

  function saveCapacity(newTargets: Record<string, number>) {
    setCapacityTargets(newTargets);
    updateSpace.mutate({ capacity_targets: newTargets }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  }

  const capacitySum = Object.values(capacityTargets).reduce((a, b) => a + b, 0);

  return (
    <aside className="w-[320px] flex-shrink-0 bg-white border-l border-neutral-200 h-full overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-neutral-800">
            Space Settings
          </h2>
          {saved && <p className="text-[10px] text-emerald-500 mt-0.5">Saved</p>}
        </div>
        <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-[var(--radius-sm)] hover:bg-neutral-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* WIP Limits */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
            WIP Limits
          </h3>
          <p className="text-[11px] text-neutral-400 mb-3">Set max cards per column. 0 = no limit.</p>
          <div className="space-y-2">
            {COLUMNS.map((col) => (
              <div key={col.key} className="flex items-center justify-between">
                <span className="text-xs text-neutral-600">{col.label}</span>
                <input
                  type="number"
                  min={0}
                  value={wipLimits[col.key] ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setWipLimits((prev) => ({ ...prev, [col.key]: val }));
                  }}
                  onBlur={() => saveWip(wipLimits)}
                  className="w-16 text-right text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Capacity Targets */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
            Capacity Targets
          </h3>
          <p className="text-[11px] text-neutral-400 mb-3">Target % allocation per work type.</p>
          <div className="space-y-2">
            {WORK_TYPES.map((wt) => (
              <div key={wt.key} className="flex items-center justify-between">
                <span className={`text-xs ${wt.color}`}>{wt.label}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={capacityTargets[wt.key] ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setCapacityTargets((prev) => ({ ...prev, [wt.key]: val }));
                    }}
                    onBlur={() => saveCapacity(capacityTargets)}
                    className="w-16 text-right text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <span className="text-xs text-neutral-400">%</span>
                </div>
              </div>
            ))}
          </div>
          <p className={`text-[10px] mt-2 ${capacitySum === 100 ? "text-emerald-500" : "text-amber-500"}`}>
            Total: {capacitySum}% {capacitySum !== 100 && "(should be 100%)"}
          </p>
        </section>
      </div>
    </aside>
  );
}
