import type { MarketExpectationAnalysis } from "../../types";

const STORY_BADGE: Record<string, string> = {
  COMPOUNDING:    "bg-blue-100 text-blue-700",
  RE_RATING:      "bg-amber-100 text-amber-700",
  CYCLICAL_TRADE: "bg-orange-100 text-orange-700",
};

const STORY_LABEL: Record<string, string> = {
  COMPOUNDING:    "Compounding",
  RE_RATING:      "Re-rating",
  CYCLICAL_TRADE: "Cyclical Trade",
};

interface Props { data: MarketExpectationAnalysis }

export default function MarketExpectationsSection({ data }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Market Expectations</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Top metric row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Implied EPS CAGR chip */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Implied EPS CAGR Required</div>
              <div className="text-base font-black text-slate-800 mt-0.5">{data.implied_eps_cagr_required}</div>
            </div>
          </div>

          {/* Story type badge */}
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Story Type</div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${STORY_BADGE[data.story_type] ?? "bg-slate-100 text-slate-500"}`}>
              {STORY_LABEL[data.story_type] ?? data.story_type}
            </span>
          </div>
        </div>

        {/* What market gets wrong */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1.5">
            What the Market Gets Wrong
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{data.what_market_gets_wrong}</p>
        </div>

        {/* De-rating risks */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">De-rating Risks</div>
          <ul className="space-y-1.5">
            {data.derating_risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-red-400 mt-0.5 flex-shrink-0">▸</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
