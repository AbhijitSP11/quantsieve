import type { EvaluationReport } from "../../types";

interface Props { evaluation: EvaluationReport }

export default function BenchmarksSection({ evaluation }: Props) {
  const { sector_index, broad_index, index_fund_alternative, benchmark_note } = evaluation.benchmarks;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Benchmark Alternatives</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        {[
          { label: "Sector Index",      value: sector_index },
          { label: "Broad Index",       value: broad_index },
          { label: "Passive Alternative", value: index_fund_alternative },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">{label}</div>
            <div className="text-sm font-semibold text-blue-700">{value}</div>
          </div>
        ))}
      </div>
      {benchmark_note && (
        <div className="px-5 py-2.5 border-t border-slate-100 text-xs text-slate-500">{benchmark_note}</div>
      )}
    </div>
  );
}
