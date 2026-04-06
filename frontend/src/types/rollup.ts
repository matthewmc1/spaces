export interface FlowDistribution {
  feature_count: number;
  defect_count: number;
  risk_count: number;
  debt_count: number;
  feature_pct: number;
  defect_pct: number;
  risk_pct: number;
  debt_pct: number;
}

export interface SpaceRollupSummary {
  space_id: string;
  space_type: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  completion_pct: number;
  alignment_pct: number;
}

export interface SpaceRollup {
  space_id: string;
  tenant_id: string;
  space_type: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  high_pri_open: number;
  completion_pct: number;
  avg_cycle_days: number;
  total_goals: number;
  linked_cards: number;
  alignment_pct: number;
  child_breakdown?: SpaceRollupSummary[];
  flow_distribution?: FlowDistribution;
}

export interface ProgrammeRollup {
  programme_id: string;
  tenant_id: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  high_pri_open: number;
  completion_pct: number;
  avg_cycle_days: number;
  total_goals: number;
  linked_cards: number;
  alignment_pct: number;
  members: SpaceRollupSummary[];
  flow_distribution?: FlowDistribution;
}
