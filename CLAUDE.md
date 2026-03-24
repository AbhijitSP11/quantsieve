# QUANTSIEVE — CLI Agent

> AI-powered stock & mutual fund evaluator for Indian retail investors.
> Phase 1: Terminal-based CLI agent. Phase 2: Full-stack web app built on top of this engine.

---

## WHAT THIS PROJECT IS

A Node.js + TypeScript CLI tool that:
1. Takes a stock ticker (e.g., NATCOPHARM) and an investor profile
2. Scrapes live financial data from Screener.in and other sources
3. Sends data + a 14-step evaluation framework to Claude API
4. Returns a structured verdict: BUY / BUY WITH CAUTION / WAIT / AVOID
5. Saves the full report as JSON

This CLI agent IS the backend engine. When we add a React frontend later, this code becomes the API service layer with zero rewrite.

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict mode, no `any`) |
| AI Engine | `@anthropic-ai/sdk` (claude-sonnet-4-20250514) |
| Scraping | `cheerio` for HTML parsing, native `fetch` for HTTP |
| CLI Framework | `commander` for CLI argument parsing |
| Validation | `zod` for runtime type validation of API responses |
| Output | `chalk` for colored terminal output |
| File Output | JSON reports saved to `./reports/` |
| Config | `dotenv` for environment variables |
| Build | `tsx` for dev, `tsup` for production build |

---

## PROJECT STRUCTURE

```
quantsieve/
├── CLAUDE.md                          # This file — project context for Claude Code
├── package.json
├── tsconfig.json
├── .env                               # ANTHROPIC_API_KEY (never commit)
├── .env.example
├── .gitignore
├── src/
│   ├── index.ts                       # CLI entry point (commander setup)
│   ├── commands/
│   │   ├── evaluate.ts                # `quantsieve evaluate TICKER` command
│   │   ├── profile.ts                 # `quantsieve profile` — create/edit investor profile
│   │   └── screen.ts                  # `quantsieve screen` — run screener query (Phase 2)
│   ├── services/
│   │   ├── scraper.ts                 # Screener.in HTML fetcher
│   │   ├── parser.ts                  # Screener.in HTML → StockData parser (cheerio)
│   │   ├── claude.ts                  # Claude API client — sends data + framework, gets verdict
│   │   └── reportWriter.ts            # Saves JSON report + prints terminal summary
│   ├── prompts/
│   │   ├── stockEvaluator.ts          # Full 14-step framework as template literal string
│   │   └── mfEvaluator.ts             # Mutual fund framework (Phase 2)
│   ├── types/
│   │   ├── stock.ts                   # StockData interface — all scraped financial data
│   │   ├── evaluation.ts              # EvaluationReport, Verdict, QualityCheck, Compatibility
│   │   ├── profile.ts                 # InvestorProfile interface
│   │   └── common.ts                  # Shared enums and utility types
│   ├── utils/
│   │   ├── sectorThresholds.ts        # Sector-specific ROE/ROCE/DE/PE benchmarks
│   │   ├── display.ts                 # Terminal output formatting (chalk)
│   │   └── validators.ts              # Zod schemas for validating Claude API JSON output
│   └── config/
│       └── env.ts                     # Environment variable loader + validation
├── profiles/
│   └── default.json                   # Saved investor profile (created by `profile` command)
├── reports/                           # Generated evaluation reports (gitignored)
└── prompts/
    └── stockEvaluatorFramework.md     # Raw framework document (reference only)
```

---

## CLI COMMANDS

### `quantsieve evaluate <TICKER>`
Main command. Evaluates a stock.

```bash
# Basic usage
npx quantsieve evaluate NATCOPHARM

# With inline profile overrides
npx quantsieve evaluate NATCOPHARM --horizon "3-5 years" --risk medium

# With custom entry context
npx quantsieve evaluate NATCOPHARM --context "first_purchase" --thesis "Screener shortlist for growth"

# Output full JSON instead of summary
npx quantsieve evaluate NATCOPHARM --json

# Specify output file
npx quantsieve evaluate NATCOPHARM --output ./my-report.json
```

### `quantsieve profile`
Creates or edits your investor profile interactively.

