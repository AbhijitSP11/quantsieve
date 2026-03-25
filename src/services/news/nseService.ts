import crypto from "crypto";
import type { NewsItem, ProviderResult } from "./types.js";
import { categorizeAnnouncement, getTrustScore } from "../../utils/newsHelpers.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function getNseCookies(): Promise<string> {
  const res = await fetch("https://www.nseindia.com/", {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

interface NseRow {
  subject?: string;
  desc?: string;
  attchmntFile?: string;
  an_dt?: string;
  symbol?: string;
}

async function attemptFetch(symbol: string): Promise<ProviderResult> {
  const start = Date.now();
  const providerName = "NSE India";

  const cookies = await getNseCookies();
  await new Promise<void>((r) => setTimeout(r, 500));

  const res = await fetch(
    `https://www.nseindia.com/api/corporate-announcements?index=equities&symbol=${encodeURIComponent(symbol)}`,
    {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://www.nseindia.com/",
        Cookie: cookies,
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (res.status === 401 || res.status === 403 || res.status === 429) {
    return { providerName, items: [], latencyMs: Date.now() - start, error: "NSE API blocked/rate-limited" };
  }
  if (!res.ok) {
    return { providerName, items: [], latencyMs: Date.now() - start, error: `NSE returned HTTP ${res.status}` };
  }

  const data: unknown = await res.json();
  const rows: NseRow[] = Array.isArray(data) ? (data as NseRow[]) : [];

  const items: NewsItem[] = rows
    .filter((r) => r.subject)
    .map((r) => {
      const title = String(r.subject ?? "").trim();
      const publishedAt = r.an_dt
        ? new Date(r.an_dt).toISOString()
        : new Date().toISOString();
      const attachment = r.attchmntFile
        ? `https://nsearchives.nseindia.com/corporate/${r.attchmntFile}`
        : null;

      return {
        id: crypto.randomUUID(),
        sourceType: "official_exchange" as const,
        exchange: "NSE" as const,
        publisher: "NSE India",
        title,
        summary: r.desc ? String(r.desc).slice(0, 300) : null,
        publishedAt,
        url: `https://www.nseindia.com/companies-listing/corporate-filings-announcements`,
        attachmentUrl: attachment,
        category: categorizeAnnouncement(title),
        trustScore: getTrustScore("NSE India", "official_exchange"),
        relevanceScore: 90,
        finalScore: 0,
        raw: r,
      };
    });

  return { providerName, items, latencyMs: Date.now() - start };
}

export async function fetchNseAnnouncements(symbol: string): Promise<ProviderResult> {
  const providerName = "NSE India";
  try {
    return await attemptFetch(symbol);
  } catch {
    // First attempt failed — retry once after 2 seconds
    try {
      await new Promise<void>((r) => setTimeout(r, 2000));
      return await attemptFetch(symbol);
    } catch (err) {
      return {
        providerName,
        items: [],
        latencyMs: 0,
        error: err instanceof Error ? err.message : "NSE API unavailable",
      };
    }
  }
}
