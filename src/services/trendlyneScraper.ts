import * as cheerio from "cheerio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendlyneSwotItem {
  text: string;
}

export interface TrendlyneChecklistItem {
  metric: string;
  /** e.g. "High in industry", "Below industry Median", "Negative Net Profit TTM Growth %" */
  assessment: string;
  value: number | null;
}

export interface TrendlyneData {
  // ── Technical ──────────────────────────────────────────────────────────────
  beta: number | null;

  // ── SWOT (Trendlyne's own analysis, separate from our rule-based SWOT) ────
  tl_swot: {
    strengths: TrendlyneSwotItem[];
    weaknesses: TrendlyneSwotItem[];
    opportunities: TrendlyneSwotItem[];
    threats: TrendlyneSwotItem[];
    counts: { s: number; w: number; o: number; t: number } | null;
  } | null;

  /** @deprecated use tl_swot.counts */
  swot_counts: { s: number; w: number; o: number; t: number } | null;

  // ── DVM Scores ─────────────────────────────────────────────────────────────
  dvm_scores: {
    durability: number | null;
    valuation: number | null;
    momentum: number | null;
    label: string | null;
  } | null;

  // ── Check Before You Buy / Scorecard ───────────────────────────────────────
  checklist: TrendlyneChecklistItem[] | null;

  /** Normalized key metrics extracted from the checklist */
  key_metrics: {
    market_cap: number | null;
    pe_ttm: number | null;
    peg_ttm: number | null;
    price_to_book: number | null;
    institutions_holding_pct: number | null;
    rev_growth_qtr_yoy: number | null;
    operating_revenue_growth_ttm: number | null;
    net_profit_qtr_growth_yoy: number | null;
    net_profit_ttm_growth: number | null;
    opm_qtr: number | null;
    opm_ttm: number | null;
    piotroski_score: number | null;
    relative_return_nifty50_qtr: number | null;
    relative_return_sector_qtr: number | null;
    roe_annual: number | null;
    roa_annual: number | null;
  } | null;

  // ── Analyst Consensus ──────────────────────────────────────────────────────
  analyst_consensus: {
    recommendation: string | null;
    count: number | null;
    target_price: number | null;
    breakdown: {
      strong_sell: number | null;
      sell: number | null;
      hold: number | null;
      buy: number | null;
      strong_buy: number | null;
    } | null;
  } | null;

  /** @deprecated use analyst_consensus.target_price */
  analyst_target_price: number | null;
  /** @deprecated use analyst_consensus.count */
  analyst_count: number | null;

  // ── Technical Levels ───────────────────────────────────────────────────────
  support_resistance: {
    resistance: [number | null, number | null, number | null];
    support: [number | null, number | null, number | null];
  } | null;

  // ── Moving Averages ────────────────────────────────────────────────────────
  moving_averages: {
    bullish: number | null;
    bearish: number | null;
  } | null;

  // ── Shareholding ───────────────────────────────────────────────────────────
  shareholding: {
    promoters: number | null;
    fii: number | null;
    dii: number | null;
    public_holding: number | null;
  } | null;

  // ── Retail Sentiment (poll) ────────────────────────────────────────────────
  retail_sentiment: {
    buy_pct: number | null;
    sell_pct: number | null;
    hold_pct: number | null;
    total_votes: number | null;
  } | null;

  fetched: boolean;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function parseNum(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "").replace(/[₹%]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}


// ─── Stock ID resolution ──────────────────────────────────────────────────────

async function resolveStockId(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://trendlyne.com/search/suggest/?q=${encodeURIComponent(ticker)}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();

    const list = Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : Array.isArray((data as Record<string, unknown>)["results"])
        ? ((data as Record<string, unknown>)["results"] as Record<string, unknown>[])
        : [];

    for (const item of list) {
      const t = String(item["ticker"] ?? item["symbol"] ?? "").toUpperCase();
      if (t === ticker.toUpperCase()) {
        const id = item["id"] ?? item["pk"];
        if (id != null) return String(id);
      }
    }
    if (list.length > 0) {
      const first = list[0];
      if (first !== undefined) {
        const id = first["id"] ?? first["pk"];
        if (id != null) return String(id);
      }
    }
  } catch { /* best-effort */ }
  return null;
}

