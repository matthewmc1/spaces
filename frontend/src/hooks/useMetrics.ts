import { useQuery } from "@tanstack/react-query";
import { getFlowMetrics, getAlignmentMetrics } from "@/lib/api/metrics";

export function useFlowMetrics(spaceId: string) {
  return useQuery({
    queryKey: ["metrics", "flow", spaceId],
    queryFn: () => getFlowMetrics(spaceId),
    enabled: !!spaceId,
    staleTime: 30 * 1000,
  });
}

export function useAlignmentMetrics(spaceId: string) {
  return useQuery({
    queryKey: ["metrics", "alignment", spaceId],
    queryFn: () => getAlignmentMetrics(spaceId),
    enabled: !!spaceId,
    staleTime: 30 * 1000,
  });
}
