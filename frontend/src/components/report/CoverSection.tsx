import type { StockData, EvaluationReport, Verdict } from "../../types";

// ─── Verdict theming ──────────────────────────────────────────────────────────

interface VerdictTheme {
  stripe:  string;   // top accent stripe color
  bg:      string;   // card background
  border:  string;   // card border
  text:    string;   // verdict text color
  badge:   string;   // verdict large badge bg
  label:   string;   // verdict human label
}

function verdictTheme(v: Verdict): VerdictTheme {
  switch (v) {
    case "BUY":
      return { stripe: "bg-green-500",   bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100",  label: "BUY" };
    case "BUY_WITH_CAUTION":
      return { stripe: "bg-amber-400",   bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100",  label: "BUY WITH CAUTION" };
    case "WAIT":
      return { stripe: "bg-amber-400",   bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100",  label: "WAIT" };
    case "NOT_SUITABLE":
      return { stripe: "bg-orange-500",  bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100", label: "NOT SUITABLE" };
    case "AVOID":
    default:
      return { stripe: "bg-red-500",     bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100",    label: "AVOID" };
  }
}

const CONF_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  HIGH:     { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50 ring-1 ring-green-200"  },
  MODERATE: { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 ring-1 ring-amber-200" },
  LOW:      { dot: "bg-red-500",   text: "text-red-700",   bg: "bg-red-50   ring-1 ring-red-200"   },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, prefix = "", suffix = "") {
  if (v === null || v === undefined) return null;
  return `${prefix}${v.toLocaleString("en-IN")}${suffix}`;
}

// Inline metric chip
function MetricChip({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-700 mt-0.5">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { stock: StockData; evaluation: EvaluationReport }

export default function CoverSection({ stock, evaluation }: Props) {
  const t     = verdictTheme(evaluation.verdict);
  const conf  = CONF_COLORS[evaluation.confidence] ?? CONF_COLORS.LOW;
  const date  = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-card overflow-hidden">

      {/* ── Verdict accent stripe at top ──────────────────────────── */}
      <div className={`h-1 ${t.stripe}`} />

      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-start sm:justify-between">

          {/* ── Left: company info ──────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Sector + market-cap tags */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                {stock.sector}
              </span>
              {stock.market_cap_category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                  {stock.market_cap_category} Cap
                </span>
              )}
            </div>

            {/* Ticker + company name */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
                {stock.ticker}
              </h1>
              {stock.current_price !== null && (
                <span className="text-xl font-semibold text-slate-500">
                  ₹{stock.current_price.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <p className="text-lg font-medium text-slate-500 mt-1.5 truncate">
              {stock.company_name}
            </p>

            {/* Key metrics row */}
            <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-slate-100">
              <MetricChip label="P/E" value={fmt(stock.pe_ratio, "", "×")} />
              <MetricChip label="P/B" value={fmt(stock.pb_ratio, "", "×")} />
              <MetricChip label="ROE" value={fmt(stock.roe, "", "%")} />
              <MetricChip label="Mkt Cap" value={stock.market_cap ? `₹${(stock.market_cap / 100).toFixed(0)}k Cr` : null} />
              {stock.high_52w !== null && stock.low_52w !== null && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">52W Range</span>
                  <span className="text-sm font-semibold text-slate-700 mt-0.5">
                    ₹{stock.low_52w.toLocaleString("en-IN")} – ₹{stock.high_52w.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: verdict card ─────────────────────────────────── */}
          <div className={`${t.bg} border ${t.border} rounded-2xl p-5 text-center min-w-[190px] shrink-0`}>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
              AI Verdict
            </div>
            <div className={`text-2xl font-black ${t.text} leading-tight`}>
              {t.label}
            </div>

            {/* Confidence */}
            <div className="mt-4 pt-4 border-t border-black/5">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${conf.bg} ${conf.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                {evaluation.confidence} CONFIDENCE
              </div>
            </div>

            {/* Quality score */}
            {evaluation.quality_score && (
              <div className="mt-3 text-xs text-slate-400">
                Quality {evaluation.quality_score.percentage.toFixed(0)}% ·{" "}
                <span className={
                  evaluation.quality_score.label === "GOOD" ? "text-green-600 font-semibold"
                  : evaluation.quality_score.label === "MODERATE" ? "text-amber-600 font-semibold"
                  : "text-red-600 font-semibold"
                }>
                  {evaluation.quality_score.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer row ──────────────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-slate-400">Generated {date}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-300">Powered by</span>
            <span className="text-[10px] font-semibold text-slate-400">QuantSieve AI</span>
            <span className="text-slate-200">·</span>
            <span className="text-[10px] text-slate-400">Claude {evaluation.overview.data_quality}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
