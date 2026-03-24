import chalk from "chalk";
import type { EvaluationReport } from "../types/evaluation.js";
import type { StockData } from "../types/stock.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const W = 60; // total report width

function line(char = "─"): string {
  return char.repeat(W);
}

function section(title: string): void {
  console.log("\n" + chalk.bold.white(` ${title}`));
  console.log(chalk.gray(line()));
}

function row(label: string, value: string, color = chalk.white): void {
  const pad = W - label.length - value.length - 4;
  console.log(
    chalk.gray("  ") +
      chalk.gray(label) +
      " ".repeat(Math.max(pad, 1)) +
      color(value)
  );
}

function fmt(v: string | number | null | undefined, suffix = ""): string {
  if (v === null || v === undefined || v === "DATA_UNAVAILABLE") return chalk.gray("—");
  return String(v) + suffix;
}

function fmtCr(v: number | null | undefined): string {
  if (v === null || v === undefined) return chalk.gray("—");
  return `₹${v.toLocaleString("en-IN")} Cr`;
}

type ChalkInstance = typeof chalk;

function verdictChalk(color: string): ChalkInstance {
  return color === "green" ? chalk.bold.green : color === "red" ? chalk.bold.red : chalk.bold.yellow;
}

function flagEmoji(type: string): string {
  return type === "green" ? "🟢" : type === "red" ? "🔴" : "🟡";
}

function qualityEmoji(result: string): string {
  return result === "PASS" ? chalk.green("✓") : result === "FAIL" ? chalk.red("✗") : chalk.yellow("~");
}

function compatEmoji(result: string): string {
  return result === "MATCH" ? chalk.green("MATCH") : result === "MISMATCH" ? chalk.red("MISMATCH") : chalk.yellow("CONCERN");
}

function countLiveMetrics(stock: StockData): number {
  let count = 0;
  const check = (v: unknown): void => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) { if (v.length > 0) count++; return; }
    if (typeof v === "object") { for (const val of Object.values(v as Record<string, unknown>)) check(val); return; }
    count++;
  };
  for (const val of Object.values(stock)) check(val);
  return count;
}

// ─── Header ─────────────────────────────────────────────────────────────────

export function printHeader(ticker: string): void {
  const date = new Date().toISOString().split("T")[0] ?? "";
  console.log("\n" + chalk.cyan("┌" + "─".repeat(W - 2) + "┐"));
  const t1 = `  QUANTSIEVE — Stock Evaluation Report`;
  const t2 = `  Ticker: ${ticker}`;
  const t3 = `  Date:   ${date}`;
  console.log(chalk.cyan("│") + chalk.bold(t1.padEnd(W - 2)) + chalk.cyan("│"));
  console.log(chalk.cyan("│") + chalk.white(t2.padEnd(W - 2)) + chalk.cyan("│"));
  console.log(chalk.cyan("│") + chalk.white(t3.padEnd(W - 2)) + chalk.cyan("│"));
  console.log(chalk.cyan("└" + "─".repeat(W - 2) + "┘") + "\n");
}

// ─── Fetch status ────────────────────────────────────────────────────────────

export function printFetchStatus(stock: StockData): void {
  const metricCount = countLiveMetrics(stock);
  console.log(chalk.bold("📡 Fetching data from Screener.in..."));
  console.log(chalk.green(`   ✓ ${metricCount} metrics extracted`));
  console.log(chalk.green(`   ✓ Company : ${stock.company_name}`));
  console.log(chalk.green(`   ✓ Sector  : ${stock.sector}`));
  if (stock.market_cap !== null) {
    console.log(chalk.green(`   ✓ Mkt Cap : ${fmtCr(stock.market_cap)} (${stock.market_cap_category ?? ""} Cap)`));
  }
  console.log(chalk.bold("\n🤖 Sending to Claude for evaluation..."));
}

// ─── Full report ─────────────────────────────────────────────────────────────

