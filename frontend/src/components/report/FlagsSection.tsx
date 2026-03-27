import type { EvaluationReport } from "../../types";

const FLAG_STYLES = {
  GREEN: { bg: "bg-green-50 border-green-200 border-l-green-500", dot: "bg-green-500", title: "text-green-800" },
  AMBER: { bg: "bg-amber-50 border-amber-200 border-l-amber-500", dot: "bg-amber-500", title: "text-amber-800" },
  RED:   { bg: "bg-red-50 border-red-200 border-l-red-500",       dot: "bg-red-500",   title: "text-red-800"   },
};

interface Props { evaluation: EvaluationReport }

export default function FlagsSection({ evaluation }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Signals &amp; Flags</span>
      </div>
      <div className="p-4 space-y-2">
        {evaluation.flags.map((f, i) => {
          const s = FLAG_STYLES[f.type] ?? FLAG_STYLES.AMBER;
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border border-l-4 ${s.bg}`}>
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <div>
                <div className={`text-sm font-semibold ${s.title}`}>{f.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{f.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
