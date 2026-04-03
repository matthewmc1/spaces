export type SpaceStatus = "on_track" | "at_risk" | "behind" | "paused";

export interface Space {
  id: string;
  tenant_id: string;
  parent_space_id?: string;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  color?: string;
  path: string;
  owner_id: string;
  visibility: "public" | "private" | "restricted";
  status: SpaceStatus;
  created_at: string;
  updated_at: string;
}

export interface SpaceTreeNode {
  space: Space;
  children: SpaceTreeNode[];
}

export interface CreateSpaceInput {
  parent_space_id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: string;
}

export interface UpdateSpaceInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: string;
  status?: SpaceStatus;
}
