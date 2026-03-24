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

app.get("/", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QuantSieve — Stock Evaluator</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f13; color: #e2e2e2; min-height: 100vh; padding: 2rem 1rem; }
    .container { max-width: 760px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2rem; }
    header h1 { font-size: 2rem; font-weight: 700; color: #fff; letter-spacing: -.5px; }
    header p { color: #888; margin-top: .4rem; font-size: .95rem; }
    .card { background: #18181f; border: 1px solid #2a2a35; border-radius: 12px; padding: 1.75rem; margin-bottom: 1.5rem; }
    .card h2 { font-size: 1rem; font-weight: 600; color: #a78bfa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 1.25rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: .4rem; }
    .field label { font-size: .82rem; color: #999; font-weight: 500; }
    .field input, .field select, .field textarea {
      background: #0f0f13; border: 1px solid #2e2e3e; border-radius: 8px;
      color: #e2e2e2; padding: .55rem .75rem; font-size: .9rem; outline: none;
      transition: border-color .15s;
    }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: #7c3aed; }
    .field textarea { resize: vertical; min-height: 70px; }
    .full-width { grid-column: 1 / -1; }
    button[type="submit"] {
      width: 100%; padding: .85rem; background: #7c3aed; color: #fff;
      border: none; border-radius: 10px; font-size: 1rem; font-weight: 600;
      cursor: pointer; transition: background .15s; margin-top: .5rem;
    }
    button[type="submit"]:hover { background: #6d28d9; }
    button[type="submit"]:disabled { background: #4c1d95; cursor: not-allowed; opacity: .7; }
    #status { text-align: center; padding: 1rem; color: #a78bfa; font-size: .9rem; display: none; }
    #result { display: none; }
    .verdict-box { border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .verdict-green { background: #052e16; border: 1px solid #16a34a; }
    .verdict-amber { background: #1c1507; border: 1px solid #d97706; }
    .verdict-red   { background: #1c0505; border: 1px solid #dc2626; }
    .verdict-label { font-size: 1.6rem; font-weight: 700; }
    .verdict-green .verdict-label { color: #4ade80; }
    .verdict-amber .verdict-label { color: #fbbf24; }
    .verdict-red   .verdict-label { color: #f87171; }
    .verdict-summary { margin-top: .5rem; color: #ccc; }
    .section-title { font-size: .8rem; color: #a78bfa; text-transform: uppercase; letter-spacing: .07em; margin: 1.25rem 0 .6rem; font-weight: 600; }
    ul.bullets { list-style: none; padding: 0; }
    ul.bullets li { padding: .25rem 0; color: #ccc; font-size: .9rem; }
    ul.bullets li::before { content: "• "; color: #a78bfa; }
    .meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: .75rem; }
    .meta-item { font-size: .82rem; color: #888; }
    .meta-item span { color: #e2e2e2; font-weight: 500; }
    .flags { display: flex; flex-direction: column; gap: .5rem; }
    .flag { padding: .6rem .9rem; border-radius: 8px; font-size: .85rem; }
    .flag-red    { background: #1c0505; border-left: 3px solid #ef4444; }
    .flag-amber  { background: #1c1507; border-left: 3px solid #f59e0b; }
    .flag-green  { background: #052e16; border-left: 3px solid #22c55e; }
    .flag strong { display: block; margin-bottom: .15rem; }
    .error-box { background: #1c0505; border: 1px solid #dc2626; border-radius: 10px; padding: 1rem 1.25rem; color: #f87171; font-size: .9rem; display: none; }
    .score-bar { background: #0f0f13; border-radius: 999px; height: 8px; margin-top: .4rem; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 999px; background: #7c3aed; transition: width .5s; }
    select option { background: #18181f; }
  </style>
</head>
<body>
<div class="container">
  <header>
    <h1>⚡ QuantSieve</h1>
    <p>AI-powered stock evaluator for Indian retail investors</p>
  </header>

  <form id="evalForm">
    <div class="card">
      <h2>Stock</h2>
      <div class="grid-2">
        <div class="field">
          <label>Ticker (e.g. NATCOPHARM)</label>
          <input type="text" name="ticker" placeholder="RELIANCE" required />
        </div>
        <div class="field">
          <label>Entry Context</label>
          <select name="entry_context">
            <option value="first_purchase">First Purchase</option>
            <option value="adding">Adding to position</option>
            <option value="hold_or_exit">Hold or Exit?</option>
            <option value="comparing">Comparing options</option>
          </select>
        </div>
        <div class="field full-width">
          <label>Investment Thesis (optional)</label>
          <textarea name="thesis" placeholder="Why are you interested in this stock?"></textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Investor Profile</h2>
      <div class="grid-2">
        <div class="field">
          <label>Age</label>
          <input type="number" name="age" min="1" max="120" placeholder="30" required />
        </div>
        <div class="field">
          <label>Investment Goal</label>
          <select name="investment_goal">
            <option value="wealth_creation">Wealth Creation</option>
            <option value="retirement">Retirement</option>
            <option value="education">Education</option>
            <option value="home_purchase">Home Purchase</option>
            <option value="short_term">Short Term</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="field">
          <label>Investment Horizon</label>
          <input type="text" name="investment_horizon" placeholder="5-7 years" required />
        </div>
        <div class="field">
          <label>Investment Mode</label>
          <select name="investment_mode">
            <option value="lump_sum">Lump Sum</option>
            <option value="staggered">Staggered</option>
            <option value="adding">Adding to existing</option>
          </select>
        </div>
        <div class="field">
          <label>Portfolio Type</label>
          <select name="portfolio_type">
            <option value="diversified_10plus">Diversified (10+ stocks)</option>
            <option value="concentrated_3to5">Concentrated (3-5 stocks)</option>
            <option value="mostly_mf">Mostly Mutual Funds</option>
            <option value="first_investment">First Investment</option>
          </select>
        </div>
        <div class="field">
          <label>Position Sizing</label>
          <select name="position_sizing">
            <option value="under_5">Under 5%</option>
            <option value="5_to_10">5–10%</option>
            <option value="10_to_20">10–20%</option>
            <option value="over_20">Over 20%</option>
          </select>
        </div>
        <div class="field">
          <label>Risk Tolerance</label>
          <select name="risk_tolerance">
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="field">
          <label>Volatility Preference</label>
          <select name="volatility_preference">
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="field">
          <label>Tax Bracket</label>
          <select name="tax_bracket">
            <option value="30pct">30%</option>
            <option value="20pct">20%</option>
            <option value="5to10pct">5–10%</option>
            <option value="not_sure">Not Sure</option>
          </select>
        </div>
      </div>
    </div>

    <button type="submit" id="submitBtn">Run Evaluation</button>
  </form>

  <div id="status">⏳ Fetching data and running AI evaluation… this takes ~30 seconds</div>
  <div class="error-box" id="errorBox"></div>

  <div id="result">
    <div class="card" id="verdictCard">
      <div id="verdictContent"></div>
    </div>
    <div class="card" id="flagsCard">
      <h2>Key Flags</h2>
      <div class="flags" id="flagsContent"></div>
    </div>
    <div class="card" id="qualityCard">
      <h2>Quality Score</h2>
      <div id="qualityContent"></div>
    </div>
  </div>
</div>

<script>
document.getElementById('evalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const ticker = fd.get('ticker').trim().toUpperCase();
  const thesis = fd.get('thesis').trim();

  const body = {
    ticker,
    entry_context: fd.get('entry_context'),
    ...(thesis && { thesis }),
    profile: {
      age: Number(fd.get('age')),
      investment_goal: fd.get('investment_goal'),
      investment_horizon: fd.get('investment_horizon'),
      investment_mode: fd.get('investment_mode'),
      portfolio_type: fd.get('portfolio_type'),
      position_sizing: fd.get('position_sizing'),
      risk_tolerance: fd.get('risk_tolerance'),
      volatility_preference: fd.get('volatility_preference'),
      tax_bracket: fd.get('tax_bracket'),
    }
  };

  const btn = document.getElementById('submitBtn');
  const status = document.getElementById('status');
  const errorBox = document.getElementById('errorBox');
  const result = document.getElementById('result');

  btn.disabled = true;
  btn.textContent = 'Evaluating…';
  status.style.display = 'block';
  errorBox.style.display = 'none';
  result.style.display = 'none';

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Evaluation failed');
    }

    renderResult(data, ticker);
    result.style.display = 'block';
  } catch (err) {
    errorBox.textContent = '❌ ' + err.message;
    errorBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Evaluation';
    status.style.display = 'none';
  }
});

function renderResult(data, ticker) {
  const ev = data.evaluation;
  const v = ev.verdict;
  const colorClass = v.color === 'green' ? 'verdict-green' : v.color === 'red' ? 'verdict-red' : 'verdict-amber';

  const verdictCard = document.getElementById('verdictCard');
  verdictCard.className = 'verdict-box ' + colorClass;

  document.getElementById('verdictContent').innerHTML = \`
    <div class="verdict-label">\${v.label.replace(/_/g, ' ')}</div>
    <div class="verdict-summary">\${v.summary}</div>
    <div class="meta-row">
      <div class="meta-item">Ticker: <span>\${ticker}</span></div>
      <div class="meta-item">Quality: <span>\${ev.quality_score.earned}/\${ev.quality_score.total} (\${ev.quality_score.label})</span></div>
      <div class="meta-item">Confidence: <span>\${ev.confidence.level}</span></div>
      <div class="meta-item">Valuation: <span>\${ev.valuation.zone}</span></div>
    </div>
    <div class="section-title">What Works</div>
    <ul class="bullets">\${(v.what_works || []).map(w => \`<li>\${w}</li>\`).join('')}</ul>
    <div class="section-title">What to Watch</div>
    <ul class="bullets">\${(v.what_to_watch || []).map(w => \`<li>\${w}</li>\`).join('')}</ul>
    <div class="section-title">vs Index</div>
    <p style="color:#ccc;font-size:.9rem">\${v.index_comparison}</p>
  \`;

  const flagsContent = document.getElementById('flagsContent');
  flagsContent.innerHTML = (ev.flags || []).map(f => \`
    <div class="flag flag-\${f.type}">
      <strong>\${f.title}</strong>
      \${f.description}
    </div>
  \`).join('');

  const qs = ev.quality_score;
  const pct = qs.percentage;
  document.getElementById('qualityContent').innerHTML = \`
    <div style="display:flex;justify-content:space-between;font-size:.9rem;color:#ccc">
      <span>\${qs.earned} / \${qs.total} checks passed</span>
      <span>\${pct}% — \${qs.label}</span>
    </div>
    <div class="score-bar"><div class="score-fill" style="width:\${pct}%"></div></div>
  \`;
}
</script>
</body>
</html>`);
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
