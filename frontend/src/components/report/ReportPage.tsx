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
  console.log('result :', result);
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
      <div className="sticky top-0 z-40 bg-navy-950 border-b border-navy-800 px-4 sm:px-6 h-14 flex items-center justify-between print:hidden">
        {/* Brand + stock name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M9 2L3 9h5l-1 5 7-7H9l1-5z" fill="white" />
              </svg>
            </div>
            <span className="hidden sm:block font-bold text-white text-sm tracking-tight">QUANTSIEVE</span>
          </div>
          <span className="text-white/20 hidden sm:block">/</span>
          <span className="font-mono font-bold text-white text-sm truncate">{stock.ticker}</span>
          <span className="hidden md:block text-slate-500 text-xs truncate">{stock.company_name}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">New Evaluation</span>
          </button>

          {user && (
            <button
              onClick={() => void handleSave()}
              disabled={saveState === "saving" || saveState === "saved"}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                saveState === "saved"
                  ? "bg-green-600 text-white"
                  : saveState === "error"
                  ? "bg-red-600 text-white"
                  : "bg-navy-800 text-slate-300 hover:bg-navy-700 hover:text-white border border-navy-700"
              }`}
            >
              {saveState === "saving" ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : saveState === "saved" ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              )}
              <span className="hidden sm:inline">
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Failed" : "Save"}
              </span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Print / PDF</span>
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
