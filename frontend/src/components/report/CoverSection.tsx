import type { StockData, EvaluationReport, Verdict } from "../../types";

function verdictStyle(v: Verdict) {
  if (v === "BUY") return { bg: "bg-green-50", border: "border-green-200", label: "text-green-700", emoji: "🟢" };
  if (v === "BUY_WITH_CAUTION") return { bg: "bg-amber-50", border: "border-amber-200", label: "text-amber-700", emoji: "🟡" };
  if (v === "WAIT") return { bg: "bg-amber-50", border: "border-amber-200", label: "text-amber-700", emoji: "🟡" };
  if (v === "NOT_SUITABLE") return { bg: "bg-red-50", border: "border-red-200", label: "text-red-700", emoji: "🔴" };
  return { bg: "bg-red-50", border: "border-red-200", label: "text-red-700", emoji: "🔴" }; // AVOID
}

const CONF_BAR: Record<string, string> = {
  HIGH:     "bg-green-500",
  MODERATE: "bg-amber-400",
  LOW:      "bg-red-500",
};

interface Props { stock: StockData; evaluation: EvaluationReport }

export default function CoverSection({ stock, evaluation }: Props) {
  const vs = verdictStyle(evaluation.verdict);
  const confBarPct = evaluation.confidence === "HIGH" ? 90 : evaluation.confidence === "MODERATE" ? 60 : 30;
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row gap-5 justify-between items-start">
      <div>
        <div className="text-3xl font-black text-blue-600 tracking-tight">{stock.ticker}</div>
        <div className="text-lg font-semibold text-slate-800 mt-0.5">{stock.company_name}</div>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
          <span>{stock.sector}</span>
          <span>·</span>
          <span>{stock.market_cap_category ?? ""} Cap</span>
          {stock.current_price !== null && <><span>·</span><span>₹{stock.current_price}</span></>}
          {stock.pe_ratio !== null && <><span>·</span><span>P/E {stock.pe_ratio}×</span></>}
          <span>·</span>
          <span>Generated {date}</span>
        </div>
      </div>

      <div className={`${vs.bg} border ${vs.border} rounded-xl px-6 py-4 text-center min-w-[180px]`}>
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Verdict</div>
        <div className={`text-xl font-black ${vs.label}`}>
          {vs.emoji} {evaluation.verdict.replace(/_/g, " ")}
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Confidence: {evaluation.confidence}
          <div className="mt-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${CONF_BAR[evaluation.confidence]}`}
              style={{ width: `${confBarPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
