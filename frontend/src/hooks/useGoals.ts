import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listGoals, createGoal, updateGoal, deleteGoal, createGoalLink, deleteGoalLink, getGoalChain, getCardAlignment } from "@/lib/api/goals";
import type { CreateGoalInput, UpdateGoalInput, CreateGoalLinkInput } from "@/types/goal";

export function useGoals(spaceId: string) {
  return useQuery({
    queryKey: ["goals", spaceId],
    queryFn: () => listGoals(spaceId),
    enabled: !!spaceId,
  });
}

export function useCreateGoal(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(spaceId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useUpdateGoal(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: UpdateGoalInput }) =>
      updateGoal(goalId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useDeleteGoal(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useCreateGoalLink(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: CreateGoalLinkInput }) =>
      createGoalLink(goalId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useDeleteGoalLink(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => deleteGoalLink(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", spaceId] }),
  });
}

export function useGoalChain(goalId: string) {
  return useQuery({
    queryKey: ["goals", goalId, "chain"],
    queryFn: () => getGoalChain(goalId),
    enabled: !!goalId,
  });
}

export function useCardAlignment(cardId: string) {
  return useQuery({
    queryKey: ["cards", cardId, "alignment"],
    queryFn: () => getCardAlignment(cardId),
    enabled: !!cardId,
  });
}
