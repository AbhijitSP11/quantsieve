import type { EvaluationReport } from "../../types";

const HEALTH_BADGE: Record<string, string> = {
  STRONG:    "bg-green-100 text-green-700",
  ADEQUATE:  "bg-amber-100 text-amber-700",
  WEAK:      "bg-orange-100 text-orange-700",
  DISTRESSED:"bg-red-100 text-red-700",
};

function cfColor(v: number) {
  return v >= 0 ? "text-green-600" : "text-red-500";
}

interface Props { evaluation: EvaluationReport }

export default function FinancialsSection({ evaluation }: Props) {
  const { profitability, balance_sheet, cash_flow, health_verdict } = evaluation.financials;
  const profKeys = Object.keys(profitability);
  const firstKey = profKeys[0];
  const headerRow = firstKey ? (profitability[firstKey] ?? []) : [];
  const years = headerRow.slice(1);

  const bs = balance_sheet;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Financial Health</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${HEALTH_BADGE[health_verdict] ?? "bg-slate-100 text-slate-500"}`}>
          {health_verdict}
        </span>
      </div>

      {/* Profitability table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2 font-semibold text-slate-500 w-36">Metric</th>
              {years.map((y, i) => (
                <th key={i} className="text-right px-3 py-2 font-semibold text-slate-500">
                  {String(y).length === 4 ? `FY${String(y).slice(-2)}` : String(y)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {profKeys.map((key) => {
              const vals = profitability[key] ?? [];
              return (
                <tr key={key} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 text-slate-500 font-medium">{key}</td>
                  {vals.slice(1).map((v, i) => (
                    <td key={i} className={`px-3 py-2 text-right font-medium ${v === "DATA_UNAVAILABLE" ? "text-slate-300" : "text-slate-700"}`}>
                      {v === "DATA_UNAVAILABLE" ? "—" : String(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Balance sheet cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-0 divide-x divide-slate-100 border-t border-slate-100">
        {[
          { label: "D/E Ratio",   value: bs["Debt/Equity"] },
          { label: "Int. Cover",  value: typeof bs["Interest Coverage"] === "number" ? `${bs["Interest Coverage"]}×` : bs["Interest Coverage"] },
          { label: "Current Ratio",value: bs["Current Ratio"] },
          { label: "Total Assets", value: typeof bs["Total Assets"] === "number" ? `₹${(bs["Total Assets"] as number).toLocaleString("en-IN")} Cr` : bs["Total Assets"] },
          { label: "Borrowings",   value: typeof bs["Borrowings"] === "number" ? `₹${(bs["Borrowings"] as number).toLocaleString("en-IN")} Cr` : bs["Borrowings"] },
          { label: "Reserves",     value: typeof bs["Reserves"] === "number" ? `₹${(bs["Reserves"] as number).toLocaleString("en-IN")} Cr` : bs["Reserves"] },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 text-center">
            <div className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</div>
            <div className="text-sm font-bold text-slate-700">{value ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* Cash flow table */}
      <div className="border-t border-slate-100 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2 font-semibold text-slate-500">Cash Flow (₹Cr)</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Operating</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Investing</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Financing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cash_flow.map((cf) => (
              <tr key={cf.year} className="hover:bg-slate-50/50">
                <td className="px-4 py-2 text-slate-500 font-medium">{cf.year}</td>
                <td className={`px-3 py-2 text-right font-medium ${cfColor(cf.operating)}`}>{cf.operating.toLocaleString("en-IN")}</td>
                <td className={`px-3 py-2 text-right font-medium ${cfColor(cf.investing)}`}>{cf.investing.toLocaleString("en-IN")}</td>
                <td className={`px-3 py-2 text-right font-medium ${cfColor(cf.financing)}`}>{cf.financing.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
