import { useState, useEffect } from "react";
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

const inputCls =
  "qs-input";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Left panel feature list ──────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Live market data",
    desc: "Real-time scrape from Screener.in + Trendlyne",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Rule-based SWOT",
    desc: "20+ deterministic signals with evidence & strength",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "15-step AI evaluation",
    desc: "Institutional framework powered by Claude",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    title: "News sentiment analysis",
    desc: "Exchange disclosures + media coverage scored",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: "Investor-profile matched",
    desc: "Compatibility scored across 9 dimensions",
  },
];

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-sm font-semibold text-slate-700">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
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
    <div className="min-h-[calc(100vh-56px)] flex flex-col lg:flex-row">

      {/* ── Left panel: dark hero ────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-[42%] flex-col justify-between bg-navy-950 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.8) 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl" />

        <div className="relative px-10 py-14 flex flex-col gap-10">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M9 2L3 9h5l-1 5 7-7H9l1-5z" fill="white" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white font-bold tracking-tight">QUANTSIEVE</span>
          </div>

          {/* Value prop */}
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4 text-balance">
              Institutional-grade<br />
              equity evaluation<br />
              <span className="text-brand-400">for every investor</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              The same rigorous framework used by buy-side analysts —
              now available to Indian retail investors in under 30 seconds.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-brand-600/15 border border-brand-500/20 flex items-center justify-center shrink-0 mt-0.5 text-brand-400">
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative px-10 pb-10 flex items-center justify-between">
          <span className="text-[10px] text-white/40 font-medium">Powered by Claude AI</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-white/40 font-medium">Live data</span>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-5 sm:px-8 py-10 bg-slate-50 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M9 2L3 9h5l-1 5 7-7H9l1-5z" fill="white" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 tracking-tight">QUANTSIEVE</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Evaluate a stock</h2>
            <p className="text-slate-500 text-sm mt-1">Get a 15-step institutional analysis in ~30 seconds</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} autoComplete="off" className="space-y-6">

            {/* ── Stock Details ───────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
              <SectionHeading>Stock Details</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <Field label="NSE / BSE Ticker" required>
                  <input
                    className={`${inputCls} uppercase font-mono font-semibold tracking-wide`}
                    placeholder="e.g. NATCOPHARM"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    required
                  />
                </Field>
                <Field label="Entry Context">
                  <select
                    className={inputCls}
                    value={context}
                    onChange={(e) => setContext(e.target.value as EvaluateRequest["entry_context"])}
                  >
                    <option value="first_purchase">First Purchase</option>
                    <option value="adding">Adding to Position</option>
                    <option value="hold_or_exit">Hold or Exit?</option>
                    <option value="comparing">Comparing Options</option>
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Investment Thesis (optional)">
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={2}
                      placeholder="Why are you interested in this stock?"
                      value={thesis}
                      onChange={(e) => setThesis(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Investor Profile ────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
              <SectionHeading>Your Profile</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Age">
                  <input
                    type="number"
                    className={inputCls}
                    min={18}
                    max={99}
                    value={profile.age}
                    onChange={(e) => setP("age", Number(e.target.value))}
                  />
                </Field>
                <Field label="Investment Goal">
                  <select
                    className={inputCls}
                    value={profile.investment_goal}
                    onChange={(e) => setP("investment_goal", e.target.value as InvestorProfile["investment_goal"])}
                  >
                    <option value="wealth_creation">Wealth Creation</option>
                    <option value="retirement">Retirement</option>
                    <option value="education">Education</option>
                    <option value="home_purchase">Home Purchase</option>
                    <option value="short_term">Short Term</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Investment Horizon">
                  <select
                    className={inputCls}
                    value={profile.investment_horizon}
                    onChange={(e) => setP("investment_horizon", e.target.value)}
                  >
                    <option value="less than 1 year">Less than 1 year</option>
                    <option value="1-3 years">1–3 years</option>
                    <option value="3-5 years">3–5 years</option>
                    <option value="5-7 years">5–7 years</option>
                    <option value="7-10 years">7–10 years</option>
                    <option value="10+ years">10+ years</option>
                  </select>
                </Field>
                <Field label="Entry Mode">
                  <select
                    className={inputCls}
                    value={profile.investment_mode}
                    onChange={(e) => setP("investment_mode", e.target.value as InvestorProfile["investment_mode"])}
                  >
                    <option value="lump_sum">Lump Sum</option>
                    <option value="staggered">Staggered / SIP</option>
                    <option value="adding">Adding to Existing</option>
                  </select>
                </Field>
                <Field label="Portfolio Type">
                  <select
                    className={inputCls}
                    value={profile.portfolio_type}
                    onChange={(e) => setP("portfolio_type", e.target.value as InvestorProfile["portfolio_type"])}
                  >
                    <option value="diversified_10plus">Diversified (10+ stocks)</option>
                    <option value="concentrated_3to5">Concentrated (3–5 stocks)</option>
                    <option value="mostly_mf">Mostly Mutual Funds</option>
                    <option value="first_investment">First Investment</option>
                  </select>
                </Field>
                <Field label="Position Size">
                  <select
                    className={inputCls}
                    value={profile.position_sizing}
                    onChange={(e) => setP("position_sizing", e.target.value as InvestorProfile["position_sizing"])}
                  >
                    <option value="under_5">Under 5%</option>
                    <option value="5_to_10">5–10%</option>
                    <option value="10_to_20">10–20%</option>
                    <option value="over_20">Over 20%</option>
                  </select>
                </Field>
                <Field label="Risk Tolerance">
                  <select
                    className={inputCls}
                    value={profile.risk_tolerance}
                    onChange={(e) => setP("risk_tolerance", e.target.value as InvestorProfile["risk_tolerance"])}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </Field>
                <Field label="Volatility Comfort">
                  <select
                    className={inputCls}
                    value={profile.volatility_preference}
                    onChange={(e) => setP("volatility_preference", e.target.value as InvestorProfile["volatility_preference"])}
                  >
                    <option value="low">Low — prefer stable</option>
                    <option value="medium">Medium</option>
                    <option value="high">High — can handle swings</option>
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Tax Bracket">
                    <select
                      className={inputCls}
                      value={profile.tax_bracket}
                      onChange={(e) => setP("tax_bracket", e.target.value as InvestorProfile["tax_bracket"])}
                    >
                      <option value="30pct">30%</option>
                      <option value="20pct">20%</option>
                      <option value="5to10pct">5–10%</option>
                      <option value="not_sure">Not Sure</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Submit ──────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading || !ticker.trim()}
              className="
                w-full py-3.5 px-6
                bg-brand-600 hover:bg-brand-700
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white text-sm font-semibold
                rounded-xl shadow-md hover:shadow-lg
                transition-all duration-150
                flex items-center justify-center gap-2
              "
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
                  Evaluate {ticker || "Stock"}
                </>
              )}
            </button>

            {/* Footer disclaimer */}
            <p className="text-center text-[10px] text-slate-400">
              For educational purposes only. Not investment advice.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
