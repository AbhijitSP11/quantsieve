import type { SwotResult, SwotItem } from "../../types";

const QUADRANT_CONFIG = [
  {
    key: "strengths" as const,
    label: "Strengths",
    icon: "✅",
    bg: "bg-green-50",
    border: "border-green-200",
    headCls: "text-green-700",
    badgeCls: "bg-green-100 text-green-700",
    dotCls: "bg-green-500",
  },
  {
    key: "weaknesses" as const,
    label: "Weaknesses",
    icon: "❌",
    bg: "bg-red-50",
    border: "border-red-200",
    headCls: "text-red-700",
    badgeCls: "bg-red-100 text-red-700",
    dotCls: "bg-red-500",
  },
  {
    key: "opportunities" as const,
    label: "Opportunities",
    icon: "🔷",
    bg: "bg-blue-50",
    border: "border-blue-200",
    headCls: "text-blue-700",
    badgeCls: "bg-blue-100 text-blue-700",
    dotCls: "bg-blue-500",
  },
  {
    key: "threats" as const,
    label: "Threats",
    icon: "⚠️",
    bg: "bg-amber-50",
    border: "border-amber-200",
    headCls: "text-amber-700",
    badgeCls: "bg-amber-100 text-amber-700",
    dotCls: "bg-amber-500",
  },
];

function SwotItem({ item, dotCls }: { item: SwotItem; dotCls: string }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-black/5 last:border-0">
      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
      <div>
        <div className="text-xs font-semibold text-slate-700">{item.label}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{item.detail}</div>
      </div>
    </div>
  );
}

interface Props { swot: SwotResult }

export default function SwotSection({ swot }: Props) {
  const { s, w, o, t } = swot.summary;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">SWOT Analysis</span>
        <span className="text-xs text-slate-400 font-medium">rule-based · from live data</span>
        <div className="ml-auto flex gap-2 text-xs font-bold">
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{s}S</span>
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">{w}W</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{o}O</span>
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{t}T</span>
        </div>
      </div>

      {/* 2×2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {QUADRANT_CONFIG.map((q) => {
          const items = swot[q.key] as SwotItem[];
          return (
            <div key={q.key} className={`${q.bg} p-4`}>
              <div className={`flex items-center gap-2 mb-3 ${q.headCls}`}>
                <span className="text-sm">{q.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide">{q.label}</span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${q.badgeCls}`}>
                  {items.length}
                </span>
              </div>
              <div>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">None identified</p>
                ) : (
                  items.map((item, i) => (
                    <SwotItem key={i} item={item} dotCls={q.dotCls} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
