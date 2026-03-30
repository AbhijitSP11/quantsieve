import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { EvaluateRequest, InvestorProfile } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { saveInvestorProfile } from "../lib/db";

const DEFAULT_PROFILE: InvestorProfile = {
  age: 30,
  investment_goal: "wealth_creation",
  investment_horizon: "5-7 years",
  investment_mode: "lump_sum",
  portfolio_type: "diversified_10plus",
  position_sizing: "5_to_10",
  risk_tolerance: "medium",
  volatility_preference: "medium",
  tax_bracket: "30pct",
};

interface Props {
  onSubmit: (req: EvaluateRequest) => void;
  loading: boolean;
  error: string | null;
}

// ─── Custom Select (portal-based — bypasses all parent overflow clipping) ──────

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
}) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Capture position of the trigger so the portal can align to it
  function openDropdown() {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  }

  // Re-sync position on scroll / resize while open
  useEffect(() => {
    if (!open) return;

    function syncPosition() {
      if (triggerRef.current) {
        setTriggerRect(triggerRef.current.getBoundingClientRect());
      }
    }

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  // Compute dropdown position — flip upward if not enough room below
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
  const spaceBelow = triggerRect ? viewportHeight - triggerRect.bottom : 999;
  const dropAbove = spaceBelow < 220 && triggerRect ? triggerRect.top > 220 : false;

  const portalStyle: React.CSSProperties = triggerRect
    ? {
        position: "fixed",
        left: triggerRect.left,
        width: triggerRect.width,
        zIndex: 9999,
        ...(dropAbove
          ? { bottom: viewportHeight - triggerRect.top + 6 }
          : { top: triggerRect.bottom + 6 }),
      }
    : { display: "none" };

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 text-left flex items-center justify-between gap-2 outline-none transition-all duration-150 ${
          open
            ? "border-blue-500 ring-2 ring-blue-100"
            : "border-slate-200 hover:border-slate-300"
        }`}
        style={{ boxShadow: "inset 0 1px 2px 0 rgba(0,0,0,0.04)" }}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-blue-500" : "text-slate-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown rendered in document.body — no parent overflow clipping */}
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              ...portalStyle,
              boxShadow: "0 8px 30px 0 rgba(0,0,0,0.12), 0 2px 8px 0 rgba(0,0,0,0.06)",
            }}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent the outside-click handler from firing before onChange
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-center justify-between gap-3 ${
                    opt.value === value
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && (
                    <svg
                      className="w-3.5 h-3.5 text-blue-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Select option definitions ────────────────────────────────────────────────

const ENTRY_CONTEXT_OPTIONS: SelectOption<EvaluateRequest["entry_context"]>[] = [
  { value: "first_purchase", label: "First Purchase" },
  { value: "adding",         label: "Adding to Position" },
  { value: "hold_or_exit",   label: "Hold or Exit?" },
  { value: "comparing",      label: "Comparing Options" },
];

const GOAL_OPTIONS: SelectOption<InvestorProfile["investment_goal"]>[] = [
  { value: "wealth_creation", label: "Wealth Creation" },
  { value: "retirement",      label: "Retirement" },
  { value: "education",       label: "Education" },
  { value: "home_purchase",   label: "Home Purchase" },
  { value: "short_term",      label: "Short Term" },
  { value: "other",           label: "Other" },
];

const HORIZON_OPTIONS: SelectOption<string>[] = [
  { value: "less than 1 year", label: "Less than 1 year" },
  { value: "1-3 years",        label: "1–3 years" },
  { value: "3-5 years",        label: "3–5 years" },
  { value: "5-7 years",        label: "5–7 years" },
  { value: "7-10 years",       label: "7–10 years" },
  { value: "10+ years",        label: "10+ years" },
];

const MODE_OPTIONS: SelectOption<InvestorProfile["investment_mode"]>[] = [
  { value: "lump_sum",   label: "Lump Sum" },
  { value: "staggered",  label: "Staggered / SIP" },
  { value: "adding",     label: "Adding to Existing" },
];

const PORTFOLIO_OPTIONS: SelectOption<InvestorProfile["portfolio_type"]>[] = [
  { value: "diversified_10plus",  label: "Diversified (10+ stocks)" },
  { value: "concentrated_3to5",   label: "Concentrated (3–5 stocks)" },
  { value: "mostly_mf",           label: "Mostly Mutual Funds" },
  { value: "first_investment",    label: "First Investment" },
];

const POSITION_OPTIONS: SelectOption<InvestorProfile["position_sizing"]>[] = [
  { value: "under_5",   label: "Under 5%" },
  { value: "5_to_10",   label: "5–10%" },
  { value: "10_to_20",  label: "10–20%" },
  { value: "over_20",   label: "Over 20%" },
];

const RISK_OPTIONS: SelectOption<InvestorProfile["risk_tolerance"]>[] = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
];

const VOLATILITY_OPTIONS: SelectOption<InvestorProfile["volatility_preference"]>[] = [
  { value: "low",    label: "Low — prefer stable" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High — can handle swings" },
];

const TAX_OPTIONS: SelectOption<InvestorProfile["tax_bracket"]>[] = [
  { value: "30pct",      label: "30%" },
  { value: "20pct",      label: "20%" },
  { value: "5to10pct",   label: "5–10%" },
  { value: "not_sure",   label: "Not Sure" },
];

// ─── Hero stats ────────────────────────────────────────────────────────────────

const HERO_STATS = [
  { value: "15",  label: "Analysis Steps" },
  { value: "~30s", label: "Time to Report" },
  { value: "20+",  label: "SWOT Signals" },
  { value: "17",   label: "Quality Checks" },
];

// ─── Report preview (right panel) ─────────────────────────────────────────────

const REPORT_SECTIONS = [
  { dot: "bg-green-500",  title: "AI Verdict",       desc: "BUY / WAIT / AVOID with institutional rationale and 9 guard-rails" },
  { dot: "bg-blue-500",   title: "Financial Health",  desc: "Revenue & profit CAGRs, OCF quality, FCF, working capital" },
  { dot: "bg-violet-500", title: "Valuation & Entry", desc: "Intrinsic value range, risk/reward ratio, entry mode, position sizing" },
  { dot: "bg-amber-500",  title: "Rule-based SWOT",   desc: "20+ deterministic signals with evidence and strength ratings" },
  { dot: "bg-slate-400",  title: "Quality Checks",    desc: "17-point checklist — governance, earnings, promoter trends" },
  { dot: "bg-cyan-500",   title: "News & Sentiment",  desc: "Exchange disclosures, media coverage, institutional sentiment score" },
];

const DATA_SOURCES = [
  { label: "Screener.in",   desc: "Live financials, ratios, shareholding", badge: "Live",     badgeCls: "bg-green-100 text-green-700" },
  { label: "Trendlyne",     desc: "DVM scores, beta, analyst consensus",   badge: "Live",     badgeCls: "bg-green-100 text-green-700" },
  { label: "BSE / NSE India", desc: "Exchange disclosures, corporate actions", badge: "Official", badgeCls: "bg-amber-100 text-amber-700" },
  { label: "Google News",   desc: "Media coverage and recent articles",    badge: "Live",     badgeCls: "bg-green-100 text-green-700" },
  { label: "Claude AI",     desc: "15-step institutional evaluation engine", badge: "AI",     badgeCls: "bg-violet-100 text-violet-700" },
];

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Form section card ────────────────────────────────────────────────────────

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      style={{ boxShadow: "0 1px 4px 0 rgba(0,0,0,0.06)" }}
    >
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EvaluateForm({ onSubmit, loading, error }: Props) {
  const { user, profile: userProfile } = useAuth();
  const [ticker, setTicker] = useState("");
  const [context, setContext] = useState<EvaluateRequest["entry_context"]>("first_purchase");
  const [thesis, setThesis] = useState("");
  const [profile, setProfile] = useState<InvestorProfile>(DEFAULT_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (userProfile?.investor_profile && !profileLoaded) {
      setProfile(userProfile.investor_profile);
      setProfileLoaded(true);
    }
  }, [userProfile, profileLoaded]);

  function setP<K extends keyof InvestorProfile>(key: K, value: InvestorProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    if (user) void saveInvestorProfile(profile);
    onSubmit({
      ticker: ticker.trim().toUpperCase(),
      entry_context: context,
      ...(thesis.trim() ? { thesis: thesis.trim() } : {}),
      profile,
    });
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-100 overflow-y-auto">

      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16">

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 text-blue-300 rounded-full px-3.5 py-1 text-xs font-semibold mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                Live data · Claude AI · Institutional framework
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4">
                Evaluate any Indian stock<br />
                <span className="text-blue-400">like a fund manager</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg">
                The same 15-step buy-side framework used by institutional analysts — live data, rule-based SWOT, AI verdict, news sentiment. All in under 30 seconds.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                {["Screener.in", "Trendlyne", "BSE / NSE India", "Claude Sonnet 4"].map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <span className="w-1 h-1 rounded-full bg-slate-600 inline-block" />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
              {HERO_STATS.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 text-center px-4 py-5"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="text-3xl font-black text-white leading-none mb-1.5">{value}</div>
                  <div className="text-[11px] text-slate-400 font-medium leading-tight">{label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">

          {/* ── LEFT: Form ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} autoComplete="off" className="space-y-4">

              {/* Stock Details */}
              <FormSection
                title="Stock Details"
                subtitle="Enter the NSE or BSE ticker of the stock you want to evaluate"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ticker Symbol" required hint="e.g. NATCOPHARM · RELIANCE · TCS">
                    <input
                      className="qs-input uppercase font-mono font-bold tracking-widest text-slate-900 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                      placeholder="e.g. NATCOPHARM"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      required
                    />
                  </Field>

                  <Field label="Entry Context">
                    <CustomSelect
                      value={context}
                      onChange={setContext}
                      options={ENTRY_CONTEXT_OPTIONS}
                    />
                  </Field>

                  <div className="col-span-2">
                    <Field label="Investment Thesis" hint="Optional — helps Claude evaluate your specific angle">
                      <textarea
                        className="qs-input resize-none"
                        rows={2}
                        placeholder="Why are you interested in this stock?"
                        value={thesis}
                        onChange={(e) => setThesis(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </FormSection>

              {/* Investor Profile */}
              <FormSection
                title="Your Investor Profile"
                subtitle="Used to assess compatibility across 9 dimensions — age, horizon, risk, goal, and more"
              >
                <div className="grid grid-cols-2 gap-4">

                  <Field label="Age">
                    <input
                      type="number"
                      className="qs-input"
                      min={18}
                      max={99}
                      value={profile.age}
                      onChange={(e) => setP("age", Number(e.target.value))}
                    />
                  </Field>

                  <Field label="Investment Goal">
                    <CustomSelect
                      value={profile.investment_goal}
                      onChange={(v) => setP("investment_goal", v)}
                      options={GOAL_OPTIONS}
                    />
                  </Field>

                  <Field label="Investment Horizon">
                    <CustomSelect
                      value={profile.investment_horizon}
                      onChange={(v) => setP("investment_horizon", v)}
                      options={HORIZON_OPTIONS}
                    />
                  </Field>

                  <Field label="Entry Mode">
                    <CustomSelect
                      value={profile.investment_mode}
                      onChange={(v) => setP("investment_mode", v)}
                      options={MODE_OPTIONS}
                    />
                  </Field>

                  <Field label="Portfolio Type">
                    <CustomSelect
                      value={profile.portfolio_type}
                      onChange={(v) => setP("portfolio_type", v)}
                      options={PORTFOLIO_OPTIONS}
                    />
                  </Field>

                  <Field label="Position Size">
                    <CustomSelect
                      value={profile.position_sizing}
                      onChange={(v) => setP("position_sizing", v)}
                      options={POSITION_OPTIONS}
                    />
                  </Field>

                  <Field label="Risk Tolerance">
                    <CustomSelect
                      value={profile.risk_tolerance}
                      onChange={(v) => setP("risk_tolerance", v)}
                      options={RISK_OPTIONS}
                    />
                  </Field>

                  <Field label="Volatility Comfort">
                    <CustomSelect
                      value={profile.volatility_preference}
                      onChange={(v) => setP("volatility_preference", v)}
                      options={VOLATILITY_OPTIONS}
                    />
                  </Field>

                  <div className="col-span-2">
                    <Field label="Tax Bracket">
                      <CustomSelect
                        value={profile.tax_bracket}
                        onChange={(v) => setP("tax_bracket", v)}
                        options={TAX_OPTIONS}
                      />
                    </Field>
                  </div>

                </div>
              </FormSection>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !ticker.trim()}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl transition-all duration-150 flex items-center justify-center gap-2.5"
                style={{ boxShadow: "0 4px 16px 0 rgba(37,99,235,0.3)" }}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Evaluating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Run Evaluation{ticker ? ` · ${ticker}` : ""}
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-slate-400 pb-2">
                For educational purposes only. Not investment advice.
              </p>
            </form>
          </div>

          {/* ── RIGHT: Sticky preview panel ──────────────────────── */}
          <div className="hidden lg:block space-y-4 sticky top-[72px]">

            <div
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              style={{ boxShadow: "0 1px 4px 0 rgba(0,0,0,0.06)" }}
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">What's in your report</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {REPORT_SECTIONS.map((s) => (
                  <div key={s.title} className="flex items-start gap-3 px-5 py-3.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{s.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              style={{ boxShadow: "0 1px 4px 0 rgba(0,0,0,0.06)" }}
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Data Sources</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {DATA_SOURCES.map((s) => (
                  <div key={s.label} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{s.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{s.desc}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-3 ${s.badgeCls}`}>
                      {s.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed px-1">
              Data sourced from Screener.in and Trendlyne. AI analysis via Claude (Anthropic). For educational purposes only — not investment advice.
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
