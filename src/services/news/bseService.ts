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

async function resolveBseCode(symbol: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bseindia.com/BseIndiaAPI/api/Suggest/w?Type=SS&text=${encodeURIComponent(symbol)}`,
      { headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://www.bseindia.com/" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const list = Array.isArray(data) ? data : (data as Record<string, unknown>)["Table"];
    if (!Array.isArray(list) || list.length === 0) return null;
    const match = (list as Record<string, unknown>[]).find(
      (r) => String(r["NSESYMBOL"] ?? r["NSE_SYMBOL"] ?? "").toUpperCase() === symbol.toUpperCase()
    ) ?? (list as Record<string, unknown>[])[0];
    if (match === undefined) return null;
    const code = match["SCRIP_CD"] ?? match["scripcode"] ?? match["ScripCode"];
    return code != null ? String(code) : null;
  } catch {
    return null;
  }
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
    const code = bseCode ?? (await resolveBseCode(symbol));
    if (!code) {
      return { providerName, items: [], latencyMs: Date.now() - start, error: "BSE code not found for symbol" };
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
        const rawDate = r.NEWS_DT ?? r.NEWSDT ?? "";
        const rawTime = r.DT_TM ?? "00:00:00";
        // NEWS_DT is "DD/MM/YYYY", NEWSDT is "YYYYMMDD"
        let publishedAt: string;
        if (rawDate.includes("/")) {
          const [dd, mm, yyyy] = rawDate.split("/");
          publishedAt = new Date(`${yyyy}-${mm}-${dd}T${rawTime}+05:30`).toISOString();
        } else if (rawDate.length === 8) {
          const yyyy = rawDate.slice(0, 4), mm = rawDate.slice(4, 6), dd = rawDate.slice(6, 8);
          publishedAt = new Date(`${yyyy}-${mm}-${dd}T${rawTime}+05:30`).toISOString();
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
