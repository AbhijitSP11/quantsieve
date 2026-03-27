import type {
  NewsSentimentAnalysis,
  SentimentScore,
  SignalSentiment,
  FlagType,
  InstitutionalAction,
  CatalystHorizon,
} from "../../types";

// ─── Style helpers ────────────────────────────────────────────────────────────

function scoreBadge(score: SentimentScore): { label: string; bg: string; text: string; border: string } {
  const map: Record<SentimentScore, { label: string; bg: string; text: string; border: string }> = {
    STRONGLY_BULLISH: { label: "Strongly Bullish", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
    BULLISH:          { label: "Bullish",           bg: "bg-green-100",   text: "text-green-800",   border: "border-green-300"   },
    NEUTRAL:          { label: "Neutral",            bg: "bg-slate-100",   text: "text-slate-700",   border: "border-slate-300"   },
    BEARISH:          { label: "Bearish",            bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-300"   },
    STRONGLY_BEARISH: { label: "Strongly Bearish",   bg: "bg-red-100",     text: "text-red-800",     border: "border-red-300"     },
  };
  return map[score];
}

function signalSentimentColor(s: SignalSentiment): string {
  return {
    POSITIVE: "text-green-700 bg-green-50 border-green-200",
    NEGATIVE: "text-red-700 bg-red-50 border-red-200",
    MIXED:    "text-amber-700 bg-amber-50 border-amber-200",
    NEUTRAL:  "text-slate-600 bg-slate-50 border-slate-200",
  }[s];
}

function flagColors(type: FlagType): { bg: string; border: string; badge: string; icon: string } {
  return {
    RISK:        { bg: "bg-red-50",    border: "border-l-red-400",    badge: "bg-red-100 text-red-700",     icon: "⚠" },
    OPPORTUNITY: { bg: "bg-green-50",  border: "border-l-green-400",  badge: "bg-green-100 text-green-700", icon: "★" },
    WATCH:       { bg: "bg-amber-50",  border: "border-l-amber-400",  badge: "bg-amber-100 text-amber-700", icon: "◎" },
  }[type];
}

function actionStyle(action: InstitutionalAction): { bg: string; text: string; border: string } {
  return {
    ACCUMULATE: { bg: "bg-emerald-600", text: "text-white",          border: "" },
    HOLD:       { bg: "bg-slate-600",   text: "text-white",          border: "" },
    REDUCE:     { bg: "bg-amber-500",   text: "text-white",          border: "" },
    MONITOR:    { bg: "bg-blue-600",    text: "text-white",          border: "" },
    AVOID:      { bg: "bg-red-600",     text: "text-white",          border: "" },
  }[action];
}

function horizonLabel(h: CatalystHorizon): string {
  return { NEAR_TERM: "Near-term", MEDIUM_TERM: "Medium-term", LONG_TERM: "Long-term" }[h];
}

function confidenceDot(c: "HIGH" | "MODERATE" | "LOW"): string {
  return { HIGH: "bg-green-500", MODERATE: "bg-amber-400", LOW: "bg-red-400" }[c];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
      {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
    </div>
  );
}

function SignalBox({
  label,
  sentiment,
  count,
  items,
  itemLabel,
}: {
  label: string;
  sentiment: SignalSentiment;
  count: number;
  items: string[];
  itemLabel: string;
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${signalSentimentColor(sentiment)}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold">{sentiment}</span>
          <span className="text-[10px] opacity-60">· {count} items</span>
        </div>
      </div>
      {items.length > 0 && (
        <ul className="space-y-0.5">
          {items.slice(0, 4).map((e, i) => (
            <li key={i} className="text-[11px] leading-snug flex gap-1">
              <span className="mt-0.5 opacity-50">›</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="text-[10px] opacity-50">{itemLabel}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  sentiment: NewsSentimentAnalysis;
}

export default function NewsSentiment({ sentiment }: Props) {
console.log('sentiment :', sentiment);
  const badge = scoreBadge(sentiment.overall.score);
  const action = actionStyle(sentiment.institutional_action.recommendation);

  const risks = sentiment.institutional_flags.filter((f) => f.type === "RISK");
  const opps  = sentiment.institutional_flags.filter((f) => f.type === "OPPORTUNITY");
  const watches = sentiment.institutional_flags.filter((f) => f.type === "WATCH");

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Institutional News Sentiment
          </span>
          <span className="text-[10px] text-slate-400">
            · {sentiment.meta.items_analyzed} items · {sentiment.meta.coverage_period}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence indicator */}
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${confidenceDot(sentiment.overall.confidence)}`} />
            {sentiment.overall.confidence} confidence
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Overall Score ────────────────────────────────────────────── */}
        <div className={`rounded-xl border-2 ${badge.border} ${badge.bg} px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3`}>
          <div className={`shrink-0 px-4 py-1.5 rounded-lg font-bold text-sm tracking-wide ${badge.text} border ${badge.border} bg-white`}>
            {badge.label}
          </div>
          <div className="flex-1">
            <div className={`text-sm font-semibold ${badge.text} leading-snug`}>{sentiment.overall.headline}</div>
            <div className="text-xs text-slate-600 mt-1 leading-relaxed">{sentiment.overall.summary}</div>
          </div>
        </div>

        {/* ── Signal Breakdown ─────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Signal Breakdown" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SignalBox
              label="Exchange Filings (BSE/NSE)"
              sentiment={sentiment.signal_breakdown.official.sentiment}
              count={sentiment.signal_breakdown.official.count}
              items={sentiment.signal_breakdown.official.key_events}
              itemLabel="Key regulatory & corporate events"
            />
            <SignalBox
              label="Media Coverage"
              sentiment={sentiment.signal_breakdown.media.sentiment}
              count={sentiment.signal_breakdown.media.count}
              items={sentiment.signal_breakdown.media.dominant_themes}
              itemLabel="Dominant editorial themes"
            />
          </div>
        </div>

        {/* ── Institutional Flags ───────────────────────────────────────── */}
        {sentiment.institutional_flags.length > 0 && (
          <div>
            <SectionHeader
              title="Institutional Flags"
              sub={`${risks.length} risk · ${opps.length} opportunity · ${watches.length} watch`}
            />
            <div className="space-y-2">
              {[...risks, ...opps, ...watches].map((flag, i) => {
                const c = flagColors(flag.type);
                return (
                  <div
                    key={i}
                    className={`flex gap-3 ${c.bg} border-l-4 ${c.border} rounded-r-lg px-3 py-2.5`}
                  >
                    <span className="mt-0.5 text-base leading-none">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badge}`}>
                          {flag.type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{flag.category}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 leading-snug">{flag.title}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{flag.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Price Catalysts ───────────────────────────────────────────── */}
        {sentiment.price_catalysts.length > 0 && (
          <div>
            <SectionHeader title="Price Catalysts" />
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
              {sentiment.price_catalysts.map((cat, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-white">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        cat.direction === "POSITIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {cat.direction === "POSITIVE" ? "▲" : "▼"}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium text-center leading-tight">
                      {horizonLabel(cat.horizon)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 leading-snug">{cat.event}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{cat.expected_impact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Institutional Action & Risk/Upside ───────────────────────── */}
        <div>
          <SectionHeader title="Institutional Verdict" sub={`· ${sentiment.institutional_action.time_horizon}`} />
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Action banner */}
            <div className={`px-4 py-3 flex items-center gap-3 ${action.bg}`}>
              <span className={`text-lg font-black tracking-wider ${action.text}`}>
                {sentiment.institutional_action.recommendation}
              </span>
              <span className={`text-xs leading-relaxed ${action.text} opacity-90`}>
                {sentiment.institutional_action.rationale}
              </span>
            </div>

            {/* Risk / Upside columns */}
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="px-4 py-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">Key Risks</div>
                {sentiment.institutional_action.key_risks.map((r, i) => (
                  <div key={i} className="flex gap-1.5 text-[11px] text-slate-700 leading-snug">
                    <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2">Key Upside</div>
                {sentiment.institutional_action.key_upside.map((u, i) => (
                  <div key={i} className="flex gap-1.5 text-[11px] text-slate-700 leading-snug">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    <span>{u}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Meta footer ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
          <span>BSE/NSE filings: {sentiment.meta.official_count}</span>
          <span>·</span>
          <span>Media articles: {sentiment.meta.media_count}</span>
          <span>·</span>
          <span>Data freshness: {sentiment.meta.freshness}</span>
          <span>·</span>
          <span>Analysis by Claude (Anthropic)</span>
        </div>

      </div>
    </div>
  );
}
