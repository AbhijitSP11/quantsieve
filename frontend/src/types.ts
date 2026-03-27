// ─── Mirrors backend types ────────────────────────────────────────────────────

export type SourceType = "official_exchange" | "media";
export type Exchange = "NSE" | "BSE" | null;
export type NewsCategory =
  | "announcement" | "result" | "corporate_action"
  | "board_meeting" | "insider_trade" | "article" | "other";

export interface NewsItem {
  id: string;
  sourceType: SourceType;
  exchange: Exchange;
  publisher: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  url: string;
  attachmentUrl: string | null;
  category: NewsCategory;
  trustScore: number;
  relevanceScore: number;
  finalScore: number;
}

export interface NewsResponse {
  symbol: string;
  companyName: string | null;
  fetchedAt: string;
  providers: {
    name: string;
    status: "success" | "failed" | "skipped";
    itemCount: number;
    latencyMs: number;
    error?: string;
  }[];
  items: NewsItem[];
}

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
  bse_code: string | null;
  listed_since: string | null;
  data_source: string;
  fetched_at: string;
}

// ─── SWOT (V2 — evidence + strength per item) ─────────────────────────────────

export interface SwotItem {
  point: string;
  evidence: string;
  strength: "HIGH" | "MEDIUM" | "LOW";
}

export interface SwotResult {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  summary: {
    strengths: number;
    weaknesses: number;
    opportunities: number;
    threats: number;
    posture: string;
  };
}

// ─── Trendlyne ────────────────────────────────────────────────────────────────

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
  moving_averages: { bullish: number | null; bearish: number | null } | null;
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

// ─── EvaluationReport (V2 — 15-step framework) ───────────────────────────────

export interface EvaluationOverview {
  company_anchor: string;
  data_quality: "HIGH_INTEGRITY" | "ADEQUATE" | "FRAGMENTED" | "WEAK";
  data_quality_notes: string;
  business_quality: "ELITE" | "STRONG" | "AVERAGE" | "FRAGILE";
  business_quality_rationale: string;
  growth_type:
    | "EFFICIENT_COMPOUNDING" | "MARGIN_EXPANSION_STORY" | "DEBT_FUELED_GROWTH"
    | "CYCLICAL_PEAK" | "DETERIORATING" | "EARLY_STAGE" | "LOW_QUALITY";
  moat_type:
    | "COST_ADVANTAGE" | "SWITCHING_COSTS" | "NETWORK_EFFECTS"
    | "INTANGIBLE_ASSETS" | "EFFICIENT_SCALE" | "NO_MOAT_IDENTIFIED";
  moat_width: "WIDE" | "NARROW" | "NONE";
  moat_structural_or_cyclical: "STRUCTURAL" | "CYCLICAL" | "UNCLEAR";
  moat_rationale: string;
  earnings_quality: "CLEAN" | "ACCEPTABLE" | "QUESTIONABLE" | "WEAK";
  earnings_quality_rationale: string;
  governance_posture: "STRONG" | "ACCEPTABLE" | "WATCHLIST" | "HIGH_RISK";
  governance_rationale: string;
  executive_summary: string;
  what_works: string[];
  what_worries_me: string[];
}

export interface EvaluationFlag {
  type: "RED" | "AMBER" | "GREEN";
  title: string;
  description: string;
}

export interface EvaluationFinancials {
  health_verdict: "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED";
  health_rationale: string;
  revenue_cagr_3y: number | null;
  profit_cagr_3y: number | null;
  ocf_to_pat_assessment: string;
  fcf_assessment: string;
  working_capital_assessment: string;
  weighted_expected_return_pct: number | null;
}

export interface EvaluationValuation {
  zone: "UNDERVALUED" | "FAIR" | "OVERVALUED" | "EXPENSIVE";
  justified_pe: number | null;
  implied_growth_rate_priced_in: number | null;
  iv_conservative: number | null;
  iv_optimistic: number | null;
  risk_reward_ratio: number | null;
  margin_of_safety_pct: number | null;
  trendlyne_integration: string;
  valuation_narrative: string;
}

export interface MarketExpectationAnalysis {
  implied_eps_cagr_required: string;
  derating_risks: string[];
  story_type: "COMPOUNDING" | "RE_RATING" | "CYCLICAL_TRADE";
  what_market_gets_wrong: string;
}

export interface EvaluationScenario {
  conditions: string;
  what_breaks: string;
  target_price: number | null;
  probability_pct: number;
}

export interface EvaluationScenarios {
  bull: EvaluationScenario;
  base: EvaluationScenario;
  bear: EvaluationScenario;
}

