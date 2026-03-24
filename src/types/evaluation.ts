import type {
  HealthVerdict,
  ValuationZone,
  QualityLabel,
  QualityResult,
  CompatibilityResult,
  CompatibilityOverall,
  Verdict,
  VerdictColor,
  FlagType,
  DataGapImpact,
  ConfidenceLevel,
} from "./common.js";

export interface EvaluationReport {
  overview: Record<string, string | number | null>;
  flags: { type: FlagType; title: string; description: string }[];
  benchmarks: { sector_index: string; broad_index: string; index_fund: string };
  financials: {
    profitability: Record<string, (string | number)[]>;
    balance_sheet: Record<string, string | number>;
    cash_flow: {
      year: string;
      operating: number;
      investing: number;
      financing: number;
    }[];
    health_verdict: HealthVerdict;
  };
  valuation: {
    metrics: {
      metric: string;
      current: string;
      median_5y: string;
      sector_median: string;
      assessment: string;
    }[];
    zone: ValuationZone;
    peers: {
      name: string;
      pe: number | string;
      pb: number | string;
      roe: number | string;
    }[];
    price_performance: {
      period: string;
      stock: string;
      sector: string;
      nifty: string;
      alpha: string;
    }[];
    margin_of_safety: string;
  };
  quality_checks: {
    id: number;
    name: string;
    critical: boolean;
    result: QualityResult;
    detail: string;
  }[];
  quality_score: {
    earned: number;
    total: number;
    percentage: number;
    label: QualityLabel;
  };
  compatibility: {
    code: string;
    name: string;
    result: CompatibilityResult;
    reason: string;
  }[];
  compatibility_overall: CompatibilityOverall;
  verdict: {
    label: Verdict;
    color: VerdictColor;
    summary: string;
    what_works: string[];
    what_to_watch: string[];
    index_comparison: string;
    review_triggers: string[];
  };
  data_gaps: {
    metric: string;
    impact: DataGapImpact;
    explanation: string;
    check_url: string;
  }[];
  confidence: { level: ConfidenceLevel; live_count: number; total: number };
}
