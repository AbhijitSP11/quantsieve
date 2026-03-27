import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import path from "path";
import { fetchScreenerPage } from "../services/scraper.js";
import { parseScreenerPage } from "../services/parser.js";
import { evaluateStock } from "../services/claude.js";
import { generateSwot } from "../services/swotEngine.js";
import { fetchTrendlyneData } from "../services/trendlyneScraper.js";
import { buildHtml } from "../services/htmlWriter.js";
import type { EvaluationInput } from "../types/profile.js";
import { fetchAllNews } from "../services/news/newsAggregator.js";
import { analyzeNewsSentiment } from "../services/newsSentimentService.js";
import type { NewsResponse } from "../services/news/types.js";
import type { NewsSentimentAnalysis } from "../types/newsSentiment.js";

// ── News cache (15 min TTL per symbol) ────────────────────────────────────────
const newsCache = new Map<string, { data: NewsResponse; expiresAt: number }>();
const NEWS_TTL_MS = 15 * 60 * 1000;

const PUBLIC_DIR = path.resolve(process.cwd(), "dist/public");

const app = express();
app.use(express.json());

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: () => void) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── CORS (permissive — tighten in production if needed) ───────────────────────
app.use((_req: Request, res: Response, next: () => void) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.options("/{*path}", (_req: Request, res: Response) => {
  res.sendStatus(204);
});

// ── Serve built Vite frontend ─────────────────────────────────────────────────
app.use(express.static(PUBLIC_DIR));

// ── Zod schema ────────────────────────────────────────────────────────────────
const investorProfileSchema = z.object({
  age: z.number().int().min(1).max(120),
  investment_goal: z.enum([
    "retirement", "education", "wealth_creation",
    "home_purchase", "short_term", "other",
  ]),
  investment_horizon: z.string().min(1),
  investment_mode: z.enum(["lump_sum", "staggered", "adding"]),
  portfolio_type: z.enum([
    "diversified_10plus", "concentrated_3to5",
    "mostly_mf", "first_investment",
  ]),
  position_sizing: z.enum(["under_5", "5_to_10", "10_to_20", "over_20"]),
  risk_tolerance: z.enum(["low", "medium", "high"]),
  volatility_preference: z.enum(["low", "medium", "high"]),
  tax_bracket: z.enum(["30pct", "20pct", "5to10pct", "not_sure"]),
});

const evaluateRequestSchema = z.object({
  ticker: z.string().min(1).max(20),
  entry_context: z
    .enum(["first_purchase", "adding", "hold_or_exit", "comparing"])
    .default("first_purchase"),
  thesis: z.string().optional(),
  profile: investorProfileSchema,
});

// ── Shared scrape + evaluate logic ────────────────────────────────────────────
async function runEvaluation(body: unknown) {
  const parsed = evaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid request body",
      details: parsed.error.flatten(),
    };
  }

  const { ticker, entry_context, thesis, profile } = parsed.data;
  const symbol = ticker.toUpperCase();

  // 1. Scrape Screener.in
  let stockData: Awaited<ReturnType<typeof parseScreenerPage>>;
  try {
    const { html } = await fetchScreenerPage(symbol);
    stockData = parseScreenerPage(html, symbol);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 502;
    return { ok: false as const, status, error: message };
  }

  const input: EvaluationInput = {
    ticker: symbol,
    entry_context,
    ...(thesis !== undefined && { thesis }),
    profile,
  };

  // 2. Rule-based SWOT (instant, no network)
  const swot = generateSwot(stockData);

  // 3. Trendlyne + news in parallel (both best-effort)
  const [trendlyne, newsResult] = await Promise.all([
    fetchTrendlyneData(symbol).catch(() => null),
    fetchAllNews(symbol, stockData.company_name ?? undefined, stockData.bse_code ?? undefined).catch(() => null),
  ]);

  const recentNews = newsResult?.items ?? [];

  // 4. Claude evaluation + news sentiment analysis — run in parallel (zero extra latency)
  let evaluation: Awaited<ReturnType<typeof evaluateStock>>;
  let sentiment: NewsSentimentAnalysis | null = null;

  try {
    [evaluation, sentiment] = await Promise.all([
      evaluateStock(stockData, input, swot, trendlyne ?? undefined, recentNews),
      analyzeNewsSentiment(recentNews, stockData.company_name, symbol, stockData.sector).catch(() => null),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false as const, status: 500, error: message };
  }

  return {
    ok: true as const,
    stock: stockData,
    swot,
    trendlyne,
    news: newsResult,
    sentiment,
    evaluation,
    input,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "quantsieve" });
});