// ─── Parse: Beta ─────────────────────────────────────────────────────────────

function parseBeta($: cheerio.CheerioAPI): number | null {
  // Pattern 1: explicit label near value
  let found: number | null = null;
  $("[class*='beta'], [id*='beta']").each((_i, el) => {
    if (found !== null) return false;
    const text = $(el).text();
    const m = text.match(/[\d.]+/);
    if (m) {
      const v = parseFloat(m[0]);
      if (v > 0 && v < 10) { found = v; return false; }
    }
  });
  if (found !== null) return found;

  // Pattern 2: "Beta" label → sibling or next element
  $("*").each((_i, el) => {
    if (found !== null) return false;
    const ownText = $(el).clone().children().remove().end().text().trim();
    if (/^beta$/i.test(ownText)) {
      const next = $(el).next().text().trim();
      const v = parseFloat(next);
      if (!isNaN(v) && v > 0 && v < 10) { found = v; return false; }
    }
  });
  if (found !== null) return found;

  // Pattern 3: "Beta: 0.85" anywhere in page
  const m = $("body").text().match(/\bbeta[:\s]+(\d+\.?\d*)/i);
  if (m?.[1]) {
    const v = parseFloat(m[1]);
    if (v > 0 && v < 10) return v;
  }
  return null;
}

// ─── Parse: DVM ──────────────────────────────────────────────────────────────

function parseDvm($: cheerio.CheerioAPI): TrendlyneData["dvm_scores"] {
  let durability: number | null = null;
  let valuation: number | null = null;
  let momentum: number | null = null;
  let label: string | null = null;

  const searchText =
    $("[class*='dvm'],[class*='DVM'],[id*='dvm'],[id*='DVM']").text() ||
    $("body").text();

  const dM = searchText.match(/durability[:\s]+(\d+)/i);
  const vM = searchText.match(/valuation[:\s]+(\d+)/i);
  const mM = searchText.match(/momentum[:\s]+(\d+)/i);
  const lM = searchText.match(/\b([\w\s-]+performer|[\w\s-]+stock)\b/i);

  if (dM?.[1]) durability = parseInt(dM[1]);
  if (vM?.[1]) valuation = parseInt(vM[1]);
  if (mM?.[1]) momentum = parseInt(mM[1]);
  if (lM?.[1]) label = lM[1].trim();

  if (durability === null && valuation === null && momentum === null) return null;
  return { durability, valuation, momentum, label };
}

// ─── Parse: Trendlyne SWOT ────────────────────────────────────────────────────

