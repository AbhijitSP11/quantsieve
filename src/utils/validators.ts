// src/utils/validators.ts
// QuantSieve — Zod runtime validators for all Claude API output types.
// Every field Claude can return must be validated here before use.
// If Zod throws, the raw Claude response is logged and the error is surfaced to the caller.

import { z } from "zod";

// ─── Primitive Unions ────────────────────────────────────────────────────────

const VerdictSchema = z.enum([
  "BUY",
  "BUY_WITH_CAUTION",
  "WAIT",
  "NOT_SUITABLE",
  "AVOID",
]);

const HealthVerdictSchema = z.enum([
  "STRONG",
  "ADEQUATE",
  "WEAK",
  "DISTRESSED",
]);

const ValuationZoneSchema = z.enum([
  "UNDERVALUED",
  "FAIR",
  "OVERVALUED",
  "EXPENSIVE",
]);

const DataQualitySchema = z.enum([
  "HIGH_INTEGRITY",
  "ADEQUATE",
  "FRAGMENTED",
  "WEAK",
]);

const BusinessQualitySchema = z.enum(["ELITE", "STRONG", "AVERAGE", "FRAGILE"]);

const MoatTypeSchema = z.enum([
  "COST_ADVANTAGE",
  "SWITCHING_COSTS",
  "NETWORK_EFFECTS",
  "INTANGIBLE_ASSETS",
  "EFFICIENT_SCALE",
  "NO_MOAT_IDENTIFIED",
]);

const MoatWidthSchema = z.enum(["WIDE", "NARROW", "NONE"]);

const MoatNatureSchema = z.enum(["STRUCTURAL", "CYCLICAL", "UNCLEAR"]);

const GrowthTypeSchema = z.enum([
  "EFFICIENT_COMPOUNDING",
  "MARGIN_EXPANSION_STORY",
  "DEBT_FUELED_GROWTH",
  "CYCLICAL_PEAK",
  "DETERIORATING",
  "EARLY_STAGE",
  "LOW_QUALITY",
]);

const EarningsQualitySchema = z.enum([
  "CLEAN",
  "ACCEPTABLE",
  "QUESTIONABLE",
  "WEAK",
]);

const GovernancePostureSchema = z.enum([
  "STRONG",
  "ACCEPTABLE",
  "WATCHLIST",
  "HIGH_RISK",
]);

const QualityCheckResultSchema = z.enum([
  "PASS",
  "FAIL",
  "CONDITIONAL",
  "DATA_UNAVAILABLE",
]);

const QualityLabelSchema = z.enum(["GOOD", "MODERATE", "BAD"]);

const CompatibilityResultSchema = z.enum(["MATCH", "CONCERN", "MISMATCH"]);

const CompatibilityOverallSchema = z.enum(["STRONG", "MODERATE", "POOR"]);

const FlagTypeSchema = z.enum(["RED", "AMBER", "GREEN"]);

const DataGapMaterialitySchema = z.enum(["MATERIAL", "MINOR"]);

const NewsImpactSchema = z.enum([
  "THESIS_CONFIRMING",
  "THESIS_NEUTRAL",
  "THESIS_RISKING",
  "THESIS_CHANGING",
]);

const StoryTypeSchema = z.enum(["COMPOUNDING", "RE_RATING", "CYCLICAL_TRADE"]);

const EntryModeSchema = z.enum([
  "LUMP_SUM",
  "STAGGERED_3_TRANCHES",
  "STAGGERED_5_TRANCHES",
  "WAIT_FOR_TRIGGER",
]);

const ConfidenceLevelSchema = z.enum(["HIGH", "MODERATE", "LOW"]);

// ─── Sub-Section Schemas ─────────────────────────────────────────────────────

const EvaluationOverviewSchema = z.object({
  company_anchor: z.string().min(1),
  data_quality: DataQualitySchema,
  data_quality_notes: z.string(),
  business_quality: BusinessQualitySchema,
  business_quality_rationale: z.string().min(1),
  growth_type: GrowthTypeSchema,
  moat_type: MoatTypeSchema,
  moat_width: MoatWidthSchema,
  moat_structural_or_cyclical: MoatNatureSchema,
  moat_rationale: z.string().min(1),
  earnings_quality: EarningsQualitySchema,
  earnings_quality_rationale: z.string().min(1),
  governance_posture: GovernancePostureSchema,
  governance_rationale: z.string().min(1),
  executive_summary: z.string().min(20),
  what_works: z.array(z.string()).min(1).max(8),
  what_worries_me: z.array(z.string()).min(1).max(8),
});

const EvaluationFlagSchema = z.object({
  type: FlagTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
});

const EvaluationFinancialsSchema = z.object({
  health_verdict: HealthVerdictSchema,
  health_rationale: z.string().min(1),
  revenue_cagr_3y: z.number().nullable(),
  profit_cagr_3y: z.number().nullable(),
  ocf_to_pat_assessment: z.string().min(1),
  fcf_assessment: z.string().min(1),
  working_capital_assessment: z.string().min(1),
  weighted_expected_return_pct: z.number().nullable(),
});

const EvaluationValuationSchema = z.object({
  zone: ValuationZoneSchema,
  justified_pe: z.number().nullable(),
  implied_growth_rate_priced_in: z.number().nullable(),
  iv_conservative: z.number().nullable(),
  iv_optimistic: z.number().nullable(),
  risk_reward_ratio: z.number().nullable(),
  margin_of_safety_pct: z.number().nullable(),
  trendlyne_integration: z.string(),
  valuation_narrative: z.string().min(20),
});

const MarketExpectationAnalysisSchema = z.object({
  implied_eps_cagr_required: z.string().min(1),
  derating_risks: z.array(z.string()).min(1),
  story_type: StoryTypeSchema,
  what_market_gets_wrong: z.string().min(1),
});

