import crypto from "crypto";
import type { NewsItem, ProviderResult } from "./types.js";
import { getTrustScore, getRelevanceScore } from "../../utils/newsHelpers.js";

interface NewsApiArticle {
  title?: string;
  description?: string;
  publishedAt?: string;
  url?: string;
  source?: { name?: string };
}

interface NewsApiResponse {
  status?: string;
  articles?: NewsApiArticle[];
}

export async function fetchNewsApiNews(
  companyName: string,
  symbol: string
): Promise<ProviderResult> {
  const start = Date.now();
  const providerName = "NewsAPI.org";

  const apiKey = process.env["NEWSAPI_KEY"];
  if (!apiKey) {
    return { providerName, items: [], latencyMs: 0 };
  }

  try {
    const query = encodeURIComponent(`"${companyName}"`);
    const url =
      `https://newsapi.org/v2/everything?q=${query}&language=en` +
      `&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (res.status === 429) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: "Rate limited" };
    }
    if (!res.ok) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as NewsApiResponse;
    const articles: NewsApiArticle[] = data.articles ?? [];

    const items: NewsItem[] = articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => {
        const title = String(a.title ?? "").trim();
        const publisher = String(a.source?.name ?? "Unknown").trim();
        const trustScore = getTrustScore(publisher, "media");
        const summary = a.description ? String(a.description).slice(0, 300) : null;

        return {
          id: crypto.randomUUID(),
          sourceType: "media" as const,
          exchange: null,
          publisher,
          title,
          summary,
          publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
          url: a.url ?? "",
          attachmentUrl: null,
          category: "article" as const,
          trustScore,
          relevanceScore: getRelevanceScore(title, summary, symbol, companyName),
          finalScore: 0,
          raw: a,
        };
      });

    return { providerName, items, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      providerName,
      items: [],
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "NewsAPI.org error",
    };
  }
}
