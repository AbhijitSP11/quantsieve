import * as cheerio from "cheerio";
import type { StockData } from "../types/stock.js";
import type { MarketCapCategory } from "../types/common.js";

// ---------------------------------------------------------------------------
// Number helpers
// ---------------------------------------------------------------------------

function parseIndianNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/Cr\.?/gi, "")
    .replace(/%/g, "")
    .trim();
  if (cleaned === "" || cleaned === "—" || cleaned === "-" || cleaned === "NA") {
    return null;
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parsePercent(raw: string): number | null {
  return parseIndianNumber(raw.replace(/%/g, ""));
}

function marketCapCategory(crores: number | null): MarketCapCategory | null {
  if (crores === null) return null;
  if (crores >= 20000) return "Large";
  if (crores >= 5000) return "Mid";
  if (crores >= 500) return "Small";
  return "Micro";
}

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

type TableData = Record<string, string[]>;

/**
 * Parse a Screener table into { rowLabel: [col1, col2, ...] }.
 * The first column of each row is treated as the label.
 */
function parseTable($: cheerio.CheerioAPI, section: string): TableData {
  const result: TableData = {};
  $(`${section} table`).each((_i, table) => {
    $(table)
      .find("tr")
      .each((_j, row) => {
        const cells = $(row).find("td, th");
        if (cells.length < 2) return;
        const label = $(cells[0]).text().trim();
        if (!label) return;
        const values: string[] = [];
        cells.each((k, cell) => {
          if (k === 0) return;
          values.push($(cell).text().trim());
        });
        result[label] = values;
      });
  });
  return result;
}

/** Get last N numeric values from a table row, skipping empty/TTM columns */
function lastNValues(row: string[] | undefined, n: number): number[] {
  if (!row) return [];
  const nums = row
    .map((v) => parseIndianNumber(v))
    .filter((v): v is number => v !== null);
  return nums.slice(-n);
}

/** Get the last value in a row as a number */
function lastValue(row: string[] | undefined): number | null {
  if (!row || row.length === 0) return null;
  for (let i = row.length - 1; i >= 0; i--) {
    const v = parseIndianNumber(row[i] ?? "");
    if (v !== null) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

function parseTopRatios(
  $: cheerio.CheerioAPI
): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  $("#top-ratios li").each((_i, el) => {
    const label = $(el).find(".name").text().trim();
    const value = $(el).find(".number").text().trim();
    if (label) result[label] = parseIndianNumber(value);
  });
  return result;
}

function parsePriceBlock($: cheerio.CheerioAPI): {
  high52: number | null;
  low52: number | null;
} {
  // "52 Week High / Low" is sometimes in the top-ratios block
  let high52: number | null = null;
  let low52: number | null = null;
  $("#top-ratios li").each((_i, el) => {
    const label = $(el).find(".name").text().trim();
    if (/52 week high/i.test(label)) {
      high52 = parseIndianNumber($(el).find(".number").text().trim());
    }
    if (/52 week low/i.test(label)) {
      low52 = parseIndianNumber($(el).find(".number").text().trim());
    }
    // Sometimes shown as "High / Low" with a combined value
    if (/high.*low/i.test(label)) {
      const text = $(el).find(".number").text().trim();
      const parts = text.split("/");
      high52 = parseIndianNumber(parts[0] ?? "");
      low52 = parseIndianNumber(parts[1] ?? "");
    }
  });
  return { high52, low52 };
}

function parseCompoundedGrowth($: cheerio.CheerioAPI): {
  sales: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null };
  profit: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null };
  stockCagr: { "1y": number | null; "3y": number | null; "5y": number | null; "10y": number | null };
  roeHistory: { "3y": number | null; "5y": number | null; "10y": number | null; last_year: number | null };
} {
  const sales: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null } =
    { "3y": null, "5y": null, "10y": null, ttm: null };
  const profit: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null } =
    { "3y": null, "5y": null, "10y": null, ttm: null };
  const stockCagr: { "1y": number | null; "3y": number | null; "5y": number | null; "10y": number | null } =
    { "1y": null, "3y": null, "5y": null, "10y": null };
  const roeHistory: { "3y": number | null; "5y": number | null; "10y": number | null; last_year: number | null } =
    { "3y": null, "5y": null, "10y": null, last_year: null };

  // Screener renders these in a .ranges-table or similar inside #profit-loss
  $("section#profit-loss .ranges-table, section#profit-loss table").each(
    (_i, table) => {
      $(table)
        .find("tr")
        .each((_j, row) => {
          const cells = $(row).find("td, th");
          const label = $(cells[0]).text().trim();
          const vals = cells
            .toArray()
            .slice(1)
            .map((c) => $(c).text().trim());

          if (/compounded sales growth/i.test(label)) {
            // cols: 10Y, 5Y, 3Y, TTM
            sales["10y"] = parsePercent(vals[0] ?? "");
            sales["5y"] = parsePercent(vals[1] ?? "");
            sales["3y"] = parsePercent(vals[2] ?? "");
            sales["ttm"] = parsePercent(vals[3] ?? "");
          } else if (/compounded profit growth/i.test(label)) {
            profit["10y"] = parsePercent(vals[0] ?? "");
            profit["5y"] = parsePercent(vals[1] ?? "");
            profit["3y"] = parsePercent(vals[2] ?? "");
            profit["ttm"] = parsePercent(vals[3] ?? "");
          } else if (/stock price cagr/i.test(label)) {
            stockCagr["10y"] = parsePercent(vals[0] ?? "");
            stockCagr["5y"] = parsePercent(vals[1] ?? "");
            stockCagr["3y"] = parsePercent(vals[2] ?? "");
            stockCagr["1y"] = parsePercent(vals[3] ?? "");
          } else if (/return on equity/i.test(label)) {
            roeHistory["10y"] = parsePercent(vals[0] ?? "");
            roeHistory["5y"] = parsePercent(vals[1] ?? "");
            roeHistory["3y"] = parsePercent(vals[2] ?? "");
            roeHistory["last_year"] = parsePercent(vals[3] ?? "");
          }
        });
    }
  );

  return { sales, profit, stockCagr, roeHistory };
}

