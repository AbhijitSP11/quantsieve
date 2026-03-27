export type SentimentScore =
  | "STRONGLY_BULLISH"
  | "BULLISH"
  | "NEUTRAL"
  | "BEARISH"
  | "STRONGLY_BEARISH";

export type SignalSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";

export type FlagType = "RISK" | "OPPORTUNITY" | "WATCH";

export type FlagCategory =
  | "Corporate Action"
  | "Regulatory"
  | "Insider Activity"
  | "Management"
  | "Financials"
  | "Operational"
  | "Market"
  | "Other";

export type CatalystHorizon = "NEAR_TERM" | "MEDIUM_TERM" | "LONG_TERM";

export type InstitutionalAction =
  | "ACCUMULATE"
  | "HOLD"
  | "REDUCE"
  | "MONITOR"
  | "AVOID";

export type NewsFreshness = "FRESH" | "RECENT" | "STALE";

export interface NewsSentimentAnalysis {
  overall: {
    score: SentimentScore;
    confidence: "HIGH" | "MODERATE" | "LOW";
    headline: string;   // 1-sentence verdict
    summary: string;    // 2-3 sentences
  };

  signal_breakdown: {
    official: {
      sentiment: SignalSentiment;
      count: number;
      key_events: string[];         // top 3-4 events from exchange filings
    };
    media: {
      sentiment: SignalSentiment;
      count: number;
      dominant_themes: string[];    // top 3-4 themes from news articles
    };
  };

  // The most important signal cards — what an institutional PM would highlight in their morning note
  institutional_flags: {
    type: FlagType;
    category: FlagCategory;
    title: string;
    detail: string;
  }[];

  // Concrete events that could move the stock
  price_catalysts: {
    horizon: CatalystHorizon;
    direction: "POSITIVE" | "NEGATIVE";
    event: string;
    expected_impact: string;
  }[];

  // The institutional verdict
  institutional_action: {
    recommendation: InstitutionalAction;
    rationale: string;            // 2 sentences
    time_horizon: string;         // e.g. "6-12 months"
    key_risks: string[];          // top 3
    key_upside: string[];         // top 3
  };

  meta: {
    items_analyzed: number;
    official_count: number;
    media_count: number;
    freshness: NewsFreshness;
    coverage_period: string;      // e.g. "Last 30 days"
  };
}
