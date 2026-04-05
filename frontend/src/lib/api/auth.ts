import { apiFetch } from "./client";
import type { AuthUser, SignupInput, InviteUserInput, RoleAssignment, AssignRoleInput } from "@/types/auth";

export function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

export function signup(input: SignupInput): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listUsers(): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>("/auth/users");
}

export function inviteUser(input: InviteUserInput): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listSpaceMembers(spaceId: string): Promise<RoleAssignment[]> {
  return apiFetch<RoleAssignment[]>(`/spaces/${spaceId}/members`);
}

export function assignSpaceRole(spaceId: string, input: AssignRoleInput): Promise<RoleAssignment> {
  return apiFetch<RoleAssignment>(`/spaces/${spaceId}/members`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listTenantMembers(): Promise<RoleAssignment[]> {
  return apiFetch<RoleAssignment[]>("/members");
}

export function revokeRole(assignmentId: string): Promise<void> {
  return apiFetch<void>(`/role-assignments/${assignmentId}`, { method: "DELETE" });
}