function parseTlSwot($: cheerio.CheerioAPI): TrendlyneData["tl_swot"] {
  const strengths: TrendlyneSwotItem[] = [];
  const weaknesses: TrendlyneSwotItem[] = [];
  const opportunities: TrendlyneSwotItem[] = [];
  const threats: TrendlyneSwotItem[] = [];

  // Strategy 1: dedicated section containers
  const swotContainer = $("[class*='swot'],[id*='swot'],[class*='SWOT'],[id*='SWOT']");

  if (swotContainer.length > 0) {
    swotContainer.each((_i, section) => {
      const sectionText = $(section).text().toLowerCase();
      const items: TrendlyneSwotItem[] = [];
      $(section).find("li, [class*='item'], p").each((_j, el) => {
        const txt = $(el).text().trim();
        if (txt.length > 10) items.push({ text: txt });
      });

      if (sectionText.includes("strength")) strengths.push(...items);
      else if (sectionText.includes("weakness")) weaknesses.push(...items);
      else if (sectionText.includes("opportunit")) opportunities.push(...items);
      else if (sectionText.includes("threat")) threats.push(...items);
    });
  }

  // Strategy 2: look for headers followed by lists
  if (strengths.length + weaknesses.length + opportunities.length + threats.length === 0) {
    $("h2, h3, h4, [class*='heading'], [class*='title']").each((_i, hEl) => {
      const hText = $(hEl).text().trim().toLowerCase();
      let bucket: TrendlyneSwotItem[] | null = null;
      if (/strength/.test(hText)) bucket = strengths;
      else if (/weakness/.test(hText)) bucket = weaknesses;
      else if (/opportunit/.test(hText)) bucket = opportunities;
      else if (/threat/.test(hText)) bucket = threats;
      if (!bucket) return;

      $(hEl).nextUntil("h2,h3,h4").find("li").each((_j, li) => {
        const txt = $(li).text().trim();
        if (txt.length > 10) bucket!.push({ text: txt });
      });
    });
  }

  // Strategy 3: count badges from page text
  const bodyText = $("body").text();
  const countM = bodyText.match(/(\d+)\s*S\b.*?(\d+)\s*W\b.*?(\d+)\s*O\b.*?(\d+)\s*T\b/s);
  let counts: { s: number; w: number; o: number; t: number } | null = null;
  if (countM?.[1] && countM[2] && countM[3] && countM[4]) {
    counts = {
      s: parseInt(countM[1]),
      w: parseInt(countM[2]),
      o: parseInt(countM[3]),
      t: parseInt(countM[4]),
    };
  }

  // Use counts to infer if we have valid items
  const totalItems = strengths.length + weaknesses.length + opportunities.length + threats.length;
  if (totalItems === 0 && counts === null) return null;

  return { strengths, weaknesses, opportunities, threats, counts };
}

// ─── Parse: Checklist / Score Card ───────────────────────────────────────────

function parseChecklist($: cheerio.CheerioAPI): TrendlyneChecklistItem[] | null {
  const items: TrendlyneChecklistItem[] = [];

  // Strategy 1: class-based checklist containers
  $("[class*='checklist'],[class*='scorecard'],[class*='score-card'],[id*='checklist']").each((_i, container) => {
    // Each row: metric label + assessment label + value
    $(container).find("tr, [class*='row'], [class*='item']").each((_j, row) => {
      const cells = $(row).find("td, [class*='cell'], [class*='col']");
      if (cells.length >= 2) {
        const metric = cells.eq(0).text().trim();
        const assessment = cells.eq(1).text().trim();
        const rawVal = cells.length >= 3 ? cells.eq(2).text().trim() : "";
        if (metric.length > 2 && assessment.length > 2) {
          items.push({ metric, assessment, value: parseNum(rawVal) });
        }
      }
    });
  });

  if (items.length > 0) return items;

  // Strategy 2: look for known metric names near values in tables
  const knownMetrics: [RegExp, string][] = [
    [/market\s*cap/i, "Market Capitalization"],
    [/pe\s*ttm/i, "PE TTM"],
    [/peg\s*ttm/i, "PEG TTM"],
    [/price\s*to\s*book/i, "Price to Book"],
    [/institutions?\s*holding/i, "Institutions holding %"],
    [/rev\.?\s*growth\s*qtr/i, "Rev. Growth Qtr YoY %"],
    [/operating\s*revenue\s*growth\s*ttm/i, "Operating Revenue growth TTM %"],
    [/net\s*profit\s*qtr\s*growth/i, "Net Profit Qtr Growth YoY %"],
    [/net\s*profit\s*ttm\s*growth/i, "Net Profit TTM Growth %"],
    [/opm\s*qtr|operating\s*profit\s*margin\s*qtr/i, "Operating Profit Margin Qtr %"],
    [/opm\s*ttm/i, "OPM TTM %"],
    [/piotroski/i, "Piotroski Score"],
    [/relative\s*return.*nifty/i, "Relative returns vs Nifty50 quarter%"],
    [/relative\s*return.*sector/i, "Relative returns vs Sector quarter%"],
    [/roe\s*ann/i, "ROE Ann. %"],
    [/roa\s*ann/i, "RoA Ann. %"],
  ];

  const assessmentPhrases = [
    "High in industry", "Low in industry",
    "Above industry Median", "Below industry Median",
    "Negative", "Positive", "Average",
  ];

  $("table tr, [class*='row']").each((_i, row) => {
    const text = $(row).text();
    for (const [re, label] of knownMetrics) {
      if (re.test(text)) {
        let assessment = "";
        for (const phrase of assessmentPhrases) {
          if (text.includes(phrase)) { assessment = phrase; break; }
        }
        // Extract trailing number
        const numM = text.match(/([-\d.]+)\s*$/);
        const value = numM ? parseNum(numM[1]) : null;
        if (!items.find((x) => x.metric === label)) {
          items.push({ metric: label, assessment, value });
        }
        break;
      }
    }
  });

  return items.length > 0 ? items : null;
}

