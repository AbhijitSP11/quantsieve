import type { EvaluationInput } from "../types/profile.js";
import { loadProfile } from "./profile.js";
import { fetchScreenerPage } from "../services/scraper.js";
import { parseScreenerPage } from "../services/parser.js";
import { evaluateStock } from "../services/claude.js";
import { saveReport } from "../services/reportWriter.js";
import { saveHtmlReport } from "../services/htmlWriter.js";
import { generateSwot } from "../services/swotEngine.js";
import { fetchTrendlyneData } from "../services/trendlyneScraper.js";
import {
  printHeader,
  printFetchStatus,
  printSwotStatus,
  printTrendlyneStatus,
  printFullReport,
  printReportSaved,
  printError,
} from "../utils/display.js";
import { exec } from "child_process";
import type { SwotResult } from "../services/swotEngine.js";
import type { TrendlyneData } from "../services/trendlyneScraper.js";

interface EvaluateOptions {
  context: EvaluationInput["entry_context"];
  thesis?: string;
  json: boolean;
  output?: string;
  noHtml: boolean;
  open: boolean;
}

function openBrowser(filePath: string): void {
  const url = `file://${filePath.replace(/\\/g, "/")}`;
  const cmd =
    process.platform === "win32" ? `start "" "${url}"`
    : process.platform === "darwin" ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd);
}

export async function evaluateCommand(
  ticker: string,
  options: EvaluateOptions
): Promise<void> {
  const symbol = ticker.toUpperCase();

  printHeader(symbol);

  // 1. Load profile
  let profile: Awaited<ReturnType<typeof loadProfile>>;
  try {
    profile = await loadProfile();
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const input: EvaluationInput = {
    ticker: symbol,
    entry_context: options.context,
    ...(options.thesis !== undefined && { thesis: options.thesis }),
    profile,
  };

  // 2. Scrape Screener.in
  let stockData: Awaited<ReturnType<typeof parseScreenerPage>>;
  try {
    const { html } = await fetchScreenerPage(symbol);
    stockData = parseScreenerPage(html, symbol);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  printFetchStatus(stockData);

  // 3. Rule-based SWOT pre-analysis (no network, instant)
  const swot: SwotResult = generateSwot(stockData);
  printSwotStatus(swot);

  // 4. Trendlyne supplementary data (best-effort, non-blocking)
  let trendlyne: TrendlyneData | null = null;
  try {
    trendlyne = await fetchTrendlyneData(symbol);
    printTrendlyneStatus(trendlyne);
  } catch {
    // Trendlyne is supplementary — silently skip on unexpected errors
  }

  // 5. Evaluate via Claude (with SWOT + Trendlyne in prompt)
  let evaluation: Awaited<ReturnType<typeof evaluateStock>>;
  try {
    evaluation = await evaluateStock(
      stockData,
      input,
      swot,
      trendlyne ?? undefined
    );
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // 6. JSON-only mode
  if (options.json) {
    console.log(JSON.stringify({ swot, trendlyne, evaluation }, null, 2));
    return;
  }

  // 7. Terminal report
  printFullReport(evaluation, stockData, swot, trendlyne);

  // 8. Save JSON
  try {
    const jsonPath = await saveReport(
      stockData,
      input,
      evaluation,
      swot,
      trendlyne,
      options.output
    );
    printReportSaved(jsonPath);
  } catch (err) {
    printError(
      `Failed to save JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 9. Save HTML report
  if (!options.noHtml) {
    try {
      const htmlPath = await saveHtmlReport(stockData, input, evaluation, swot, trendlyne);
      const rel = htmlPath
        .replace(process.cwd() + "\\", "")
        .replace(process.cwd() + "/", "");
      console.log(`🌐 HTML report saved: ${rel}`);
      if (options.open) {
        openBrowser(htmlPath);
        console.log(`   Opening in browser...\n`);
      } else {
        console.log(
          `   Run with --open to launch in browser, or open the file directly.\n`
        );
      }
    } catch (err) {
      printError(
        `Failed to save HTML: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
