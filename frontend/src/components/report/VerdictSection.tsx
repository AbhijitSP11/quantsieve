import type { EvaluationReport, Verdict } from "../../types";

function verdictStyle(v: Verdict) {
  if (v === "BUY") return { bg: "bg-green-50 border-green-200", label: "text-green-700", emoji: "🟢" };
  if (v === "BUY_WITH_CAUTION") return { bg: "bg-amber-50 border-amber-200", label: "text-amber-700", emoji: "🟡" };
  if (v === "WAIT") return { bg: "bg-amber-50 border-amber-200", label: "text-amber-700", emoji: "🟡" };
  if (v === "NOT_SUITABLE") return { bg: "bg-red-50 border-red-200", label: "text-red-700", emoji: "🔴" };
  return { bg: "bg-red-50 border-red-200", label: "text-red-700", emoji: "🔴" }; // AVOID
}

const CONF_BADGE: Record<string, string> = {
  HIGH:     "bg-green-100 text-green-700",
  MODERATE: "bg-amber-100 text-amber-700",
  LOW:      "bg-red-100 text-red-700",
};

interface Props { evaluation: EvaluationReport }

export default function VerdictSection({ evaluation }: Props) {
  const s = verdictStyle(evaluation.verdict);

  return (
    <div className={`border rounded-xl p-6 ${s.bg}`}>
      <div className={`text-2xl font-black mb-3 ${s.label}`}>
        {s.emoji} {evaluation.verdict.replace(/_/g, " ")}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-5">{evaluation.verdict_summary}</p>

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">✅ What works</h4>
          <ul className="space-y-1.5">
            {evaluation.overview.what_works.map((p, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-slate-300 mt-0.5">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">⚠️ What worries me</h4>
          <ul className="space-y-1.5">
            {evaluation.overview.what_worries_me.map((p, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-slate-300 mt-0.5">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Thesis Breakers */}
      {evaluation.thesis_breakers && evaluation.thesis_breakers.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-red-700 mb-2">🚨 Thesis Breakers</h4>
          <ul className="space-y-1.5">
            {evaluation.thesis_breakers.map((t, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <span className="mt-0.5">•</span>{t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conviction signals */}
      {(evaluation.conviction_improvers || evaluation.conviction_reducers) && (
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">📈 Conviction Improvers</h4>
            <ul className="space-y-1">
              {(evaluation.conviction_improvers ?? []).map((c, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">↑</span>{c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">📉 Conviction Reducers</h4>
            <ul className="space-y-1">
              {(evaluation.conviction_reducers ?? []).map((c, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">↓</span>{c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Confidence */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CONF_BADGE[evaluation.confidence] ?? ""}`}>
          {evaluation.confidence} CONFIDENCE
        </span>
        {evaluation.confidence_rationale && (
          <span className="text-xs text-slate-500">{evaluation.confidence_rationale}</span>
        )}
      </div>

      {/* Review triggers */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">🔔 Review Triggers</h4>
        <div className="flex flex-wrap gap-2">
          {evaluation.review_triggers.map((t, i) => (
            <span key={i} className="text-xs bg-white/70 border border-slate-200 rounded-full px-3 py-1 text-slate-600">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
