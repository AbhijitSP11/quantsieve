import crypto from "crypto";
import type { NewsItem, ProviderResult } from "./types.js";
import { categorizeAnnouncement, getTrustScore } from "../../utils/newsHelpers.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function bseDateStr(d: Date): string {
  return [
    String(d.getFullYear()),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
}

interface BseRow {
  NEWSSUB?: string;
  HEADLINE?: string;
  NEWSDT?: string;
  NEWS_DT?: string;
  DT_TM?: string;
  ATTACHMENTNAME?: string;
  SCRIP_CD?: string | number;
}

export async function fetchBseAnnouncements(
  symbol: string,
  bseCode?: string
): Promise<ProviderResult> {
  const start = Date.now();
  const providerName = "BSE India";

  try {
    const code = bseCode;
    if (!code) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: "BSE code not provided — pass bse_code from Screener data" };
    }

    const today = new Date();
    const prev = new Date(today);
    prev.setDate(prev.getDate() - 30);

    const url =
      `https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w?strCat=-1` +
      `&strPrevDate=${bseDateStr(prev)}&strScrip=${code}` +
      `&strSearch=P&strToDate=${bseDateStr(today)}&strType=C`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: "https://www.bseindia.com/",
        Origin: "https://www.bseindia.com",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: `BSE API returned HTTP ${res.status}` };
    }

    const data: unknown = await res.json();
    const rows: BseRow[] = (data as Record<string, unknown>)["Table"] as BseRow[] ?? [];

    const items: NewsItem[] = rows
      .filter((r) => r.NEWSSUB ?? r.HEADLINE)
      .map((r) => {
        const title = String(r.NEWSSUB ?? r.HEADLINE ?? "").trim();
        // BSE returns NEWS_DT as ISO-like "2025-03-27T15:46:41.12" (IST, no timezone suffix)
        // DT_TM is the same format. Fall back to NEWSDT "YYYYMMDD" if present.
        const rawDate = r.DT_TM ?? r.NEWS_DT ?? r.NEWSDT ?? "";
        let publishedAt: string;
        if (rawDate.includes("T") || rawDate.includes("-")) {
          // ISO-like: treat as IST (+05:30)
          const normalized = rawDate.replace(" ", "T");
          const d = new Date(`${normalized}+05:30`);
          publishedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        } else if (rawDate.length === 8) {
          // YYYYMMDD
          const yyyy = rawDate.slice(0, 4), mm = rawDate.slice(4, 6), dd = rawDate.slice(6, 8);
          publishedAt = new Date(`${yyyy}-${mm}-${dd}T00:00:00+05:30`).toISOString();
        } else {
          publishedAt = new Date().toISOString();
        }

        const attachment = r.ATTACHMENTNAME
          ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${r.ATTACHMENTNAME}`
          : null;
        const scripCode = r.SCRIP_CD ?? code;
        const url = `https://www.bseindia.com/stock-share-price/${symbol}/${symbol}/${scripCode}/`;

        return {
          id: crypto.randomUUID(),
          sourceType: "official_exchange" as const,
          exchange: "BSE" as const,
          publisher: "BSE India",
          title,
          summary: null,
          publishedAt,
          url,
          attachmentUrl: attachment,
          category: categorizeAnnouncement(title),
          trustScore: getTrustScore("BSE India", "official_exchange"),
          relevanceScore: 90,
          finalScore: 0,
          raw: r,
        };
      });

    return { providerName, items, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      providerName,
      items: [],
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown BSE error",
    };
  }
}