function parseShareholding($: cheerio.CheerioAPI): {
  promoter: number | null;
  promoterTrend: { quarter: string; pct: number }[];
  pledge: number | null;
  fii: number | null;
  dii: number | null;
  pub: number | null;
} {
  const headers: string[] = [];
  const rows: Record<string, string[]> = {};

  $("section#shareholding table").each((_i, table) => {
    $(table)
      .find("tr")
      .each((_j, row) => {
        const cells = $(row).find("td, th");
        const label = $(cells[0]).text().trim();
        if (!label) return;
        const vals: string[] = [];
        cells.each((k, cell) => {
          if (k === 0) return;
          vals.push($(cell).text().trim());
        });
        if (/^(quarter|period|sep|dec|mar|jun)/i.test(label)) {
          headers.push(...vals);
        } else {
          rows[label] = vals;
        }
      });
  });

  const promoterRow = Object.entries(rows).find(([k]) =>
    /promoter/i.test(k)
  )?.[1] ?? [];
  const fiiRow = Object.entries(rows).find(([k]) => /fii|foreign/i.test(k))?.[1] ?? [];
  const diiRow = Object.entries(rows).find(([k]) => /dii|domestic inst/i.test(k))?.[1] ?? [];
  const pubRow = Object.entries(rows).find(([k]) => /^public$/i.test(k))?.[1] ?? [];
  const pledgeRow = Object.entries(rows).find(([k]) => /pledge/i.test(k))?.[1] ?? [];

  const promoterTrend: { quarter: string; pct: number }[] = [];
  promoterRow.forEach((val, idx) => {
    const pct = parsePercent(val);
    const quarter = headers[idx] ?? `Q${idx + 1}`;
    if (pct !== null) promoterTrend.push({ quarter, pct });
  });

  return {
    promoter: lastValue(promoterRow),
    promoterTrend,
    pledge: lastValue(pledgeRow),
    fii: lastValue(fiiRow),
    dii: lastValue(diiRow),
    pub: lastValue(pubRow),
  };
}

