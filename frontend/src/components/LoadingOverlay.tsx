interface Props {
  steps: string[];
  currentStep: number;
}

const STEP_ICONS: Record<number, React.ReactNode> = {
  0: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  1: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  2: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  ),
  3: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  4: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  5: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// Checkmark icon (completed state)
function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-green-600 animate-check-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Spinner icon (active state)
function SpinnerIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-500 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function LoadingOverlay({ steps, currentStep }: Props) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-sm mx-4 overflow-hidden animate-slide-up">

        {/* Top progress bar */}
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-full bg-brand-500 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-7">
          {/* Header */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
              <svg className="w-5 h-5 text-brand-600 animate-pulse-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Analyzing stock…</p>
              <p className="text-xs text-slate-400">Usually takes around 30 seconds</p>
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-3">
            {steps.map((label, i) => {
              const isDone    = i < currentStep;
              const isActive  = i === currentStep;
              const isPending = i > currentStep;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 transition-opacity duration-300 ${
                    isPending ? "opacity-35" : "opacity-100"
                  }`}
                >
                  {/* Status indicator */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      isDone
                        ? "bg-green-50 border-green-200"
                        : isActive
                        ? "bg-brand-50 border-brand-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {isDone    && <CheckIcon />}
                    {isActive  && <SpinnerIcon />}
                    {isPending && (
                      <div className="text-slate-300">
                        {STEP_ICONS[i] ?? (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-xs leading-snug ${
                      isDone    ? "text-slate-400 line-through decoration-slate-300"
                    : isActive  ? "text-slate-800 font-semibold"
                    : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step counter */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-[10px] text-slate-400">
              {Math.round(progress)}% complete
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