```bash
npx quantsieve profile
# Walks through Q2-Q10 interactively
# Saves to ./profiles/default.json
```

### `quantsieve profile --show`
Displays your current saved profile.

---

## CORE TYPES

```typescript
// types/stock.ts
export interface StockData {
  ticker: string;
  company_name: string;
  sector: string;
  industry: string;

  // Price data
  current_price: number | null;
  high_52w: number | null;
  low_52w: number | null;
  market_cap: number | null;           // in Crores
  market_cap_category: "Large" | "Mid" | "Small" | "Micro" | null;

  // Valuation
  pe_ratio: number | null;
  pb_ratio: number | null;
  ev_ebitda: number | null;
  dividend_yield: number | null;
  book_value: number | null;
  face_value: number | null;

  // Profitability (arrays = last 5 years, index 0 = oldest)
  revenue: number[];                   // in Crores
  net_profit: number[];                // in Crores
  opm: number[];                       // Operating Profit Margin %
  npm: number[];                       // Net Profit Margin %
  eps: number[];                       // Earnings Per Share
  roe: number | null;                  // Latest ROE %
  roce: number[];                      // Last 5 years ROCE %
  ttm_revenue: number | null;
  ttm_net_profit: number | null;
  ttm_eps: number | null;

  // Balance sheet
  debt_to_equity: number | null;
  interest_coverage: number | null;    // Computed: PBT / Interest
  current_ratio: number | null;
  total_assets: number | null;
  borrowings: number | null;
  reserves: number | null;

  // Cash flow (last 3 years)
  cash_flow: {
    year: string;
    operating: number;
    investing: number;
    financing: number;
  }[];

  // Shareholding
  promoter_holding: number | null;
  promoter_holding_trend: { quarter: string; pct: number }[];
  promoter_pledge: number | null;
  fii_holding: number | null;
  dii_holding: number | null;
  public_holding: number | null;

  // Growth rates (from Screener's compounded growth section)
  compounded_sales_growth: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null };
  compounded_profit_growth: { "3y": number | null; "5y": number | null; "10y": number | null; ttm: number | null };
  stock_price_cagr: { "1y": number | null; "3y": number | null; "5y": number | null; "10y": number | null };
  roe_history: { "3y": number | null; "5y": number | null; "10y": number | null; last_year: number | null };

  // Metadata
  listed_since: string | null;
  data_source: string;
  fetched_at: string;                  // ISO timestamp
}

// types/profile.ts
export interface InvestorProfile {
  age: number;
  investment_goal: "retirement" | "education" | "wealth_creation" | "home_purchase" | "short_term" | "other";
  investment_horizon: string;
  investment_mode: "lump_sum" | "staggered" | "adding";
  portfolio_type: "diversified_10plus" | "concentrated_3to5" | "mostly_mf" | "first_investment";
  position_sizing: "under_5" | "5_to_10" | "10_to_20" | "over_20";
  risk_tolerance: "low" | "medium" | "high";
  volatility_preference: "low" | "medium" | "high";
  tax_bracket: "30pct" | "20pct" | "5to10pct" | "not_sure";
}

export interface EvaluationInput {
  ticker: string;
  entry_context: "first_purchase" | "adding" | "hold_or_exit" | "comparing";
  thesis?: string;
  profile: InvestorProfile;
}

// types/evaluation.ts
export interface EvaluationReport {
  overview: Record<string, string | number | null>;
  flags: { type: "red" | "amber" | "green"; title: string; description: string }[];
  benchmarks: { sector_index: string; broad_index: string; index_fund: string };
  financials: {
    profitability: Record<string, (string | number)[]>;
    balance_sheet: Record<string, string | number>;
    cash_flow: { year: string; operating: number; investing: number; financing: number }[];
    health_verdict: "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED";
  };
  valuation: {
    metrics: { metric: string; current: string; median_5y: string; sector_median: string; assessment: string }[];
    zone: "UNDERVALUED" | "FAIR" | "OVERVALUED" | "EXPENSIVE";
    peers: { name: string; pe: number | string; pb: number | string; roe: number | string }[];
    price_performance: { period: string; stock: string; sector: string; nifty: string; alpha: string }[];
    margin_of_safety: string;
  };
  quality_checks: {
    id: number;
    name: string;
    critical: boolean;
    result: "PASS" | "FAIL" | "CONDITIONAL";
    detail: string;
  }[];
  quality_score: { earned: number; total: number; percentage: number; label: "GOOD" | "MODERATE" | "BAD" };
  compatibility: {
    code: string;
    name: string;
    result: "MATCH" | "CONCERN" | "MISMATCH";
    reason: string;
  }[];
  compatibility_overall: "STRONG" | "MODERATE" | "POOR";
  verdict: {
    label: "BUY" | "BUY_WITH_CAUTION" | "WAIT" | "NOT_SUITABLE" | "AVOID";
    color: "green" | "amber" | "red";
    summary: string;
    what_works: string[];
    what_to_watch: string[];
    index_comparison: string;
    review_triggers: string[];
  };
  data_gaps: { metric: string; impact: "MATERIAL" | "MINOR"; explanation: string; check_url: string }[];
  confidence: { level: "HIGH" | "MODERATE" | "LOW"; live_count: number; total: number };
}
```

