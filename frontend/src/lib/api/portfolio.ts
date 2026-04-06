import { apiFetch } from "./client";
import type { PortfolioResult } from "@/types/portfolio";

export function getPortfolio(): Promise<PortfolioResult> {
  return apiFetch<PortfolioResult>("/portfolio");
}
