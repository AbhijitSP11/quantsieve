import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../config/env.js";
import type { NewsItem } from "./news/types.js";
import type { NewsSentimentAnalysis } from "../types/newsSentiment.js";
import { NEWS_SENTIMENT_SYSTEM_PROMPT, NEWS_SENTIMENT_USER_PREFIX } from "../prompts/newsSentimentPrompt.js";
import { generateMockSentiment } from "./newsSentimentService.mock.js";

// Set to true to use mock data instead of Claude API (saves API charges during testing)
const USE_SENTIMENT_MOCK = process.env.USE_SENTIMENT_MOCK === "true";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const sentimentScoreEnum = z.enum([
  "STRONGLY_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "STRONGLY_BEARISH",
]);
const signalSentimentEnum = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]);

const newsSentimentSchema = z.object({
  overall: z.object({
    score: sentimentScoreEnum,
    confidence: z.enum(["HIGH", "MODERATE", "LOW"]),
    headline: z.string(),
    summary: z.string(),
  }),
  signal_breakdown: z.object({
    official: z.object({
      sentiment: signalSentimentEnum,
      count: z.number(),
      key_events: z.array(z.string()),
    }),
    media: z.object({
      sentiment: signalSentimentEnum,
      count: z.number(),
      dominant_themes: z.array(z.string()),
    }),
  }),
  institutional_flags: z.array(
    z.object({
      type: z.enum(["RISK", "OPPORTUNITY", "WATCH"]),
      category: z.enum([
        "Corporate Action", "Regulatory", "Insider Activity",
        "Management", "Financials", "Operational", "Market", "Other",
      ]),
      title: z.string(),
      detail: z.string(),
    })
  ),
  price_catalysts: z.array(
    z.object({
      horizon: z.enum(["NEAR_TERM", "MEDIUM_TERM", "LONG_TERM"]),
      direction: z.enum(["POSITIVE", "NEGATIVE"]),
      event: z.string(),
      expected_impact: z.string(),
    })
  ),
  institutional_action: z.object({
    recommendation: z.enum(["ACCUMULATE", "HOLD", "REDUCE", "MONITOR", "AVOID"]),
    rationale: z.string(),
    time_horizon: z.string(),
    key_risks: z.array(z.string()),
    key_upside: z.array(z.string()),
  }),
  meta: z.object({
    items_analyzed: z.number(),
    official_count: z.number(),
    media_count: z.number(),
    freshness: z.enum(["FRESH", "RECENT", "STALE"]),
    coverage_period: z.string(),
  }),
});


// ─── Main function ────────────────────────────────────────────────────────────

export async function analyzeNewsSentiment(
  newsItems: NewsItem[],
  companyName: string,
  symbol: string,
  sector: string
): Promise<NewsSentimentAnalysis | null> {
  if (newsItems.length < 1) {
    console.log("[NewsSentiment] Skipping — no news items available");
    return null;
  }

  console.log(`[NewsSentiment] Analysing ${newsItems.length} items for ${symbol}`);

  const official = newsItems.filter((n) => n.sourceType === "official_exchange");
  const media = newsItems.filter((n) => n.sourceType === "media");

  // Build a concise but information-dense news digest for Claude
  const lines: string[] = [
    `COMPANY: ${companyName} (${symbol}) | SECTOR: ${sector}`,
    `TOTAL NEWS ITEMS: ${newsItems.length} (${official.length} official exchange filings, ${media.length} media articles)`,
    ``,
    `=== OFFICIAL EXCHANGE FILINGS (BSE/NSE) ===`,
  ];

  for (const item of official.slice(0, 20)) {
    lines.push(`[${item.exchange ?? "EXCH"} | ${item.publishedAt.slice(0, 10)} | ${item.category.toUpperCase()}] ${item.title}`);
  }

  lines.push(``, `=== MEDIA COVERAGE ===`);
  for (const item of media.slice(0, 15)) {
    const summaryText = item.summary ? ` — ${item.summary.slice(0, 120)}` : "";
    lines.push(`[${item.publisher} | ${item.publishedAt.slice(0, 10)}] ${item.title}${summaryText}`);
  }

  lines.push(
    ``,
    `Analyse all items above. Return JSON only.`
  );

  const userContent = `${NEWS_SENTIMENT_USER_PREFIX}\n\n${lines.join("\n")}`;

  try {
    // ─── Test mode: use mock sentiment data instead of Claude API ─────────────────
    if (USE_SENTIMENT_MOCK) {
      console.log("[NewsSentiment] ⚠️  MOCK MODE ENABLED — returning test data (set USE_SENTIMENT_MOCK=false to use real Claude API)");
      const mockData = generateMockSentiment(companyName, symbol);
      const result = newsSentimentSchema.safeParse(mockData);
      if (!result.success) {
        console.error("[NewsSentiment] Mock data failed schema validation! This is a bug.");
        return null;
      }
      console.log(`[NewsSentiment] Mock Done — score=${result.data.overall.score} action=${result.data.institutional_action.recommendation}`);
      return result.data;
    }

    // ─── Production: call Claude API ─────────────────────────────────────────────
    const message = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: NEWS_SENTIMENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") return null;

    const cleaned = firstBlock.text.replace(/```json\n?|```\n?/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);

    const result = newsSentimentSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[NewsSentiment] Schema validation failed:");
      console.warn("[NewsSentiment] Error details:", JSON.stringify(result.error.flatten(), null, 2));
      console.warn("[NewsSentiment] Full Claude response:", cleaned);
      console.warn("[NewsSentiment] Parsed JSON:", JSON.stringify(parsed, null, 2));
      return null;
    }

    console.log(`[NewsSentiment] Done — score=${result.data.overall.score} action=${result.data.institutional_action.recommendation}`);
    console.log('result.data for sentiment:', result.data);
    return result.data;
  } catch (err) {
    console.warn("[NewsSentiment] Analysis failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