---

## SECTOR THRESHOLDS (hardcode)

```typescript
// utils/sectorThresholds.ts
export interface SectorThreshold {
  good_roe: number;
  good_roce: number | null;
  roa_threshold?: number;
  acceptable_de: number;
  pe_range: [number, number];
  min_horizon: string;
}

export const SECTOR_THRESHOLDS: Record<string, SectorThreshold> = {
  "Banking / NBFC": { good_roe: 14, good_roce: null, roa_threshold: 1.2, acceptable_de: 999, pe_range: [10, 25], min_horizon: "5+" },
  "IT / Technology": { good_roe: 20, good_roce: 25, acceptable_de: 0.5, pe_range: [20, 35], min_horizon: "3-5+" },
  "Pharma / Healthcare": { good_roe: 15, good_roce: 18, acceptable_de: 0.8, pe_range: [20, 35], min_horizon: "5+" },
  "FMCG / Consumer": { good_roe: 25, good_roce: 30, acceptable_de: 0.5, pe_range: [35, 60], min_horizon: "5-7+" },
  "Auto / Auto ancillary": { good_roe: 14, good_roce: 18, acceptable_de: 1.0, pe_range: [15, 30], min_horizon: "5+" },
  "Metal / Mining": { good_roe: 12, good_roce: 15, acceptable_de: 1.5, pe_range: [8, 15], min_horizon: "5-7" },
  "Real Estate": { good_roe: 10, good_roce: 12, acceptable_de: 1.5, pe_range: [15, 30], min_horizon: "5-7+" },
  "Infrastructure / Capital Goods": { good_roe: 12, good_roce: 15, acceptable_de: 1.5, pe_range: [20, 35], min_horizon: "5-7+" },
  "Power / Utilities": { good_roe: 10, good_roce: 12, acceptable_de: 2.0, pe_range: [10, 20], min_horizon: "5+" },
  "Chemicals": { good_roe: 15, good_roce: 18, acceptable_de: 1.0, pe_range: [20, 35], min_horizon: "5+" },
  "General": { good_roe: 15, good_roce: 18, acceptable_de: 1.0, pe_range: [15, 25], min_horizon: "5+" },
};
```

---

## SCREENER.IN SCRAPING GUIDE

The Screener.in consolidated page (`https://www.screener.in/company/TICKER/consolidated/`) contains ALL the data we need in structured HTML.

### Key sections to parse:

1. **Top ratios bar** — `#top-ratios .company-ratios li`
   - Market Cap, Current Price, P/E, Book Value, Dividend Yield, ROCE, ROE, Face Value

2. **Profit & Loss table** — `section#profit-loss table`
   - Rows: Sales, Expenses, Operating Profit, OPM%, Other Income, Interest, Depreciation, PBT, Tax%, Net Profit, EPS
   - Columns: Last 10+ years + TTM

3. **Balance Sheet table** — `section#balance-sheet table`
   - Rows: Equity Capital, Reserves, Borrowings, Other Liabilities, Total Liabilities, Fixed Assets, CWIP, Investments, Other Assets, Total Assets

4. **Cash Flow table** — `section#cash-flow table`
   - Rows: Cash from Operating, Investing, Financing, Net Cash Flow

