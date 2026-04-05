import { apiFetch } from "./client";
import type {
  Integration,
  CreateIntegrationInput,
  UpdateIntegrationInput,
  CardLink,
  CreateCardLinkInput,
} from "@/types/integration";

export function listIntegrations(): Promise<Integration[]> {
  return apiFetch<Integration[]>("/integrations");
}

export function createIntegration(input: CreateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>("/integrations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration> {
  return apiFetch<Integration>(`/integrations/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteIntegration(id: string): Promise<void> {
  return apiFetch<void>(`/integrations/${id}`, { method: "DELETE" });
}

export function listCardLinks(cardId: string): Promise<CardLink[]> {
  return apiFetch<CardLink[]>(`/cards/${cardId}/links`);
}

export function createCardLink(cardId: string, input: CreateCardLinkInput): Promise<CardLink> {
  return apiFetch<CardLink>(`/cards/${cardId}/links`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteCardLink(linkId: string): Promise<void> {
  return apiFetch<void>(`/card-links/${linkId}`, { method: "DELETE" });
}
