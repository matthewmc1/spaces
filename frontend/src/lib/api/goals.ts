import { apiFetch } from "./client";
import type { Goal, GoalLink, CreateGoalInput, UpdateGoalInput, CreateGoalLinkInput, AlignmentChain } from "@/types/goal";

export function listGoals(spaceId: string): Promise<Goal[]> {
  return apiFetch<Goal[]>(`/spaces/${spaceId}/goals`);
}

export function createGoal(spaceId: string, input: CreateGoalInput): Promise<Goal> {
  return apiFetch<Goal>(`/spaces/${spaceId}/goals`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGoal(goalId: string, input: UpdateGoalInput): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${goalId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteGoal(goalId: string): Promise<void> {
  return apiFetch<void>(`/goals/${goalId}`, { method: "DELETE" });
}

export function createGoalLink(goalId: string, input: CreateGoalLinkInput): Promise<GoalLink> {
  return apiFetch<GoalLink>(`/goals/${goalId}/links`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteGoalLink(linkId: string): Promise<void> {
  return apiFetch<void>(`/goal-links/${linkId}`, { method: "DELETE" });
}

export function getGoalChain(goalId: string): Promise<AlignmentChain> {
  return apiFetch<AlignmentChain>(`/goals/${goalId}/chain`);
}

export function getCardAlignment(cardId: string): Promise<AlignmentChain[]> {
  return apiFetch<AlignmentChain[]>(`/cards/${cardId}/alignment`);
}
