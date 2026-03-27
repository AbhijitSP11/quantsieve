import crypto from "crypto";
import * as cheerio from "cheerio";
import type { NewsItem, ProviderResult } from "./types.js";
import { getTrustScore, getRelevanceScore } from "../../utils/newsHelpers.js";

/** Strip common legal suffixes so "Natco Pharma Ltd" → "Natco Pharma" */
function shortName(companyName: string): string {
  return companyName.replace(/\s+(ltd|limited|inc|corp|pvt|llp)\.?$/i, "").trim();
}

export async function fetchGoogleNewsRss(
  companyName: string,
  symbol: string
): Promise<ProviderResult> {
  const start = Date.now();
  const providerName = "Google News";

  try {
    const q = encodeURIComponent(`${shortName(companyName)} stock`);
    const url = `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS/2.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
    }

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const items: NewsItem[] = [];

    $("item").each((_i, el) => {
      const rawTitle = $(el).find("title").first().text().trim();
      const pubDate = $(el).find("pubDate").first().text().trim();
      const publisher = $(el).find("source").first().text().trim() || "Google News";
      const googleLink = $(el).find("link").first().text().trim();

      // The description contains HTML-encoded HTML with the real article URL
      // e.g. <a href="https://actual-url.com">Title - Source</a>
      const rawDesc = $(el).find("description").first().text();
      let articleUrl = googleLink; // fallback to Google redirect
      if (rawDesc) {
        const descDom = cheerio.load(rawDesc);
        const href = descDom("a").first().attr("href");
        if (href) articleUrl = href;
      }

      // Google News title sometimes appends "- Source Name"; strip it
      const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").trim() || rawTitle;
      if (!title) return;

      const trustScore = getTrustScore(publisher, "media");
      const summary = null; // RSS only provides title + source

      items.push({
        id: crypto.randomUUID(),
        sourceType: "media" as const,
        exchange: null,
        publisher,
        title,
        summary,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        url: articleUrl,
        attachmentUrl: null,
        category: "article" as const,
        trustScore,
        relevanceScore: getRelevanceScore(title, summary, symbol, companyName),
        finalScore: 0,
        raw: { title: rawTitle, pubDate, publisher, url: articleUrl },
      });
    });

    console.log(`[Google News] Fetched ${items.length} articles for "${shortName(companyName)}"`);
    return { providerName, items: items.slice(0, 25), latencyMs: Date.now() - start };
  } catch (err) {
    return {
      providerName,
      items: [],
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Google News RSS error",
    };
  }
}
