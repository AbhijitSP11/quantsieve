interface Props {
  steps: string[];
  currentStep: number;
}

export default function LoadingOverlay({ steps, currentStep }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-50/90 backdrop-blur-sm">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-sm font-semibold text-blue-600 mb-1">
          Step {currentStep + 1} of {steps.length}
        </p>
        <p className="text-slate-600 font-medium">{steps[currentStep]}</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= currentStep ? "w-6 bg-blue-600" : "w-1.5 bg-slate-300"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1">This takes ~30 seconds</p>
    </div>
  );
}
