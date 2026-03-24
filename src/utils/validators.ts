import { z } from "zod";

const flagSchema = z.object({
  type: z.enum(["red", "amber", "green"]),
  title: z.string(),
  description: z.string(),
});

const benchmarksSchema = z.object({
  sector_index: z.string(),
  broad_index: z.string(),
  index_fund: z.string(),
});

const cashFlowEntrySchema = z.object({
  year: z.string(),
  operating: z.number(),
  investing: z.number(),
  financing: z.number(),
});

const financialsSchema = z.object({
  profitability: z.record(z.array(z.union([z.string(), z.number()]))),
  balance_sheet: z.record(z.union([z.string(), z.number()])),
  cash_flow: z.array(cashFlowEntrySchema),
  health_verdict: z.enum(["STRONG", "ADEQUATE", "WEAK", "DISTRESSED"]),
});

const valuationMetricSchema = z.object({
  metric: z.string(),
  current: z.string(),
  median_5y: z.string(),
  sector_median: z.string(),
  assessment: z.string(),
});

const peerSchema = z.object({
  name: z.string(),
  pe: z.union([z.number(), z.string()]),
  pb: z.union([z.number(), z.string()]),
  roe: z.union([z.number(), z.string()]),
});

const pricePerformanceSchema = z.object({
  period: z.string(),
  stock: z.string(),
  sector: z.string(),
  nifty: z.string(),
  alpha: z.string(),
});

const valuationSchema = z.object({
  metrics: z.array(valuationMetricSchema),
  zone: z.enum(["UNDERVALUED", "FAIR", "OVERVALUED", "EXPENSIVE"]),
  peers: z.array(peerSchema),
  price_performance: z.array(pricePerformanceSchema),
  margin_of_safety: z.string(),
});

const qualityCheckSchema = z.object({
  id: z.number(),
  name: z.string(),
  critical: z.boolean(),
  result: z.enum(["PASS", "FAIL", "CONDITIONAL"]),
  detail: z.string(),
});

const qualityScoreSchema = z.object({
  earned: z.number(),
  total: z.number(),
  percentage: z.number(),
  label: z.enum(["GOOD", "MODERATE", "BAD"]),
});

const compatibilitySchema = z.object({
  code: z.string(),
  name: z.string(),
  result: z.enum(["MATCH", "CONCERN", "MISMATCH"]),
  reason: z.string(),
});

const verdictSchema = z.object({
  label: z.enum(["BUY", "BUY_WITH_CAUTION", "WAIT", "NOT_SUITABLE", "AVOID"]),
  color: z.enum(["green", "amber", "red"]),
  summary: z.string(),
  what_works: z.array(z.string()),
  what_to_watch: z.array(z.string()),
  index_comparison: z.string(),
  review_triggers: z.array(z.string()),
});

const dataGapSchema = z.object({
  metric: z.string(),
  impact: z.enum(["MATERIAL", "MINOR"]),
  explanation: z.string(),
  check_url: z.string(),
});

const confidenceSchema = z.object({
  level: z.enum(["HIGH", "MODERATE", "LOW"]),
  live_count: z.number(),
  total: z.number(),
});

export const evaluationReportSchema = z.object({
  overview: z.record(z.union([z.string(), z.number(), z.null()])),
  flags: z.array(flagSchema),
  benchmarks: benchmarksSchema,
  financials: financialsSchema,
  valuation: valuationSchema,
  quality_checks: z.array(qualityCheckSchema),
  quality_score: qualityScoreSchema,
  compatibility: z.array(compatibilitySchema),
  compatibility_overall: z.enum(["STRONG", "MODERATE", "POOR"]),
  verdict: verdictSchema,
  data_gaps: z.array(dataGapSchema),
  confidence: confidenceSchema,
});

export type EvaluationReportSchema = z.infer<typeof evaluationReportSchema>;
