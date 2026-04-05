import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  listCardLinks,
  createCardLink,
  deleteCardLink,
} from "@/lib/api/integrations";
import type { CreateIntegrationInput, UpdateIntegrationInput, CreateCardLinkInput } from "@/types/integration";

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: listIntegrations,
  });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIntegrationInput) => createIntegration(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIntegrationInput }) =>
      updateIntegration(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useCardLinks(cardId: string) {
  return useQuery({
    queryKey: ["card-links", cardId],
    queryFn: () => listCardLinks(cardId),
    enabled: !!cardId,
  });
}

export function useCreateCardLink(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardLinkInput) => createCardLink(cardId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["card-links", cardId] }),
  });
}

export function useDeleteCardLink(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => deleteCardLink(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["card-links", cardId] }),
  });
}