export interface EntryStrategy {
  entry_mode: "LUMP_SUM" | "STAGGERED_3_TRANCHES" | "STAGGERED_5_TRANCHES" | "WAIT_FOR_TRIGGER";
  entry_mode_rationale: string;
  suggested_position_size: string;
  thesis_horizon: string;
  exit_signal: string;
}

export interface QualityCheck {
  id: string;
  label: string;
  result: "PASS" | "FAIL" | "CONDITIONAL" | "DATA_UNAVAILABLE";
  finding: string;
}

export interface QualityScore {
  earned: number;
  total: number;
  percentage: number;
  label: "GOOD" | "MODERATE" | "BAD";
}

export interface CompatibilityItem {
  dimension: string;
  result: "MATCH" | "CONCERN" | "MISMATCH";
  note: string;
}

export interface EvaluationBenchmarks {
  sector_index: string;
  broad_index: string;
  index_fund_alternative: string;
  benchmark_note: string;
}

export interface NewsAssessment {
  overall_impact: "THESIS_CONFIRMING" | "THESIS_NEUTRAL" | "THESIS_RISKING" | "THESIS_CHANGING";
  key_findings: string[];
  official_disclosure_summary: string;
  media_coverage_summary: string;
}

export interface DataGap {
  field: string;
  materiality: "MATERIAL" | "MINOR";
  impact: string;
}

export type Verdict = "BUY" | "BUY_WITH_CAUTION" | "WAIT" | "NOT_SUITABLE" | "AVOID";

export interface EvaluationReport {
  overview: EvaluationOverview;
  flags: EvaluationFlag[];
  financials: EvaluationFinancials;
  valuation: EvaluationValuation;
  market_expectation_analysis: MarketExpectationAnalysis;
  scenarios: EvaluationScenarios;
  entry_strategy: EntryStrategy;
  quality_checks: QualityCheck[];
  quality_score: QualityScore;
  compatibility: CompatibilityItem[];
  compatibility_overall: "STRONG" | "MODERATE" | "POOR";
  thesis_breakers: string[];
  monitorables: string[];
  conviction_improvers: string[];
  conviction_reducers: string[];
  benchmarks: EvaluationBenchmarks;
  news_assessment: NewsAssessment;
  verdict: Verdict;
  verdict_summary: string;
  review_triggers: string[];
  confidence: "HIGH" | "MODERATE" | "LOW";
  confidence_rationale: string;
  data_gaps: DataGap[];
}

// ─── Investor profile & request ───────────────────────────────────────────────

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

// ─── News Sentiment Analysis ──────────────────────────────────────────────────

export type SentimentScore =
  | "STRONGLY_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONGLY_BEARISH";
export type SignalSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
export type FlagType = "RISK" | "OPPORTUNITY" | "WATCH";
export type FlagCategory =
  | "Corporate Action" | "Regulatory" | "Insider Activity"
  | "Management" | "Financials" | "Operational" | "Market" | "Other";
export type CatalystHorizon = "NEAR_TERM" | "MEDIUM_TERM" | "LONG_TERM";
export type InstitutionalAction = "ACCUMULATE" | "HOLD" | "REDUCE" | "MONITOR" | "AVOID";

export interface NewsSentimentAnalysis {
  overall: {
    score: SentimentScore;
    confidence: "HIGH" | "MODERATE" | "LOW";
    headline: string;
    summary: string;
  };
  signal_breakdown: {
    official: { sentiment: SignalSentiment; count: number; key_events: string[] };
    media: { sentiment: SignalSentiment; count: number; dominant_themes: string[] };
  };
  institutional_flags: {
    type: FlagType;
    category: FlagCategory;
    title: string;
    detail: string;
  }[];
  price_catalysts: {
    horizon: CatalystHorizon;
    direction: "POSITIVE" | "NEGATIVE";
    event: string;
    expected_impact: string;
  }[];
  institutional_action: {
    recommendation: InstitutionalAction;
    rationale: string;
    time_horizon: string;
    key_risks: string[];
    key_upside: string[];
  };
  meta: {
    items_analyzed: number;
    official_count: number;
    media_count: number;
    freshness: "FRESH" | "RECENT" | "STALE";
    coverage_period: string;
  };
}

export interface EvaluateResponse {
  stock: StockData;
  swot: SwotResult;
  trendlyne: TrendlyneData | null;
  news: NewsResponse | null;
  sentiment: NewsSentimentAnalysis | null;
  evaluation: EvaluationReport;
}
