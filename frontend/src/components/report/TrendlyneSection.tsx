import type { TrendlyneData } from "../../types";

function DvmBar({ name, score }: { name: string; score: number | null }) {
  const pct = score ?? 0;
  const color =
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20 flex-shrink-0">{name}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-6 text-right">{score ?? "—"}</span>
    </div>
  );
}

interface Props { trendlyne: TrendlyneData }

export default function TrendlyneSection({ trendlyne }: Props) {
  if (!trendlyne.fetched) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-sm text-slate-400">
        <span>📡</span>
        <span>
          <span className="font-semibold">Trendlyne:</span>{" "}
          {trendlyne.error ?? "Could not fetch supplementary data"}
        </span>
      </div>
    );
  }

  const anyData =
    trendlyne.beta !== null ||
    trendlyne.analyst_target_price !== null ||
    trendlyne.dvm_scores !== null ||
    trendlyne.retail_sentiment !== null;

  if (!anyData) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Trendlyne Supplementary Data</span>
        <span className="text-xs text-slate-400">from trendlyne.com</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Beta */}
        {trendlyne.beta !== null && (
          <div className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Beta</div>
            <div className="text-2xl font-bold text-slate-800">{trendlyne.beta}</div>
            <div className="text-[11px] text-slate-400 mt-1">vs market volatility</div>
          </div>
        )}

        {/* Analyst Target */}
        {trendlyne.analyst_target_price !== null && (
          <div className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Analyst Target</div>
            <div className="text-2xl font-bold text-slate-800">₹{trendlyne.analyst_target_price}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {trendlyne.analyst_count !== null ? `${trendlyne.analyst_count} analysts` : "consensus"}
            </div>
          </div>
        )}

        {/* Retail Sentiment */}
        {trendlyne.retail_sentiment !== null && (
          <div className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Retail Sentiment</div>
            <div className="flex gap-2 text-xs">
              <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">
                {trendlyne.retail_sentiment.buy_pct ?? "—"}% Buy
              </span>
              <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">
                {trendlyne.retail_sentiment.sell_pct ?? "—"}% Sell
              </span>
            </div>
            {trendlyne.retail_sentiment.hold_pct !== null && (
              <div className="text-[11px] text-slate-400 mt-1">
                {trendlyne.retail_sentiment.hold_pct}% Hold
                {trendlyne.retail_sentiment.total_votes !== null &&
                  ` · ${trendlyne.retail_sentiment.total_votes.toLocaleString("en-IN")} votes`}
              </div>
            )}
          </div>
        )}

        {/* DVM Scores */}
        {trendlyne.dvm_scores !== null && (
          <div className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              DVM Scores
              {trendlyne.dvm_scores.label && (
                <span className="ml-2 normal-case font-medium text-slate-400">· {trendlyne.dvm_scores.label}</span>
              )}
            </div>
            <div className="space-y-2">
              <DvmBar name="Durability" score={trendlyne.dvm_scores.durability} />
              <DvmBar name="Valuation"  score={trendlyne.dvm_scores.valuation} />
              <DvmBar name="Momentum"   score={trendlyne.dvm_scores.momentum} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
