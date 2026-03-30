import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { evaluate } from "./api";
import type { EvaluateRequest, EvaluateResponse } from "./types";
import EvaluateForm from "./components/EvaluateForm";
import LoadingOverlay from "./components/LoadingOverlay";
import ReportPage from "./components/report/ReportPage";
import SavedReports from "./components/reports/SavedReports";
import AuthButton from "./components/auth/AuthButton";

type Tab = "evaluate" | "reports";

const STEPS = [
  "Fetching live data from Screener.in…",
  "Running rule-based SWOT analysis…",
  "Fetching supplementary data from Trendlyne…",
  "Running 15-step Claude evaluation…",
  "Analyzing news sentiment…",
  "Building your report…",
];

// ─── Logo mark ───────────────────────────────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-blue-600 shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="none">
        <path d="M9 2L3 9h5l-1 5 7-7H9l1-5z" fill="white" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Inner app (needs auth context) ──────────────────────────────────────────

function AppInner() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("evaluate");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);

  async function handleSubmit(req: EvaluateRequest) {
    setError(null);
    setResult(null);
    setLoading(true);
    setStep(0);

    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 5500);

    try {
      const data = await evaluate(req);
      clearInterval(interval);
      setResult(data);
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setTab("evaluate");
  }

  // Full-screen report view — no nav chrome
  if (result) {
    return (
      <>
        {loading && <LoadingOverlay steps={STEPS} currentStep={step} />}
        <ReportPage result={result} onBack={handleReset} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {loading && <LoadingOverlay steps={STEPS} currentStep={step} />}

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200" style={{ boxShadow: "0 1px 3px 0 rgba(0,0,0,0.06)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <div className="flex items-baseline gap-2">
              <span className="font-black text-slate-900 tracking-tight text-sm">QUANTSIEVE</span>
              <span className="hidden md:block text-slate-400 text-xs font-medium border-l border-slate-200 pl-2 ml-0.5">
                Institutional Equity Evaluation
              </span>
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-1">
            {/* Tab switcher — underline style, matches hero section height */}
            <nav className="flex items-stretch h-14">
              <button
                onClick={() => setTab("evaluate")}
                className={`flex items-center px-4 text-sm font-semibold transition-all border-b-2 ${
                  tab === "evaluate"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Evaluate
              </button>
              {user && (
                <button
                  onClick={() => setTab("reports")}
                  className={`flex items-center px-4 text-sm font-semibold transition-all border-b-2 ${
                    tab === "reports"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  My Reports
                </button>
              )}
            </nav>

            <div className="ml-2">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {tab === "evaluate" ? (
        <EvaluateForm onSubmit={handleSubmit} loading={loading} error={error} />
      ) : (
        <SavedReports
          onOpenReport={(r) => {
            setResult(r);
            setTab("evaluate");
          }}
        />
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