/** Extract normalized key_metrics from a checklist array */
function extractKeyMetrics(
  checklist: TrendlyneChecklistItem[]
): TrendlyneData["key_metrics"] {
  function find(re: RegExp): number | null {
    return checklist.find((c) => re.test(c.metric))?.value ?? null;
  }
  return {
    market_cap: find(/market\s*cap/i),
    pe_ttm: find(/pe\s*ttm/i),
    peg_ttm: find(/peg\s*ttm/i),
    price_to_book: find(/price\s*to\s*book/i),
    institutions_holding_pct: find(/institutions?\s*holding/i),
    rev_growth_qtr_yoy: find(/rev\.?\s*growth\s*qtr/i),
    operating_revenue_growth_ttm: find(/operating\s*revenue\s*growth\s*ttm/i),
    net_profit_qtr_growth_yoy: find(/net\s*profit\s*qtr\s*growth/i),
    net_profit_ttm_growth: find(/net\s*profit\s*ttm\s*growth/i),
    opm_qtr: find(/opm\s*qtr|operating\s*profit\s*margin\s*qtr/i),
    opm_ttm: find(/opm\s*ttm/i),
    piotroski_score: find(/piotroski/i),
    relative_return_nifty50_qtr: find(/relative\s*return.*nifty/i),
    relative_return_sector_qtr: find(/relative\s*return.*sector/i),
    roe_annual: find(/roe\s*ann/i),
    roa_annual: find(/roa\s*ann/i),
  };
}

// ─── Parse: Analyst Consensus ────────────────────────────────────────────────

function parseAnalystConsensus($: cheerio.CheerioAPI): TrendlyneData["analyst_consensus"] {
  const searchText =
    $("[class*='analyst'],[class*='consensus'],[class*='recommendation'],[id*='analyst']").text() ||
    $("body").text();

  // Recommendation label
  const recM = searchText.match(/\b(strong\s*buy|strong\s*sell|buy|sell|hold)\b/i);
  const recommendation = recM?.[1] ? recM[1].toUpperCase().replace(/\s+/g, "_") : null;

  // Analyst count
  const countM = searchText.match(/(\d+)\s*analyst/i);
  const count = countM?.[1] ? parseInt(countM[1]) : null;

  // Target price
  const priceM = searchText.match(/(?:target|consensus)[^₹\d]*[₹Rs.]+\s*([\d,]+)/i);
  const target_price = priceM?.[1] ? parseNum(priceM[1]) : null;

  // Breakdown: "3 Strong Sell, 3 Hold, 2 Buy, 3 Strong Buy"
  // or table cells with those labels
  const ssM = searchText.match(/(\d+)\s*strong\s*sell/i);
  const sM = /strong\s*sell/i.test(searchText)
    ? null  // avoid double-counting — handle below
    : searchText.match(/(\d+)\s*sell\b/i);
  const hM = searchText.match(/(\d+)\s*hold\b/i);
  const bM = /strong\s*buy/i.test(searchText)
    ? null
    : searchText.match(/(\d+)\s*buy\b/i);
  const sbM = searchText.match(/(\d+)\s*strong\s*buy/i);

  // Re-extract sell/buy excluding "strong" prefix
  const sellOnlyM = searchText.match(/(?<!strong\s)(\d+)\s*sell\b/i);
  const buyOnlyM = searchText.match(/(?<!strong\s)(\d+)\s*buy\b/i);

  const breakdown =
    ssM || hM || sbM
      ? {
          strong_sell: ssM?.[1] ? parseInt(ssM[1]) : null,
          sell: sellOnlyM?.[1] ? parseInt(sellOnlyM[1]) : null,
          hold: hM?.[1] ? parseInt(hM[1]) : null,
          buy: buyOnlyM?.[1] ? parseInt(buyOnlyM[1]) : null,
          strong_buy: sbM?.[1] ? parseInt(sbM[1]) : null,
        }
      : null;

  if (!recommendation && !count && !target_price) return null;
  return { recommendation, count, target_price, breakdown };
}

