import { apiFetch } from "./client";
import type { UserSettings, UpdateSettingsInput } from "@/types/settings";

export function getSettings(): Promise<UserSettings> {
  return apiFetch<UserSettings>("/settings");
}

export function updateSettings(input: UpdateSettingsInput): Promise<UserSettings> {
  return apiFetch<UserSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