function parseCashFlow($: cheerio.CheerioAPI): {
  year: string;
  operating: number;
  investing: number;
  financing: number;
}[] {
  const tableData = parseTable($, "section#cash-flow");

  const opRow = Object.entries(tableData).find(([k]) =>
    /cash from operating/i.test(k)
  )?.[1] ?? [];
  const invRow = Object.entries(tableData).find(([k]) =>
    /cash from investing/i.test(k)
  )?.[1] ?? [];
  const finRow = Object.entries(tableData).find(([k]) =>
    /cash from financing/i.test(k)
  )?.[1] ?? [];

  // Get column headers (years) from the cash flow table
  const yearHeaders: string[] = [];
  $("section#cash-flow table thead tr th, section#cash-flow table tr th").each(
    (_i, el) => {
      const text = $(el).text().trim();
      if (text && !/^(mar|sep|dec|jun)/i.test(text) === false) {
        yearHeaders.push(text);
      } else if (/^\d{4}$/.test(text) || /Mar \d{2}/.test(text)) {
        yearHeaders.push(text);
      }
    }
  );

  const len = Math.max(opRow.length, invRow.length, finRow.length);
  const result: { year: string; operating: number; investing: number; financing: number }[] = [];

  // Take last 3 years
  const start = Math.max(0, len - 3);
  for (let i = start; i < len; i++) {
    const operating = parseIndianNumber(opRow[i] ?? "");
    const investing = parseIndianNumber(invRow[i] ?? "");
    const financing = parseIndianNumber(finRow[i] ?? "");
    const year = yearHeaders[i] ?? `Year ${i + 1}`;
    if (operating !== null || investing !== null || financing !== null) {
      result.push({
        year,
        operating: operating ?? 0,
        investing: investing ?? 0,
        financing: financing ?? 0,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseScreenerPage(html: string, ticker: string): StockData {
  const $ = cheerio.load(html);

  // Company name & sector
  const companyName =
    $("h1.h2").first().text().trim() ||
    $(".company-name").first().text().trim() ||
    ticker;

  const sectorEl = $('a[href*="/stocks/"]').first();
  const sector = sectorEl.text().trim() || "General";
  const industry = $('a[href*="/stocks/"]').eq(1).text().trim() || sector;

  // Top ratios
  const ratios = parseTopRatios($);
  const { high52, low52 } = parsePriceBlock($);

  const currentPrice =
    ratios["Current Price"] ??
    ratios["Price"] ??
    parseIndianNumber($(".current-price .number, #top-ratios .number").first().text());

  const marketCap = ratios["Market Cap"] ?? null;

  // Profit & Loss table
  const plData = parseTable($, "section#profit-loss");

  const salesRow = Object.entries(plData).find(([k]) => /^sales$/i.test(k))?.[1];
  const netProfitRow = Object.entries(plData).find(([k]) =>
    /^net profit$/i.test(k)
  )?.[1];
  const epsRow = Object.entries(plData).find(([k]) => /^eps/i.test(k))?.[1];
  const opmRow = Object.entries(plData).find(([k]) => /^opm/i.test(k))?.[1];
  const interestRow = Object.entries(plData).find(([k]) => /^interest$/i.test(k))?.[1];
  const pbtRow = Object.entries(plData).find(([k]) => /^profit before tax/i.test(k))?.[1];

  // Net Profit Margin = Net Profit / Sales * 100 (per year)
  const revenue5y = lastNValues(salesRow, 5);
  const netProfit5y = lastNValues(netProfitRow, 5);
  const eps5y = lastNValues(epsRow, 5);
  const opm5y = lastNValues(opmRow, 5);

  // TTM is the last column
  const ttmRevenue = salesRow ? parseIndianNumber(salesRow[salesRow.length - 1] ?? "") : null;
  const ttmNetProfit = netProfitRow ? parseIndianNumber(netProfitRow[netProfitRow.length - 1] ?? "") : null;
  const ttmEps = epsRow ? parseIndianNumber(epsRow[epsRow.length - 1] ?? "") : null;

  // NPM (net profit margin) computed per year
  const npm5y: number[] = revenue5y.map((rev, i) => {
    const np = netProfit5y[i];
    if (rev === 0 || np === undefined) return 0;
    return parseFloat(((np / rev) * 100).toFixed(2));
  });

  // Interest coverage = PBT / Interest
  const latestPbt = lastValue(pbtRow);
  const latestInterest = lastValue(interestRow);
  let interestCoverage: number | null = null;
  if (latestPbt !== null && latestInterest !== null && latestInterest !== 0) {
    interestCoverage = parseFloat((latestPbt / latestInterest).toFixed(2));
  }

  // Balance sheet
  const bsData = parseTable($, "section#balance-sheet");
  const borrowingsRow = Object.entries(bsData).find(([k]) => /^borrowings$/i.test(k))?.[1];
  const reservesRow = Object.entries(bsData).find(([k]) => /^reserves$/i.test(k))?.[1];
  const totalAssetsRow = Object.entries(bsData).find(([k]) => /^total assets$/i.test(k))?.[1];

  // ROCE from ratios section
  const ratiosData = parseTable($, "section#ratios");
  const roceRow = Object.entries(ratiosData).find(([k]) => /^roce/i.test(k))?.[1];
  const roce5y = lastNValues(roceRow, 5);

  // Compounded growth
  const { sales, profit, stockCagr, roeHistory } = parseCompoundedGrowth($);

  // Shareholding
  const shareholding = parseShareholding($);

  // Cash flow
  const cashFlow = parseCashFlow($);

  // Listed since — look for incorporation / listing year
  const listedSince: string | null =
    $(".company-links a, .company-info a")
      .toArray()
      .map((el) => $(el).text().trim())
      .find((t) => /\d{4}/.test(t))
      ?.match(/\d{4}/)?.[0] ?? null;

  // BSE scrip code — Screener.in embeds it in BSE links like:
  // href="https://www.bseindia.com/stock-share-price/natco-pharma/natcopharm/524816/"
  let bseCode: string | null = null;
  const bseHref = $('a[href*="bseindia.com/stock-share-price/"]').first().attr("href") ?? "";
  const bseMatch = bseHref.match(/\/stock-share-price\/[^/]+\/[^/]+\/(\d{5,6})\/?/);
  if (bseMatch?.[1]) {
    bseCode = bseMatch[1];
  }

  return {
    ticker: ticker.toUpperCase(),
    company_name: companyName,
    sector,
    industry,

    current_price: currentPrice,
    high_52w: high52,
    low_52w: low52,
    market_cap: marketCap,
    market_cap_category: marketCapCategory(marketCap),

    pe_ratio: ratios["Stock P/E"] ?? ratios["P/E"] ?? null,
    pb_ratio: ratios["Price to Book"] ?? null,
    ev_ebitda: null, // Not directly available on Screener
    dividend_yield: ratios["Dividend Yield"] ?? null,
    book_value: ratios["Book Value"] ?? null,
    face_value: ratios["Face Value"] ?? null,

    revenue: revenue5y,
    net_profit: netProfit5y,
    opm: opm5y,
    npm: npm5y,
    eps: eps5y,
    roe: ratios["ROE"] ?? null,
    roce: roce5y,
    ttm_revenue: ttmRevenue,
    ttm_net_profit: ttmNetProfit,
    ttm_eps: ttmEps,

    debt_to_equity: ratios["Debt to equity"] ?? null,
    interest_coverage: interestCoverage,
    current_ratio: ratios["Current ratio"] ?? null,
    total_assets: lastValue(totalAssetsRow),
    borrowings: lastValue(borrowingsRow),
    reserves: lastValue(reservesRow),

    cash_flow: cashFlow,

    promoter_holding: shareholding.promoter,
    promoter_holding_trend: shareholding.promoterTrend,
    promoter_pledge: shareholding.pledge,
    fii_holding: shareholding.fii,
    dii_holding: shareholding.dii,
    public_holding: shareholding.pub,

    compounded_sales_growth: sales,
    compounded_profit_growth: profit,
    stock_price_cagr: stockCagr,
    roe_history: roeHistory,

    bse_code: bseCode,
    listed_since: listedSince,
    data_source: "screener.in",
    fetched_at: new Date().toISOString(),
  };
}