// ─── Parse: Support & Resistance ─────────────────────────────────────────────

function parseSupportResistance($: cheerio.CheerioAPI): TrendlyneData["support_resistance"] {
  const text =
    $("[class*='support'],[class*='resistance'],[id*='support'],[id*='resistance']").text() ||
    $("body").text();

  // "First Resistance 962.1 Second Resistance 974.4 Third Resistance 992.9"
  const r1 = text.match(/first\s*resistance[:\s]*([\d.]+)/i);
  const r2 = text.match(/second\s*resistance[:\s]*([\d.]+)/i);
  const r3 = text.match(/third\s*resistance[:\s]*([\d.]+)/i);
  const s1 = text.match(/first\s*support[:\s]*([\d.]+)/i);
  const s2 = text.match(/second\s*support[:\s]*([\d.]+)/i);
  const s3 = text.match(/third\s*support[:\s]*([\d.]+)/i);

  const anyFound = r1 ?? r2 ?? r3 ?? s1 ?? s2 ?? s3;
  if (!anyFound) return null;

  return {
    resistance: [
      r1?.[1] ? parseNum(r1[1]) : null,
      r2?.[1] ? parseNum(r2[1]) : null,
      r3?.[1] ? parseNum(r3[1]) : null,
    ],
    support: [
      s1?.[1] ? parseNum(s1[1]) : null,
      s2?.[1] ? parseNum(s2[1]) : null,
      s3?.[1] ? parseNum(s3[1]) : null,
    ],
  };
}

// ─── Parse: Moving Averages ───────────────────────────────────────────────────

function parseMovingAverages($: cheerio.CheerioAPI): TrendlyneData["moving_averages"] {
  const text =
    $("[class*='moving'],[class*='ema'],[class*='sma'],[id*='moving']").text() ||
    $("body").text();

  const bullishM = text.match(/bullish[:\s]+(\d+)/i) ?? text.match(/(\d+)\s*bullish/i);
  const bearishM = text.match(/bearish[:\s]+(\d+)/i) ?? text.match(/(\d+)\s*bearish/i);

  if (!bullishM && !bearishM) return null;
  return {
    bullish: bullishM?.[1] ? parseInt(bullishM[1]) : null,
    bearish: bearishM?.[1] ? parseInt(bearishM[1]) : null,
  };
}

// ─── Parse: Shareholding ─────────────────────────────────────────────────────

function parseShareholding($: cheerio.CheerioAPI): TrendlyneData["shareholding"] {
  const text =
    $("[class*='shareholding'],[class*='ownership'],[id*='shareholding']").text() ||
    $("body").text();

  const proM = text.match(/promoter[s]?[:\s]+([\d.]+)\s*%/i);
  const fiiM = text.match(/fii[s]?[:\s]+([\d.]+)\s*%/i);
  const diiM = text.match(/dii[s]?[:\s]+([\d.]+)\s*%/i);
  const pubM = text.match(/public[:\s]+([\d.]+)\s*%/i);

  if (!proM && !fiiM && !diiM) return null;
  return {
    promoters: proM?.[1] ? parseNum(proM[1]) : null,
    fii: fiiM?.[1] ? parseNum(fiiM[1]) : null,
    dii: diiM?.[1] ? parseNum(diiM[1]) : null,
    public_holding: pubM?.[1] ? parseNum(pubM[1]) : null,
  };
}

