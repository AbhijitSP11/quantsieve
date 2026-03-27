// src/types/evaluation.ts
// QuantSieve — EvaluationReport types
// Fully aligned with the 15-step institutional evaluation prompt.
// Every field in the JSON output schema has a corresponding TypeScript type here.

import type { Verdict, HealthVerdict, ValuationZone, DataQuality } from "./common";

// ─── Enums & Union Types ────────────────────────────────────────────────────

export type BusinessQuality = "ELITE" | "STRONG" | "AVERAGE" | "FRAGILE";

export type MoatType =
  | "COST_ADVANTAGE"
  | "SWITCHING_COSTS"
  | "NETWORK_EFFECTS"
  | "INTANGIBLE_ASSETS"
  | "EFFICIENT_SCALE"
  | "NO_MOAT_IDENTIFIED";

export type MoatWidth = "WIDE" | "NARROW" | "NONE";

export type MoatNature = "STRUCTURAL" | "CYCLICAL" | "UNCLEAR";

export type GrowthType =
  | "EFFICIENT_COMPOUNDING"
  | "MARGIN_EXPANSION_STORY"
  | "DEBT_FUELED_GROWTH"
  | "CYCLICAL_PEAK"
  | "DETERIORATING"
  | "EARLY_STAGE"
  | "LOW_QUALITY";

export type EarningsQuality = "CLEAN" | "ACCEPTABLE" | "QUESTIONABLE" | "WEAK";

export type GovernancePosture = "STRONG" | "ACCEPTABLE" | "WATCHLIST" | "HIGH_RISK";

export type QualityCheckResult = "PASS" | "FAIL" | "CONDITIONAL" | "DATA_UNAVAILABLE";

export type QualityLabel = "GOOD" | "MODERATE" | "BAD";

export type CompatibilityResult = "MATCH" | "CONCERN" | "MISMATCH";

export type CompatibilityOverall = "STRONG" | "MODERATE" | "POOR";

export type FlagType = "RED" | "AMBER" | "GREEN";

export type DataGapMateriality = "MATERIAL" | "MINOR";

export type NewsImpact =
  | "THESIS_CONFIRMING"
  | "THESIS_NEUTRAL"
  | "THESIS_RISKING"
  | "THESIS_CHANGING";

export type StoryType = "COMPOUNDING" | "RE_RATING" | "CYCLICAL_TRADE";

export type EntryMode =
  | "LUMP_SUM"
  | "STAGGERED_3_TRANCHES"
  | "STAGGERED_5_TRANCHES"
  | "WAIT_FOR_TRIGGER";

export type ConfidenceLevel = "HIGH" | "MODERATE" | "LOW";

// ─── Sub-Sections ───────────────────────────────────────────────────────────

export interface EvaluationOverview {
  /** What the business does, its scale, and primary revenue driver. */
  company_anchor: string;

  data_quality: DataQuality;
  data_quality_notes: string;

  business_quality: BusinessQuality;
  business_quality_rationale: string;

  growth_type: GrowthType;

  moat_type: MoatType;
  moat_width: MoatWidth;
  moat_structural_or_cyclical: MoatNature;
  moat_rationale: string;

  earnings_quality: EarningsQuality;
  earnings_quality_rationale: string;

  governance_posture: GovernancePosture;
  governance_rationale: string;

  /**
   * 4–6 sentence institutional summary: what the business is, what the data
   * shows, key risks, verdict rationale. No hype language.
   */
  executive_summary: string;

  what_works: string[];
  what_worries_me: string[];
}

export interface EvaluationFlag {
  type: FlagType;
  /** Concise label — max 8 words. */
  title: string;
  /** Data-backed explanation citing specific numbers. 1–2 sentences. */
  description: string;
}

export interface EvaluationFinancials {
  health_verdict: HealthVerdict;
  health_rationale: string;

  revenue_cagr_3y: number | null;
  profit_cagr_3y: number | null;

  /** OCF/PAT ratio assessment with actual per-year figures where available. */
  ocf_to_pat_assessment: string;

  /** FCF positive/negative trend assessment. */
  fcf_assessment: string;

  /** Debtor/creditor/inventory signals, or "DATA_UNAVAILABLE". */
  working_capital_assessment: string;

  /**
   * Probability-weighted expected return across bull/base/bear scenarios.
   * Expressed as percentage. Null if scenario prices could not be estimated.
   */
  weighted_expected_return_pct: number | null;
}

export interface EvaluationValuation {
  zone: ValuationZone;

  /** Justified P/E derived from sustainable growth + cost of equity estimate. */
  justified_pe: number | null;

  /** EPS CAGR the market is implicitly pricing in at current valuation. */
  implied_growth_rate_priced_in: number | null;

