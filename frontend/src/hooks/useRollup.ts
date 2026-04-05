import { useQuery } from "@tanstack/react-query";
import { getSpaceRollup, getOrgRollup, getProgrammeRollup } from "@/lib/api/rollup";

const STALE_TIME = 60 * 1000;

export function useSpaceRollup(spaceId: string) {
  return useQuery({
    queryKey: ["rollup", "space", spaceId],
    queryFn: () => getSpaceRollup(spaceId),
    enabled: !!spaceId,
    staleTime: STALE_TIME,
  });
}

export function useOrgRollup() {
  return useQuery({
    queryKey: ["rollup", "org"],
    queryFn: getOrgRollup,
    staleTime: STALE_TIME,
  });
}

export function useProgrammeRollup(programmeId: string) {
  return useQuery({
    queryKey: ["rollup", "programme", programmeId],
    queryFn: () => getProgrammeRollup(programmeId),
    enabled: !!programmeId,
    staleTime: STALE_TIME,
  });
}
