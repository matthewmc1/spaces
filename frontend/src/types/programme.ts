export type ProgrammeStatus = "active" | "paused" | "completed";
export type ProgrammeRole = "owns" | "contributes";

export interface Programme {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: ProgrammeStatus;
  owner_id: string;
  start_date?: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeSpace {
  programme_id: string;
  space_id: string;
  tenant_id: string;
  role: ProgrammeRole;
  created_at: string;
}

export interface CreateProgrammeInput {
  name: string;
  description?: string;
  start_date?: string;
  target_date?: string;
}

export interface UpdateProgrammeInput {
  name?: string;
  description?: string;
  status?: ProgrammeStatus;
  start_date?: string;
  target_date?: string;
}

export interface LinkSpaceInput {
  space_id: string;
  role?: ProgrammeRole;
}
