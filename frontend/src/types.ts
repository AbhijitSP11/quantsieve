// ─── Mirrors backend types ────────────────────────────────────────────────────

export interface StockData {
  ticker: string;
  company_name: string;
  sector: string;
  industry: string;
  current_price: number | null;
  high_52w: number | null;
  low_52w: number | null;
  market_cap: number | null;
  market_cap_category: "Large" | "Mid" | "Small" | "Micro" | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  ev_ebitda: number | null;
  dividend_yield: number | null;
  book_value: number | null;
  face_value: number | null;
  revenue: number[];
  net_profit: number[];
  opm: number[];
  npm: number[];
  eps: number[];
  roe: number | null;
  roce: number[];
  ttm_revenue: number | null;
  ttm_net_profit: number | null;
  ttm_eps: number | null;
  debt_to_equity: number | null;
  interest_coverage: number | null;
  current_ratio: number | null;
  total_assets: number | null;
  borrowings: number | null;
  reserves: number | null;
  cash_flow: { year: string; operating: number; investing: number; financing: number }[];
  promoter_holding: number | null;
  promoter_holding_trend: { quarter: string; pct: number }[];
  promoter_pledge: number | null;
  fii_holding: number | null;
  dii_holding: number | null;
  public_holding: number | null;
  compounded_sales_growth: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null };
  compounded_profit_growth: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null };
  stock_price_cagr: { "1y": number | null; "3y": number | null; "5y": number | null; "10y": number | null };
  roe_history: { "3y": number | null; "5y": number | null; "10y": number | null; last_year: number | null };
  listed_since: string | null;
  data_source: string;
  fetched_at: string;
}

export interface SwotItem {
  label: string;
  detail: string;
}

export interface SwotResult {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  summary: { s: number; w: number; o: number; t: number };
}

export interface TrendlyneSwotItem {
  text: string;
}

export interface TrendlyneChecklistItem {
  metric: string;
  assessment: string;
  value: number | null;
}

export interface TrendlyneData {
  beta: number | null;

  tl_swot: {
    strengths: TrendlyneSwotItem[];
    weaknesses: TrendlyneSwotItem[];
    opportunities: TrendlyneSwotItem[];
    threats: TrendlyneSwotItem[];
    counts: { s: number; w: number; o: number; t: number } | null;
  } | null;

  /** @deprecated use tl_swot.counts */
  swot_counts: { s: number; w: number; o: number; t: number } | null;

  dvm_scores: {
    durability: number | null;
    valuation: number | null;
    momentum: number | null;
    label: string | null;
  } | null;

  checklist: TrendlyneChecklistItem[] | null;

  key_metrics: {
    market_cap: number | null;
    pe_ttm: number | null;
    peg_ttm: number | null;
    price_to_book: number | null;
    institutions_holding_pct: number | null;
    rev_growth_qtr_yoy: number | null;
    operating_revenue_growth_ttm: number | null;
    net_profit_qtr_growth_yoy: number | null;
    net_profit_ttm_growth: number | null;
    opm_qtr: number | null;
    opm_ttm: number | null;
    piotroski_score: number | null;
    relative_return_nifty50_qtr: number | null;
    relative_return_sector_qtr: number | null;
    roe_annual: number | null;
    roa_annual: number | null;
  } | null;

  analyst_consensus: {
    recommendation: string | null;
    count: number | null;
    target_price: number | null;
    breakdown: {
      strong_sell: number | null;
      sell: number | null;
      hold: number | null;
      buy: number | null;
      strong_buy: number | null;
    } | null;
  } | null;

  /** @deprecated use analyst_consensus.target_price */
  analyst_target_price: number | null;
  /** @deprecated use analyst_consensus.count */
  analyst_count: number | null;

  support_resistance: {
    resistance: [number | null, number | null, number | null];
    support: [number | null, number | null, number | null];
  } | null;

  moving_averages: {
    bullish: number | null;
    bearish: number | null;
  } | null;

  shareholding: {
    promoters: number | null;
    fii: number | null;
    dii: number | null;
    public_holding: number | null;
  } | null;

  retail_sentiment: {
    buy_pct: number | null;
    sell_pct: number | null;
    hold_pct: number | null;
    total_votes: number | null;
  } | null;

  fetched: boolean;
  error: string | null;
}

export interface EvaluationReport {
  overview: Record<string, string | number | null>;
  flags: { type: "red" | "amber" | "green"; title: string; description: string }[];
  benchmarks: { sector_index: string; broad_index: string; index_fund: string };
  financials: {
    profitability: Record<string, (string | number)[]>;
    balance_sheet: Record<string, string | number>;
    cash_flow: { year: string; operating: number; investing: number; financing: number }[];
    health_verdict: "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED";
  };
  valuation: {
    metrics: { metric: string; current: string; median_5y: string; sector_median: string; assessment: string }[];
    zone: "UNDERVALUED" | "FAIR" | "OVERVALUED" | "EXPENSIVE";
    peers: { name: string; pe: number | string; pb: number | string; roe: number | string }[];
    price_performance: { period: string; stock: string; sector: string; nifty: string; alpha: string }[];
    margin_of_safety: string;
  };
  quality_checks: {
    id: number;
    name: string;
    critical: boolean;
    result: "PASS" | "FAIL" | "CONDITIONAL";
    detail: string;
  }[];
  quality_score: { earned: number; total: number; percentage: number; label: "GOOD" | "MODERATE" | "BAD" };
  compatibility: {
    code: string;
    name: string;
    result: "MATCH" | "CONCERN" | "MISMATCH";
    reason: string;
  }[];
  compatibility_overall: "STRONG" | "MODERATE" | "POOR";
  verdict: {
    label: "BUY" | "BUY_WITH_CAUTION" | "WAIT" | "NOT_SUITABLE" | "AVOID";
    color: "green" | "amber" | "red";
    summary: string;
    what_works: string[];
    what_to_watch: string[];
    index_comparison: string;
    review_triggers: string[];
  };
  data_gaps: { metric: string; impact: "MATERIAL" | "MINOR"; explanation: string; check_url: string }[];
  confidence: { level: "HIGH" | "MODERATE" | "LOW"; live_count: number; total: number };
}

export interface InvestorProfile {
  age: number;
  investment_goal: "retirement" | "education" | "wealth_creation" | "home_purchase" | "short_term" | "other";
  investment_horizon: string;
  investment_mode: "lump_sum" | "staggered" | "adding";
  portfolio_type: "diversified_10plus" | "concentrated_3to5" | "mostly_mf" | "first_investment";
  position_sizing: "under_5" | "5_to_10" | "10_to_20" | "over_20";
  risk_tolerance: "low" | "medium" | "high";
  volatility_preference: "low" | "medium" | "high";
  tax_bracket: "30pct" | "20pct" | "5to10pct" | "not_sure";
}

export interface EvaluateRequest {
  ticker: string;
  entry_context: "first_purchase" | "adding" | "hold_or_exit" | "comparing";
  thesis?: string;
  profile: InvestorProfile;
}

export interface EvaluateResponse {
  stock: StockData;
  swot: SwotResult;
  trendlyne: TrendlyneData | null;
  evaluation: EvaluationReport;
}
