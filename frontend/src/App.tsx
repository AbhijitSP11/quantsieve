import { useState } from "react";
import { evaluate } from "./api";
import type { EvaluateRequest, EvaluateResponse } from "./types";
import EvaluateForm from "./components/EvaluateForm";
import LoadingOverlay from "./components/LoadingOverlay";
import ReportPage from "./components/report/ReportPage";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);

  const STEPS = [
    "Fetching live data from Screener.in…",
    "Running rule-based SWOT analysis…",
    "Fetching supplementary data from Trendlyne…",
    "Sending to Claude for 14-step evaluation…",
    "Validating AI response…",
    "Building your report…",
  ];

  async function handleSubmit(req: EvaluateRequest) {
    setError(null);
    setResult(null);
    setLoading(true);
    setStep(0);

    // Cycle through steps while waiting
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
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {loading && <LoadingOverlay steps={STEPS} currentStep={step} />}

      {result ? (
        <ReportPage result={result} onBack={handleReset} />
      ) : (
        <EvaluateForm onSubmit={handleSubmit} loading={loading} error={error} />
      )}
    </div>
  );
}
