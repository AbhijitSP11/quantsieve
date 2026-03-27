import type { NewsItem, NewsResponse, ProviderResult } from "./types.js";
import { fetchBseAnnouncements } from "./bseService.js";
import { fetchNseAnnouncements } from "./nseService.js";
import { fetchNewsdataNews } from "./newsdataService.js";
import { fetchNewsApiNews } from "./newsApiService.js";
import { fetchGoogleNewsRss } from "./googleNewsService.js";
import { computeFinalScore, deduplicateNews } from "../../utils/newsHelpers.js";

// ─── Provider runners ─────────────────────────────────────────────────────────

function shouldRunNewsdata(): boolean {
  return Boolean(process.env["NEWSDATA_API_KEY"]);
}
function shouldRunNewsApi(): boolean {
  return Boolean(process.env["NEWSAPI_KEY"]);
}

type SettledResult = PromiseSettledResult<ProviderResult>;

function toProviderMeta(
  r: SettledResult,
  defaultName: string
): NewsResponse["providers"][number] {
  if (r.status === "rejected") {
    return { name: defaultName, status: "failed", itemCount: 0, latencyMs: 0, error: String(r.reason) };
  }
  const { providerName, items, latencyMs, error } = r.value;
  return {
    name: providerName,
    status: error && items.length === 0 ? "failed" : "success",
    itemCount: items.length,
    latencyMs,
    ...(error ? { error } : {}),
  };
}

function skippedMeta(name: string): NewsResponse["providers"][number] {
  return { name, status: "skipped", itemCount: 0, latencyMs: 0 };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function sortItems(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    // Official first
    if (a.sourceType !== b.sourceType) {
      return a.sourceType === "official_exchange" ? -1 : 1;
    }
    // Then by finalScore desc
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    // Then by recency desc
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

// ─── Main aggregator ──────────────────────────────────────────────────────────
// Provider order: BSE (official) → NSE (official) → Google News (free, no key) →
//                 NewsData.io (optional key) → NewsAPI.org (optional key)

export async function fetchAllNews(
  symbol: string,
  companyName?: string,
  bseCode?: string
): Promise<NewsResponse> {
  const co = companyName ?? symbol;

  // Google News is always run — free, no API key needed
  // NewsData.io and NewsAPI.org only run if keys are present
  const tasks: Promise<ProviderResult>[] = [
    fetchBseAnnouncements(symbol, bseCode),
    fetchNseAnnouncements(symbol),
    fetchGoogleNewsRss(co, symbol),
    ...(shouldRunNewsdata() ? [fetchNewsdataNews(co, symbol)] : []),
    ...(shouldRunNewsApi() ? [fetchNewsApiNews(co, symbol)] : []),
  ];

  console.log(`[News] Fetching for ${symbol} (${co}) bseCode=${bseCode ?? "none"} — ${tasks.length} provider(s)`);
  const settled = await Promise.allSettled(tasks);

  // settled indices: 0=BSE, 1=NSE, 2=GoogleNews, 3+=optional media
  const [bseSettled, nseSettled, googleSettled, ...optionalSettled] = settled;

  let optIdx = 0;
  const providers: NewsResponse["providers"] = [
    toProviderMeta(bseSettled!, "BSE India"),
    toProviderMeta(nseSettled!, "NSE India"),
    toProviderMeta(googleSettled!, "Google News"),
    ...(shouldRunNewsdata()
      ? [toProviderMeta(optionalSettled[optIdx++]!, "NewsData.io")]
      : [skippedMeta("NewsData.io")]),
    ...(shouldRunNewsApi()
      ? [toProviderMeta(optionalSettled[optIdx++]!, "NewsAPI.org")]
      : [skippedMeta("NewsAPI.org")]),
  ];

  // Collect all items
  const allItems: NewsItem[] = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value.items : []
  );

  // Deduplicate, score, sort, cap at 30
  const deduped = deduplicateNews(allItems);
  const scored = deduped.map((item) => ({ ...item, finalScore: computeFinalScore(item) }));
  const sorted = sortItems(scored);
  const items = sorted.slice(0, 30);

  console.log(`[News] Done — ${items.length} items. Providers: ${providers.map((p) => `${p.name}:${p.status}(${p.itemCount})`).join(", ")}`);

  return {
    symbol,
    companyName: companyName ?? null,
    fetchedAt: new Date().toISOString(),
    providers,
    items,
  };
}