// JSON API — used by the React frontend
app.post("/api/evaluate", async (req: Request, res: Response) => {
  const result = await runEvaluation(req.body);
  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      ...("details" in result ? { details: result.details } : {}),
    });
    return;
  }
  // Cache the news result for the independent /api/stocks/:symbol/news endpoint
  if (result.news) {
    const cacheKey = `${result.stock.ticker}:${result.stock.company_name ?? ""}`;
    newsCache.set(cacheKey, { data: result.news, expiresAt: Date.now() + NEWS_TTL_MS });
  }

  res.json({
    stock: result.stock,
    swot: result.swot,
    trendlyne: result.trendlyne,
    news: result.news ?? null,
    sentiment: result.sentiment ?? null,
    evaluation: result.evaluation,
  });
});

// HTML report — used for Print / PDF in the React frontend
app.post("/api/evaluate/html", async (req: Request, res: Response) => {
  const result = await runEvaluation(req.body);
  if (!result.ok) {
    res.status(result.status).send(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Error — QuantSieve</title>
      <style>
        body{font-family:system-ui,sans-serif;background:#fef2f2;color:#991b1b;
        display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem}
        .box{max-width:520px;text-align:center}
        .title{font-size:1.5rem;font-weight:700;margin-bottom:.75rem}
        .msg{font-size:.95rem;line-height:1.6;color:#7f1d1d}
        .back{display:inline-block;margin-top:1.5rem;padding:.6rem 1.5rem;
        background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}
      </style>
      </head><body><div class="box">
      <div class="title">❌ Evaluation Failed</div>
      <div class="msg">${result.error}</div>
      <a class="back" href="/">← Back</a>
      </div></body></html>`);
    return;
  }
  const html = buildHtml(
    result.evaluation,
    result.stock,
    result.input,
    result.swot,
    result.trendlyne
  );
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// GET /api/stocks/:symbol/news — independent, cached, non-blocking
app.get("/api/stocks/:symbol/news", async (req: Request, res: Response) => {
  const rawSym = req.params["symbol"] ?? "";
  const symbol = (Array.isArray(rawSym) ? (rawSym[0] ?? "") : rawSym).toUpperCase();
  if (!symbol) { res.status(400).json({ error: "symbol required" }); return; }

  const companyName = typeof req.query["companyName"] === "string" ? req.query["companyName"] : undefined;
  const bseCode = typeof req.query["bseCode"] === "string" ? req.query["bseCode"] : undefined;
  const cacheKey = `${symbol}:${companyName ?? ""}`;

  const cached = newsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  try {
    const data = await fetchAllNews(symbol, companyName, bseCode);
    newsCache.set(cacheKey, { data, expiresAt: Date.now() + NEWS_TTL_MS });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "News fetch failed" });
  }
});

// ── SPA catch-all: serve index.html for all non-API GET routes ────────────────
// This lets the React router handle client-side navigation in production.
app.get("/{*path}", (req: Request, res: Response) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (err: Error | null) => {
    if (err) {
      // Frontend not built yet — show a dev notice
      res.status(200).send(`
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>QuantSieve — Dev Mode</title>
        <style>body{font-family:system-ui,sans-serif;background:#f0fdf4;color:#166534;
        display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
        .box{max-width:500px;text-align:center;padding:2rem}
        h1{font-size:1.5rem;font-weight:700;margin-bottom:1rem}
        code{background:#dcfce7;padding:.2rem .5rem;border-radius:4px;font-size:.9rem}
        p{margin-top:.75rem;color:#15803d}</style>
        </head><body><div class="box">
        <h1>⚡ QuantSieve — Backend Running</h1>
        <p>The React frontend has not been built yet.</p>
        <p>Run <code>cd frontend && npm install && npm run dev</code> to start the Vite dev server on <code>localhost:5173</code></p>
        <p style="margin-top:1.5rem">API is live at <code>/api/evaluate</code></p>
        </div></body></html>`);
    }
  });
});

export default app;
