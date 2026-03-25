import type { EvaluationReport, StockData } from "../../types";

const ZONE_STYLES: Record<string, string> = {
  UNDERVALUED: "bg-green-100 text-green-700",
  FAIR:        "bg-blue-100 text-blue-700",
  OVERVALUED:  "bg-amber-100 text-amber-700",
  EXPENSIVE:   "bg-red-100 text-red-700",
};

const ASSESS_STYLES: Record<string, string> = {
  CHEAP:      "bg-green-100 text-green-700",
  FAIR:       "bg-blue-100 text-blue-700",
  EXPENSIVE:  "bg-red-100 text-red-700",
};

interface Props { evaluation: EvaluationReport; stock: StockData }

export default function ValuationSection({ evaluation, stock }: Props) {
  const { zone, metrics, peers, margin_of_safety } = evaluation.valuation;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Valuation</span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${ZONE_STYLES[zone] ?? "bg-slate-100 text-slate-500"}`}>
          {zone}
        </span>
      </div>

      {/* Metrics table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2 font-semibold text-slate-500">Metric</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Current</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">5Y Median</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Sector</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {metrics.map((m) => (
              <tr key={m.metric} className="hover:bg-slate-50/50">
                <td className="px-4 py-2 text-slate-600 font-medium">{m.metric}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-800">{m.current === "DATA_UNAVAILABLE" ? "—" : m.current}</td>
                <td className="px-3 py-2 text-right text-slate-400">{m.median_5y === "DATA_UNAVAILABLE" ? "—" : m.median_5y}</td>
                <td className="px-3 py-2 text-right text-slate-400">{m.sector_median === "DATA_UNAVAILABLE" ? "—" : m.sector_median}</td>
                <td className="px-3 py-2 text-right">
                  {m.assessment === "DATA_UNAVAILABLE" ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${ASSESS_STYLES[m.assessment] ?? "bg-slate-100 text-slate-500"}`}>
                      {m.assessment}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Peers */}
      <div className="border-t border-slate-100 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2 font-semibold text-slate-500">Peer Comparison</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">P/E</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">P/B</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">ROE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr className="bg-blue-50/40">
              <td className="px-4 py-2 font-bold text-blue-700">{stock.company_name}</td>
              <td className="px-3 py-2 text-right font-bold text-blue-700">{stock.pe_ratio !== null ? `${stock.pe_ratio}×` : "—"}</td>
              <td className="px-3 py-2 text-right font-bold text-blue-700">{stock.pb_ratio !== null ? `${stock.pb_ratio}×` : "—"}</td>
              <td className="px-3 py-2 text-right font-bold text-blue-700">{stock.roe !== null ? `${stock.roe}%` : "—"}</td>
            </tr>
            {peers.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-2 text-slate-500">{p.name}</td>
                <td className="px-3 py-2 text-right text-slate-500">{p.pe}</td>
                <td className="px-3 py-2 text-right text-slate-500">{p.pb}</td>
                <td className="px-3 py-2 text-right text-slate-500">{p.roe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Margin of safety note */}
      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
        📐 {margin_of_safety}
      </div>
    </div>
  );
}
