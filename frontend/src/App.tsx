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
  "Sending to Claude for 14-step evaluation…",
  "Validating AI response…",
  "Building your report…",
];

// ─── Inner app (needs auth context) ─────────────────────────────────────────

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
    }, 6000);

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

  // If showing a report, render full-screen (no chrome)
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

      {/* ── Top nav ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="font-bold text-blue-600 tracking-widest text-sm">⚡ QUANTSIEVE</div>

        <div className="flex items-center gap-3">
          {/* Tab switcher — only show My Reports when signed in */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setTab("evaluate")}
              className={`px-3 py-1.5 transition ${
                tab === "evaluate"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Evaluate
            </button>
            {user && (
              <button
                onClick={() => setTab("reports")}
                className={`px-3 py-1.5 transition border-l border-slate-200 ${
                  tab === "reports"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                My Reports
              </button>
            )}
          </div>

          <AuthButton />
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
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

// ─── Root with provider ───────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
