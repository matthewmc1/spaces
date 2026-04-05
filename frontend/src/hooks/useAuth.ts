import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMe, signup, listUsers, inviteUser, listSpaceMembers, assignSpaceRole, listTenantMembers, revokeRole } from "@/lib/api/auth";
import type { SignupInput, InviteUserInput, AssignRoleInput } from "@/types/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (input: SignupInput) => signup(input),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["auth", "users"],
    queryFn: listUsers,
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => inviteUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "users"] }),
  });
}

export function useSpaceMembers(spaceId: string) {
  return useQuery({
    queryKey: ["members", "space", spaceId],
    queryFn: () => listSpaceMembers(spaceId),
    enabled: !!spaceId,
  });
}

export function useAssignSpaceRole(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignRoleInput) => assignSpaceRole(spaceId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", "space", spaceId] }),
  });
}

export function useTenantMembers() {
  return useQuery({
    queryKey: ["members", "tenant"],
    queryFn: listTenantMembers,
  });
}

export function useRevokeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => revokeRole(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
