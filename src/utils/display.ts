import chalk from "chalk";
import type { EvaluationReport } from "../types/evaluation.js";
import type { StockData } from "../types/stock.js";
import type { SwotResult } from "../services/swotEngine.js";
import type { TrendlyneData } from "../services/trendlyneScraper.js";

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
  return type === "GREEN" ? "🟢" : type === "RED" ? "🔴" : "🟡";
}

function verdictColor(verdict: string): string {
  return verdict === "BUY" ? "green" : verdict === "AVOID" ? "red" : "amber";
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
}

export function printSwotStatus(swot: SwotResult): void {
  console.log(chalk.bold("\n📊 SWOT Pre-Analysis..."));
  console.log(
    chalk.green(
      `   ✓ ${swot.summary.strengths} Strengths | ${swot.summary.weaknesses} Weaknesses | ${swot.summary.opportunities} Opportunities | ${swot.summary.threats} Threats`
    )
  );
}

export function printTrendlyneStatus(tl: TrendlyneData): void {
  console.log(chalk.bold("\n📡 Trendlyne supplementary data..."));
  if (!tl.fetched) {
    console.log(
      chalk.yellow(`   ⚠ ${tl.error ?? "Could not fetch Trendlyne data"} — skipping`)
    );
  } else {
    const betaStr = tl.beta !== null ? `Beta: ${tl.beta}` : "Beta: N/A";
    const targetStr =
      tl.analyst_target_price !== null
        ? `Analyst Target: ₹${tl.analyst_target_price}${tl.analyst_count !== null ? ` (${tl.analyst_count} analysts)` : ""}`
        : null;
    console.log(chalk.green(`   ✓ ${betaStr}${targetStr !== null ? ` | ${targetStr}` : ""}`));
    if (tl.dvm_scores !== null) {
      console.log(
        chalk.green(
          `   ✓ DVM: Durability ${tl.dvm_scores.durability ?? "—"} | Valuation ${tl.dvm_scores.valuation ?? "—"} | Momentum ${tl.dvm_scores.momentum ?? "—"}`
        )
      );
    }
  }
  console.log(chalk.bold("\n🤖 Sending to Claude for evaluation..."));
}

// ─── Full report ─────────────────────────────────────────────────────────────

