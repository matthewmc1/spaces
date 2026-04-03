"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Columns3 } from "lucide-react";
import { COLUMNS, type Column } from "@/types/card";

interface ColumnConfigDropdownProps {
  visible: Column[];
  onToggle: (column: Column) => void;
  onShowAll: () => void;
}

export function ColumnConfigDropdown({ visible, onToggle, onShowAll }: ColumnConfigDropdownProps) {
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
      <Button variant="ghost" size="sm" icon={<Columns3 className="w-4 h-4" />} onClick={() => setOpen(!open)}>
        Columns
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-20 py-1">
          {COLUMNS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={visible.includes(key)}
                onChange={() => onToggle(key)}
                className="rounded border-neutral-300 text-primary-500 focus:ring-primary-200"
              />
              {label}
            </label>
          ))}
          <div className="border-t border-neutral-100 mt-1 pt-1 px-3 pb-1">
            <button onClick={onShowAll} className="text-xs text-primary-600 hover:text-primary-700">Show all columns</button>
          </div>
        </div>
      )}
    </div>
  );
}
