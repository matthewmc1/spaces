import { apiFetch } from "./client";
import type { SpaceRollup, ProgrammeRollup } from "@/types/rollup";

export function getSpaceRollup(spaceId: string): Promise<SpaceRollup> {
  return apiFetch<SpaceRollup>(`/spaces/${spaceId}/rollup`);
}

export function getOrgRollup(): Promise<SpaceRollup> {
  return apiFetch<SpaceRollup>("/org/rollup");
}

export function getProgrammeRollup(programmeId: string): Promise<ProgrammeRollup> {
  return apiFetch<ProgrammeRollup>(`/programmes/${programmeId}/rollup`);
}
