import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { fetchScreenerPage } from "../services/scraper.js";
import { parseScreenerPage } from "../services/parser.js";
import { evaluateStock } from "../services/claude.js";
import type { EvaluationInput } from "../types/profile.js";

const app = express();
app.use(express.json());

// CORS
app.use((_req: Request, res: Response, next: () => void) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.options("/{*path}", (_req: Request, res: Response) => {
  res.sendStatus(204);
});

// ── Zod schema for POST /api/evaluate body ──────────────────────────────────

const investorProfileSchema = z.object({
  age: z.number().int().min(1).max(120),
  investment_goal: z.enum([
    "retirement",
    "education",
    "wealth_creation",
    "home_purchase",
    "short_term",
    "other",
  ]),
  investment_horizon: z.string().min(1),
  investment_mode: z.enum(["lump_sum", "staggered", "adding"]),
  portfolio_type: z.enum([
    "diversified_10plus",
    "concentrated_3to5",
    "mostly_mf",
    "first_investment",
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

// ── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "quantsieve" });
});

app.post("/api/evaluate", async (req: Request, res: Response) => {
  // 1. Validate request body
  const parsed = evaluateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { ticker, entry_context, thesis, profile } = parsed.data;
  const symbol = ticker.toUpperCase();

  // 2. Scrape stock data
  let stockData: Awaited<ReturnType<typeof parseScreenerPage>>;
  try {
    const { html } = await fetchScreenerPage(symbol);
    stockData = parseScreenerPage(html, symbol);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 502;
    res.status(status).json({ error: message });
    return;
  }

  // 3. Run Claude evaluation
  const input: EvaluationInput = {
    ticker: symbol,
    entry_context,
    ...(thesis !== undefined && { thesis }),
    profile,
  };

  try {
    const evaluation = await evaluateStock(stockData, input);
    res.json({ stock: stockData, evaluation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default app;
