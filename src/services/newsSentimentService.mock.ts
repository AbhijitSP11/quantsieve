// Mock sentiment data generator for testing
// Returns valid dummy data matching NewsSentimentAnalysis schema exactly
// Use this to test the integration without calling Claude API

import type { NewsSentimentAnalysis } from "../types/newsSentiment.js";

export function generateMockSentiment(companyName: string, symbol: string): NewsSentimentAnalysis {
  return {
    overall: {
      score: "BULLISH",
      confidence: "HIGH",
      headline: `${companyName} showing positive momentum with strong operational updates and institutional interest.`,
      summary: `${symbol} has demonstrated operational strength with recent demerger announcement and successful product launches. Official disclosures outweigh media noise; institutional positioning remains constructive despite recent profit correction.`,
    },
    signal_breakdown: {
      official: {
        sentiment: "POSITIVE",
        count: 12,
        key_events: [
          "Board approval for agrochemicals demerger with 1:1 allocation",
          "US generics approvals: Pomalidomide and Semaglutide launches",
          "Q3 FY26 results beat consensus on OCF expansion",
          "Analyst consensus upgraded; target price ₹1,200 (+27% upside)",
        ],
      },
      media: {
        sentiment: "NEUTRAL",
        count: 8,
        dominant_themes: [
          "Demerger creates optionality for both entities",
          "Generic portfolio diversification reducing dependence on single molecules",
          "Competition in key therapeutic areas intensifying",
          "Promoter buying shows founder conviction",
        ],
      },
    },
    institutional_flags: [
      {
        type: "OPPORTUNITY",
        category: "Corporate Action",
        title: "Demerger Value Unlock",
        detail: "Agrochemicals demerger with 1:1 allocation eliminates regulatory overhang and unlocks ~₹400 Cr value. Pharma entity focuses on high-margin specialty generics.",
      },
      {
        type: "OPPORTUNITY",
        category: "Financials",
        title: "OCF Expansion Signal",
        detail: "Q3 operating cash flow up 41% YoY to ₹425 Cr. Working capital improvement and collections efficiency point to sustainable earnings quality.",
      },
      {
        type: "WATCH",
        category: "Market",
        title: "Valuation Re-rating Catalyst",
        detail: "Post-demerger, pharma entity trading at 10.8x FY26E PE; analysts seeing 15–17x multiple once demerger completes. Institutional buying likely on completion.",
      },
    ],
    price_catalysts: [
      {
        horizon: "NEAR_TERM",
        direction: "POSITIVE",
        event: "Demerger scheme approval and regulatory clearance (likely Q3 FY27)",
        expected_impact: "15–20% upside on completion; eliminate execution risk premium",
      },
      {
        horizon: "MEDIUM_TERM",
        direction: "POSITIVE",
        event: "Specialty generics market share gains in US (semaglutide, pomalidomide ramp)",
        expected_impact: "Revenue growth acceleration; margin profile improvement to 45%+ OPM",
      },
      {
        horizon: "LONG_TERM",
        direction: "NEGATIVE",
        event: "US generic price compression on key molecules (2028–2029)",
        expected_impact: "Earnings CAGR deceleration; hunting for new approvals critical",
      },
    ],
    institutional_action: {
      recommendation: "ACCUMULATE",
      rationale: `Demerger removes strategic uncertainty and creates two focused entities. Pharma pure-play offers 18–22% earnings CAGR with favorable US generics cycles and specialty positioning. Institutional PM would add on any weakness below ₹900.`,
      time_horizon: "6–12 months (demerger catalyst) + 2–3 years (earnings trajectory)",
      key_risks: [
        "Demerger scheme blocked or delayed by NCLT/MCA — regulatory overhang persists; re-rate down 10–15%",
        "US generic pricing acceleration sharper than forecast — specialty thesis breaks",
        "Promoter exits post-demerger — lose founder conviction anchor",
      ],
      key_upside: [
        "Demerger ₹400 Cr value unlock + combined entity multiple re-rating (+25–30%)",
        "Specialty generics mix shift + margin expansion to 48–50% OPM (+20% FCF)",
        "Strategic M&A or partnership post-demerger to diversify beyond generics (+15–20% optionality)",
      ],
    },
    meta: {
      items_analyzed: 20,
      official_count: 12,
      media_count: 8,
      freshness: "FRESH",
      coverage_period: "Last 30 days",
    },
  };
}
