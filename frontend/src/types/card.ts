export type Column =
  | "inbox"
  | "icebox"
  | "freezer"
  | "planned"
  | "in_progress"
  | "review"
  | "done";

export type WorkType = "feature" | "defect" | "risk" | "debt";

export const COLUMNS: {
  key: Column;
  label: string;
  borderColor: string;
  bgColor: string;
}[] = [
  { key: "inbox", label: "Inbox", borderColor: "border-t-slate-400", bgColor: "bg-slate-50" },
  { key: "icebox", label: "Ice Box", borderColor: "border-t-sky-400", bgColor: "bg-sky-50" },
  { key: "freezer", label: "Freezer", borderColor: "border-t-blue-500", bgColor: "bg-blue-50" },
  { key: "planned", label: "Planned", borderColor: "border-t-teal-500", bgColor: "bg-teal-50" },
  { key: "in_progress", label: "In Progress", borderColor: "border-t-amber-500", bgColor: "bg-amber-50" },
  { key: "review", label: "Review", borderColor: "border-t-orange-400", bgColor: "bg-orange-50" },
  { key: "done", label: "Done", borderColor: "border-t-emerald-500", bgColor: "bg-emerald-50" },
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
  work_type: WorkType;
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
  work_type?: WorkType;
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