const EvaluationScenarioSchema = z.object({
  conditions: z.string().min(1),
  what_breaks: z.string().min(1),
  target_price: z.number().nullable(),
  probability_pct: z.number().min(0).max(100),
});

const EvaluationScenariosSchema = z.object({
  bull: EvaluationScenarioSchema,
  base: EvaluationScenarioSchema,
  bear: EvaluationScenarioSchema,
}).refine(
  (data) => {
    const total =
      data.bull.probability_pct +
      data.base.probability_pct +
      data.bear.probability_pct;
    // Allow small floating-point drift: must be 99–101
    return total >= 99 && total <= 101;
  },
  {
    message:
      "Scenario probabilities must sum to 100 (bull + base + bear = 100).",
  }
);

const EntryStrategySchema = z.object({
  entry_mode: EntryModeSchema,
  entry_mode_rationale: z.string().min(1),
  suggested_position_size: z.string().min(1),
  thesis_horizon: z.string().min(1),
  exit_signal: z.string().min(1),
});

const QualityCheckSchema = z.object({
  id: z.string().regex(/^QC\d{2}$/), // QC01 … QC17
  label: z.string().min(1),
  result: QualityCheckResultSchema,
  finding: z.string().min(1),
});

const QualityScoreSchema = z.object({
  earned: z.number().min(0),
  total: z.number().min(1),
  percentage: z.number().min(0).max(100),
  label: QualityLabelSchema,
});

const CompatibilityItemSchema = z.object({
  dimension: z.string().min(1),
  result: CompatibilityResultSchema,
  note: z.string().min(1),
});

const EvaluationBenchmarksSchema = z.object({
  sector_index: z.string(),
  broad_index: z.string(),
  index_fund_alternative: z.string(),
  benchmark_note: z.string(),
});

const NewsAssessmentSchema = z.object({
  overall_impact: NewsImpactSchema,
  key_findings: z.array(z.string()),
  official_disclosure_summary: z.string(),
  media_coverage_summary: z.string(),
});

const DataGapSchema = z.object({
  field: z.string().min(1),
  materiality: DataGapMaterialitySchema,
  impact: z.string().min(1),
});

// ─── Root EvaluationReport Schema ────────────────────────────────────────────

export const evaluationReportSchema = z.object({
  overview: EvaluationOverviewSchema,

  flags: z.array(EvaluationFlagSchema),

  financials: EvaluationFinancialsSchema,

  valuation: EvaluationValuationSchema,

  market_expectation_analysis: MarketExpectationAnalysisSchema,

  scenarios: EvaluationScenariosSchema,

  entry_strategy: EntryStrategySchema,

  quality_checks: z
    .array(QualityCheckSchema)
    .min(10) // Require at least 10 of 17 — allows DATA_UNAVAILABLE on some
    .max(17),

  quality_score: QualityScoreSchema,

  compatibility: z.array(CompatibilityItemSchema).min(9).max(9),

  compatibility_overall: CompatibilityOverallSchema,

  thesis_breakers: z.array(z.string()).min(3).max(5),

  monitorables: z.array(z.string()).min(3).max(5),

  conviction_improvers: z.array(z.string()).min(3).max(3),

  conviction_reducers: z.array(z.string()).min(3).max(3),

  benchmarks: EvaluationBenchmarksSchema,

  news_assessment: NewsAssessmentSchema,

  verdict: VerdictSchema,

  verdict_summary: z.string().min(20),

  review_triggers: z.array(z.string()).min(2),

  confidence: ConfidenceLevelSchema,

  confidence_rationale: z.string().min(1),

  data_gaps: z.array(DataGapSchema),
});

// ─── News Sentiment Schema ────────────────────────────────────────────────────
// Validates the second Claude call output from newsSentimentService.ts

export const newsSentimentAnalysisSchema = z.object({
  overall: z.object({
    score: z.enum([
      "STRONGLY_BULLISH",
      "BULLISH",
      "NEUTRAL",
      "BEARISH",
      "STRONGLY_BEARISH",
    ]),
    confidence: z.enum(["HIGH", "MODERATE", "LOW"]),
    summary: z.string().min(10),
  }),

  signal_breakdown: z.object({
    official_disclosures: z.object({
      sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]),
      key_findings: z.array(z.string()),
    }),
    media_coverage: z.object({
      sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]),
      key_findings: z.array(z.string()),
    }),
  }),

  institutional_flags: z.array(
    z.object({
      type: z.enum(["RISK", "OPPORTUNITY", "WATCH"]),
      category: z.string(),
      title: z.string(),
      detail: z.string(),
      news_count: z.number().int().min(1),
    })
  ),

  price_catalysts: z.array(
    z.object({
      horizon: z.enum(["NEAR_TERM", "MEDIUM_TERM", "LONG_TERM"]),
      direction: z.enum(["POSITIVE", "NEGATIVE"]),
      description: z.string(),
    })
  ),

  institutional_verdict: z.object({
    action: z.enum(["ACCUMULATE", "HOLD", "REDUCE", "MONITOR"]),
    rationale: z.string(),
    key_risks: z.array(z.string()),
  }),

  data_quality: z.object({
    total_items_analyzed: z.number().int().min(0),
    official_sources: z.number().int().min(0),
    media_sources: z.number().int().min(0),
    freshness: z.enum(["FRESH", "RECENT", "STALE"]),
  }),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────
// These inferred types can be imported anywhere that consumes validated Claude output.

export type EvaluationReportValidated = z.infer<typeof evaluationReportSchema>;
export type NewsSentimentValidated = z.infer<typeof newsSentimentAnalysisSchema>;
