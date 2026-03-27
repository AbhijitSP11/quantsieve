import type { EntryStrategy } from "../../types";

const MODE_BADGE: Record<string, { label: string; cls: string }> = {
  LUMP_SUM:             { label: "Lump Sum",          cls: "bg-green-100 text-green-700" },
  STAGGERED_3_TRANCHES: { label: "Staggered · 3×",    cls: "bg-blue-100 text-blue-700"  },
  STAGGERED_5_TRANCHES: { label: "Staggered · 5×",    cls: "bg-blue-100 text-blue-700"  },
  WAIT_FOR_TRIGGER:     { label: "Wait for Trigger",  cls: "bg-amber-100 text-amber-700" },
};

interface Props { data: EntryStrategy }

export default function EntryStrategySection({ data }: Props) {
  const mode = MODE_BADGE[data.entry_mode] ?? { label: data.entry_mode, cls: "bg-slate-100 text-slate-600" };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Entry Strategy</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Entry mode */}
        <div>
          <span className={`inline-block text-sm font-black px-4 py-1.5 rounded-full ${mode.cls}`}>
            {mode.label}
          </span>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{data.entry_mode_rationale}</p>
        </div>

        {/* Position size + horizon row */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex-1 min-w-[180px]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Suggested Position Size</div>
            <div className="text-base font-bold text-slate-800">{data.suggested_position_size}</div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thesis Horizon</div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              ⏱ {data.thesis_horizon}
            </span>
          </div>
        </div>

        {/* Exit signal — red-bordered callout */}
        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1.5">
            🚪 Exit Signal
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{data.exit_signal}</p>
        </div>
      </div>
    </div>
  );
}
