import type { EvaluationReport } from "../../types";

const HEALTH_BADGE: Record<string, string> = {
  STRONG:    "bg-green-100 text-green-700",
  ADEQUATE:  "bg-amber-100 text-amber-700",
  WEAK:      "bg-orange-100 text-orange-700",
  DISTRESSED:"bg-red-100 text-red-700",
};

function AssessmentBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="border border-slate-100 rounded-lg p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</div>
      <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
    </div>
  );
}

interface Props { evaluation: EvaluationReport }

export default function FinancialsSection({ evaluation }: Props) {
  const f = evaluation.financials;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Financial Health</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${HEALTH_BADGE[f.health_verdict] ?? "bg-slate-100 text-slate-500"}`}>
          {f.health_verdict}
        </span>
      </div>

      {/* Key growth metrics */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Revenue CAGR (3Y)", value: f.revenue_cagr_3y !== null ? `${f.revenue_cagr_3y}%` : "—" },
          { label: "Profit CAGR (3Y)",  value: f.profit_cagr_3y  !== null ? `${f.profit_cagr_3y}%`  : "—" },
          { label: "Wtd. Expected Return", value: (f.weighted_expected_return_pct ?? null) !== null ? `${f.weighted_expected_return_pct}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="p-3.5 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
            <div className="text-lg font-bold text-slate-800">{value}</div>
          </div>
        ))}
      </div>

      {/* Assessment blocks */}
      <div className="p-4 space-y-2.5">
        {f.health_rationale && <AssessmentBlock label="Health Rationale" text={f.health_rationale} />}
        {f.ocf_to_pat_assessment && <AssessmentBlock label="OCF / PAT Assessment" text={f.ocf_to_pat_assessment} />}
        {f.fcf_assessment && <AssessmentBlock label="Free Cash Flow" text={f.fcf_assessment} />}
        {f.working_capital_assessment && <AssessmentBlock label="Working Capital" text={f.working_capital_assessment} />}
      </div>
    </div>
  );
}