export function printFullReport(report: EvaluationReport, stock: StockData): void {

  // ── 1. Snapshot ────────────────────────────────────────────────────────────
  section("SNAPSHOT");
  row("Company",        stock.company_name);
  row("Sector",         report.overview["sector"] as string ?? stock.sector);
  row("Market Cap",     fmtCr(stock.market_cap) + (stock.market_cap_category ? `  (${stock.market_cap_category} Cap)` : ""));
  row("Current Price",  stock.current_price !== null ? `₹${stock.current_price}` : "—");
  row("52W High / Low", `₹${fmt(stock.high_52w)} / ₹${fmt(stock.low_52w)}`);
  row("P/E Ratio",      fmt(stock.pe_ratio, "×"));
  row("Book Value",     fmt(stock.book_value !== null ? `₹${stock.book_value}` : null));
  row("ROE",            fmt(stock.roe, "%"));
  row("ROCE (latest)",  stock.roce.length ? `${stock.roce[stock.roce.length - 1]}%` : "—");
  row("Dividend Yield", fmt(stock.dividend_yield, "%"));
  row("Interest Cover", fmt(stock.interest_coverage, "×"));
  row("Promoter Hold",  fmt(stock.promoter_holding, "%"));
  row("FII / DII",      `${fmt(stock.fii_holding, "%")} / ${fmt(stock.dii_holding, "%")}`);

  // ── 2. Flags ───────────────────────────────────────────────────────────────
  section("FLAGS");
  for (const flag of report.flags) {
    const labelColor = flag.type === "green" ? chalk.green : flag.type === "red" ? chalk.red : chalk.yellow;
    console.log(`  ${flagEmoji(flag.type)}  ${labelColor(flag.title)}`);
    console.log(chalk.gray(`       ${flag.description}`));
  }

  // ── 3. Financials ──────────────────────────────────────────────────────────
  section("FINANCIAL HEALTH  ·  " + report.financials.health_verdict);

  // Profitability mini-table
  const prof = report.financials.profitability;
  const profKeys = Object.keys(prof);
  if (profKeys.length > 0) {
    const firstKey = profKeys[0];
    const cols = firstKey !== undefined ? (prof[firstKey]?.length ?? 0) : 0;
    const colW = Math.floor((W - 20) / Math.max(cols - 1, 1));

    // Header row
    const headerRow = profKeys[0] !== undefined ? prof[profKeys[0]] : [];
    let header = "  " + "Metric".padEnd(16);
    for (let i = 1; i < (headerRow?.length ?? 0); i++) {
      const yearLabel = String(headerRow?.[i] ?? `Y${i}`).slice(-2);
      header += String(`FY${yearLabel}`).padStart(colW);
    }
    console.log(chalk.gray(header));
    console.log(chalk.gray("  " + "─".repeat(W - 4)));

    for (const key of profKeys) {
      const vals = prof[key] ?? [];
      let rowStr = "  " + key.padEnd(16);
      for (let i = 1; i < vals.length; i++) {
        const v = vals[i];
        const cell = (v === "DATA_UNAVAILABLE" ? "—" : String(v)).padStart(colW);
        rowStr += v === "DATA_UNAVAILABLE" ? chalk.gray(cell) : chalk.white(cell);
      }
      console.log(rowStr);
    }
  }

  // Balance sheet
  console.log();
  const bs = report.financials.balance_sheet;
  row("Debt / Equity",    fmt(bs["Debt/Equity"]));
  row("Interest Coverage",fmt(bs["Interest Coverage"], "×"));
  row("Current Ratio",    fmt(bs["Current Ratio"]));
  row("Total Assets",     typeof bs["Total Assets"] === "number" ? fmtCr(bs["Total Assets"]) : "—");
  row("Borrowings",       typeof bs["Borrowings"] === "number" ? fmtCr(bs["Borrowings"]) : "—");
  row("Reserves",         typeof bs["Reserves"] === "number" ? fmtCr(bs["Reserves"]) : "—");

  // Cash flow table
  console.log("\n" + chalk.gray("  Cash Flow (₹Cr)"));
  console.log(chalk.gray("  " + "─".repeat(W - 4)));
  const cfHeader = "  " + "Year".padEnd(12) + "Operating".padStart(12) + "Investing".padStart(12) + "Financing".padStart(12);
  console.log(chalk.gray(cfHeader));
  for (const cf of report.financials.cash_flow) {
    const opColor  = cf.operating  >= 0 ? chalk.green : chalk.red;
    const invColor = cf.investing  >= 0 ? chalk.green : chalk.red;
    const finColor = cf.financing  >= 0 ? chalk.green : chalk.red;
    console.log(
      "  " + chalk.white(cf.year.padEnd(12)) +
      opColor(String(cf.operating).padStart(12)) +
      invColor(String(cf.investing).padStart(12)) +
      finColor(String(cf.financing).padStart(12))
    );
  }

  // ── 4. Valuation ───────────────────────────────────────────────────────────
  const zoneColor = (z: string) =>
    z === "UNDERVALUED" ? chalk.green(z) : z === "EXPENSIVE" ? chalk.red(z) : chalk.yellow(z);

  section(`VALUATION  ·  ${zoneColor(report.valuation.zone)}`);

  // Metrics table
  const mHeader = "  " + "Metric".padEnd(12) + "Current".padStart(12) + "5Y Median".padStart(12) + "Sector".padStart(12) + "Assess".padStart(10);
  console.log(chalk.gray(mHeader));
  console.log(chalk.gray("  " + "─".repeat(W - 4)));
  for (const m of report.valuation.metrics) {
    const assessColor = m.assessment === "CHEAP" ? chalk.green : m.assessment === "EXPENSIVE" ? chalk.red : chalk.yellow;
    const curr = m.current === "DATA_UNAVAILABLE" ? chalk.gray("—") : chalk.white(m.current);
    const med  = m.median_5y === "DATA_UNAVAILABLE" ? chalk.gray("—") : chalk.gray(m.median_5y);
    const sec  = m.sector_median === "DATA_UNAVAILABLE" ? chalk.gray("—") : chalk.gray(m.sector_median);
    const ass  = m.assessment === "DATA_UNAVAILABLE" ? chalk.gray("—") : assessColor(m.assessment);
    console.log("  " + m.metric.padEnd(12) + curr.padStart(12) + med.padStart(12) + sec.padStart(12) + ass.padStart(10));
  }

  // Peers
  console.log("\n" + chalk.gray("  Peer Comparison"));
  console.log(chalk.gray("  " + "─".repeat(W - 4)));
  const pHeader = "  " + "Company".padEnd(30) + "P/E".padStart(8) + "P/B".padStart(8) + "ROE".padStart(8);
  console.log(chalk.gray(pHeader));
  // Current stock first
  console.log(
    "  " + chalk.cyan(chalk.bold(stock.company_name.padEnd(30))) +
    chalk.cyan(fmt(stock.pe_ratio, "×").padStart(8)) +
    chalk.cyan(fmt(stock.pb_ratio, "×").padStart(8)) +
    chalk.cyan(fmt(stock.roe, "%").padStart(8))
  );
  for (const peer of report.valuation.peers) {
    console.log(
      "  " + chalk.gray(peer.name.padEnd(30)) +
      chalk.gray(String(peer.pe).padStart(8)) +
      chalk.gray(String(peer.pb).padStart(8)) +
      chalk.gray(String(peer.roe).padStart(8))
    );
  }

  console.log("\n" + chalk.gray(`  ${report.valuation.margin_of_safety}`));

  // ── 5. Quality Checks ─────────────────────────────────────────────────────
  const { earned, total, percentage, label } = report.quality_score;
  const scoreColor = label === "GOOD" ? chalk.green : label === "BAD" ? chalk.red : chalk.yellow;
  section(`QUALITY CHECKS  ·  ${scoreColor(`${earned}/${total}  (${percentage.toFixed(0)}%)  ${label}`)}`);

  for (const qc of report.quality_checks) {
    const critTag = qc.critical ? chalk.red(" [C]") : "    ";
    console.log(`  ${qualityEmoji(qc.result)}${critTag}  ${chalk.white(qc.name)}`);
    if (qc.result !== "PASS") {
      console.log(chalk.gray(`            ${qc.detail}`));
    }
  }
  console.log(chalk.gray("\n  [C] = Critical check"));

  // ── 6. Compatibility ──────────────────────────────────────────────────────
  const overallColor = report.compatibility_overall === "STRONG" ? chalk.green : report.compatibility_overall === "POOR" ? chalk.red : chalk.yellow;
  section(`INVESTOR COMPATIBILITY  ·  ${overallColor(report.compatibility_overall)}`);

  for (const c of report.compatibility) {
    console.log(`  ${compatEmoji(c.result).padEnd(20)}  ${chalk.gray(c.code)}  ${chalk.white(c.name)}`);
    console.log(chalk.gray(`                         ${c.reason}`));
  }

  // ── 7. Verdict ────────────────────────────────────────────────────────────
  const vc = verdictChalk(report.verdict.color);
  const emoji = report.verdict.color === "green" ? "🟢" : report.verdict.color === "red" ? "🔴" : "🟡";

  console.log("\n" + chalk.bold.white(line("━")));
  console.log(`  ${emoji}  ${vc("VERDICT: " + report.verdict.label.replace(/_/g, " "))}`);
  console.log(chalk.bold.white(line("━")));
  console.log();
  console.log(chalk.white("  " + report.verdict.summary));
  console.log();

  console.log(chalk.bold.green("  ✅ What works:"));
  for (const p of report.verdict.what_works) console.log(chalk.white(`     •  ${p}`));
  console.log();

  console.log(chalk.bold.yellow("  ⚠️  What to watch:"));
  for (const p of report.verdict.what_to_watch) console.log(chalk.white(`     •  ${p}`));
  console.log();

  console.log(chalk.bold("  📊 vs Index:"));
  console.log(chalk.white(`     ${report.verdict.index_comparison}`));
  console.log();

  console.log(chalk.bold("  🔔 Review triggers:"));
  for (const t of report.verdict.review_triggers) console.log(chalk.gray(`     •  ${t}`));

  // ── 8. Benchmarks ─────────────────────────────────────────────────────────
  console.log();
  console.log(chalk.gray("  Benchmark alternatives:"));
  console.log(chalk.gray(`     Sector index : ${report.benchmarks.sector_index}`));
  console.log(chalk.gray(`     Broad index  : ${report.benchmarks.broad_index}`));
  console.log(chalk.gray(`     Index fund   : ${report.benchmarks.index_fund}`));

  // ── 9. Data Gaps ──────────────────────────────────────────────────────────
  if (report.data_gaps.length > 0) {
    const material = report.data_gaps.filter((g) => g.impact === "MATERIAL");
    section(`DATA GAPS  ·  ${material.length} material`);
    for (const gap of report.data_gaps) {
      const impactColor = gap.impact === "MATERIAL" ? chalk.red : chalk.gray;
      console.log(`  ${impactColor(gap.impact.padEnd(10))}  ${chalk.white(gap.metric)}`);
      console.log(chalk.gray(`                ${gap.explanation}`));
    }
    console.log(chalk.gray(`\n  Check: ${report.data_gaps[0]?.check_url ?? ""}`));
  }

  // ── 10. Confidence ────────────────────────────────────────────────────────
  console.log();
  const confColor = report.confidence.level === "HIGH" ? chalk.green : report.confidence.level === "LOW" ? chalk.red : chalk.yellow;
  console.log(chalk.gray("  " + line()));
  console.log(
    chalk.gray("  Confidence: ") +
      confColor(report.confidence.level) +
      chalk.gray(`  (${report.confidence.live_count}/${report.confidence.total} metrics live)`)
  );
  console.log(chalk.gray("  " + line()) + "\n");
}

export function printReportSaved(filePath: string): void {
  console.log(chalk.gray(`💾 Full JSON saved: ${filePath}\n`));
}

export function printError(message: string): void {
  console.error(chalk.bold.red("\n✖ Error: ") + chalk.red(message) + "\n");
}
