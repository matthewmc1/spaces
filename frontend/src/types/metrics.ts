export interface FlowMetrics {
  in_flight: number;
  avg_cycle_time_days: number;
  throughput: number;
  completion_pct: number;
  by_column: Record<string, number>;
  cumulative_flow: DailySnapshot[];
}

export interface DailySnapshot {
  date: string;
  columns: Record<string, number>;
}

export interface AlignmentMetrics {
  linked_pct: number;
  linked_count: number;
  total_in_flight: number;
  orphaned_goals: OrphanedGoal[];
  unlinked_high_pri: UnlinkedCard[];
}

export interface OrphanedGoal {
  id: string;
  title: string;
}

export interface UnlinkedCard {
  id: string;
  title: string;
  priority: string;
}
