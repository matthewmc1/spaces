export type Column =
  | "inbox"
  | "icebox"
  | "freezer"
  | "planned"
  | "in_progress"
  | "review"
  | "done";

export const COLUMNS: { key: Column; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "icebox", label: "Ice Box" },
  { key: "freezer", label: "Freezer" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export interface Card {
  id: string;
  space_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  column_name: Column;
  position: number;
  assignee_id?: string;
  priority?: "p0" | "p1" | "p2" | "p3";
  effort_estimate?: number;
  due_date?: string;
  labels: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  moved_at: string;
}

export interface CreateCardInput {
  title: string;
  description?: string;
  priority?: string;
  effort_estimate?: number;
  due_date?: string;
  labels?: string[];
  assignee_id?: string;
}

export interface MoveCardInput {
  column: Column;
  position: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor?: string;
    has_more: boolean;
  };
}
