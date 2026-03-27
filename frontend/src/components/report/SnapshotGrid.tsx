import type { StockData, EvaluationReport } from "../../types";

function fmt(v: number | null | undefined, prefix = "", suffix = "") {
  if (v === null || v === undefined) return "—";
  return `${prefix}${v.toLocaleString("en-IN")}${suffix}`;
}

function fmtCr(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `₹${v.toLocaleString("en-IN")} Cr`;
}

// Color bands for financial metrics
function roeColor(v: number | null | undefined) {
  if (!v) return "text-slate-700";
  if (v >= 20) return "text-green-600";
  if (v >= 12) return "text-amber-600";
  return "text-red-600";
}
function peColor(v: number | null | undefined) {
  if (!v) return "text-slate-700";
  if (v <= 20) return "text-green-600";
  if (v <= 40) return "text-amber-600";
  return "text-red-600";
}

const HEALTH_STYLE: Record<string, { text: string; bg: string; dot: string }> = {
  STRONG:    { text: "text-green-700",  bg: "bg-green-50  ring-1 ring-green-200",  dot: "bg-green-500"  },
  ADEQUATE:  { text: "text-amber-700",  bg: "bg-amber-50  ring-1 ring-amber-200",  dot: "bg-amber-400"  },
  WEAK:      { text: "text-orange-700", bg: "bg-orange-50 ring-1 ring-orange-200", dot: "bg-orange-500" },
  DISTRESSED:{ text: "text-red-700",    bg: "bg-red-50    ring-1 ring-red-200",    dot: "bg-red-500"    },
};
const QUAL_STYLE: Record<string, { text: string; bar: string }> = {
  GOOD:     { text: "text-green-600",  bar: "bg-green-500"  },
  MODERATE: { text: "text-amber-600",  bar: "bg-amber-400"  },
  BAD:      { text: "text-red-600",    bar: "bg-red-500"    },
};

interface CardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;      // optional left border color class e.g. "border-l-green-400"
}

function MetricCard({ label, value, sub, accent }: CardProps) {
  return (
    <div className={`bg-white border border-slate-100 rounded-xl p-4 shadow-card flex flex-col gap-1 ${accent ? `border-l-4 ${accent}` : ""}`}>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold text-slate-800 leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 leading-snug">{sub}</div>}
    </div>
  );
}

interface Props { stock: StockData; evaluation: EvaluationReport }

export default function SnapshotGrid({ stock, evaluation }: Props) {
  const latestRoce = stock.roce.length ? stock.roce[stock.roce.length - 1] : null;
  const { earned, total, percentage, label: qLabel } = evaluation.quality_score;
  const healthStyle = HEALTH_STYLE[evaluation.financials.health_verdict] ?? HEALTH_STYLE.ADEQUATE;
  const qualStyle   = QUAL_STYLE[qLabel] ?? QUAL_STYLE.MODERATE;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

      <MetricCard
        label="Market Cap"
        value={fmtCr(stock.market_cap)}
        sub={`${stock.market_cap_category ?? "—"} Cap`}
      />

      <MetricCard
        label="Current Price"
        value={fmt(stock.current_price, "₹")}
        sub={
          stock.high_52w !== null && stock.low_52w !== null
            ? `52W ₹${stock.low_52w.toLocaleString("en-IN")} – ₹${stock.high_52w.toLocaleString("en-IN")}`
            : undefined
        }
      />

      <MetricCard
        label="P/E Ratio"
        value={
          <span className={peColor(stock.pe_ratio)}>{fmt(stock.pe_ratio, "", "×")}</span>
        }
        sub={`P/B ${fmt(stock.pb_ratio, "", "×")}`}
        accent={stock.pe_ratio && stock.pe_ratio <= 20 ? "border-l-green-400" : stock.pe_ratio && stock.pe_ratio <= 40 ? "border-l-amber-400" : "border-l-red-400"}
      />

      <MetricCard
        label="ROE"
        value={
          <span className={roeColor(stock.roe)}>{fmt(stock.roe, "", "%")}</span>
        }
        sub={`ROCE ${fmt(latestRoce, "", "%")}`}
        accent={stock.roe && stock.roe >= 20 ? "border-l-green-400" : stock.roe && stock.roe >= 12 ? "border-l-amber-400" : "border-l-red-400"}
      />

      <MetricCard
        label="Interest Cover"
        value={fmt(stock.interest_coverage, "", "×")}
        sub={`Reserves ${fmtCr(stock.reserves)}`}
        accent={stock.interest_coverage && stock.interest_coverage >= 5 ? "border-l-green-400" : undefined}
      />

      <MetricCard
        label="Div Yield"
        value={fmt(stock.dividend_yield, "", "%")}
        sub={`Face Val ₹${fmt(stock.face_value)}`}
      />

      <MetricCard
        label="Promoter Holding"
        value={fmt(stock.promoter_holding, "", "%")}
        sub={`FII ${fmt(stock.fii_holding, "", "%")}  ·  DII ${fmt(stock.dii_holding, "", "%")}`}
        accent={stock.promoter_holding && stock.promoter_holding >= 50 ? "border-l-green-400" : stock.promoter_holding && stock.promoter_holding >= 35 ? "border-l-amber-400" : "border-l-red-400"}
      />

      <MetricCard
        label="Financial Health"
        value={
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${healthStyle.dot}`} />
            <span className={`text-sm font-bold ${healthStyle.text}`}>
              {evaluation.financials.health_verdict}
            </span>
          </div>
        }
        sub={
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`font-medium ${qualStyle.text}`}>
                Quality {percentage.toFixed(0)}% — {qLabel}
              </span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${qualStyle.bar}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
