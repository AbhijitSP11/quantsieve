import Anthropic from "@anthropic-ai/sdk";
import type { StockData } from "../types/stock.js";
import type { EvaluationInput } from "../types/profile.js";
import type { EvaluationReport } from "../types/evaluation.js";
import { STOCK_EVALUATOR_PROMPT } from "../prompts/stockEvaluator.js";
import { evaluationReportSchema } from "../utils/validators.js";
import { env } from "../config/env.js";
import type { SwotResult } from "./swotEngine.js";
import type { TrendlyneData } from "./trendlyneScraper.js";
import type { NewsItem } from "./news/types.js";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

function buildSwotSection(swot: SwotResult): string {
  const lines: string[] = [
    `PRE-COMPUTED SWOT ANALYSIS (rule-based, from live data):`,
    ``,
    `STRENGTHS (${swot.summary.s}):`,
    ...swot.strengths.map((s) => `• ${s.label}: ${s.detail}`),
    ``,
    `WEAKNESSES (${swot.summary.w}):`,
    ...swot.weaknesses.map((w) => `• ${w.label}: ${w.detail}`),
    ``,
    `OPPORTUNITIES (${swot.summary.o}):`,
    ...swot.opportunities.map((o) => `• ${o.label}: ${o.detail}`),
    ``,
    `THREATS (${swot.summary.t}):`,
    ...swot.threats.map((t) => `• ${t.label}: ${t.detail}`),
    ``,
    `Use these pre-computed signals alongside the raw financial data. Incorporate relevant SWOT items into your quality checks, risk assessment, and verdict reasoning. Flag any SWOT items that are especially relevant to this specific investor's profile.`,
  ];
  return lines.join("\n");
}

function buildTrendlyneSection(tl: TrendlyneData): string {
  if (!tl.fetched) return "";
  const lines: string[] = ["SUPPLEMENTARY DATA (from Trendlyne):"];
  lines.push(`Beta: ${tl.beta !== null ? tl.beta : "N/A"}`);
  if (tl.analyst_target_price !== null) {
    lines.push(
      `Analyst Consensus Target: ₹${tl.analyst_target_price}${tl.analyst_count !== null ? ` (${tl.analyst_count} analysts)` : ""}`
    );
  }
  if (tl.dvm_scores !== null) {
    lines.push(
      `DVM Scores: Durability ${tl.dvm_scores.durability ?? "N/A"}/100, Valuation ${tl.dvm_scores.valuation ?? "N/A"}/100, Momentum ${tl.dvm_scores.momentum ?? "N/A"}/100`
    );
    if (tl.dvm_scores.label !== null) {
      lines.push(`Trendlyne Classification: ${tl.dvm_scores.label}`);
    }
  }
  if (tl.retail_sentiment !== null) {
    lines.push(
      `Retail Sentiment: ${tl.retail_sentiment.buy_pct ?? "N/A"}% Buy, ${tl.retail_sentiment.sell_pct ?? "N/A"}% Sell, ${tl.retail_sentiment.hold_pct ?? "N/A"}% Hold`
    );
  }
  return lines.join("\n");
}

function buildNewsSection(newsItems: NewsItem[]): string {
  if (newsItems.length === 0) return "";
  const top = newsItems.slice(0, 10); // cap tokens
  const official = top.filter((n) => n.sourceType === "official_exchange");
  const media = top.filter((n) => n.sourceType === "media");
  const lines: string[] = ["RECENT NEWS & DISCLOSURES (last 30 days):"];
  for (const item of official) {
    lines.push(
      `[OFFICIAL - ${item.exchange}] ${item.publishedAt.slice(0, 10)}: ${item.title}`
    );
  }
  for (const item of media) {
    lines.push(
      `[NEWS - ${item.publisher}] ${item.publishedAt.slice(0, 10)}: ${item.title}${item.summary ? ` — ${item.summary.slice(0, 100)}` : ""}`
    );
  }
  lines.push(
    "\nConsider these recent developments in your risk assessment and flags. If any news item represents a material event (regulatory action, management change, major contract, earnings surprise), flag it in your analysis."
  );
  return lines.join("\n");
}

export async function evaluateStock(
  stockData: StockData,
  input: EvaluationInput,
  swot: SwotResult,
  trendlyne?: TrendlyneData,
  recentNews?: NewsItem[]
): Promise<EvaluationReport> {
  const swotSection = buildSwotSection(swot);
  const trendlyneSection =
    trendlyne !== undefined ? buildTrendlyneSection(trendlyne) : "";
  const newsSection =
    recentNews && recentNews.length > 0 ? buildNewsSection(recentNews) : "";

  const userContent = [
    `LIVE STOCK DATA:\n${JSON.stringify(stockData, null, 2)}`,
    `\nINVESTOR PROFILE:\n${JSON.stringify(input.profile, null, 2)}`,
    `\nENTRY CONTEXT: ${input.entry_context}`,
    input.thesis ? `\nINVESTOR THESIS: ${input.thesis}` : "",
    `\n${swotSection}`,
    trendlyneSection.length > 0 ? `\n${trendlyneSection}` : "",
    newsSection.length > 0 ? `\n${newsSection}` : "",
    `\nRun the complete 14-step evaluation. Return ONLY valid JSON matching the EvaluationReport schema. No markdown, no explanation outside the JSON.`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: STOCK_EVALUATOR_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error(
      "Claude returned an unexpected response format. Please try again."
    );
  }

  const text = firstBlock.text;
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Claude returned invalid JSON. Raw response:\n${text.slice(0, 500)}`
    );
  }

  const result = evaluationReportSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Claude response failed schema validation:\n${result.error.message}`
    );
  }

  return result.data;
}
