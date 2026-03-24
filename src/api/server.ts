import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { fetchScreenerPage } from "../services/scraper.js";
import { parseScreenerPage } from "../services/parser.js";
import { evaluateStock } from "../services/claude.js";
import { buildHtml } from "../services/htmlWriter.js";
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

// ── Shared scrape + evaluate logic ───────────────────────────────────────────

async function runEvaluation(body: unknown) {
  const parsed = evaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: "Invalid request body", details: parsed.error.flatten() };
  }

  const { ticker, entry_context, thesis, profile } = parsed.data;
  const symbol = ticker.toUpperCase();

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

  try {
    const evaluation = await evaluateStock(stockData, input);
    return { ok: true as const, stock: stockData, evaluation, input };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false as const, status: 500, error: message };
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "quantsieve" });
});

// Returns full rich HTML report — used by the web UI
app.post("/api/evaluate/html", async (req: Request, res: Response) => {
  const result = await runEvaluation(req.body);
  if (!result.ok) {
    res.status(result.status).send(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Error — QuantSieve</title>
      <style>body{font-family:system-ui,sans-serif;background:#fef2f2;color:#991b1b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem}
      .box{max-width:520px;text-align:center}.title{font-size:1.5rem;font-weight:700;margin-bottom:.75rem}
      .msg{font-size:.95rem;line-height:1.6;color:#7f1d1d}.back{display:inline-block;margin-top:1.5rem;padding:.6rem 1.5rem;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}</style>
      </head><body><div class="box">
      <div class="title">❌ Evaluation Failed</div>
      <div class="msg">${result.error}</div>
      <a class="back" href="/">← Back</a>
      </div></body></html>`);
    return;
  }
  const html = buildHtml(result.evaluation, result.stock, result.input);
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// Returns JSON — for programmatic / API use
app.post("/api/evaluate", async (req: Request, res: Response) => {
  const result = await runEvaluation(req.body);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, ...(("details" in result) ? { details: result.details } : {}) });
    return;
  }
  res.json({ stock: result.stock, evaluation: result.evaluation });
});

// ── Landing page ─────────────────────────────────────────────────────────────

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
    :root {
      --bg: #f5f6fa;
      --surface: #ffffff;
      --border: #dde1f0;
      --text: #1a1d2e;
      --muted: #6b7280;
      --blue: #2563eb;
      --blue-dark: #1d4ed8;
      --green: #16a34a;
      --red: #dc2626;
    }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1rem 4rem;
    }
    .page { max-width: 740px; margin: 0 auto; }

    /* Header */
    header { text-align: center; margin-bottom: 2.5rem; padding-top: 1rem; }
    .logo { font-size: 1.5rem; font-weight: 800; color: var(--blue); letter-spacing: 1px; margin-bottom: .35rem; }
    header p { color: var(--muted); font-size: .9rem; }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem 1.75rem;
      margin-bottom: 1.25rem;
    }
    .card-title {
      font-size: .7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: var(--muted);
      padding-bottom: .75rem; border-bottom: 1px solid var(--border);
      margin-bottom: 1.25rem;
    }

    /* Grid */
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .9rem; }
    .full { grid-column: 1 / -1; }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: .35rem; }
    .field label { font-size: .78rem; font-weight: 500; color: var(--text); }
    .field input, .field select, .field textarea {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 7px;
      color: var(--text);
      padding: .55rem .75rem;
      font-size: .875rem;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
      font-family: inherit;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(37,99,235,.1);
    }
    .field textarea { resize: vertical; min-height: 68px; }

    /* Submit */
    .submit-wrap { margin-top: .5rem; }
    button[type="submit"] {
      width: 100%; padding: .8rem 1rem;
      background: var(--blue); color: #fff;
      border: none; border-radius: 9px;
      font-size: .95rem; font-weight: 600;
      cursor: pointer; transition: background .15s;
      font-family: inherit;
    }
    button[type="submit"]:hover { background: var(--blue-dark); }
    button[type="submit"]:disabled { opacity: .55; cursor: not-allowed; }

    /* Overlay */
    #overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(245,246,250,.92);
      backdrop-filter: blur(4px);
      z-index: 50;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
    }
    #overlay.active { display: flex; }
    .spinner {
      width: 44px; height: 44px;
      border: 3px solid var(--border);
      border-top-color: var(--blue);
      border-radius: 50%;
      animation: spin .75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .overlay-text { font-size: .95rem; color: var(--muted); font-weight: 500; text-align: center; line-height: 1.6; }
    .overlay-step { font-size: .8rem; color: var(--blue); font-weight: 600; }

    /* Error */
    .error {
      display: none;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 10px; padding: .9rem 1.1rem;
      color: var(--red); font-size: .875rem; margin-bottom: 1rem;
    }
    .error.visible { display: block; }

    /* Info strip */
    .info-strip {
      display: flex; gap: 1rem; flex-wrap: wrap;
      background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 10px; padding: .9rem 1.1rem;
      margin-bottom: 1.5rem;
    }
    .info-item { display: flex; align-items: center; gap: .4rem; font-size: .82rem; color: #1e40af; }

    @media (max-width: 540px) {
      .grid { grid-template-columns: 1fr; }
      .full { grid-column: 1; }
    }
  </style>
</head>
<body>
<div class="page">
  <header>
    <div class="logo">⚡ QUANTSIEVE</div>
    <p>AI-powered stock evaluation for Indian retail investors</p>
  </header>

  <div class="info-strip">
    <div class="info-item">📡 Live data from Screener.in</div>
    <div class="info-item">🤖 14-step AI analysis via Claude</div>
    <div class="info-item">⏱ Takes ~30 seconds</div>
    <div class="info-item">📄 Full PDF-ready report</div>
  </div>

  <div class="error" id="errorBox"></div>

  <form id="evalForm" autocomplete="off">
    <div class="card">
      <div class="card-title">Stock Details</div>
      <div class="grid">
        <div class="field">
          <label>NSE / BSE Ticker</label>
          <input type="text" name="ticker" placeholder="e.g. NATCOPHARM, RELIANCE" required />
        </div>
        <div class="field">
          <label>Entry Context</label>
          <select name="entry_context">
            <option value="first_purchase">First Purchase</option>
            <option value="adding">Adding to Existing Position</option>
            <option value="hold_or_exit">Hold or Exit?</option>
            <option value="comparing">Comparing Options</option>
          </select>
        </div>
        <div class="field full">
          <label>Investment Thesis <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <textarea name="thesis" placeholder="Why are you interested in this stock? What's your hypothesis?"></textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Investor Profile</div>
      <div class="grid">
        <div class="field">
          <label>Your Age</label>
          <input type="number" name="age" min="1" max="120" placeholder="e.g. 32" required />
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
          <input type="text" name="investment_horizon" placeholder="e.g. 5-7 years" required />
        </div>
        <div class="field">
          <label>Investment Mode</label>
          <select name="investment_mode">
            <option value="lump_sum">Lump Sum</option>
            <option value="staggered">Staggered Entry</option>
            <option value="adding">Adding to Existing</option>
          </select>
        </div>
        <div class="field">
          <label>Portfolio Type</label>
          <select name="portfolio_type">
            <option value="diversified_10plus">Diversified (10+ stocks)</option>
            <option value="concentrated_3to5">Concentrated (3–5 stocks)</option>
            <option value="mostly_mf">Mostly Mutual Funds</option>
            <option value="first_investment">First Investment</option>
          </select>
        </div>
        <div class="field">
          <label>Position Size</label>
          <select name="position_sizing">
            <option value="under_5">Under 5% of portfolio</option>
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

    <div class="submit-wrap">
      <button type="submit" id="submitBtn">Run Full Evaluation →</button>
    </div>
  </form>
</div>

<!-- Loading overlay -->
<div id="overlay">
  <div class="spinner"></div>
  <div class="overlay-text">
    <div id="overlayStep" class="overlay-step">Fetching live data from Screener.in…</div>
    <div style="margin-top:.4rem">Running 14-step AI analysis — please wait</div>
  </div>
</div>

<script>
  const steps = [
    "Fetching live data from Screener.in…",
    "Parsing financial statements…",
    "Sending to Claude AI for analysis…",
    "Running quality checks…",
    "Evaluating investor compatibility…",
    "Generating full report…",
  ];
  let stepIdx = 0;
  let stepTimer;

  function startSteps() {
    stepIdx = 0;
    document.getElementById('overlayStep').textContent = steps[0];
    stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      document.getElementById('overlayStep').textContent = steps[stepIdx];
    }, 5000);
  }

  function stopSteps() { clearInterval(stepTimer); }

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
    const errorBox = document.getElementById('errorBox');
    const overlay = document.getElementById('overlay');

    btn.disabled = true;
    errorBox.className = 'error';
    overlay.classList.add('active');
    startSteps();

    try {
      const res = await fetch('/api/evaluate/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const html = await res.text();

      if (!res.ok) {
        // Server returned an error HTML page — show inline error instead
        const match = html.match(/<div class="msg">(.*?)<\\/div>/s);
        throw new Error(match ? match[1] : 'Evaluation failed. Please check the ticker and try again.');
      }

      // Replace the entire page with the rich report
      document.open();
      document.write(html);
      document.close();
    } catch (err) {
      stopSteps();
      overlay.classList.remove('active');
      btn.disabled = false;
      errorBox.textContent = '❌ ' + err.message;
      errorBox.className = 'error visible';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
</script>
</body>
</html>`);
});

export default app;
