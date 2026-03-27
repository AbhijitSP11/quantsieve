// src/services/swotEngine.ts
// QuantSieve — Rule-Based SWOT Engine
//
// Runs entirely on StockData with no external API calls.
// Produces a structured SwotResult that is passed to Claude as a "pre-computed starting
// reference" — Claude validates every point against raw data and is not obligated to agree.
//
// DESIGN PRINCIPLE: This engine catches definitive, data-driven signals only.
// It never speculates. If a field is null, the check is simply skipped.
// Claude's 15-step reasoning handles nuance; this engine handles deterministic thresholds.

import type { StockData } from "../types/stock";
import { getSectorThresholds } from "../utils/sectorThresholds";

export interface SwotItem {
  point: string;
  /** The specific metric values that triggered this signal. */
  evidence: string;
  /** Signal strength for ordering. HIGH items surfaced first. */
  strength: "HIGH" | "MEDIUM" | "LOW";
}

export interface SwotSummary {
  strengths: number;
  weaknesses: number;
  opportunities: number;
  threats: number;
  /** One-line overall posture derived from S/W/O/T counts. */
  posture: string;
}

export interface SwotResult {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  summary: SwotSummary;
}

export function runSwotEngine(stock: StockData): SwotResult {
  const thresholds = getSectorThresholds(stock.sector ?? "General");

  const strengths: SwotItem[] = [];
  const weaknesses: SwotItem[] = [];
  const opportunities: SwotItem[] = [];
  const threats: SwotItem[] = [];

  // ─── Helper: safe array average ──────────────────────────────────────────
  const avg = (arr: (number | null)[] | null | undefined): number | null => {
    if (!arr || arr.length === 0) return null;
    const nums = arr.filter((v): v is number => v !== null);
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  };

  // ─── Helper: trend direction (positive = improving) ───────────────────────
  const trend = (arr: (number | null)[] | null | undefined): "UP" | "DOWN" | "FLAT" | null => {
    if (!arr || arr.length < 2) return null;
    const nums = arr.filter((v): v is number => v !== null);
    if (nums.length < 2) return null;
    const first = nums[0];
    const last = nums[nums.length - 1];
    const delta = ((last - first) / Math.abs(first || 1)) * 100;
    if (delta > 5) return "UP";
    if (delta < -5) return "DOWN";
    return "FLAT";
  };

  // ─── Helper: consecutive direction in array ───────────────────────────────
  const consecutiveDeclineCount = (arr: (number | null)[] | null | undefined): number => {
    if (!arr || arr.length < 2) return 0;
    const nums = arr.filter((v): v is number => v !== null);
    let count = 0;
    for (let i = nums.length - 1; i > 0; i--) {
      if (nums[i] < nums[i - 1]) count++;
      else break;
    }
    return count;
  };

  // ═══════════════════════════════════════════════
  // STRENGTHS
  // ═══════════════════════════════════════════════

  // ROE above sector threshold
  if (stock.roe !== null && stock.roe >= thresholds.goodRoe) {
    strengths.push({
      point: "ROE above sector threshold",
      evidence: `ROE ${stock.roe.toFixed(1)}% vs threshold ${thresholds.goodRoe}%`,
      strength: stock.roe >= thresholds.goodRoe * 1.3 ? "HIGH" : "MEDIUM",
    });
  }

  // ROCE above threshold (non-banking)
  const latestRoce = stock.roce && stock.roce.length > 0
    ? stock.roce[stock.roce.length - 1]
    : null;
  if (latestRoce !== null && thresholds.goodRoce && latestRoce >= thresholds.goodRoce) {
    strengths.push({
      point: "ROCE above sector threshold",
      evidence: `ROCE ${latestRoce.toFixed(1)}% vs threshold ${thresholds.goodRoce}%`,
      strength: latestRoce >= thresholds.goodRoce * 1.3 ? "HIGH" : "MEDIUM",
    });
  }

  // Revenue growth (5Y CAGR)
  const rev5y = stock.compounded_sales_growth?.["5Year"];
  if (rev5y !== null && rev5y !== undefined && rev5y >= 15) {
    strengths.push({
      point: "Strong 5-year revenue compounding",
      evidence: `5Y Sales CAGR ${rev5y.toFixed(1)}%`,
      strength: rev5y >= 20 ? "HIGH" : "MEDIUM",
    });
  }

  // Profit growth (5Y CAGR) exceeds revenue (margin expansion proxy)
  const profit5y = stock.compounded_profit_growth?.["5Year"];
  if (
    profit5y !== null &&
    profit5y !== undefined &&
    rev5y !== null &&
    rev5y !== undefined &&
    profit5y > rev5y + 3
  ) {
    strengths.push({
      point: "Profit growing faster than revenue (margin expansion)",
      evidence: `5Y Profit CAGR ${profit5y.toFixed(1)}% vs Sales CAGR ${rev5y.toFixed(1)}%`,
      strength: "HIGH",
    });
  }

  // Low debt
  if (stock.debt_to_equity !== null && stock.debt_to_equity <= thresholds.acceptableDE * 0.5) {
    strengths.push({
      point: "Conservatively leveraged balance sheet",
      evidence: `D/E ${stock.debt_to_equity.toFixed(2)}x (sector threshold ${thresholds.acceptableDE}x)`,
      strength: stock.debt_to_equity === 0 ? "HIGH" : "MEDIUM",
    });
  }

  // High promoter holding (stable or increasing)
  if (stock.promoter_holding !== null && stock.promoter_holding >= 60) {
    const promTrend = trend(stock.promoter_holding_trend ?? null);
    if (promTrend === "UP" || promTrend === "FLAT") {
      strengths.push({
        point: "High and stable/increasing promoter holding",
        evidence: `Promoter holding ${stock.promoter_holding.toFixed(1)}%${promTrend === "UP" ? " — increasing trend" : ""}`,
        strength: "HIGH",
      });
    }
  }

  // OPM improving trend
  const opmTrend = trend(stock.opm ?? null);
  const latestOpm = stock.opm && stock.opm.length > 0
    ? stock.opm[stock.opm.length - 1]
    : null;
  if (opmTrend === "UP" && latestOpm !== null && latestOpm >= 15) {
    strengths.push({
      point: "Operating margins expanding",
      evidence: `OPM improving trend, latest ${latestOpm.toFixed(1)}%`,
      strength: "MEDIUM",
    });
  }

  // Strong interest coverage
  if (stock.interest_coverage !== null && stock.interest_coverage >= 5) {
    strengths.push({
      point: "Strong interest coverage — debt servicing not a concern",
      evidence: `Interest coverage ${stock.interest_coverage.toFixed(1)}x`,
      strength: stock.interest_coverage >= 10 ? "HIGH" : "MEDIUM",
    });
  }

  // Positive OCF proxy — operating CF positive across available years
  const ocfArr = stock.cash_flow
    ?.map((cf) => cf.operating)
    .filter((v): v is number => v !== null);
  if (ocfArr && ocfArr.length >= 2) {
    const allPositive = ocfArr.every((v) => v > 0);
    if (allPositive) {
      strengths.push({
        point: "Operating cash flow consistently positive",
        evidence: `OCF positive in all ${ocfArr.length} available years`,
        strength: "HIGH",
      });
    }
  }

  // Debt-free or near-debt-free
  if (stock.debt_to_equity !== null && stock.debt_to_equity === 0) {
    strengths.push({
      point: "Debt-free balance sheet",
      evidence: `D/E ratio 0x`,
      strength: "HIGH",
    });
  }

  // ═══════════════════════════════════════════════
  // WEAKNESSES
  // ═══════════════════════════════════════════════

  // ROE below threshold
  if (stock.roe !== null && stock.roe < thresholds.goodRoe) {
    weaknesses.push({
      point: "ROE below sector threshold",
      evidence: `ROE ${stock.roe.toFixed(1)}% vs threshold ${thresholds.goodRoe}%`,
      strength: stock.roe < thresholds.goodRoe * 0.7 ? "HIGH" : "MEDIUM",
    });
  }

  // ROCE below threshold
  if (latestRoce !== null && thresholds.goodRoce && latestRoce < thresholds.goodRoce) {
    weaknesses.push({
      point: "ROCE below sector threshold — capital not working hard enough",
      evidence: `ROCE ${latestRoce.toFixed(1)}% vs threshold ${thresholds.goodRoce}%`,
      strength: latestRoce < thresholds.goodRoce * 0.7 ? "HIGH" : "MEDIUM",
    });
  }

  // High debt
  if (stock.debt_to_equity !== null && stock.debt_to_equity > thresholds.acceptableDE) {
    weaknesses.push({
      point: "Leverage above sector threshold",
      evidence: `D/E ${stock.debt_to_equity.toFixed(2)}x vs threshold ${thresholds.acceptableDE}x`,
      strength: stock.debt_to_equity > thresholds.acceptableDE * 1.5 ? "HIGH" : "MEDIUM",
    });
  }

  // Compressing OPM
  if (opmTrend === "DOWN") {
    const earliestOpm = stock.opm && stock.opm.length > 0 ? stock.opm[0] : null;
    weaknesses.push({
      point: "Operating margin compression trend",
      evidence: latestOpm !== null && earliestOpm !== null
        ? `OPM declined from ${earliestOpm.toFixed(1)}% to ${latestOpm.toFixed(1)}%`
        : "OPM declining across available periods",
      strength: "HIGH",
    });
  }

  // Weak interest coverage
  if (stock.interest_coverage !== null && stock.interest_coverage < 2.0) {
    weaknesses.push({
      point: "Weak interest coverage — debt servicing risk",
      evidence: `Interest coverage ${stock.interest_coverage.toFixed(1)}x (< 2.0x threshold)`,
      strength: stock.interest_coverage < 1.0 ? "HIGH" : "MEDIUM",
    });
  }

  // OCF inconsistency (one or more negative years)
  if (ocfArr && ocfArr.length >= 2) {
    const negativeYears = ocfArr.filter((v) => v < 0).length;
    if (negativeYears > 0) {
      weaknesses.push({
        point: "Operating cash flow turned negative in one or more years",
        evidence: `${negativeYears} of ${ocfArr.length} available years showed negative OCF`,
        strength: negativeYears >= 2 ? "HIGH" : "MEDIUM",
      });
    }
  }

  // Borrowings rising faster than revenue
  if (
    stock.borrowings !== null &&
    stock.compounded_sales_growth?.["3Year"] !== undefined &&
    stock.compounded_sales_growth["3Year"] !== null
  ) {
    // Proxy check: if reserves growth is slow vs borrowings absolute level
    if (stock.reserves !== null && stock.borrowings > stock.reserves * 0.8) {
      weaknesses.push({
        point: "Borrowings large relative to reserves — balance sheet stretched",
        evidence: `Borrowings ₹${stock.borrowings.toFixed(0)} Cr vs Reserves ₹${stock.reserves.toFixed(0)} Cr`,
        strength: stock.borrowings > stock.reserves ? "HIGH" : "MEDIUM",
      });
    }
  }

  // Slowing profit growth
  const profit3y = stock.compounded_profit_growth?.["3Year"];
  const profitTtm = stock.compounded_profit_growth?.["TTM"];
  if (
    profit3y !== null &&
    profit3y !== undefined &&
    profitTtm !== null &&
    profitTtm !== undefined &&
    profitTtm < profit3y * 0.5
  ) {
    weaknesses.push({
      point: "Profit growth decelerating significantly in TTM vs 3Y trend",
      evidence: `TTM profit growth ${profitTtm.toFixed(1)}% vs 3Y CAGR ${profit3y.toFixed(1)}%`,
      strength: profitTtm < 0 ? "HIGH" : "MEDIUM",
    });
  }

  // ═══════════════════════════════════════════════
  // OPPORTUNITIES
  // ═══════════════════════════════════════════════

  // Small / Mid cap with room to grow
  if (
    stock.market_cap_category === "Small Cap" ||
    stock.market_cap_category === "Mid Cap"
  ) {
    if (rev5y !== null && rev5y !== undefined && rev5y >= 12) {
      opportunities.push({
        point: "Mid/Small cap with demonstrated growth runway",
        evidence: `${stock.market_cap_category} with 5Y Sales CAGR ${rev5y.toFixed(1)}%`,
        strength: "MEDIUM",
      });
    }
  }

  // Margin expansion headroom (OPM improving but still below sector ceiling)
  if (opmTrend === "UP" && latestOpm !== null && latestOpm < 25) {
    opportunities.push({
      point: "Operating leverage headroom — margins still expanding",
      evidence: `OPM ${latestOpm.toFixed(1)}% and rising; expansion potential remains`,
      strength: "MEDIUM",
    });
  }

  // Debt reduction in progress (borrowings declining)
  const borrowingsTrend = stock.borrowings !== null && stock.reserves !== null
    ? stock.borrowings < stock.reserves * 0.3
      ? "LOW_DEBT"
      : null
    : null;
  if (borrowingsTrend === "LOW_DEBT") {
    opportunities.push({
      point: "Balance sheet deleveraging trajectory — financial flexibility improving",
      evidence: `Borrowings ₹${stock.borrowings?.toFixed(0)} Cr = ${((stock.borrowings! / stock.reserves!) * 100).toFixed(0)}% of reserves`,
      strength: "LOW",
    });
  }

  // Strong ROCE with low leverage = capacity to take on growth investment
  if (
    latestRoce !== null &&
    thresholds.goodRoce &&
    latestRoce >= thresholds.goodRoce &&
    stock.debt_to_equity !== null &&
    stock.debt_to_equity <= 0.5
  ) {
    opportunities.push({
      point: "Strong ROCE + low debt = capacity for high-return reinvestment",
      evidence: `ROCE ${latestRoce.toFixed(1)}%, D/E ${stock.debt_to_equity.toFixed(2)}x`,
      strength: "HIGH",
    });
  }

  // FII buying trend (institutional accumulation signal)
  if (stock.fii_holding !== null && stock.fii_holding > 10) {
    // Simple proxy — if FII holding is meaningful, flag as opportunity signal
    opportunities.push({
      point: "Meaningful FII presence — institutional validation",
      evidence: `FII holding ${stock.fii_holding.toFixed(1)}%`,
      strength: "LOW",
    });
  }

  // ═══════════════════════════════════════════════
  // THREATS
  // ═══════════════════════════════════════════════

  // Promoter pledge
  if (stock.promoter_pledge !== null && stock.promoter_pledge > 10) {
    threats.push({
      point: "Promoter pledge above safe threshold",
      evidence: `Promoter pledge ${stock.promoter_pledge.toFixed(1)}% (threshold > 10%)`,
      strength: stock.promoter_pledge > 30 ? "HIGH" : "MEDIUM",
    });
  }

  // Promoter selling — consecutive quarter decline
  const promDeclines = consecutiveDeclineCount(stock.promoter_holding_trend ?? null);
  if (promDeclines >= 3) {
    threats.push({
      point: "Promoter holding declining for multiple consecutive quarters",
      evidence: `${promDeclines} consecutive quarters of promoter stake reduction`,
      strength: promDeclines >= 5 ? "HIGH" : "MEDIUM",
    });
  }

  // Sharp promoter stake reduction total
  if (stock.promoter_holding_trend && stock.promoter_holding_trend.length >= 4) {
    const nums = stock.promoter_holding_trend.filter((v): v is number => v !== null);
    if (nums.length >= 4) {
      const recentDrop = nums[0] - nums[nums.length - 1];
      if (recentDrop > 5) {
        threats.push({
          point: "Promoter has reduced stake significantly over available period",
          evidence: `Promoter holding fell by ${recentDrop.toFixed(1)}pp over ${nums.length} quarters`,
          strength: recentDrop > 10 ? "HIGH" : "MEDIUM",
        });
      }
    }
  }

  // FII selling trend (if both FII low and trend down — proxy)
  if (stock.fii_holding !== null && stock.fii_holding < 3) {
    threats.push({
      point: "Low FII ownership — limited institutional sponsorship",
      evidence: `FII holding ${stock.fii_holding.toFixed(1)}%`,
      strength: "LOW",
    });
  }

  // Valuation excess vs sector PE ceiling
  if (
    stock.pe_ratio !== null &&
    thresholds.peRange &&
    stock.pe_ratio > thresholds.peRange[1] * 1.3
  ) {
    threats.push({
      point: "Valuation significantly above sector PE ceiling",
      evidence: `P/E ${stock.pe_ratio.toFixed(1)}x vs sector ceiling ${thresholds.peRange[1]}x`,
      strength: stock.pe_ratio > thresholds.peRange[1] * 1.6 ? "HIGH" : "MEDIUM",
    });
  }

  // Rising D/E with accelerating borrowings
  if (
    stock.debt_to_equity !== null &&
    stock.debt_to_equity > thresholds.acceptableDE * 1.2
  ) {
    threats.push({
      point: "Leverage meaningfully above sector norms — balance sheet risk",
      evidence: `D/E ${stock.debt_to_equity.toFixed(2)}x vs sector norm ${thresholds.acceptableDE}x`,
      strength: "MEDIUM",
    });
  }

  // Small/Micro cap exit liquidity risk (below ₹500 Cr MCap estimate)
  if (
    stock.market_cap !== null &&
    stock.market_cap < 500 &&
    stock.market_cap_category === "Small Cap"
  ) {
    threats.push({
      point: "Low market cap — exit liquidity may be constrained",
      evidence: `Market cap ₹${stock.market_cap.toFixed(0)} Cr — thin float risk`,
      strength: "MEDIUM",
    });
  }

  // ─── Sort by strength ────────────────────────────────────────────────────
  const strengthOrder: Record<SwotItem["strength"], number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };
  const sortByStrength = (a: SwotItem, b: SwotItem) =>
    strengthOrder[a.strength] - strengthOrder[b.strength];

  strengths.sort(sortByStrength);
  weaknesses.sort(sortByStrength);
  opportunities.sort(sortByStrength);
  threats.sort(sortByStrength);

  // ─── Summary posture ─────────────────────────────────────────────────────
  const s = strengths.length;
  const w = weaknesses.length;
  const o = opportunities.length;
  const t = threats.length;

  const highThreats = threats.filter((x) => x.strength === "HIGH").length;
  const highWeaknesses = weaknesses.filter((x) => x.strength === "HIGH").length;
  const highStrengths = strengths.filter((x) => x.strength === "HIGH").length;

  let posture: string;
  if (highThreats >= 2 || highWeaknesses >= 3) {
    posture = "CAUTION — Multiple high-severity risks detected. Requires careful evaluation.";
  } else if (highStrengths >= 3 && highThreats === 0 && highWeaknesses <= 1) {
    posture = "CONSTRUCTIVE — Strong fundamental signals with manageable risks.";
  } else if (s >= w && t <= 2) {
    posture = "MIXED_POSITIVE — More strengths than weaknesses; some risks present.";
  } else if (w > s || t > o) {
    posture = "MIXED_NEGATIVE — Weaknesses and threats outweigh positives.";
  } else {
    posture = "NEUTRAL — Balanced signals; no clear directional tilt from deterministic checks.";
  }

  return {
    strengths,
    weaknesses,
    opportunities,
    threats,
    summary: { strengths: s, weaknesses: w, opportunities: o, threats: t, posture },
  };
}
