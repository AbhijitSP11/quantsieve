import type { StockData } from "../types/stock.js";
import { SECTOR_THRESHOLDS } from "../utils/sectorThresholds.js";
import type { SectorThreshold } from "../utils/sectorThresholds.js";

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

function pct(v: number): string {
  return `${v.toFixed(1)}%`;
}

function getSectorThreshold(sector: string): SectorThreshold {
  if (sector in SECTOR_THRESHOLDS) return SECTOR_THRESHOLDS[sector]!;
  const sectorLower = sector.toLowerCase();
  for (const [key, value] of Object.entries(SECTOR_THRESHOLDS)) {
    const keyParts = key.toLowerCase().split(/[\s/]+/);
    if (keyParts.some((part) => part.length > 3 && sectorLower.includes(part))) {
      return value;
    }
  }
  return SECTOR_THRESHOLDS["General"]!;
}

function calcSimpleCagr(arr: number[]): number | null {
  if (arr.length < 2) return null;
  const first = arr[0];
  const last = arr[arr.length - 1];
  if (first === undefined || last === undefined || first <= 0) return null;
  const years = arr.length - 1;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

function isConsecutivelyGrowing(arr: number[], minYears = 3): boolean {
  if (arr.length < minYears + 1) return false;
  const recent = arr.slice(-(minYears + 1));
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    if (prev === undefined || curr === undefined || curr <= prev) return false;
  }
  return true;
}

