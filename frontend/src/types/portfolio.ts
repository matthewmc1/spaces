export interface PortfolioItem {
  id: string;
  name: string;
  item_type: "programme" | "space";
  status: string;
  space_type?: string;
  total_cards: number;
  done_cards: number;
  in_flight: number;
  high_pri_open: number;
  completion_pct: number;
  alignment_pct: number;
  owner_id: string;
  target_date?: string;
  health: "green" | "amber" | "red";
}

export interface PortfolioResult {
  items: PortfolioItem[];
  wip_limit: number;
  wip_current: number;
}
