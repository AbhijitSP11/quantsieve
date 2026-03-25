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

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Trendlyne official embed widget endpoints — no auth or numeric stock ID needed.
// tl-widgets.js fetches these URLs server-side and injects the returned HTML.
const WIDGET_BASE = "https://trendlyne.com/web-widget";
const WIDGET_PARAMS = "posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "").replace(/[₹%]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ─── Widget fetcher ───────────────────────────────────────────────────────────

type WidgetType = "swot-widget" | "technical-widget" | "checklist-widget";

async function fetchWidget(
  type: WidgetType,
  ticker: string
): Promise<cheerio.CheerioAPI | null> {
  const url = `${WIDGET_BASE}/${type}/Poppins/${ticker.toUpperCase()}/?${WIDGET_PARAMS}`;
  console.log(`[Trendlyne] Fetching ${type}: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        Referer: "https://trendlyne.com/",
      },
      signal: AbortSignal.timeout(12000),
    });
    console.log(`[Trendlyne] ${type} → HTTP ${res.status}`);
    if (!res.ok) return null;
    const html = await res.text();
    console.log(`[Trendlyne] ${type} → ${html.length} chars`);
    // If only a CSS stub was returned the widget is JS-rendered — nothing useful to parse
    if (html.length < 500) {
      console.log(`[Trendlyne] ${type} → too short, likely JS-rendered shell, skipping`);
      return null;
    }
    return cheerio.load(html);
  } catch (e) {
    console.log(`[Trendlyne] ${type} error: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

// ─── SWOT widget parser ───────────────────────────────────────────────────────
// The SWOT widget is server-rendered and returns real HTML.
// Structure: headings (h3/h4) for each quadrant + <ul><li> items beneath them.

function parseSwotWidget($: cheerio.CheerioAPI): TrendlyneData["tl_swot"] {
  const strengths: TrendlyneSwotItem[] = [];
  const weaknesses: TrendlyneSwotItem[] = [];
  const opportunities: TrendlyneSwotItem[] = [];
  const threats: TrendlyneSwotItem[] = [];

  function bucketFor(text: string): TrendlyneSwotItem[] | null {
    const t = text.toLowerCase();
    if (/strength/.test(t)) return strengths;
    if (/weakness/.test(t)) return weaknesses;
    if (/opportunit/.test(t)) return opportunities;
    if (/threat/.test(t)) return threats;
    return null;
  }

  // Strategy 1: heading → next sibling <ul>/<li>
  $("h1,h2,h3,h4,h5,h6").each((_i, hEl) => {
    const hText = $(hEl).text().trim();
    const bucket = bucketFor(hText);
    if (!bucket) return;
    // Items in the immediately following <ul>
    $(hEl).nextAll("ul").first().find("li").each((_j, li) => {
      const txt = $(li).text().trim();
      if (txt.length > 5) bucket.push({ text: txt });
    });
    // Some widgets flatten lists as <li> siblings (no wrapping <ul>)
    if (bucket.length === 0) {
      $(hEl).nextUntil("h1,h2,h3,h4,h5,h6", "li").each((_j, li) => {
        const txt = $(li).text().trim();
        if (txt.length > 5) bucket.push({ text: txt });
      });
    }
  });

  // Strategy 2: class-based containers
  if (strengths.length + weaknesses.length + opportunities.length + threats.length === 0) {
    $("[class*='strength'],[class*='weakness'],[class*='opportunit'],[class*='threat']").each(
      (_i, section) => {
        const cls = ($(section).attr("class") ?? "").toLowerCase();
        const bucket = bucketFor(cls) ?? bucketFor($(section).text());
        if (!bucket) return;
        $(section).find("li,p,[class*='item']").each((_j, el) => {
          const txt = $(el).text().trim();
          if (txt.length > 5) bucket.push({ text: txt });
        });
      }
    );
  }

  // Counts: anchor to label words to avoid matching stray S/W/O/T letters elsewhere
  const bodyText = $("body").text();
  const sM = bodyText.match(/strength[s]?\s*(\d+)/i);
  const wM = bodyText.match(/weakness(?:es)?\s*(\d+)/i);
  const oM = bodyText.match(/opportunit(?:y|ies)\s*(\d+)/i);
  const tM = bodyText.match(/threat[s]?\s*(\d+)/i);

  let counts: { s: number; w: number; o: number; t: number } | null = null;
  if (sM?.[1] ?? wM?.[1] ?? oM?.[1] ?? tM?.[1]) {
    counts = {
      s: sM?.[1] ? parseInt(sM[1]) : strengths.length,
      w: wM?.[1] ? parseInt(wM[1]) : weaknesses.length,
      o: oM?.[1] ? parseInt(oM[1]) : opportunities.length,
      t: tM?.[1] ? parseInt(tM[1]) : threats.length,
    };
  }

  const totalItems =
    strengths.length + weaknesses.length + opportunities.length + threats.length;
  if (totalItems === 0 && counts === null) return null;

  console.log(
    `[Trendlyne] SWOT parsed: counts=${JSON.stringify(counts)}, items=${totalItems}`
  );
  return { strengths, weaknesses, opportunities, threats, counts };
}

// ─── Technical widget parser ──────────────────────────────────────────────────
// The technical widget is JS-rendered; parse whatever Cheerio can see.

function parseTechnicalWidget($: cheerio.CheerioAPI): {
  beta: number | null;
  dvm_scores: TrendlyneData["dvm_scores"];
  support_resistance: TrendlyneData["support_resistance"];
  moving_averages: TrendlyneData["moving_averages"];
} {
  const body = $("body").text();

  // Beta
  let beta: number | null = null;
  const betaM = body.match(/\bbeta[:\s]+(\d+\.?\d*)/i);
  if (betaM?.[1]) {
    const v = parseFloat(betaM[1]);
    if (v > 0 && v < 10) beta = v;
  }

  // DVM scores
  const dM = body.match(/durability[:\s]+(\d+)/i);
  const vM = body.match(/valuation[:\s]+(\d+)/i);
  const mM = body.match(/momentum[:\s]+(\d+)/i);
  const dvm_scores =
    dM?.[1] ?? vM?.[1] ?? mM?.[1]
      ? {
          durability: dM?.[1] ? parseInt(dM[1]) : null,
          valuation: vM?.[1] ? parseInt(vM[1]) : null,
          momentum: mM?.[1] ? parseInt(mM[1]) : null,
          label: null,
        }
      : null;

  // Support / Resistance
  const r1 = body.match(/first\s*resistance[:\s]*([\d.]+)/i);
  const r2 = body.match(/second\s*resistance[:\s]*([\d.]+)/i);
  const r3 = body.match(/third\s*resistance[:\s]*([\d.]+)/i);
  const s1 = body.match(/first\s*support[:\s]*([\d.]+)/i);
  const s2 = body.match(/second\s*support[:\s]*([\d.]+)/i);
  const s3 = body.match(/third\s*support[:\s]*([\d.]+)/i);
  const support_resistance =
    r1 ?? s1
      ? {
          resistance: [
            r1?.[1] ? parseNum(r1[1]) : null,
            r2?.[1] ? parseNum(r2[1]) : null,
            r3?.[1] ? parseNum(r3[1]) : null,
          ] as [number | null, number | null, number | null],
          support: [
            s1?.[1] ? parseNum(s1[1]) : null,
            s2?.[1] ? parseNum(s2[1]) : null,
            s3?.[1] ? parseNum(s3[1]) : null,
          ] as [number | null, number | null, number | null],
        }
      : null;

  // Moving averages
  const bullM =
    body.match(/bullish(?:\s*moving\s*averages?)?[:\s]+(\d+)/i) ??
    body.match(/(\d+)\s*bullish/i);
  const bearM =
    body.match(/bearish(?:\s*moving\s*averages?)?[:\s]+(\d+)/i) ??
    body.match(/(\d+)\s*bearish/i);
  const moving_averages =
    bullM ?? bearM
      ? {
          bullish: bullM?.[1] ? parseInt(bullM[1]) : null,
          bearish: bearM?.[1] ? parseInt(bearM[1]) : null,
        }
      : null;

  return { beta, dvm_scores, support_resistance, moving_averages };
}

// ─── Checklist widget parser ──────────────────────────────────────────────────
// The checklist widget is JS-rendered; parse what Cheerio can see.

function parseChecklistWidget($: cheerio.CheerioAPI): TrendlyneChecklistItem[] | null {
  const items: TrendlyneChecklistItem[] = [];

  // Try table rows first (most structured)
  $("tr").each((_i, row) => {
    const cells = $(row).find("td,th");
    if (cells.length >= 2) {
      const metric = cells.eq(0).text().trim();
      const assessment = cells.eq(1).text().trim();
      const valRaw = cells.length >= 3 ? cells.eq(2).text().trim() : "";
      if (metric.length > 2 && !/^metric$/i.test(metric)) {
        items.push({ metric, assessment, value: parseNum(valRaw) });
      }
    }
  });

  if (items.length > 0) return items;

  // Fallback: scan body text for known metric names
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
    [/opm\s*qtr|operating\s*profit\s*margin\s*qtr/i, "OPM Qtr %"],
    [/opm\s*ttm/i, "OPM TTM %"],
    [/piotroski/i, "Piotroski Score"],
    [/relative\s*return.*nifty/i, "Relative return vs Nifty50 Qtr %"],
    [/relative\s*return.*sector/i, "Relative return vs Sector Qtr %"],
    [/roe\s*ann/i, "ROE Ann. %"],
    [/roa\s*ann/i, "RoA Ann. %"],
  ];
  const assessmentPhrases = [
    "High in industry", "Low in industry",
    "Above industry Median", "Below industry Median",
    "Average Financials", "Negative", "Positive",
  ];
  const bodyText = $("body").text();
  for (const [re, label] of knownMetrics) {
    const idx = bodyText.search(re);
    if (idx === -1) continue;
    const snippet = bodyText.slice(idx, idx + 120);
    let assessment = "";
    for (const phrase of assessmentPhrases) {
      if (snippet.includes(phrase)) { assessment = phrase; break; }
    }
    const numM = snippet.match(/([-\d.]+)\s*$/);
    if (!items.find((x) => x.metric === label)) {
      items.push({ metric: label, assessment, value: numM ? parseNum(numM[1]) : null });
    }
  }

  return items.length > 0 ? items : null;
}

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
    opm_qtr: find(/opm\s*qtr/i),
    opm_ttm: find(/opm\s*ttm/i),
    piotroski_score: find(/piotroski/i),
    relative_return_nifty50_qtr: find(/relative\s*return.*nifty/i),
    relative_return_sector_qtr: find(/relative\s*return.*sector/i),
    roe_annual: find(/roe\s*ann/i),
    roa_annual: find(/roa\s*ann/i),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchTrendlyneData(ticker: string): Promise<TrendlyneData> {
  console.log(`[Trendlyne] Starting fetch for ${ticker.toUpperCase()}`);
  // Brief delay after Screener.in scrape
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  try {
    // Fetch all three widgets in parallel — widget URLs only need the ticker symbol
    const [swot$, tech$, checklist$] = await Promise.all([
      fetchWidget("swot-widget", ticker),
      fetchWidget("technical-widget", ticker),
      fetchWidget("checklist-widget", ticker),
    ]);

    // Parse each widget independently
    const tl_swot = swot$ ? parseSwotWidget(swot$) : null;

    const techResult = tech$
      ? parseTechnicalWidget(tech$)
      : { beta: null, dvm_scores: null, support_resistance: null, moving_averages: null };

    const checklist = checklist$ ? parseChecklistWidget(checklist$) : null;
    const key_metrics = checklist ? extractKeyMetrics(checklist) : null;

    const { beta, dvm_scores, support_resistance, moving_averages } = techResult;

    // Back-compat aliases
    const swot_counts = tl_swot?.counts ?? null;
    const analyst_target_price = null;
    const analyst_count = null;

    const anyDataFound =
      tl_swot !== null ||
      beta !== null ||
      dvm_scores !== null ||
      checklist !== null ||
      support_resistance !== null ||
      moving_averages !== null;

    console.log(`[Trendlyne] Results summary:`, {
      swot_counts,
      swot_items: tl_swot
        ? {
            s: tl_swot.strengths.length,
            w: tl_swot.weaknesses.length,
            o: tl_swot.opportunities.length,
            t: tl_swot.threats.length,
          }
        : null,
      dvm_scores,
      checklist_rows: checklist?.length ?? 0,
      support_resistance,
      moving_averages,
      beta,
      anyDataFound,
    });

    return {
      beta,
      tl_swot,
      swot_counts,
      dvm_scores,
      checklist,
      key_metrics,
      analyst_consensus: null,   // not available from widgets
      analyst_target_price,
      analyst_count,
      support_resistance,
      moving_averages,
      shareholding: null,        // not available from widgets
      retail_sentiment: null,    // not available from widgets
      fetched: anyDataFound,
      error: anyDataFound
        ? null
        : "No data extracted — SWOT widget may be empty, technical/checklist widgets are JS-rendered",
    };
  } catch (err) {
    return {
      ...EMPTY,
      fetched: false,
      error: err instanceof Error ? err.message : "Unknown error fetching Trendlyne data",
    };
  }
}
