import type { EvaluationReport } from "../../types";

const VERDICT_STYLES = {
  green: { bg: "bg-green-50 border-green-200",   label: "text-green-700",  emoji: "🟢" },
  amber: { bg: "bg-amber-50 border-amber-200",   label: "text-amber-700",  emoji: "🟡" },
  red:   { bg: "bg-red-50 border-red-200",       label: "text-red-700",    emoji: "🔴" },
};

interface Props { evaluation: EvaluationReport }

export default function VerdictSection({ evaluation }: Props) {
  const v = evaluation.verdict;
  const s = VERDICT_STYLES[v.color];

  return (
    <div className={`border rounded-xl p-6 ${s.bg}`}>
      <div className={`text-2xl font-black mb-3 ${s.label}`}>
        {s.emoji} {v.label.replace(/_/g, " ")}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-5">{v.summary}</p>

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">✅ What works</h4>
          <ul className="space-y-1.5">
            {v.what_works.map((p, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-slate-300 mt-0.5">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">⚠️ What to watch</h4>
          <ul className="space-y-1.5">
            {v.what_to_watch.map((p, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-slate-300 mt-0.5">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">📊 {v.index_comparison}</p>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">🔔 Review Triggers</h4>
        <div className="flex flex-wrap gap-2">
          {v.review_triggers.map((t, i) => (
            <span key={i} className="text-xs bg-white/70 border border-slate-200 rounded-full px-3 py-1 text-slate-600">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
