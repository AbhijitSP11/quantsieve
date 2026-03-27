// src/types/common.ts
// Shared enums used across evaluation, news sentiment, and SWOT types.
// Keep this file as the single source of truth for all union type strings.

export type Verdict =
  | "BUY"
  | "BUY_WITH_CAUTION"
  | "WAIT"
  | "NOT_SUITABLE"
  | "AVOID";

export type HealthVerdict = "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED";

export type ValuationZone = "UNDERVALUED" | "FAIR" | "OVERVALUED" | "EXPENSIVE";

export type DataQuality = "HIGH_INTEGRITY" | "ADEQUATE" | "FRAGMENTED" | "WEAK";

// Used by news aggregator and news sentiment service
export type NewsCategory =
  | "result"
  | "board_meeting"
  | "corporate_action"
  | "insider_trade"
  | "announcement"
  | "article";

export type NewsTrustTier = "EXCHANGE" | "PREMIUM_MEDIA" | "MEDIA" | "DEFAULT";
