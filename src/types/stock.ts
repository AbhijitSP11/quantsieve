import type { MarketCapCategory } from "./common.js";

export interface StockData {
  ticker: string;
  company_name: string;
  sector: string;
  industry: string;

  // Price data
  current_price: number | null;
  high_52w: number | null;
  low_52w: number | null;
  market_cap: number | null; // in Crores
  market_cap_category: MarketCapCategory | null;

  // Valuation
  pe_ratio: number | null;
  pb_ratio: number | null;
  ev_ebitda: number | null;
  dividend_yield: number | null;
  book_value: number | null;
  face_value: number | null;

  // Profitability (arrays = last 5 years, index 0 = oldest)
  revenue: number[]; // in Crores
  net_profit: number[]; // in Crores
  opm: number[]; // Operating Profit Margin %
  npm: number[]; // Net Profit Margin %
  eps: number[]; // Earnings Per Share
  roe: number | null; // Latest ROE %
  roce: number[]; // Last 5 years ROCE %
  ttm_revenue: number | null;
  ttm_net_profit: number | null;
  ttm_eps: number | null;

  // Balance sheet
  debt_to_equity: number | null;
  interest_coverage: number | null; // Computed: PBT / Interest
  current_ratio: number | null;
  total_assets: number | null;
  borrowings: number | null;
  reserves: number | null;

  // Cash flow (last 3 years)
  cash_flow: {
    year: string;
    operating: number;
    investing: number;
    financing: number;
  }[];

  // Shareholding
  promoter_holding: number | null;
  promoter_holding_trend: { quarter: string; pct: number }[];
  promoter_pledge: number | null;
  fii_holding: number | null;
  dii_holding: number | null;
  public_holding: number | null;

  // Growth rates (from Screener's compounded growth section)
  compounded_sales_growth: {
    "3y": number | null;
    "5y": number | null;
    "10y": number | null;
    ttm: number | null;
  };
  compounded_profit_growth: {
    "3y": number | null;
    "5y": number | null;
    "10y": number | null;
    ttm: number | null;
  };
  stock_price_cagr: {
    "1y": number | null;
    "3y": number | null;
    "5y": number | null;
    "10y": number | null;
  };
  roe_history: {
    "3y": number | null;
    "5y": number | null;
    "10y": number | null;
    last_year: number | null;
  };

  // Metadata
  listed_since: string | null;
  data_source: string;
  fetched_at: string; // ISO timestamp
}
