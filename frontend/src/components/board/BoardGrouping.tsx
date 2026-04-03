"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Layers } from "lucide-react";

export type GroupBy = "none" | "priority" | "assignee" | "dependency";

interface BoardGroupingProps {
  value: GroupBy;
  onChange: (groupBy: GroupBy) => void;
}

const options: { value: GroupBy; label: string; description: string }[] = [
  { value: "none", label: "No grouping", description: "Show all cards in columns" },
  { value: "priority", label: "Priority", description: "Group cards by P0–P3" },
  { value: "assignee", label: "Owner", description: "Group cards by assignee" },
  { value: "dependency", label: "Dependencies", description: "Group by dependency chains" },
];

export function BoardGrouping({ value, onChange }: BoardGroupingProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={value !== "none" ? "secondary" : "ghost"}
        size="sm"
        icon={<Layers className="w-4 h-4" />}
        onClick={() => setOpen(!open)}
      >
        {value === "none" ? "Group" : `By ${options.find(o => o.value === value)?.label}`}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-neutral-200 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-20 py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 transition-colors ${
                value === opt.value ? "text-primary-600 bg-primary-50/50" : "text-neutral-700"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-[11px] text-neutral-400">{opt.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