5. **Ratios table** — `section#ratios table`
   - Rows: Debtor Days, Inventory Days, Days Payable, Cash Conversion Cycle, Working Capital Days, ROCE%

6. **Shareholding table** — `section#shareholding table`
   - Rows: Promoters, FIIs, DIIs, Public, No. of Shareholders
   - Columns: Quarterly data

7. **Compounded growth rates** — `section#profit-loss .ranges-table` or `.compound-growth`
   - Compounded Sales Growth: 10Y, 5Y, 3Y, TTM
   - Compounded Profit Growth: 10Y, 5Y, 3Y, TTM
   - Stock Price CAGR: 10Y, 5Y, 3Y, 1Y
   - Return on Equity: 10Y, 5Y, 3Y, Last Year

8. **Pros and Cons** — `.pros-cons` section
   - Machine-generated bullet points

### Important scraping notes:
- Screener.in may rate-limit or block automated requests. Add a User-Agent header and reasonable delay between requests.
- The page uses server-rendered HTML — no JS rendering needed (cheerio works fine).
- Numbers use Indian formatting: "1,234" for thousands. Parse accordingly.
- Some fields show "—" or are empty when data is unavailable. Handle as null.

---

## CLAUDE API INTEGRATION

### How the evaluation call works:

```typescript
// services/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import type { StockData } from "../types/stock";
import type { EvaluationInput } from "../types/profile";
import type { EvaluationReport } from "../types/evaluation";
import { STOCK_EVALUATOR_PROMPT } from "../prompts/stockEvaluator";
import { evaluationReportSchema } from "../utils/validators";

const client = new Anthropic();

export async function evaluateStock(
  stockData: StockData,
  input: EvaluationInput
): Promise<EvaluationReport> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: STOCK_EVALUATOR_PROMPT,
    messages: [{
      role: "user",
      content: [
        `LIVE STOCK DATA:\n${JSON.stringify(stockData, null, 2)}`,
        `\nINVESTOR PROFILE:\n${JSON.stringify(input.profile, null, 2)}`,
        `\nENTRY CONTEXT: ${input.entry_context}`,
        input.thesis ? `\nINVESTOR THESIS: ${input.thesis}` : "",
        `\nRun the complete 14-step evaluation. Return ONLY valid JSON matching the EvaluationReport schema. No markdown, no explanation outside the JSON.`,
      ].join("\n"),
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return evaluationReportSchema.parse(parsed); // Zod validation
}
```

### The system prompt (stockEvaluator.ts):
Export the entire 14-step Stock Evaluator framework as a template literal string.
Add this prefix:
```
You are QuantSieve, an AI-powered stock evaluation engine for Indian retail investors.
You receive live financial data and an investor profile.
You must run the complete 14-step evaluation framework below and return ONLY a JSON object matching the EvaluationReport schema.
Do not include any text outside the JSON. Do not use markdown code fences.
All analysis must be based solely on the provided data. Do not fabricate any numbers.
If a data point is missing (null), mark it as DATA_UNAVAILABLE in the relevant section.
```

---

## TERMINAL OUTPUT FORMAT

Use chalk for colored output:

```
┌─────────────────────────────────────────────┐
│  QUANTSIEVE — Stock Evaluation Engine       │
│  Ticker: NATCOPHARM                         │
│  Date: 2026-03-24                           │
└─────────────────────────────────────────────┘

📡 Fetching data...
   ✓ Screener.in — 42 metrics extracted
   ✓ Company: NATCO Pharma Limited
   ✓ Sector: Pharma / Healthcare
   ✓ Market Cap: ₹16,800 Cr (Mid Cap)

🤖 Running evaluation via Claude...
   ✓ Financial health: STRONG
   ✓ Valuation zone: UNDERVALUED (P/E 10× vs 5Y median 30×)
   ✓ Quality score: 16/17 (94%) — GOOD
   ✓ Compatibility: 8 Match, 1 Concern — STRONG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🟡 VERDICT: BUY WITH CAUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Strong financials and attractive valuation, but
  post-Revlimid earnings uncertainty and FDA
  overhang warrant a smaller position.

  ✅ What works:
     • 5Y profit CAGR 33%, ROE 28%, almost debt-free
     • P/E 10× — deeply undervalued vs peers (25-60×)
     • Semaglutide launch — major growth catalyst

  ⚠️ What to watch:
     • Revlimid revenue cliff — FY27 earnings uncertain
     • FDA Form 483 observations at Manali plant
     • DII holding dropped from 15% to 6%

  📊 vs Index: -2% CAGR (5Y) vs NIFTY Pharma +14%
  📁 Confidence: MODERATE (11/15 metrics live)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Full report saved: ./reports/NATCOPHARM_2026-03-24.json
```

