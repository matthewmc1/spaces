import { apiFetch } from "./client";
import type {
  Space,
  SpaceTreeNode,
  CreateSpaceInput,
  UpdateSpaceInput,
} from "@/types/space";

export function listSpaces(): Promise<Space[]> {
  return apiFetch<Space[]>("/api/v1/spaces");
}

export function getSpace(id: string): Promise<Space> {
  return apiFetch<Space>(`/api/v1/spaces/${id}`);
}

export function getSpaceTree(id: string): Promise<SpaceTreeNode> {
  return apiFetch<SpaceTreeNode>(`/api/v1/spaces/${id}/tree`);
}

export function createSpace(input: CreateSpaceInput): Promise<Space> {
  return apiFetch<Space>("/api/v1/spaces", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSpace(
  id: string,
  input: UpdateSpaceInput
): Promise<Space> {
  return apiFetch<Space>(`/api/v1/spaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSpace(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/spaces/${id}`, {
    method: "DELETE",
  });
}
