import type { TrendlyneData, TrendlyneSwotItem } from "../../types";

// ─── Sub-components ───────────────────────────────────────────────────────────

function DvmBar({ name, score }: { name: string; score: number | null }) {
  const pct = score ?? 0;
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20 flex-shrink-0">{name}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-7 text-right">{score ?? "—"}</span>
    </div>
  );
}

function SwotQuadrant({
  label, color, items, count,
}: { label: string; color: string; items: TrendlyneSwotItem[]; count: number | null }) {
  const borderColor: Record<string, string> = {
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
  };
  const headColor: Record<string, string> = {
    green: "text-green-700",
    red: "text-red-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
  };
  const dotColor: Record<string, string> = {
    green: "bg-green-400", red: "bg-red-400", blue: "bg-blue-400", amber: "bg-amber-400",
  };
  const displayItems = items.length > 0 ? items : [];
  const displayCount = items.length > 0 ? items.length : (count ?? 0);

  return (
    <div className={`border rounded-lg p-3 ${borderColor[color] ?? "border-slate-200 bg-slate-50"}`}>
      <div className={`flex items-center justify-between mb-2 ${headColor[color] ?? "text-slate-700"}`}>
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold bg-white rounded-full px-2 py-0.5 shadow-sm">{displayCount}</span>
      </div>
      {displayItems.length > 0 ? (
        <ul className="space-y-1">
          {displayItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-700">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[color] ?? "bg-slate-400"}`} />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400 italic">
          {count !== null && count > 0
            ? `${count} items (detail not loaded)`
            : "No items found"}
        </p>
      )}
    </div>
  );
}

function AnalystBar({
  label, count, total, color,
}: { label: string; count: number | null; total: number; color: string }) {
  if (count === null || count === 0) return null;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const bgMap: Record<string, string> = {
    "strong-sell": "bg-red-600", sell: "bg-red-300",
    hold: "bg-amber-400", buy: "bg-green-300", "strong-buy": "bg-green-600",
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-right text-slate-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
        <div className={`h-full ${bgMap[color] ?? "bg-slate-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-bold text-slate-700 w-4">{count}</span>
    </div>
  );
}

function ChecklistTable({ items }: { items: { metric: string; assessment: string; value: number | null }[] }) {
  function assessClass(a: string): string {
    if (/high in industry|above.*median|positive/i.test(a)) return "text-green-700 bg-green-50";
    if (/negative|below.*median|low in industry/i.test(a)) return "text-red-600 bg-red-50";
    if (/average/i.test(a)) return "text-amber-600 bg-amber-50";
    return "text-slate-500 bg-slate-50";
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-1.5 px-2 font-semibold text-slate-400 uppercase tracking-wider">Metric</th>
            <th className="text-left py-1.5 px-2 font-semibold text-slate-400 uppercase tracking-wider">Assessment</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-400 uppercase tracking-wider">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="py-1.5 px-2 text-slate-700">{item.metric}</td>
              <td className="py-1.5 px-2">
                <span className={`rounded px-1.5 py-0.5 font-medium ${assessClass(item.assessment)}`}>
                  {item.assessment || "—"}
                </span>
              </td>
              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-700">
                {item.value !== null ? item.value : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { trendlyne: TrendlyneData }

export default function TrendlyneSection({ trendlyne }: Props) {
  if (!trendlyne.fetched) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-sm text-slate-400">
        <span>📡</span>
        <span>
          <span className="font-semibold text-slate-500">Trendlyne:</span>{" "}
          {trendlyne.error ?? "Could not fetch supplementary data"}
        </span>
      </div>
    );
  }

  const ac = trendlyne.analyst_consensus;
  const sr = trendlyne.support_resistance;
  const ma = trendlyne.moving_averages;
  const sh = trendlyne.shareholding;
  const dvm = trendlyne.dvm_scores;
  const swot = trendlyne.tl_swot;

  const totalAnalysts =
    ac?.breakdown
      ? (ac.breakdown.strong_sell ?? 0) +
        (ac.breakdown.sell ?? 0) +
        (ac.breakdown.hold ?? 0) +
        (ac.breakdown.buy ?? 0) +
        (ac.breakdown.strong_buy ?? 0)
      : (ac?.count ?? 0);

  const recColor: Record<string, string> = {
    BUY: "bg-green-100 text-green-800",
    STRONG_BUY: "bg-green-200 text-green-900",
    HOLD: "bg-amber-100 text-amber-800",
    SELL: "bg-red-100 text-red-700",
    STRONG_SELL: "bg-red-200 text-red-900",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Trendlyne Data</h2>
        <a
          href={`https://trendlyne.com/equity/${trendlyne.analyst_target_price ?? ""}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline"
        >
          trendlyne.com ↗
        </a>
      </div>

      {/* Row 1: DVM + Analyst + Beta + MA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DVM Scores */}
        {dvm && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              DVM Scores
              {dvm.label && <span className="ml-1 normal-case font-medium">· {dvm.label}</span>}
            </div>
            <div className="space-y-2.5">
              <DvmBar name="Durability" score={dvm.durability} />
              <DvmBar name="Valuation" score={dvm.valuation} />
              <DvmBar name="Momentum" score={dvm.momentum} />
            </div>
          </div>
        )}

        {/* Analyst Consensus */}
        {ac && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Analyst Consensus
              {ac.count !== null && (
                <span className="ml-1 normal-case font-medium">· {ac.count} analysts</span>
              )}
            </div>
            {ac.recommendation && (
              <div className={`inline-block text-sm font-bold px-3 py-1 rounded-lg mb-3 ${recColor[ac.recommendation] ?? "bg-slate-100 text-slate-700"}`}>
                {ac.recommendation.replace("_", " ")}
              </div>
            )}
            {ac.target_price !== null && (
              <div className="text-xs text-slate-500 mb-3">
                Target: <span className="font-bold text-slate-700">₹{ac.target_price}</span>
              </div>
            )}
            {ac.breakdown && totalAnalysts > 0 && (
              <div className="space-y-1">
                <AnalystBar label="Strong Sell" count={ac.breakdown.strong_sell} total={totalAnalysts} color="strong-sell" />
                <AnalystBar label="Sell" count={ac.breakdown.sell} total={totalAnalysts} color="sell" />
                <AnalystBar label="Hold" count={ac.breakdown.hold} total={totalAnalysts} color="hold" />
                <AnalystBar label="Buy" count={ac.breakdown.buy} total={totalAnalysts} color="buy" />
                <AnalystBar label="Strong Buy" count={ac.breakdown.strong_buy} total={totalAnalysts} color="strong-buy" />
              </div>
            )}
          </div>
        )}

        {/* Beta + Retail Sentiment */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          {trendlyne.beta !== null && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Beta</div>
              <div className="text-3xl font-bold text-slate-800">{trendlyne.beta}</div>
              <div className="text-[11px] text-slate-400">vs market volatility</div>
            </div>
          )}
          {trendlyne.retail_sentiment && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Retail Sentiment</div>
              <div className="flex gap-1.5 flex-wrap text-xs">
                {trendlyne.retail_sentiment.buy_pct !== null && (
                  <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">
                    {trendlyne.retail_sentiment.buy_pct}% Buy
                  </span>
                )}
                {trendlyne.retail_sentiment.hold_pct !== null && (
                  <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded">
                    {trendlyne.retail_sentiment.hold_pct}% Hold
                  </span>
                )}
                {trendlyne.retail_sentiment.sell_pct !== null && (
                  <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">
                    {trendlyne.retail_sentiment.sell_pct}% Sell
                  </span>
                )}
              </div>
              {trendlyne.retail_sentiment.total_votes !== null && (
                <div className="text-[11px] text-slate-400 mt-1">
                  {trendlyne.retail_sentiment.total_votes.toLocaleString("en-IN")} votes
                </div>
              )}
            </div>
          )}
        </div>

        {/* Moving Averages + Support/Resistance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          {ma && (ma.bullish !== null || ma.bearish !== null) && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Moving Averages</div>
              <div className="flex gap-3">
                {ma.bullish !== null && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{ma.bullish}</div>
                    <div className="text-[10px] text-slate-400">Bullish</div>
                  </div>
                )}
                {ma.bearish !== null && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{ma.bearish}</div>
                    <div className="text-[10px] text-slate-400">Bearish</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {sr && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Support / Resistance</div>
              <div className="space-y-0.5 text-xs">
                {sr.resistance.map((v, i) =>
                  v !== null ? (
                    <div key={`r${i}`} className="flex justify-between text-red-600">
                      <span className="text-slate-400">R{i + 1}</span>
                      <span className="font-mono font-semibold">₹{v}</span>
                    </div>
                  ) : null
                )}
                {sr.support.map((v, i) =>
                  v !== null ? (
                    <div key={`s${i}`} className="flex justify-between text-green-600">
                      <span className="text-slate-400">S{i + 1}</span>
                      <span className="font-mono font-semibold">₹{v}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Trendlyne SWOT */}
      {swot && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Trendlyne SWOT</span>
            {swot.counts && (
              <div className="flex gap-1.5 text-[10px] font-bold">
                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{swot.counts.s}S</span>
                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{swot.counts.w}W</span>
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{swot.counts.o}O</span>
                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{swot.counts.t}T</span>
              </div>
            )}
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SwotQuadrant
              label="Strengths" color="green"
              items={swot.strengths} count={swot.counts?.s ?? null}
            />
            <SwotQuadrant
              label="Weaknesses" color="red"
              items={swot.weaknesses} count={swot.counts?.w ?? null}
            />
            <SwotQuadrant
              label="Opportunities" color="blue"
              items={swot.opportunities} count={swot.counts?.o ?? null}
            />
            <SwotQuadrant
              label="Threats" color="amber"
              items={swot.threats} count={swot.counts?.t ?? null}
            />
          </div>
        </div>
      )}

      {/* Row 3: Shareholding */}
      {sh && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Shareholding Pattern</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Promoters", value: sh.promoters },
              { label: "FII", value: sh.fii },
              { label: "DII", value: sh.dii },
              { label: "Public", value: sh.public_holding },
            ].map(({ label, value }) =>
              value !== null ? (
                <div key={label} className="text-center">
                  <div className="text-xl font-bold text-slate-700">{value}%</div>
                  <div className="text-[11px] text-slate-400">{label}</div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Row 4: Checklist */}
      {trendlyne.checklist && trendlyne.checklist.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Check Before You Buy
            </span>
            <span className="ml-2 text-xs text-slate-400">
              {trendlyne.checklist.length} metrics
            </span>
          </div>
          <div className="p-4">
            <ChecklistTable items={trendlyne.checklist} />
          </div>
        </div>
      )}
    </div>
  );
}
