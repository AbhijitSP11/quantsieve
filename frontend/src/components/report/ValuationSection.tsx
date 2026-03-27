import type { EvaluationReport, StockData } from "../../types";

const ZONE_STYLES: Record<string, string> = {
  UNDERVALUED: "bg-green-100 text-green-700",
  FAIR:        "bg-blue-100 text-blue-700",
  OVERVALUED:  "bg-amber-100 text-amber-700",
  EXPENSIVE:   "bg-red-100 text-red-700",
};

function fmt(v: number | null | undefined, suffix = "") {
  return v != null ? `${v}${suffix}` : "—";
}

interface Props { evaluation: EvaluationReport; stock: StockData }

export default function ValuationSection({ evaluation, stock }: Props) {
  const val = evaluation.valuation;
  const justifiedPe  = val?.justified_pe   ?? null;
  const ivCons       = val?.iv_conservative ?? null;
  const ivOpt        = val?.iv_optimistic   ?? null;
  const rrRatio      = val?.risk_reward_ratio ?? null;
  const mosPct       = val?.margin_of_safety_pct ?? null;

  const mosClass = mosPct !== null ? (mosPct >= 0 ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100") : "";
  const rrClass  = rrRatio !== null
    ? rrRatio >= 3 ? "bg-green-100 text-green-700"
    : rrRatio >= 2 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700"
    : "bg-slate-100 text-slate-500";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Valuation</span>
        {val?.zone && (
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${ZONE_STYLES[val.zone] ?? "bg-slate-100 text-slate-500"}`}>
            {val.zone}
          </span>
        )}
      </div>

      {/* Key valuation metrics grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Justified P/E",   value: fmt(justifiedPe, "×") },
          { label: "Actual P/E",      value: stock.pe_ratio != null ? `${stock.pe_ratio}×` : "—" },
          { label: "IV (Conservative)", value: ivCons !== null ? `₹${ivCons}` : "—" },
          { label: "IV (Optimistic)",   value: ivOpt  !== null ? `₹${ivOpt}`  : "—" },
          {
            label: "Risk / Reward",
            value: rrRatio !== null
              ? <span className={`text-sm font-bold px-2 py-0.5 rounded ${rrClass}`}>{rrRatio}:1</span>
              : "—",
          },
          {
            label: "Margin of Safety",
            value: mosPct !== null
              ? <span className={`text-sm font-bold px-2 py-0.5 rounded ${mosClass}`}>{mosPct > 0 ? "+" : ""}{mosPct}%</span>
              : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 text-center">
            <div className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</div>
            <div className="text-sm font-bold text-slate-700">{value}</div>
          </div>
        ))}
      </div>

      {/* IV price range band */}
      {ivCons !== null && ivOpt !== null && (
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Intrinsic Value Range</span>
          <span className="text-sm font-bold text-slate-700">₹{ivCons} – ₹{ivOpt}</span>
          <span className="text-[10px] text-slate-400">conservative · optimistic</span>
        </div>
      )}

      {/* Valuation narrative */}
      {val?.valuation_narrative && (
        <div className="px-5 py-3.5 border-b border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Valuation Narrative</div>
          <p className="text-xs text-slate-600 leading-relaxed">{val.valuation_narrative}</p>
        </div>
      )}

      {/* Trendlyne integration note */}
      {val?.trendlyne_integration && (
        <div className="px-5 py-3 text-xs text-slate-500">
          📊 Trendlyne: {val.trendlyne_integration}
        </div>
      )}
    </div>
  );
}