---

## BUILD ORDER FOR CLAUDE CODE

Give these instructions to Claude Code one at a time:

### Step 1: Project init
```
Initialize a Node.js + TypeScript CLI project:
- npm init with name "quantsieve"
- Install: typescript, tsx, tsup, @types/node, @anthropic-ai/sdk, cheerio, commander, chalk, zod, dotenv, inquirer, @types/inquirer
- Create tsconfig.json with strict mode, ES2022 target, NodeNext module
- Create .env.example with ANTHROPIC_API_KEY placeholder
- Create .gitignore (node_modules, dist, .env, reports/)
- Create the folder structure from CLAUDE.md
```

### Step 2: Types
```
Create all type files exactly as defined in CLAUDE.md:
- src/types/stock.ts (StockData)
- src/types/profile.ts (InvestorProfile, EvaluationInput)
- src/types/evaluation.ts (EvaluationReport and all nested types)
- src/types/common.ts (shared enums)
```

### Step 3: Scraper
```
Build the Screener.in scraper:
- src/services/scraper.ts — fetches the HTML page for a given ticker
- src/services/parser.ts — parses HTML into StockData using cheerio

Follow the parsing guide in CLAUDE.md exactly.
Handle missing data as null, not errors.
Add a User-Agent header to avoid blocks.
Parse Indian number formatting (commas, Cr suffix).
```

### Step 4: Claude integration
```
Build src/services/claude.ts exactly as shown in CLAUDE.md.
Build src/prompts/stockEvaluator.ts — export the 14-step framework as a string.
Build src/utils/validators.ts — Zod schema for EvaluationReport.
```

### Step 5: Profile command
```
Build src/commands/profile.ts
Uses inquirer to walk through Q2-Q10 interactively.
Saves to ./profiles/default.json
--show flag prints current profile.
```

### Step 6: Evaluate command
```
Build src/commands/evaluate.ts
1. Load profile from ./profiles/default.json (error if not found)
2. Scrape stock data using scraper + parser
3. Send to Claude for evaluation
4. Print formatted terminal output using chalk (format from CLAUDE.md)
5. Save full JSON report to ./reports/TICKER_DATE.json
```

### Step 7: CLI entry point
```
Build src/index.ts using commander:
- quantsieve evaluate <ticker> [--json] [--context first_purchase] [--thesis "..."]
- quantsieve profile [--show]
Add bin field to package.json pointing to dist/index.js
Add scripts: "dev": "tsx src/index.ts", "build": "tsup src/index.ts --format esm"
```

### Step 8: Test
```
Test the full flow:
npx tsx src/index.ts profile
npx tsx src/index.ts evaluate NATCOPHARM
```

---

## IMPORTANT CONSTRAINTS

1. **No `any` types.** Every variable, parameter, and return type must be explicitly typed.
2. **Zod validation on Claude output.** Never trust the AI response shape — validate with Zod before using.
3. **Graceful degradation.** If a scraper section fails, set it to null and continue. Don't crash on partial data.
4. **Rate limiting.** Add a 1-second delay between scraper requests. Don't hammer Screener.in.
5. **Error messages.** Every error should tell the user what went wrong and what to do about it.
6. **No hardcoded data.** Everything comes from live scraping or the user's profile. The only hardcoded data is sector thresholds.

---

## FUTURE: CONVERTING TO FULL-STACK

When adding the React frontend later:
- `src/services/` becomes the backend service layer (Express routes call these functions)
- `src/types/` is shared between frontend and backend
- `src/prompts/` stays in the backend only
- `src/commands/` is CLI-only — the web app calls services directly
- Add: `src/api/` for Express route handlers that wrap the services
