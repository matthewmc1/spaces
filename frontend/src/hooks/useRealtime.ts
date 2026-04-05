"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

type RealtimeEvent = {
  type: string;
  tenant_id: string;
  space_id: string;
  actor_id: string;
  payload: unknown;
  timestamp: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const WS_BASE = API_BASE.replace(/^http/, "ws");

// useRealtime opens a WebSocket for the given space and invalidates React Query
// caches when relevant events arrive.
export function useRealtime(spaceId: string | undefined, token: string | undefined) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!spaceId || !token) return;

    const url = `${WS_BASE}/ws?space=${spaceId}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as RealtimeEvent;
        switch (data.type) {
          case "card.created":
          case "card.updated":
          case "card.moved":
          case "card.deleted":
            qc.invalidateQueries({ queryKey: ["cards", spaceId] });
            qc.invalidateQueries({ queryKey: ["metrics", "flow", spaceId] });
            break;
          case "space.updated":
            qc.invalidateQueries({ queryKey: ["spaces"] });
            qc.invalidateQueries({ queryKey: ["spaces", spaceId] });
            break;
          case "goal.created":
          case "goal.updated":
          case "goal.deleted":
            qc.invalidateQueries({ queryKey: ["goals", spaceId] });
            qc.invalidateQueries({ queryKey: ["metrics", "alignment", spaceId] });
            break;
        }
      } catch {
        // Ignore malformed events
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [spaceId, token, qc]);
}
