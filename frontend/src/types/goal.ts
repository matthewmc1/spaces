export type GoalStatus = "active" | "achieved" | "abandoned";

export interface Goal {
  id: string;
  tenant_id: string;
  space_id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  target_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GoalLink {
  id: string;
  tenant_id: string;
  source_type: "card" | "goal";
  source_id: string;
  target_goal_id: string;
  link_type: "supports" | "drives" | "blocks";
  created_at: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  target_date?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: GoalStatus;
  target_date?: string;
}

export interface CreateGoalLinkInput {
  source_type: "card" | "goal";
  source_id: string;
  link_type: "supports" | "drives" | "blocks";
}
