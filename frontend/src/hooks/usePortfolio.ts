import { useQuery } from "@tanstack/react-query";
import { getPortfolio } from "@/lib/api/portfolio";

const STALE_TIME = 60 * 1000;

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: getPortfolio,
    staleTime: STALE_TIME,
  });
}
