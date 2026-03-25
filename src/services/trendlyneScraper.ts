import * as cheerio from "cheerio";

export interface TrendlyneData {
  beta: number | null;
  analyst_target_price: number | null;
  analyst_count: number | null;
  swot_counts: { s: number; w: number; o: number; t: number } | null;
  dvm_scores: {
    durability: number | null;
    valuation: number | null;
    momentum: number | null;
    label: string | null;
  } | null;
  retail_sentiment: {
    buy_pct: number | null;
    sell_pct: number | null;
    hold_pct: number | null;
    total_votes: number | null;
  } | null;
  fetched: boolean;
  error: string | null;
}

const EMPTY_RESULT: TrendlyneData = {
  beta: null,
  analyst_target_price: null,
  analyst_count: null,
  swot_counts: null,
  dvm_scores: null,
  retail_sentiment: null,
  fetched: false,
  error: null,
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseIndianNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

async function resolveStockId(ticker: string): Promise<string | null> {
  try {
    const searchUrl = `https://trendlyne.com/search/suggest/?q=${encodeURIComponent(ticker)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();

    // Handle array response: [{id, ticker, ...}, ...]
    if (Array.isArray(data) && data.length > 0) {
      for (const item of data as Record<string, unknown>[]) {
        const tickerField = String(item["ticker"] ?? item["symbol"] ?? "").toUpperCase();
        if (tickerField === ticker.toUpperCase()) {
          const id = item["id"] ?? item["pk"];
          if (id !== undefined && id !== null) return String(id);
        }
      }
      // Fallback: take first result
      const first = data[0] as Record<string, unknown>;
      const id = first["id"] ?? first["pk"];
      if (id !== undefined && id !== null) return String(id);
    }

    // Handle object with results array
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      const results = obj["results"] ?? obj["data"];
      if (Array.isArray(results) && results.length > 0) {
        const first = results[0] as Record<string, unknown>;
        const id = first["id"] ?? first["pk"];
        if (id !== undefined && id !== null) return String(id);
      }
    }
  } catch {
    // Silently ignore — stock ID is best-effort
  }
  return null;
}

function parseBeta($: cheerio.CheerioAPI): number | null {
  // Look for "Beta" label near a value
  let betaValue: number | null = null;

  $("*").each((_i, el) => {
    if (betaValue !== null) return false;
    const text = $(el).clone().children().remove().end().text().trim();
    if (/^beta$/i.test(text)) {
      // Check siblings and parent's next sibling for the value
      const parent = $(el).parent();
      const siblingText = parent.find("*").not(el).first().text().trim();
      const parsed = parseIndianNumber(siblingText);
      if (parsed !== null && parsed > 0 && parsed < 10) {
        betaValue = parsed;
        return false;
      }
      // Also check the next element in parent
      const nextText = $(el).next().text().trim();
      const parsedNext = parseIndianNumber(nextText);
      if (parsedNext !== null && parsedNext > 0 && parsedNext < 10) {
        betaValue = parsedNext;
        return false;
      }
    }
    // Check for "Beta: 0.85" pattern in text
    const fullText = $(el).text();
    const betaMatch = fullText.match(/\bbeta[:\s]+(\d+\.?\d*)/i);
    if (betaMatch?.[1]) {
      const parsed = parseFloat(betaMatch[1]);
      if (!isNaN(parsed) && parsed > 0 && parsed < 10) {
        betaValue = parsed;
        return false;
      }
    }
  });

  return betaValue;
}

function parseSwotCounts($: cheerio.CheerioAPI): { s: number; w: number; o: number; t: number } | null {
  // Trendlyne shows SWOT badge counts like "24S 4W 1O 2T"
  const fullText = $("body").text();

  // Pattern: digits followed by S/W/O/T (possibly spaced)
  const pattern = /(\d+)\s*S\b.*?(\d+)\s*W\b.*?(\d+)\s*O\b.*?(\d+)\s*T\b/s;
  const m = fullText.match(pattern);
  if (m?.[1] && m[2] && m[3] && m[4]) {
    return {
      s: parseInt(m[1]),
      w: parseInt(m[2]),
      o: parseInt(m[3]),
      t: parseInt(m[4]),
    };
  }

  // Try class-based selectors
  const swotContainer = $(
    "[class*='swot'], [class*='SWOT'], [id*='swot'], [id*='SWOT']"
  );
  if (swotContainer.length > 0) {
    const text = swotContainer.text();
    const sM = text.match(/(\d+)\s*S/i);
    const wM = text.match(/(\d+)\s*W/i);
    const oM = text.match(/(\d+)\s*O/i);
    const tM = text.match(/(\d+)\s*T/i);
    if (sM ?? wM ?? oM ?? tM) {
      return {
        s: sM?.[1] ? parseInt(sM[1]) : 0,
        w: wM?.[1] ? parseInt(wM[1]) : 0,
        o: oM?.[1] ? parseInt(oM[1]) : 0,
        t: tM?.[1] ? parseInt(tM[1]) : 0,
      };
    }
  }

  return null;
}

function parseDvmScores($: cheerio.CheerioAPI): TrendlyneData["dvm_scores"] {
  let durability: number | null = null;
  let valuation: number | null = null;
  let momentum: number | null = null;
  let label: string | null = null;

  const dvmEl = $(
    "[class*='dvm'], [class*='DVM'], [id*='dvm'], [id*='DVM']"
  );

  if (dvmEl.length > 0) {
    const text = dvmEl.text();
    const durM = text.match(/durability[:\s]+(\d+)/i);
    const valM = text.match(/valuation[:\s]+(\d+)/i);
    const momM = text.match(/momentum[:\s]+(\d+)/i);
    const labelM = text.match(/\b([\w\s-]+performer|[\w\s-]+stock)\b/i);

    if (durM?.[1]) durability = parseInt(durM[1]);
    if (valM?.[1]) valuation = parseInt(valM[1]);
    if (momM?.[1]) momentum = parseInt(momM[1]);
    if (labelM?.[1]) label = labelM[1].trim();
  }

  // Fallback: search full page text for DVM pattern
  if (durability === null && valuation === null && momentum === null) {
    const fullText = $("body").text();
    const durM = fullText.match(/durability[:\s]+(\d+)/i);
    const valM = fullText.match(/valuation[:\s]+(\d+)/i);
    const momM = fullText.match(/momentum[:\s]+(\d+)/i);
    if (durM?.[1]) durability = parseInt(durM[1]);
    if (valM?.[1]) valuation = parseInt(valM[1]);
    if (momM?.[1]) momentum = parseInt(momM[1]);
  }

  if (durability === null && valuation === null && momentum === null) {
    return null;
  }

  return { durability, valuation, momentum, label };
}

function parseAnalystTarget($: cheerio.CheerioAPI): { price: number | null; count: number | null } {
  let price: number | null = null;
  let count: number | null = null;

  const analystEl = $(
    "[class*='analyst'], [class*='target-price'], [class*='target_price'], [class*='consensus']"
  );

  const searchText = analystEl.length > 0 ? analystEl.text() : $("body").text();

  // Look for "₹1,234" or "Rs 1234" near "target" / "analyst"
  const priceM = searchText.match(/(?:target|consensus)[^₹\d]*[₹Rs.]+\s*(\d[\d,]*)/i);
  if (priceM?.[1]) {
    price = parseIndianNumber(priceM[1]);
  }

  // Look for analyst count: "12 analysts" or "based on 12"
  const countM = searchText.match(/(\d+)\s*analyst/i);
  if (countM?.[1]) {
    count = parseInt(countM[1]);
  }

  return { price, count };
}

function parseRetailSentiment($: cheerio.CheerioAPI): TrendlyneData["retail_sentiment"] {
  const sentEl = $(
    "[class*='sentiment'], [class*='poll'], [class*='retail']"
  );
  if (sentEl.length === 0) return null;

  const text = sentEl.text();

  const buyM = text.match(/buy[:\s]*(\d+(?:\.\d+)?)\s*%/i);
  const sellM = text.match(/sell[:\s]*(\d+(?:\.\d+)?)\s*%/i);
  const holdM = text.match(/hold[:\s]*(\d+(?:\.\d+)?)\s*%/i);
  const votesM = text.match(/(\d[\d,]+)\s*(?:votes?|people|users)/i);

  if (!buyM && !sellM && !holdM) return null;

  return {
    buy_pct: buyM?.[1] ? parseFloat(buyM[1]) : null,
    sell_pct: sellM?.[1] ? parseFloat(sellM[1]) : null,
    hold_pct: holdM?.[1] ? parseFloat(holdM[1]) : null,
    total_votes: votesM?.[1] ? parseIndianNumber(votesM[1]) : null,
  };
}

export async function fetchTrendlyneData(ticker: string): Promise<TrendlyneData> {
  // 1-second delay after Screener.in scrape
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  try {
    // Try to resolve numeric stock ID via search API
    const stockId = await resolveStockId(ticker);

    const pageUrl =
      stockId !== null
        ? `https://trendlyne.com/equity/${stockId}/${ticker}/`
        : `https://trendlyne.com/equity/${ticker}/`;

    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        ...EMPTY_RESULT,
        fetched: false,
        error: `Trendlyne returned HTTP ${res.status}`,
      };
    }

    const html = await res.text();

    // If we got a login wall or empty page, bail gracefully
    if (html.length < 1000 || html.includes("login") && !html.includes("equity")) {
      return {
        ...EMPTY_RESULT,
        fetched: false,
        error: "Trendlyne page appears to require login or returned minimal content",
      };
    }

    const $ = cheerio.load(html);

    const beta = parseBeta($);
    const swot_counts = parseSwotCounts($);
    const dvm_scores = parseDvmScores($);
    const { price: analyst_target_price, count: analyst_count } = parseAnalystTarget($);
    const retail_sentiment = parseRetailSentiment($);

    const anyDataFound =
      beta !== null ||
      swot_counts !== null ||
      dvm_scores !== null ||
      analyst_target_price !== null;

    return {
      beta,
      analyst_target_price,
      analyst_count,
      swot_counts,
      dvm_scores,
      retail_sentiment,
      fetched: anyDataFound,
      error: anyDataFound ? null : "No structured data could be extracted from Trendlyne page",
    };
  } catch (err) {
    return {
      ...EMPTY_RESULT,
      fetched: false,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error fetching Trendlyne data",
    };
  }
}
