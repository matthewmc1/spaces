import { apiFetch } from "./client";
import type {
  Programme,
  ProgrammeSpace,
  CreateProgrammeInput,
  UpdateProgrammeInput,
  LinkSpaceInput,
} from "@/types/programme";

export function listProgrammes(): Promise<Programme[]> {
  return apiFetch<Programme[]>("/programmes");
}

export function getProgramme(id: string): Promise<Programme> {
  return apiFetch<Programme>(`/programmes/${id}`);
}

export function createProgramme(input: CreateProgrammeInput): Promise<Programme> {
  return apiFetch<Programme>("/programmes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProgramme(id: string, input: UpdateProgrammeInput): Promise<Programme> {
  return apiFetch<Programme>(`/programmes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteProgramme(id: string): Promise<void> {
  return apiFetch<void>(`/programmes/${id}`, { method: "DELETE" });
}

export function listProgrammeSpaces(programmeId: string): Promise<ProgrammeSpace[]> {
  return apiFetch<ProgrammeSpace[]>(`/programmes/${programmeId}/spaces`);
}

export function linkSpace(programmeId: string, input: LinkSpaceInput): Promise<ProgrammeSpace> {
  return apiFetch<ProgrammeSpace>(`/programmes/${programmeId}/spaces`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function unlinkSpace(programmeId: string, spaceId: string): Promise<void> {
  return apiFetch<void>(`/programmes/${programmeId}/spaces/${spaceId}`, { method: "DELETE" });
}
