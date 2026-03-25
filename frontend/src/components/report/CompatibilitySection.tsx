import type { EvaluationReport } from "../../types";

const RESULT_PILL: Record<string, string> = {
  MATCH:    "bg-green-100 text-green-700",
  CONCERN:  "bg-amber-100 text-amber-700",
  MISMATCH: "bg-red-100 text-red-700",
};

const OVERALL_STYLES: Record<string, string> = {
  STRONG:   "bg-green-100 text-green-700",
  MODERATE: "bg-amber-100 text-amber-700",
  POOR:     "bg-red-100 text-red-700",
};

interface Props { evaluation: EvaluationReport }

export default function CompatibilitySection({ evaluation }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Investor Compatibility</span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${OVERALL_STYLES[evaluation.compatibility_overall]}`}>
          {evaluation.compatibility_overall}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2 font-semibold text-slate-500 w-16">Code</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Check</th>
              <th className="text-center px-3 py-2 font-semibold text-slate-500 w-24">Result</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {evaluation.compatibility.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-2 font-mono text-slate-400 text-[10px]">{c.code}</td>
                <td className="px-3 py-2 font-medium text-slate-700">{c.name}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${RESULT_PILL[c.result] ?? "bg-slate-100 text-slate-500"}`}>
                    {c.result}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{c.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
