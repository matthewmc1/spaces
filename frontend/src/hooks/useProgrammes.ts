import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProgrammes,
  getProgramme,
  createProgramme,
  updateProgramme,
  deleteProgramme,
  listProgrammeSpaces,
  linkSpace,
  unlinkSpace,
  listProgrammesForSpace,
} from "@/lib/api/programmes";
import type { CreateProgrammeInput, UpdateProgrammeInput, LinkSpaceInput } from "@/types/programme";

export function useProgrammes() {
  return useQuery({ queryKey: ["programmes"], queryFn: listProgrammes });
}

export function useProgramme(id: string) {
  return useQuery({
    queryKey: ["programmes", id],
    queryFn: () => getProgramme(id),
    enabled: !!id,
  });
}

export function useCreateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProgrammeInput) => createProgramme(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useUpdateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProgrammeInput }) =>
      updateProgramme(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProgramme(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useProgrammeSpaces(programmeId: string) {
  return useQuery({
    queryKey: ["programmes", programmeId, "spaces"],
    queryFn: () => listProgrammeSpaces(programmeId),
    enabled: !!programmeId,
  });
}

export function useLinkSpace(programmeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LinkSpaceInput) => linkSpace(programmeId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes", programmeId, "spaces"] }),
  });
}

export function useUnlinkSpace(programmeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => unlinkSpace(programmeId, spaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes", programmeId, "spaces"] }),
  });
}

export function useProgrammesForSpace(spaceId: string) {
  return useQuery({
    queryKey: ["programmes", "for-space", spaceId],
    queryFn: () => listProgrammesForSpace(spaceId),
    enabled: !!spaceId,
  });
}
