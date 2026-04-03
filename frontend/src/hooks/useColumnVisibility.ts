"use client";

import { useState, useCallback } from "react";
import type { Column } from "@/types/card";

const DEFAULT_VISIBLE: Column[] = ["planned", "in_progress", "review", "done"];

function getStorageKey(spaceId: string) {
  return `spaces-columns-${spaceId}`;
}

export function useColumnVisibility(spaceId: string) {
  const [visible, setVisible] = useState<Column[]>(() => {
    if (typeof window === "undefined") return DEFAULT_VISIBLE;
    const stored = localStorage.getItem(getStorageKey(spaceId));
    return stored ? JSON.parse(stored) : DEFAULT_VISIBLE;
  });

  const toggle = useCallback(
    (column: Column) => {
      setVisible((prev) => {
        const next = prev.includes(column)
          ? prev.filter((c) => c !== column)
          : [...prev, column];
        localStorage.setItem(getStorageKey(spaceId), JSON.stringify(next));
        return next;
      });
    },
    [spaceId]
  );

  const showAll = useCallback(() => {
    const all: Column[] = ["inbox", "icebox", "freezer", "planned", "in_progress", "review", "done"];
    setVisible(all);
    localStorage.setItem(getStorageKey(spaceId), JSON.stringify(all));
  }, [spaceId]);

  return { visible, toggle, showAll };
}
