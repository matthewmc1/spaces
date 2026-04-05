export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface AuthUser {
  id: string;
  tenant_id: string;
  external_auth_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface SignupInput {
  org_name: string;
  org_slug: string;
  user_name: string;
  email: string;
}

export interface InviteUserInput {
  name: string;
  email: string;
  role?: UserRole;
}

export interface RoleAssignment {
  id: string;
  tenant_id: string;
  user_id: string;
  space_id?: string;
  role: UserRole;
  created_at: string;
}

export interface AssignRoleInput {
  user_id: string;
  role: UserRole;
}
