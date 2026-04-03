import { apiFetch } from "./client";
import type { FlowMetrics, AlignmentMetrics } from "@/types/metrics";

export function getFlowMetrics(spaceId: string): Promise<FlowMetrics> {
  return apiFetch<FlowMetrics>(`/spaces/${spaceId}/metrics/flow`);
}

export function getAlignmentMetrics(spaceId: string): Promise<AlignmentMetrics> {
  return apiFetch<AlignmentMetrics>(`/spaces/${spaceId}/metrics/alignment`);
}