  /** Conservative intrinsic value estimate (bear assumptions). */
  iv_conservative: number | null;

  /** Optimistic intrinsic value estimate (bull assumptions). */
  iv_optimistic: number | null;

  /**
   * (Bull Target − Current Price) / (Current Price − Bear Floor).
   * > 3:1 = attractive. 2–3:1 = caution. < 2:1 = unattractive.
   */
  risk_reward_ratio: number | null;

  /**
   * Positive = trading below IV (discount).
   * Negative = trading above IV (premium).
   * Expressed as percentage of current price.
   */
  margin_of_safety_pct: number | null;

  /** How Trendlyne DVM scores corroborate or conflict with valuation view. */
  trendlyne_integration: string;

  /** 3–5 sentence valuation narrative covering absolute, relative, justified. */
  valuation_narrative: string;
}

export interface MarketExpectationAnalysis {
  /** EPS CAGR required over 3–5Y to justify current price. e.g., "18–22% p.a." */
  implied_eps_cagr_required: string;

  /** Specific events/metrics that would cause a valuation de-rating. */
  derating_risks: string[];

  story_type: StoryType;

  /** What the market consensus is likely getting wrong about this stock. */
  what_market_gets_wrong: string;
}

export interface EvaluationScenario {
  /** Conditions required for this scenario to play out. */
  conditions: string;
  /** What assumption fails / what goes wrong in this scenario. */
  what_breaks: string;
  /** Implied stock price at terminal point (3–5 years). */
  target_price: number | null;
  /** Probability weight. Bull + Base + Bear must sum to 100. */
  probability_pct: number;
}

export interface EvaluationScenarios {
  bull: EvaluationScenario;
  base: EvaluationScenario;
  bear: EvaluationScenario;
}

export interface EntryStrategy {
  entry_mode: EntryMode;
  entry_mode_rationale: string;

  /**
   * Specific size recommendation for this investor given the risk profile.
   * e.g., "Start at 4%, build to 7% after Q2 FY26 results confirm OPM recovery."
   */
  suggested_position_size: string;

  /**
   * Time horizon for thesis to play out.
   * e.g., "3–5 years for earnings compounding" — not a vague "long term".
   */
  thesis_horizon: string;

  /**
   * Specific, measurable exit signal regardless of thesis conviction.
   * e.g., "Exit if promoter pledge crosses 20% or D/E exceeds 1.5 for 2 quarters."
   */
  exit_signal: string;
}

export interface QualityCheck {
  /** QC01 through QC17. */
  id: string;
  label: string;
  result: QualityCheckResult;
  /** One-line finding with specific numbers that drove the result. */
  finding: string;
}

export interface QualityScore {
  earned: number;
  total: number;
  percentage: number;
  label: QualityLabel;
}

export interface CompatibilityItem {
  dimension: string;
  result: CompatibilityResult;
  note: string;
}

export interface EvaluationBenchmarks {
  sector_index: string;
  broad_index: string;
  index_fund_alternative: string;
  /** One sentence on opportunity cost vs passive index. */
  benchmark_note: string;
}

export interface NewsAssessment {
  overall_impact: NewsImpact;
  key_findings: string[];
  official_disclosure_summary: string;
  media_coverage_summary: string;
}

export interface DataGap {
  field: string;
  materiality: DataGapMateriality;
  /** How this gap affects reliability of the verdict. */
  impact: string;
}

// ─── Root EvaluationReport ──────────────────────────────────────────────────

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

  compatibility_overall: CompatibilityOverall;

  /**
   * 3–5 events that would invalidate the thesis entirely — non-negotiable exits.
   * Must be specific. "Regulatory order suspending plant operations" not "regulatory risk."
   */
  thesis_breakers: string[];

  /**
   * 3–5 specific, quantified metrics to track each quarter.
   * e.g., "OPM must stay above 20%" — not "Watch margins."
   */
  monitorables: string[];

  /** 3 specific events that would upgrade conviction and justify adding. */
  conviction_improvers: string[];

  /** 3 specific events that would reduce conviction and trigger trimming. */
  conviction_reducers: string[];

  benchmarks: EvaluationBenchmarks;

  news_assessment: NewsAssessment;

  verdict: Verdict;

  /** 2–3 sentence verdict rationale grounded in data. Institutional tone. */
  verdict_summary: string;

  /**
   * Time-bound, specific re-evaluation triggers.
   * e.g., "Re-evaluate after Q2 FY26 results. Exit if OPM < 18% for 2 consecutive quarters."
   */
  review_triggers: string[];

  confidence: ConfidenceLevel;

  confidence_rationale: string;

  data_gaps: DataGap[];
}
