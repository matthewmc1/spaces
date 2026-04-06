export type WorkType = "feature" | "defect" | "risk" | "debt";

export const WORK_TYPES: { key: WorkType; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: "feature", label: "Feature", color: "text-primary-700", bgColor: "bg-primary-50", borderColor: "border-primary-200" },
  { key: "defect",  label: "Defect",  color: "text-rose-700",    bgColor: "bg-rose-50",    borderColor: "border-rose-200" },
  { key: "risk",    label: "Risk",    color: "text-amber-700",   bgColor: "bg-amber-50",   borderColor: "border-amber-200" },
  { key: "debt",    label: "Debt",    color: "text-neutral-700",  bgColor: "bg-neutral-100", borderColor: "border-neutral-200" },
];
