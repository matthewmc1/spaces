"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api/client";

// ClerkTokenBridge installs Clerk's getToken as the API client's token source.
// Render it once inside ClerkProvider so all subsequent apiFetch calls carry
// the current user's JWT.
export function ClerkTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}
