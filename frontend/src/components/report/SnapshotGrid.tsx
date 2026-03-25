import type { StockData, EvaluationReport } from "../../types";

function fmt(v: number | null | undefined, prefix = "", suffix = "") {
  if (v === null || v === undefined) return "—";
  return `${prefix}${v}${suffix}`;
}

function fmtCr(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `₹${v.toLocaleString("en-IN")} Cr`;
}

const HEALTH_CLS = {
  STRONG:    "text-green-700 bg-green-100",
  ADEQUATE:  "text-amber-700 bg-amber-100",
  WEAK:      "text-orange-700 bg-orange-100",
  DISTRESSED:"text-red-700 bg-red-100",
};

const QUAL_CLS = {
  GOOD:     "text-green-700",
  MODERATE: "text-amber-700",
  BAD:      "text-red-700",
};

interface CardProps { label: string; value: React.ReactNode; sub?: React.ReactNode }
function Card({ label, value, sub }: CardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

interface Props { stock: StockData; evaluation: EvaluationReport }

export default function SnapshotGrid({ stock, evaluation }: Props) {
  const latestRoce = stock.roce.length ? stock.roce[stock.roce.length - 1] : null;
  const { earned, total, percentage, label: qLabel } = evaluation.quality_score;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card label="Market Cap"   value={fmtCr(stock.market_cap)} sub={`${stock.market_cap_category ?? ""} Cap`} />
      <Card label="Current Price" value={fmt(stock.current_price, "₹")} sub={`52W: ₹${fmt(stock.high_52w)} / ₹${fmt(stock.low_52w)}`} />
      <Card label="P/E Ratio"    value={fmt(stock.pe_ratio, "", "×")} sub={`P/B ${fmt(stock.pb_ratio, "", "×")}`} />
      <Card label="ROE"          value={fmt(stock.roe, "", "%")} sub={`ROCE ${fmt(latestRoce, "", "%")}`} />
      <Card label="Interest Cover" value={fmt(stock.interest_coverage, "", "×")} sub={`Reserves ${fmtCr(stock.reserves)}`} />
      <Card label="Div Yield"    value={fmt(stock.dividend_yield, "", "%")} sub={`Face Val ₹${fmt(stock.face_value)}`} />
      <Card label="Promoter Hold" value={fmt(stock.promoter_holding, "", "%")} sub={`FII ${fmt(stock.fii_holding, "", "%")} · DII ${fmt(stock.dii_holding, "", "%")}`} />
      <Card
        label="Financial Health"
        value={
          <span className={`text-sm font-bold px-2 py-0.5 rounded ${HEALTH_CLS[evaluation.financials.health_verdict]}`}>
            {evaluation.financials.health_verdict}
          </span>
        }
        sub={
          <span className={QUAL_CLS[qLabel]}>
            Quality: {earned}/{total} ({percentage.toFixed(0)}%) {qLabel}
          </span>
        }
      />
    </div>
  );
}
