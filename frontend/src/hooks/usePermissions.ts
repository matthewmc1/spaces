"use client";

import { useMemo } from "react";

type Role = "owner" | "admin" | "member" | "viewer";

const ROLE_LEVEL: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function usePermissions(role: Role = "member") {
  return useMemo(() => ({
    role,
    canView: ROLE_LEVEL[role] >= ROLE_LEVEL.viewer,
    canEdit: ROLE_LEVEL[role] >= ROLE_LEVEL.member,
    canAdmin: ROLE_LEVEL[role] >= ROLE_LEVEL.admin,
    canOwn: ROLE_LEVEL[role] >= ROLE_LEVEL.owner,
  }), [role]);
}