export function printFullReport(
  report: EvaluationReport,
  stock: StockData,
  swot?: SwotResult,
  trendlyne?: TrendlyneData | null
): void {

  // ── 1. Snapshot ────────────────────────────────────────────────────────────
  section("SNAPSHOT");
  row("Company",        stock.company_name);
  row("Sector",         stock.sector);
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

  // ── 1b. Trendlyne supplementary snapshot ──────────────────────────────────
  if (trendlyne !== null && trendlyne !== undefined && trendlyne.fetched) {
    if (trendlyne.beta !== null) row("Beta", String(trendlyne.beta));
    if (trendlyne.analyst_target_price !== null) {
      const target = `₹${trendlyne.analyst_target_price}${trendlyne.analyst_count !== null ? `  (${trendlyne.analyst_count} analysts)` : ""}`;
      row("Analyst Target", target);
    }
    if (trendlyne.dvm_scores !== null) {
      const dvm = `D:${trendlyne.dvm_scores.durability ?? "—"}  V:${trendlyne.dvm_scores.valuation ?? "—"}  M:${trendlyne.dvm_scores.momentum ?? "—"}`;
      row("DVM Scores", dvm);
      if (trendlyne.dvm_scores.label !== null) {
        row("Trendlyne Class", trendlyne.dvm_scores.label);
      }
    }
    if (trendlyne.retail_sentiment !== null) {
      const sent = `${trendlyne.retail_sentiment.buy_pct ?? "—"}% Buy  ${trendlyne.retail_sentiment.sell_pct ?? "—"}% Sell  ${trendlyne.retail_sentiment.hold_pct ?? "—"}% Hold`;
      row("Retail Sentiment", sent);
    }
  }

  // ── 1c. SWOT Summary ───────────────────────────────────────────────────────
  if (swot !== undefined) {
    section("SWOT ANALYSIS  (rule-based)");
    const { strengths: ns, weaknesses: nw, opportunities: no, threats: nt } = swot.summary;
    console.log(
      chalk.gray("  ") +
        chalk.green(`${ns}S`) +
        chalk.gray("  |  ") +
        chalk.red(`${nw}W`) +
        chalk.gray("  |  ") +
        chalk.cyan(`${no}O`) +
        chalk.gray("  |  ") +
        chalk.yellow(`${nt}T`)
    );
    console.log();

    if (swot.strengths.length > 0) {
      console.log(chalk.bold.green("  Strengths"));
      for (const item of swot.strengths) {
        console.log(chalk.green(`   ✓ ${item.point}`));
        console.log(chalk.gray(`       ${item.evidence}`));
      }
      console.log();
    }
    if (swot.weaknesses.length > 0) {
      console.log(chalk.bold.red("  Weaknesses"));
      for (const item of swot.weaknesses) {
        console.log(chalk.red(`   ✗ ${item.point}`));
        console.log(chalk.gray(`       ${item.evidence}`));
      }
      console.log();
    }
    if (swot.opportunities.length > 0) {
      console.log(chalk.bold.cyan("  Opportunities"));
      for (const item of swot.opportunities) {
        console.log(chalk.cyan(`   ◆ ${item.point}`));
        console.log(chalk.gray(`       ${item.evidence}`));
      }
      console.log();
    }
    if (swot.threats.length > 0) {
      console.log(chalk.bold.yellow("  Threats"));
      for (const item of swot.threats) {
        console.log(chalk.yellow(`   ⚠ ${item.point}`));
        console.log(chalk.gray(`       ${item.evidence}`));
      }
    }
  }

  // ── 2. Flags ───────────────────────────────────────────────────────────────
  section("FLAGS");
  for (const flag of report.flags) {
    const labelColor = flag.type === "GREEN" ? chalk.green : flag.type === "RED" ? chalk.red : chalk.yellow;
    console.log(`  ${flagEmoji(flag.type)}  ${labelColor(flag.title)}`);
    console.log(chalk.gray(`       ${flag.description}`));
  }

  // ── 3. Financials ──────────────────────────────────────────────────────────
  section("FINANCIAL HEALTH  ·  " + report.financials.health_verdict);
  console.log(chalk.gray("  " + report.financials.health_rationale));
  console.log();
  row("Revenue CAGR (3Y)", report.financials.revenue_cagr_3y !== null ? `${report.financials.revenue_cagr_3y}%` : "—");
  row("Profit CAGR (3Y)",  report.financials.profit_cagr_3y  !== null ? `${report.financials.profit_cagr_3y}%`  : "—");
  if (report.financials.weighted_expected_return_pct !== null) {
    row("Wtd Expected Return", `${report.financials.weighted_expected_return_pct}%`);
  }
  console.log();
  console.log(chalk.gray("  OCF/PAT: ") + chalk.white(report.financials.ocf_to_pat_assessment));
  console.log(chalk.gray("  FCF:     ") + chalk.white(report.financials.fcf_assessment));
  console.log(chalk.gray("  WC:      ") + chalk.white(report.financials.working_capital_assessment));

  // ── 4. Valuation ───────────────────────────────────────────────────────────
  const zoneColor = (z: string) =>
    z === "UNDERVALUED" ? chalk.green(z) : z === "EXPENSIVE" ? chalk.red(z) : chalk.yellow(z);

  section(`VALUATION  ·  ${zoneColor(report.valuation.zone)}`);
  row("Justified P/E",     report.valuation.justified_pe !== null ? `${report.valuation.justified_pe}×` : "—");
  row("IV Conservative",   report.valuation.iv_conservative !== null ? `₹${report.valuation.iv_conservative}` : "—");
  row("IV Optimistic",     report.valuation.iv_optimistic  !== null ? `₹${report.valuation.iv_optimistic}` : "—");
  row("Risk/Reward",       report.valuation.risk_reward_ratio !== null ? `${report.valuation.risk_reward_ratio}:1` : "—");
  row("Margin of Safety",  report.valuation.margin_of_safety_pct !== null ? `${report.valuation.margin_of_safety_pct}%` : "—");
  console.log();
  console.log(chalk.gray("  " + report.valuation.valuation_narrative));

  // ── 5. Quality Checks ─────────────────────────────────────────────────────
  const { earned, total, percentage, label } = report.quality_score;
  const scoreColor = label === "GOOD" ? chalk.green : label === "BAD" ? chalk.red : chalk.yellow;
  section(`QUALITY CHECKS  ·  ${scoreColor(`${earned}/${total}  (${percentage.toFixed(0)}%)  ${label}`)}`);

  for (const qc of report.quality_checks) {
    console.log(`  ${qualityEmoji(qc.result)}  ${chalk.gray(qc.id.padEnd(6))}  ${chalk.white(qc.label)}`);
    if (qc.result !== "PASS") {
      console.log(chalk.gray(`                ${qc.finding}`));
    }
  }

  // ── 6. Compatibility ──────────────────────────────────────────────────────
  const overallColor = report.compatibility_overall === "STRONG" ? chalk.green : report.compatibility_overall === "POOR" ? chalk.red : chalk.yellow;
  section(`INVESTOR COMPATIBILITY  ·  ${overallColor(report.compatibility_overall)}`);

  for (const c of report.compatibility) {
    console.log(`  ${compatEmoji(c.result).padEnd(20)}  ${chalk.white(c.dimension)}`);
    console.log(chalk.gray(`                         ${c.note}`));
  }

  // ── 7. Verdict ────────────────────────────────────────────────────────────
  const vColor = verdictColor(report.verdict);
  const vc = verdictChalk(vColor);
  const emoji = vColor === "green" ? "🟢" : vColor === "red" ? "🔴" : "🟡";

  console.log("\n" + chalk.bold.white(line("━")));
  console.log(`  ${emoji}  ${vc("VERDICT: " + report.verdict.replace(/_/g, " "))}`);
  console.log(chalk.bold.white(line("━")));
  console.log();
  console.log(chalk.white("  " + report.verdict_summary));
  console.log();

  console.log(chalk.bold.green("  ✅ What works:"));
  for (const p of report.overview.what_works) console.log(chalk.white(`     •  ${p}`));
  console.log();

  console.log(chalk.bold.yellow("  ⚠️  Monitorables:"));
  for (const p of report.monitorables) console.log(chalk.white(`     •  ${p}`));
  console.log();

  console.log(chalk.bold("  🔔 Review triggers:"));
  for (const t of report.review_triggers) console.log(chalk.gray(`     •  ${t}`));

  // ── 8. Benchmarks ─────────────────────────────────────────────────────────
  console.log();
  console.log(chalk.gray("  Benchmark alternatives:"));
  console.log(chalk.gray(`     Sector index : ${report.benchmarks.sector_index}`));
  console.log(chalk.gray(`     Broad index  : ${report.benchmarks.broad_index}`));
  console.log(chalk.gray(`     Index fund   : ${report.benchmarks.index_fund_alternative}`));

  // ── 9. Data Gaps ──────────────────────────────────────────────────────────
  if (report.data_gaps.length > 0) {
    const material = report.data_gaps.filter((g) => g.materiality === "MATERIAL");
    section(`DATA GAPS  ·  ${material.length} material`);
    for (const gap of report.data_gaps) {
      const impactColor = gap.materiality === "MATERIAL" ? chalk.red : chalk.gray;
      console.log(`  ${impactColor(gap.materiality.padEnd(10))}  ${chalk.white(gap.field)}`);
      console.log(chalk.gray(`                ${gap.impact}`));
    }
  }

  // ── 10. Confidence ────────────────────────────────────────────────────────
  console.log();
  const confColor = report.confidence === "HIGH" ? chalk.green : report.confidence === "LOW" ? chalk.red : chalk.yellow;
  console.log(chalk.gray("  " + line()));
  console.log(chalk.gray("  Confidence: ") + confColor(report.confidence));
  console.log(chalk.gray("  " + report.confidence_rationale));
  console.log(chalk.gray("  " + line()) + "\n");
}

export function printReportSaved(filePath: string): void {
  console.log(chalk.gray(`💾 Full JSON saved: ${filePath}\n`));
}

export function printError(message: string): void {
  console.error(chalk.bold.red("\n✖ Error: ") + chalk.red(message) + "\n");
}