// ─── Parse: Retail Sentiment ──────────────────────────────────────────────────

function parseRetailSentiment($: cheerio.CheerioAPI): TrendlyneData["retail_sentiment"] {
  const sentEl = $("[class*='sentiment'],[class*='poll'],[class*='retail']");
  if (sentEl.length === 0) return null;
  const text = sentEl.text();
  const buyM = text.match(/buy[:\s]*([\d.]+)\s*%/i);
  const sellM = text.match(/sell[:\s]*([\d.]+)\s*%/i);
  const holdM = text.match(/hold[:\s]*([\d.]+)\s*%/i);
  const votesM = text.match(/([\d,]+)\s*(?:votes?|people|users)/i);
  if (!buyM && !sellM && !holdM) return null;
  return {
    buy_pct: buyM?.[1] ? parseFloat(buyM[1]) : null,
    sell_pct: sellM?.[1] ? parseFloat(sellM[1]) : null,
    hold_pct: holdM?.[1] ? parseFloat(holdM[1]) : null,
    total_votes: votesM?.[1] ? parseNum(votesM[1]) : null,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

const EMPTY: TrendlyneData = {
  beta: null,
  tl_swot: null,
  swot_counts: null,
  dvm_scores: null,
  checklist: null,
  key_metrics: null,
  analyst_consensus: null,
  analyst_target_price: null,
  analyst_count: null,
  support_resistance: null,
  moving_averages: null,
  shareholding: null,
  retail_sentiment: null,
  fetched: false,
  error: null,
};

export async function fetchTrendlyneData(ticker: string): Promise<TrendlyneData> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  try {
    const stockId = await resolveStockId(ticker);
    const pageUrl =
      stockId !== null
        ? `https://trendlyne.com/equity/${stockId}/${ticker}/`
        : `https://trendlyne.com/equity/${ticker}/`;

    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!res.ok) {
      return { ...EMPTY, fetched: false, error: `Trendlyne returned HTTP ${res.status}` };
    }

    const html = await res.text();

    if (html.length < 1000 || (html.includes("login") && !html.includes("equity"))) {
      return {
        ...EMPTY,
        fetched: false,
        error: "Trendlyne page requires login or returned minimal content",
      };
    }

    const $ = cheerio.load(html);

    const beta = parseBeta($);
    const tl_swot = parseTlSwot($);
    const dvm_scores = parseDvm($);
    const checklist = parseChecklist($);
    const key_metrics = checklist ? extractKeyMetrics(checklist) : null;
    const analyst_consensus = parseAnalystConsensus($);
    const support_resistance = parseSupportResistance($);
    const moving_averages = parseMovingAverages($);
    const shareholding = parseShareholding($);
    const retail_sentiment = parseRetailSentiment($);

    // Back-compat aliases
    const swot_counts = tl_swot?.counts ?? null;
    const analyst_target_price = analyst_consensus?.target_price ?? null;
    const analyst_count = analyst_consensus?.count ?? null;

    const anyDataFound =
      beta !== null ||
      tl_swot !== null ||
      dvm_scores !== null ||
      checklist !== null ||
      analyst_consensus !== null ||
      support_resistance !== null ||
      moving_averages !== null;

    return {
      beta,
      tl_swot,
      swot_counts,
      dvm_scores,
      checklist,
      key_metrics,
      analyst_consensus,
      analyst_target_price,
      analyst_count,
      support_resistance,
      moving_averages,
      shareholding,
      retail_sentiment,
      fetched: anyDataFound,
      error: anyDataFound ? null : "No structured data could be extracted from Trendlyne",
    };
  } catch (err) {
    return {
      ...EMPTY,
      fetched: false,
      error: err instanceof Error ? err.message : "Unknown error fetching Trendlyne data",
    };
  }
}
