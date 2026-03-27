import { useState } from "react";
import type { EvaluateResponse } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { saveReport } from "../../lib/db";
import CoverSection from "./CoverSection";
import SnapshotGrid from "./SnapshotGrid";
import SwotSection from "./SwotSection";
import TrendlyneSection from "./TrendlyneSection";
import FlagsSection from "./FlagsSection";
import FinancialsSection from "./FinancialsSection";
import ValuationSection from "./ValuationSection";
import MarketExpectationsSection from "./MarketExpectationsSection";
import EntryStrategySection from "./EntryStrategySection";
import QualityChecks from "./QualityChecks";
import CompatibilitySection from "./CompatibilitySection";
import VerdictSection from "./VerdictSection";
import BenchmarksSection from "./BenchmarksSection";
import StockNews from "../news/StockNews";
import NewsSentiment from "../news/NewsSentiment";

interface Props {
  result: EvaluateResponse;
  onBack: () => void;
}

export default function ReportPage({ result, onBack }: Props) {
  const { stock, swot, trendlyne, news, sentiment, evaluation } = result;
  const { user } = useAuth();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    if (!user || saveState === "saving" || saveState === "saved") return;
    setSaveState("saving");
    const saved = await saveReport(result, "first_purchase");
    setSaveState(saved ? "saved" : "error");
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between print:hidden">
        <div className="font-bold text-blue-600 tracking-widest text-sm">⚡ QUANTSIEVE</div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition font-medium"
          >
            ← New Evaluation
          </button>

          {user && (
            <button
              onClick={() => void handleSave()}
              disabled={saveState === "saving" || saveState === "saved"}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${
                saveState === "saved"
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : saveState === "error"
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "border border-slate-200 hover:bg-slate-50 text-slate-700"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {saveState === "saving" ? "Saving…"
                : saveState === "saved" ? "✓ Saved"
                : saveState === "error" ? "Save failed"
                : "Save Report"}
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            ⬇ Print / PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <CoverSection stock={stock} evaluation={evaluation} />
        <SnapshotGrid stock={stock} evaluation={evaluation} />
        <SwotSection swot={swot} />
        {trendlyne && <TrendlyneSection trendlyne={trendlyne} />}
        <FlagsSection evaluation={evaluation} />
        <FinancialsSection evaluation={evaluation} />
        <ValuationSection evaluation={evaluation} stock={stock} />
        <QualityChecks evaluation={evaluation} />
        <CompatibilitySection evaluation={evaluation} />
        <MarketExpectationsSection data={evaluation.market_expectation_analysis} />
        <EntryStrategySection data={evaluation.entry_strategy} />
        <VerdictSection evaluation={evaluation} />
        <BenchmarksSection evaluation={evaluation} />

        {/* Latest News & Disclosures */}
        <StockNews
          symbol={stock.ticker}
          companyName={stock.company_name ?? undefined}
          initialData={news}
        />

        {/* Institutional News Sentiment */}
        {sentiment ? (
          <NewsSentiment sentiment={sentiment} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Institutional News Sentiment
              </span>
              <span className="text-[10px] text-slate-400">AI-powered · Claude</span>
            </div>
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <div className="text-slate-300 text-3xl">◎</div>
              <div className="text-sm font-medium text-slate-500">
                {news && news.items.length > 0
                  ? "Sentiment analysis could not be generated for this run."
                  : "No news data available — BSE/NSE/Google News required."}
              </div>
              <div className="text-xs text-slate-400 max-w-sm">
                {news && news.items.length > 0
                  ? "Re-run the evaluation to generate an institutional sentiment analysis based on the latest news."
                  : "Ensure the server can reach BSE India and Google News, then re-run the evaluation."}
              </div>
            </div>
          </div>
        )}

        {/* Data Gaps */}
        {evaluation.data_gaps.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Data Gaps</span>
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">
                {evaluation.data_gaps.filter(g => g.materiality === "MATERIAL").length} material
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {evaluation.data_gaps.map((g, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${g.materiality === "MATERIAL" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                    {g.materiality}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{g.field}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{g.impact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 py-4 print:block">
          Generated by QuantSieve · Data from Screener.in · AI via Claude (Anthropic) · For informational purposes only
        </p>
      </div>
    </div>
  );
}
