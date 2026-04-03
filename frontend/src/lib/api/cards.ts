import { apiFetch } from "./client";
import type {
  Card,
  CreateCardInput,
  MoveCardInput,
  PaginatedResponse,
  Column,
} from "@/types/card";

export interface ListCardsParams {
  column?: Column;
  limit?: number;
  cursor?: string;
}

export function listCards(
  spaceId: string,
  params: ListCardsParams = {}
): Promise<PaginatedResponse<Card>> {
  const query = new URLSearchParams();
  if (params.column) query.set("column", params.column);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.cursor) query.set("cursor", params.cursor);

  const qs = query.toString();
  const path = `/spaces/${spaceId}/cards${qs ? `?${qs}` : ""}`;
  return apiFetch<PaginatedResponse<Card>>(path);
}

export function createCard(
  spaceId: string,
  input: CreateCardInput
): Promise<Card> {
  return apiFetch<Card>(`/spaces/${spaceId}/cards`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCard(cardId: string, input: Partial<Card>): Promise<Card> {
  return apiFetch<Card>(`/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function moveCard(cardId: string, input: MoveCardInput): Promise<Card> {
  return apiFetch<Card>(`/cards/${cardId}/move`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCard(cardId: string): Promise<void> {
  return apiFetch<void>(`/cards/${cardId}`, {
    method: "DELETE",
  });
}
