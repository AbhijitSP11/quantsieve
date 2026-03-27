import crypto from "crypto";
import type { NewsItem, ProviderResult } from "./types.js";
import { getTrustScore, getRelevanceScore } from "../../utils/newsHelpers.js";

interface NewsdataArticle {
  title?: string;
  description?: string;
  pubDate?: string;
  link?: string;
  source_name?: string;
  source_id?: string;
}

interface NewsdataResponse {
  status?: string;
  results?: NewsdataArticle[];
}

export async function fetchNewsdataNews(
  companyName: string,
  symbol: string
): Promise<ProviderResult> {
  const start = Date.now();
  const providerName = "NewsData.io";

  const apiKey = process.env["NEWSDATA_API_KEY"];
  if (!apiKey) {
    return { providerName, items: [], latencyMs: 0 };
  }

  try {
    // Strip legal suffixes so "Natco Pharma Ltd" → "Natco Pharma" for better matches
    const shortName = companyName.replace(/\s+(ltd|limited|inc|corp|pvt)\.?$/i, "").trim();
    const query = encodeURIComponent(shortName);
    const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${query}&country=in&language=en`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (res.status === 429) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: "Rate limited" };
    }
    if (!res.ok) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as NewsdataResponse;
    const results: NewsdataArticle[] = data.results ?? [];

    const items: NewsItem[] = results
      .filter((a) => a.title)
      .map((a) => {
        const title = String(a.title ?? "").trim();
        const publisher = String(a.source_name ?? a.source_id ?? "Unknown").trim();
        const trustScore = getTrustScore(publisher, "media");
        const summary = a.description ? String(a.description).slice(0, 300) : null;

        return {
          id: crypto.randomUUID(),
          sourceType: "media" as const,
          exchange: null,
          publisher,
          title,
          summary,
          publishedAt: a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
          url: a.link ?? "",
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
      error: err instanceof Error ? err.message : "NewsData.io error",
    };
  }
}
