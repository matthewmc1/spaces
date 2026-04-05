import { apiFetch } from "./client";
import type {
  Space,
  SpaceTreeNode,
  CreateSpaceInput,
  UpdateSpaceInput,
} from "@/types/space";

export function listSpaces(): Promise<Space[]> {
  return apiFetch<Space[]>("/spaces");
}

export function listAllSpaces(): Promise<Space[]> {
  return apiFetch<Space[]>("/spaces?scope=all");
}

export function getSpace(id: string): Promise<Space> {
  return apiFetch<Space>(`/spaces/${id}`);
}

export function getSpaceTree(id: string): Promise<SpaceTreeNode> {
  return apiFetch<SpaceTreeNode>(`/spaces/${id}/tree`);
}

export function createSpace(input: CreateSpaceInput): Promise<Space> {
  return apiFetch<Space>("/spaces", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSpace(
  id: string,
  input: UpdateSpaceInput
): Promise<Space> {
  return apiFetch<Space>(`/spaces/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteSpace(id: string): Promise<void> {
  return apiFetch<void>(`/spaces/${id}`, {
    method: "DELETE",
  });
}
