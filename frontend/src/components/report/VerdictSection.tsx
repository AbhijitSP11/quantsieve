import type { EvaluationReport, Verdict } from "../../types";

// ─── Theming ──────────────────────────────────────────────────────────────────

function verdictTheme(v: Verdict) {
  switch (v) {
    case "BUY":
      return { bg: "bg-green-50 border-green-200",  text: "text-green-700",  label: "BUY",               ring: "ring-green-300"  };
    case "BUY_WITH_CAUTION":
      return { bg: "bg-amber-50 border-amber-200",  text: "text-amber-700",  label: "BUY WITH CAUTION",  ring: "ring-amber-300"  };
    case "WAIT":
      return { bg: "bg-amber-50 border-amber-200",  text: "text-amber-700",  label: "WAIT",              ring: "ring-amber-300"  };
    case "NOT_SUITABLE":
      return { bg: "bg-orange-50 border-orange-200",text: "text-orange-700", label: "NOT SUITABLE",      ring: "ring-orange-300" };
    case "AVOID":
    default:
      return { bg: "bg-red-50 border-red-200",      text: "text-red-700",    label: "AVOID",             ring: "ring-red-300"    };
  }
}

const CONF_BADGE: Record<string, string> = {
  HIGH:     "bg-green-100 text-green-700  ring-1 ring-green-200",
  MODERATE: "bg-amber-100 text-amber-700  ring-1 ring-amber-200",
  LOW:      "bg-red-100   text-red-700    ring-1 ring-red-200",
};

// ─── Small sub-section heading ────────────────────────────────────────────────

function SubHeading({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h4 className={`text-xs font-bold uppercase tracking-wide mb-2.5 ${color}`}>
      {children}
    </h4>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function ListItem({ children, accent = "text-slate-300" }: { children: React.ReactNode; accent?: string }) {
  return (
    <li className="text-sm text-slate-700 flex items-start gap-2 leading-relaxed">
      <span className={`${accent} mt-1 shrink-0`}>›</span>
      <span>{children}</span>
    </li>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { evaluation: EvaluationReport }

export default function VerdictSection({ evaluation }: Props) {
  const s = verdictTheme(evaluation.verdict);

  return (
    <div className={`border rounded-2xl overflow-hidden ${s.bg}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-black/5">
        <div className={`text-3xl font-black ${s.text} mb-2`}>{s.label}</div>
        <p className="text-sm text-slate-700 leading-relaxed">{evaluation.verdict_summary}</p>
      </div>

      <div className="p-6 space-y-6">

        {/* What works + What worries */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white/60 rounded-xl p-4 border border-black/5">
            <SubHeading color="text-green-700">What works</SubHeading>
            <ul className="space-y-2">
              {evaluation.overview.what_works.map((p, i) => (
                <ListItem key={i} accent="text-green-400">{p}</ListItem>
              ))}
            </ul>
          </div>
          <div className="bg-white/60 rounded-xl p-4 border border-black/5">
            <SubHeading color="text-amber-700">What worries me</SubHeading>
            <ul className="space-y-2">
              {evaluation.overview.what_worries_me.map((p, i) => (
                <ListItem key={i} accent="text-amber-400">{p}</ListItem>
              ))}
            </ul>
          </div>
        </div>

        {/* Thesis Breakers */}
        {evaluation.thesis_breakers && evaluation.thesis_breakers.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <SubHeading color="text-red-700">Thesis Breakers — Exit if any occur</SubHeading>
            <ul className="space-y-2">
              {evaluation.thesis_breakers.map((t, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2 leading-relaxed">
                  <span className="text-red-400 mt-1 shrink-0 font-bold">!</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conviction signals */}
        {(evaluation.conviction_improvers || evaluation.conviction_reducers) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {evaluation.conviction_improvers && (
              <div className="bg-white/60 rounded-xl p-4 border border-black/5">
                <SubHeading color="text-green-700">Add if…</SubHeading>
                <ul className="space-y-1.5">
                  {evaluation.conviction_improvers.map((c, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                      <span className="text-green-500 font-bold mt-0.5 shrink-0">↑</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.conviction_reducers && (
              <div className="bg-white/60 rounded-xl p-4 border border-black/5">
                <SubHeading color="text-amber-700">Trim if…</SubHeading>
                <ul className="space-y-1.5">
                  {evaluation.conviction_reducers.map((c, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                      <span className="text-amber-500 font-bold mt-0.5 shrink-0">↓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Confidence */}
        <div className="flex items-start gap-3 flex-wrap">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${CONF_BADGE[evaluation.confidence] ?? ""}`}>
            {evaluation.confidence} CONFIDENCE
          </span>
          {evaluation.confidence_rationale && (
            <p className="text-xs text-slate-500 leading-relaxed flex-1 pt-1">
              {evaluation.confidence_rationale}
            </p>
          )}
        </div>

        {/* Review triggers */}
        {evaluation.review_triggers && evaluation.review_triggers.length > 0 && (
          <div>
            <SubHeading color="text-slate-500">Re-evaluate when</SubHeading>
            <div className="flex flex-wrap gap-2">
              {evaluation.review_triggers.map((t, i) => (
                <span
                  key={i}
                  className="text-xs bg-white/80 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 shadow-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