export function generateSwot(data: StockData): SwotResult {
  const strengths: SwotItem[] = [];
  const weaknesses: SwotItem[] = [];
  const opportunities: SwotItem[] = [];
  const threats: SwotItem[] = [];

  const sector = getSectorThreshold(data.sector);

  // Derived values — compute once
  const latestRoce =
    data.roce.length > 0 ? (data.roce[data.roce.length - 1] ?? null) : null;
  const prevRoce =
    data.roce.length > 1 ? (data.roce[data.roce.length - 2] ?? null) : null;
  const latestOpm =
    data.opm.length > 0 ? (data.opm[data.opm.length - 1] ?? null) : null;
  const prevOpm =
    data.opm.length > 1 ? (data.opm[data.opm.length - 2] ?? null) : null;
  const latestCf =
    data.cash_flow.length > 0
      ? (data.cash_flow[data.cash_flow.length - 1] ?? null)
      : null;
  const latestNetProfit =
    data.net_profit.length > 0
      ? (data.net_profit[data.net_profit.length - 1] ?? null)
      : null;
  const prevNetProfit =
    data.net_profit.length > 1
      ? (data.net_profit[data.net_profit.length - 2] ?? null)
      : null;
  const latestRevenue =
    data.revenue.length > 0
      ? (data.revenue[data.revenue.length - 1] ?? null)
      : null;
  const prevRevenue =
    data.revenue.length > 1
      ? (data.revenue[data.revenue.length - 2] ?? null)
      : null;

  const promoterTrend = data.promoter_holding_trend;
  const latestPromoterPct =
    promoterTrend.length > 0
      ? (promoterTrend[promoterTrend.length - 1]?.pct ?? null)
      : null;
  const prevPromoterPct =
    promoterTrend.length > 1
      ? (promoterTrend[promoterTrend.length - 2]?.pct ?? null)
      : null;

  // ──────────────────────── STRENGTHS ────────────────────────────

  // 1. Revenue growing 3+ consecutive years
  if (isConsecutivelyGrowing(data.revenue, 3)) {
    const cagr = calcSimpleCagr(data.revenue);
    strengths.push({
      label: "Consistent Revenue Growth",
      detail:
        cagr !== null
          ? `Revenue grew consistently for 3+ years (CAGR ~${cagr.toFixed(1)}%)`
          : "Revenue grew consistently for 3+ years",
    });
  }

  // 2. Net profit growing 3+ consecutive years
  if (isConsecutivelyGrowing(data.net_profit, 3)) {
    const cagr = calcSimpleCagr(data.net_profit);
    strengths.push({
      label: "Consistent Profit Growth",
      detail:
        cagr !== null
          ? `Net profit grew consistently for 3+ years (CAGR ~${cagr.toFixed(1)}%)`
          : "Net profit grew consistently for 3+ years",
    });
  }

  // 3. Strong 5Y Profit CAGR
  if (
    data.compounded_profit_growth["5y"] !== null &&
    data.compounded_profit_growth["5y"] > 15
  ) {
    strengths.push({
      label: "Strong 5Y Profit CAGR",
      detail: `5Y profit CAGR: ${pct(data.compounded_profit_growth["5y"])}`,
    });
  }

  // 4. Strong 5Y Sales CAGR
  if (
    data.compounded_sales_growth["5y"] !== null &&
    data.compounded_sales_growth["5y"] > 12
  ) {
    strengths.push({
      label: "Strong 5Y Sales CAGR",
      detail: `5Y sales CAGR: ${pct(data.compounded_sales_growth["5y"])}`,
    });
  }

  // 5. Healthy ROE
  if (data.roe !== null && data.roe > 15) {
    strengths.push({
      label: "Healthy Return on Equity",
      detail: `ROE: ${pct(data.roe)}`,
    });
  }

  // 6. Strong ROCE
  if (latestRoce !== null && latestRoce > 18) {
    strengths.push({
      label: "Strong Capital Efficiency (ROCE)",
      detail: `ROCE: ${pct(latestRoce)}`,
    });
  }

  // 7 & 8. Debt levels (rule 8 supersedes rule 7)
  if (data.debt_to_equity !== null) {
    if (data.debt_to_equity < 0.1) {
      strengths.push({
        label: "Virtually Debt Free",
        detail: `Debt/Equity: ${data.debt_to_equity.toFixed(2)}`,
      });
    } else if (data.debt_to_equity < 0.5) {
      strengths.push({
        label: "Low Debt",
        detail: `Debt/Equity: ${data.debt_to_equity.toFixed(2)}`,
      });
    }
  }

  // 9. Strong interest coverage
  if (data.interest_coverage !== null && data.interest_coverage > 5) {
    strengths.push({
      label: "Strong Interest Coverage",
      detail: `Interest coverage: ${data.interest_coverage.toFixed(1)}x`,
    });
  }

  // 10. Zero promoter pledge
  if (data.promoter_pledge === 0 || data.promoter_pledge === null) {
    strengths.push({
      label: "Zero Promoter Pledge",
      detail: "No promoter shares pledged",
    });
  }

  // 11. High promoter holding
  if (data.promoter_holding !== null && data.promoter_holding > 50) {
    strengths.push({
      label: "High Promoter Holding",
      detail: `Promoter holding: ${pct(data.promoter_holding)}`,
    });
  }

  // 12. Stable/Increasing promoter holding (last 2 quarters)
  if (
    latestPromoterPct !== null &&
    prevPromoterPct !== null &&
    latestPromoterPct >= prevPromoterPct
  ) {
    strengths.push({
      label: "Stable/Increasing Promoter Holding",
      detail: `${pct(prevPromoterPct)} → ${pct(latestPromoterPct)}`,
    });
  }

  // 13. Consistent positive operating CF (all 3 years)
  if (data.cash_flow.length >= 3) {
    const last3 = data.cash_flow.slice(-3);
    if (last3.every((cf) => cf.operating > 0)) {
      strengths.push({
        label: "Consistent Positive Operating Cash Flow",
        detail: "All 3 years had positive operating cash flow",
      });
    }
  }

  // 14. PE below 5Y median — skipped (no historical PE data in StockData)

  // 15. Low PE
  if (
    data.pe_ratio !== null &&
    data.pe_ratio > 0 &&
    data.pe_ratio < 15
  ) {
    strengths.push({
      label: "Low PE Ratio",
      detail: `P/E: ${data.pe_ratio.toFixed(1)}x`,
    });
  }

  // 16. Good dividend yield
  if (data.dividend_yield !== null && data.dividend_yield > 1.5) {
    strengths.push({
      label: "Good Dividend Yield",
      detail: `Dividend yield: ${pct(data.dividend_yield)}`,
    });
  }

  // 17. Healthy OPM
  if (latestOpm !== null && latestOpm > 20) {
    strengths.push({
      label: "Healthy Operating Margins",
      detail: `OPM: ${pct(latestOpm)}`,
    });
  }

  // 18. Strong cash conversion (operating CF > 70% of net profit, latest year)
  if (
    latestCf !== null &&
    latestNetProfit !== null &&
    latestNetProfit > 0 &&
    latestCf.operating > latestNetProfit * 0.7
  ) {
    strengths.push({
      label: "Strong Cash Conversion",
      detail: `Operating CF (${latestCf.operating.toFixed(0)} Cr) > 70% of net profit (${latestNetProfit.toFixed(0)} Cr)`,
    });
  }

  // 19. Strong FII interest
  if (data.fii_holding !== null && data.fii_holding > 15) {
    strengths.push({
      label: "Strong FII Interest",
      detail: `FII holding: ${pct(data.fii_holding)}`,
    });
  }

  // 20. Positive 1Y price momentum (> 15%)
  if (
    data.stock_price_cagr["1y"] !== null &&
    data.stock_price_cagr["1y"] > 0 &&
    data.stock_price_cagr["1y"] > 15
  ) {
    strengths.push({
      label: "Positive 1Y Price Momentum",
      detail: `1Y price return: ${pct(data.stock_price_cagr["1y"])}`,
    });
  }

  // ──────────────────────── WEAKNESSES ────────────────────────────

  // 1. Revenue declined most recent year
  if (
    latestRevenue !== null &&
    prevRevenue !== null &&
    latestRevenue < prevRevenue
  ) {
    const change = ((latestRevenue - prevRevenue) / Math.abs(prevRevenue)) * 100;
    weaknesses.push({
      label: "Recent Revenue Decline",
      detail: `Revenue declined ${Math.abs(change).toFixed(1)}% in latest year`,
    });
  }

  // 2. Net profit declined most recent year
  if (
    latestNetProfit !== null &&
    prevNetProfit !== null &&
    latestNetProfit < prevNetProfit
  ) {
    const change =
      ((latestNetProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100;
    weaknesses.push({
      label: "Recent Profit Decline",
      detail: `Net profit declined ${Math.abs(change).toFixed(1)}% in latest year`,
    });
  }

  // 3. Declining OPM
  if (latestOpm !== null && prevOpm !== null && latestOpm < prevOpm) {
    weaknesses.push({
      label: "Declining Operating Margins",
      detail: `OPM: ${pct(prevOpm)} → ${pct(latestOpm)}`,
    });
  }

  // 4. Declining ROCE
  if (latestRoce !== null && prevRoce !== null && latestRoce < prevRoce) {
    weaknesses.push({
      label: "Declining ROCE",
      detail: `ROCE: ${pct(prevRoce)} → ${pct(latestRoce)}`,
    });
  }

  // 5. Elevated debt
  if (data.debt_to_equity !== null && data.debt_to_equity > 1.0) {
    weaknesses.push({
      label: "Elevated Debt Levels",
      detail: `Debt/Equity: ${data.debt_to_equity.toFixed(2)}`,
    });
  }

  // 6. Weak interest coverage
  if (data.interest_coverage !== null && data.interest_coverage < 3) {
    weaknesses.push({
      label: "Weak Interest Coverage",
      detail: `Interest coverage: ${data.interest_coverage.toFixed(1)}x`,
    });
  }

  // 7. Promoter reducing stake by > 1%
  if (
    latestPromoterPct !== null &&
    prevPromoterPct !== null &&
    prevPromoterPct - latestPromoterPct > 1
  ) {
    weaknesses.push({
      label: "Promoter Reducing Stake",
      detail: `Promoter holding: ${pct(prevPromoterPct)} → ${pct(latestPromoterPct)} (−${(prevPromoterPct - latestPromoterPct).toFixed(1)}%)`,
    });
  }

  // 8. Negative operating CF latest year
  if (latestCf !== null && latestCf.operating < 0) {
    weaknesses.push({
      label: "Negative Operating Cash Flow",
      detail: `Latest year operating CF: ₹${latestCf.operating.toFixed(0)} Cr`,
    });
  }

  // 9. Weak ROE
  if (data.roe !== null && data.roe < 10) {
    weaknesses.push({
      label: "Weak Return on Equity",
      detail: `ROE: ${pct(data.roe)}`,
    });
  }

  // 10. No dividend despite profitability
  if (
    (data.dividend_yield === null || data.dividend_yield === 0) &&
    latestNetProfit !== null &&
    latestNetProfit > 0
  ) {
    weaknesses.push({
      label: "No Dividend Despite Profitability",
      detail: "Company is profitable but pays no dividend",
    });
  }

  // 11. Long CCC — skipped (no CCC data directly in StockData)

  // 12. Earnings quality concern (net profit > 1.5x operating CF for 2+ years)
  if (data.cash_flow.length >= 2 && data.net_profit.length >= 2) {
    const yearsToCheck = Math.min(data.cash_flow.length, 3);
    const cfSlice = data.cash_flow.slice(-yearsToCheck);
    let concernCount = 0;
    for (let i = 0; i < cfSlice.length; i++) {
      const cf = cfSlice[i];
      const npIdx = data.net_profit.length - yearsToCheck + i;
      const np = npIdx >= 0 ? (data.net_profit[npIdx] ?? null) : null;
      if (cf !== undefined && np !== null && np > 0 && cf.operating > 0 && np > cf.operating * 1.5) {
        concernCount++;
      }
    }
    if (concernCount >= 2) {
      weaknesses.push({
        label: "Earnings Quality Concern",
        detail: "Net profit consistently higher than operating cash flow (2+ years)",
      });
    }
  }

  // ──────────────────────── OPPORTUNITIES ────────────────────────────

  // 1. FII increasing — skipped (no FII quarter-over-quarter trend in StockData)
  // 2. DII increasing — skipped (no DII quarter-over-quarter trend in StockData)

  // 3. Undervalued vs sector
  if (
    data.pe_ratio !== null &&
    data.pe_ratio > 0 &&
    sector.pe_range[0] > 0 &&
    data.pe_ratio < sector.pe_range[0]
  ) {
    opportunities.push({
      label: "Undervalued vs Sector",
      detail: `P/E ${data.pe_ratio.toFixed(1)}x vs sector range ${sector.pe_range[0]}–${sector.pe_range[1]}x`,
    });
  }

  // 4. Potential value buy after correction (1Y negative + strong fundamentals)
  const strongFundamentals =
    data.roe !== null &&
    data.roe > 15 &&
    latestRoce !== null &&
    latestRoce > 15;
  if (
    data.stock_price_cagr["1y"] !== null &&
    data.stock_price_cagr["1y"] < 0 &&
    strongFundamentals
  ) {
    opportunities.push({
      label: "Potential Value Buy After Correction",
      detail: `Stock down ${Math.abs(data.stock_price_cagr["1y"]).toFixed(1)}% in 1Y but fundamentals remain strong`,
    });
  }

  // 5. Accelerating profit growth
  if (
    data.compounded_profit_growth["3y"] !== null &&
    data.compounded_profit_growth["5y"] !== null &&
    data.compounded_profit_growth["3y"] > data.compounded_profit_growth["5y"]
  ) {
    opportunities.push({
      label: "Accelerating Profit Growth",
      detail: `3Y CAGR (${pct(data.compounded_profit_growth["3y"])}) > 5Y CAGR (${pct(data.compounded_profit_growth["5y"])})`,
    });
  }

  // 6. Accelerating revenue growth
  if (
    data.compounded_sales_growth["3y"] !== null &&
    data.compounded_sales_growth["5y"] !== null &&
    data.compounded_sales_growth["3y"] > data.compounded_sales_growth["5y"]
  ) {
    opportunities.push({
      label: "Accelerating Revenue Growth",
      detail: `3Y CAGR (${pct(data.compounded_sales_growth["3y"])}) > 5Y CAGR (${pct(data.compounded_sales_growth["5y"])})`,
    });
  }

  // 7. Near 52-week low (lower 30% of range)
  if (
    data.current_price !== null &&
    data.high_52w !== null &&
    data.low_52w !== null
  ) {
    const range = data.high_52w - data.low_52w;
    if (range > 0) {
      const position = (data.current_price - data.low_52w) / range;
      if (position <= 0.3) {
        opportunities.push({
          label: "Near 52-Week Low — Potential Entry",
          detail: `Price ₹${data.current_price} is in lower ${(position * 100).toFixed(0)}% of 52W range (₹${data.low_52w}–₹${data.high_52w})`,
        });
      }
    }
  }

  // 8. Promoter buying (increasing over last 2 quarters)
  if (
    latestPromoterPct !== null &&
    prevPromoterPct !== null &&
    latestPromoterPct > prevPromoterPct
  ) {
    opportunities.push({
      label: "Promoter Buying — Insider Confidence Signal",
      detail: `Promoter holding increased: ${pct(prevPromoterPct)} → ${pct(latestPromoterPct)}`,
    });
  }

  // ──────────────────────── THREATS ────────────────────────────

  // 1. DII reducing — skipped (no DII trend in StockData)
  // 2. FII reducing — skipped (no FII trend in StockData)

  // 3 & 4. Promoter pledge (rule 4 supersedes rule 3)
  if (data.promoter_pledge !== null && data.promoter_pledge > 0) {
    if (data.promoter_pledge > 20) {
      threats.push({
        label: "High Promoter Pledge Risk",
        detail: `Promoter pledge: ${pct(data.promoter_pledge)}`,
      });
    } else if (data.promoter_pledge > 10) {
      threats.push({
        label: "Significant Promoter Pledge",
        detail: `Promoter pledge: ${pct(data.promoter_pledge)}`,
      });
    }
  }

  // 5. Near 52-week high (upper 10% of range)
  if (
    data.current_price !== null &&
    data.high_52w !== null &&
    data.low_52w !== null
  ) {
    const range = data.high_52w - data.low_52w;
    if (range > 0) {
      const position = (data.current_price - data.low_52w) / range;
      if (position >= 0.9) {
        threats.push({
          label: "Near 52-Week High — Timing Risk",
          detail: `Price ₹${data.current_price} is in top ${((1 - position) * 100).toFixed(0)}% of 52W range (₹${data.low_52w}–₹${data.high_52w})`,
        });
      }
    }
  }

  // 6. Rising debt trend — skipped (no D/E trend in StockData)

  // 7. Significant price decline in last year (< -20%)
  if (
    data.stock_price_cagr["1y"] !== null &&
    data.stock_price_cagr["1y"] < -20
  ) {
    threats.push({
      label: "Significant Price Decline in Last Year",
      detail: `1Y price return: ${pct(data.stock_price_cagr["1y"])}`,
    });
  }

  // 8. Profit degrowth over 3 years
  if (
    data.compounded_profit_growth["3y"] !== null &&
    data.compounded_profit_growth["3y"] < 0
  ) {
    threats.push({
      label: "Profit Degrowth Over 3 Years",
      detail: `3Y profit CAGR: ${pct(data.compounded_profit_growth["3y"])}`,
    });
  }

  // 9. Expensive vs sector norms (PE > 1.5x upper bound)
  if (
    data.pe_ratio !== null &&
    data.pe_ratio > 0 &&
    data.pe_ratio > 1.5 * sector.pe_range[1]
  ) {
    threats.push({
      label: "Expensive vs Sector Norms",
      detail: `P/E ${data.pe_ratio.toFixed(1)}x vs sector upper bound ${sector.pe_range[1]}x (1.5x = ${(1.5 * sector.pe_range[1]).toFixed(0)}x)`,
    });
  }

  return {
    strengths,
    weaknesses,
    opportunities,
    threats,
    summary: {
      s: strengths.length,
      w: weaknesses.length,
      o: opportunities.length,
      t: threats.length,
    },
  };
}
