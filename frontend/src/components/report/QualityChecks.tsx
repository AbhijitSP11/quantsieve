import type { EvaluationReport } from "../../types";

const RESULT_STYLES: Record<string, { icon: string; bg: string; text: string }> = {
  PASS:             { icon: "✓", bg: "bg-green-100",  text: "text-green-700"  },
  FAIL:             { icon: "✗", bg: "bg-red-100",    text: "text-red-700"    },
  CONDITIONAL:      { icon: "~", bg: "bg-amber-100",  text: "text-amber-700"  },
  DATA_UNAVAILABLE: { icon: "–", bg: "bg-slate-100",  text: "text-slate-400"  },
};

const SCORE_STYLES: Record<string, string> = {
  GOOD:    "bg-green-100 text-green-700",
  MODERATE:"bg-amber-100 text-amber-700",
  BAD:     "bg-red-100 text-red-700",
};

interface Props { evaluation: EvaluationReport }

export default function QualityChecks({ evaluation }: Props) {
  const { earned, total, percentage, label } = evaluation.quality_score;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Quality Checks</span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${SCORE_STYLES[label]}`}>
          {earned}/{total} ({percentage.toFixed(0)}%) {label}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
        {evaluation.quality_checks.map((qc) => {
          const s = RESULT_STYLES[qc.result] ?? RESULT_STYLES.DATA_UNAVAILABLE;
          return (
            <div key={qc.id} className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${s.bg} ${s.text}`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-700">
                  <span className="text-slate-400 font-mono mr-1">{qc.id}</span>{qc.label}
                </div>
                {qc.result !== "PASS" && (
                  <div className="text-[11px] text-slate-400 mt-0.5">{qc.finding}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
