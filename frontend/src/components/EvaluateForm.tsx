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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-inherit";

export default function EvaluateForm({ onSubmit, loading, error }: Props) {
  const { user, profile: userProfile } = useAuth();
  const [ticker, setTicker] = useState("");
  const [context, setContext] = useState<EvaluateRequest["entry_context"]>("first_purchase");
  const [thesis, setThesis] = useState("");
  const [profile, setProfile] = useState<InvestorProfile>(DEFAULT_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Auto-fill investor profile from saved Supabase profile when user signs in
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
    // Save investor profile to Supabase whenever a signed-in user submits
    if (user) void saveInvestorProfile(profile);
    onSubmit({
      ticker: ticker.trim().toUpperCase(),
      entry_context: context,
      ...(thesis.trim() ? { thesis: thesis.trim() } : {}),
      profile,
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="text-2xl font-extrabold text-blue-600 tracking-widest mb-1">⚡ QUANTSIEVE</div>
        <p className="text-slate-500 text-sm">AI-powered stock evaluation for Indian retail investors</p>
      </header>

      {/* Info strip */}
      <div className="flex flex-wrap gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-blue-800 text-xs font-medium">
        <span>📡 Live Screener.in data</span>
        <span>📊 Rule-based SWOT</span>
        <span>🤖 14-step Claude analysis</span>
        <span>📈 Trendlyne supplementary</span>
        <span>⏱ ~30 seconds</span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3.5 mb-5 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} autoComplete="off" className="space-y-4">
        {/* Stock Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 pb-3 border-b border-slate-100">
            Stock Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="NSE / BSE Ticker *">
              <input
                className={`${inputCls} uppercase font-mono`}
                placeholder="e.g. NATCOPHARM"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                required
              />
            </Field>
            <Field label="Entry Context">
              <select className={inputCls} value={context} onChange={(e) => setContext(e.target.value as EvaluateRequest["entry_context"])}>
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

        {/* Investor Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 pb-3 border-b border-slate-100">
            Investor Profile
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your Age">
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
              <select className={inputCls} value={profile.investment_goal} onChange={(e) => setP("investment_goal", e.target.value as InvestorProfile["investment_goal"])}>
                <option value="wealth_creation">Wealth Creation</option>
                <option value="retirement">Retirement</option>
                <option value="education">Education</option>
                <option value="home_purchase">Home Purchase</option>
                <option value="short_term">Short Term</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Investment Horizon">
              <select className={inputCls} value={profile.investment_horizon} onChange={(e) => setP("investment_horizon", e.target.value)}>
                <option value="less than 1 year">Less than 1 year</option>
                <option value="1-3 years">1–3 years</option>
                <option value="3-5 years">3–5 years</option>
                <option value="5-7 years">5–7 years</option>
                <option value="7-10 years">7–10 years</option>
                <option value="10+ years">10+ years</option>
              </select>
            </Field>
            <Field label="Entry Mode">
              <select className={inputCls} value={profile.investment_mode} onChange={(e) => setP("investment_mode", e.target.value as InvestorProfile["investment_mode"])}>
                <option value="lump_sum">Lump Sum</option>
                <option value="staggered">Staggered / SIP</option>
                <option value="adding">Adding to Existing</option>
              </select>
            </Field>
            <Field label="Portfolio Type">
              <select className={inputCls} value={profile.portfolio_type} onChange={(e) => setP("portfolio_type", e.target.value as InvestorProfile["portfolio_type"])}>
                <option value="diversified_10plus">Diversified (10+ stocks)</option>
                <option value="concentrated_3to5">Concentrated (3–5 stocks)</option>
                <option value="mostly_mf">Mostly Mutual Funds</option>
                <option value="first_investment">First Investment</option>
              </select>
            </Field>
            <Field label="Position Size">
              <select className={inputCls} value={profile.position_sizing} onChange={(e) => setP("position_sizing", e.target.value as InvestorProfile["position_sizing"])}>
                <option value="under_5">Under 5%</option>
                <option value="5_to_10">5–10%</option>
                <option value="10_to_20">10–20%</option>
                <option value="over_20">Over 20%</option>
              </select>
            </Field>
            <Field label="Risk Tolerance">
              <select className={inputCls} value={profile.risk_tolerance} onChange={(e) => setP("risk_tolerance", e.target.value as InvestorProfile["risk_tolerance"])}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Volatility Comfort">
              <select className={inputCls} value={profile.volatility_preference} onChange={(e) => setP("volatility_preference", e.target.value as InvestorProfile["volatility_preference"])}>
                <option value="low">Low — prefer stable</option>
                <option value="medium">Medium</option>
                <option value="high">High — can handle swings</option>
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Tax Bracket">
                <select className={inputCls} value={profile.tax_bracket} onChange={(e) => setP("tax_bracket", e.target.value as InvestorProfile["tax_bracket"])}>
                  <option value="30pct">30%</option>
                  <option value="20pct">20%</option>
                  <option value="5to10pct">5–10%</option>
                  <option value="not_sure">Not Sure</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !ticker.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition"
        >
          {loading ? "Evaluating…" : "⚡ Evaluate Stock"}
        </button>
      </form>
    </div>
  );
}
