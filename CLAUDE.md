# QUANTSIEVE — Full-Stack AI Stock Evaluator

> Institutional-grade AI equity evaluation engine for Indian retail investors.
> Phase 1: CLI tool (complete). Phase 2: Full-stack web app (complete). Engine: V2 (15-step institutional framework).

---

## WHAT THIS PROJECT IS

A Node.js + TypeScript full-stack application that:
1. Takes a stock ticker (e.g., `NATCOPHARM`) and an investor profile
2. Scrapes live financial data from Screener.in
3. Fetches supplementary data from Trendlyne (beta, DVM scores, analyst consensus)
4. Aggregates news from BSE India, NSE India, Google News, NewsData.io, NewsAPI.org
5. Runs a rule-based SWOT analysis locally (no external API) — 20+ deterministic signals with evidence + strength ratings
6. Sends all data + a 15-step institutional evaluation framework to Claude API
7. Runs a separate institutional-grade news sentiment analysis via Claude (in parallel)
8. Returns a structured verdict: BUY / BUY_WITH_CAUTION / WAIT / NOT_SUITABLE / AVOID
9. Saves full reports to Supabase (when user is authenticated via Google OAuth)
10. Allows re-viewing past reports via a My Reports page

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict mode, no `any`) |
| AI Engine | `@anthropic-ai/sdk` — `claude-sonnet-4-20250514` |
| Scraping | `cheerio` for HTML parsing, native `fetch` for HTTP |
| CLI Framework | `commander` for CLI argument parsing |
| Validation | `zod` for runtime type validation of all Claude API responses |
| Terminal Output | `chalk` for colored terminal output |
| API Server | `express` v5 |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth & DB | Supabase (Google OAuth + PostgreSQL with RLS) |
| Build | `tsx` for dev, `tsup` for production build |
| Config | `dotenv` for environment variables |

---

## PROJECT STRUCTURE

```
quantsieve/
├── CLAUDE.md                                  # This file — complete project context
├── supabase_setup.sql                         # Run in Supabase SQL Editor on first setup
├── package.json                               # Backend deps
├── tsconfig.json
├── .env                                       # ANTHROPIC_API_KEY (never commit)
├── .env.example
├── .gitignore
│
├── src/
│   ├── server.ts                              # Express server bootstrap (listens on PORT)
│   ├── index.ts                               # CLI entry point (commander)
│   │
│   ├── api/
│   │   └── server.ts                          # Express app — all routes + shared eval logic
│   │
│   ├── commands/
│   │   ├── evaluate.ts                        # CLI: quantsieve evaluate <TICKER>
│   │   ├── profile.ts                         # CLI: quantsieve profile
│   │   └── screen.ts                          # CLI: quantsieve screen (Phase 3 placeholder)
│   │
│   ├── services/
│   │   ├── scraper.ts                         # Fetches Screener.in HTML
│   │   ├── parser.ts                          # Parses HTML → StockData (cheerio)
│   │   ├── claude.ts                          # Claude API: 15-step evaluation call
│   │   ├── swotEngine.ts                      # Rule-based SWOT — 20+ signals, evidence + strength
│   │   ├── trendlyneScraper.ts                # Trendlyne supplementary data
│   │   ├── htmlWriter.ts                      # Builds printable HTML report string
│   │   ├── newsSentimentService.ts            # Claude API: institutional news sentiment
│   │   └── news/
│   │       ├── types.ts                       # NewsItem, NewsResponse, ProviderResult
│   │       ├── newsAggregator.ts              # Orchestrates all providers, dedupes, scores
│   │       ├── bseService.ts                  # BSE India API
│   │       ├── nseService.ts                  # NSE India API (cookie-based)
│   │       ├── googleNewsService.ts           # Google News RSS (free, no key)
│   │       ├── newsApiService.ts              # NewsAPI.org (NEWSAPI_KEY required)
│   │       └── newsdataService.ts             # NewsData.io (NEWSDATA_API_KEY required)
│   │
│   ├── prompts/
│   │   ├── stockEvaluator.ts                  # 15-step institutional evaluation prompt
│   │   │                                      # Exports: STOCK_EVALUATOR_PROMPT, EVALUATION_USER_PREFIX
│   │   ├── newsSentimentPrompt.ts             # Institutional news sentiment prompt
│   │   │                                      # Exports: NEWS_SENTIMENT_SYSTEM_PROMPT, NEWS_SENTIMENT_USER_PREFIX
│   │   └── mfEvaluator.ts                     # Mutual fund framework (Phase 3 placeholder)
│   │
│   ├── types/
│   │   ├── stock.ts                           # StockData interface (42 fields)
│   │   ├── profile.ts                         # InvestorProfile, EvaluationInput
│   │   ├── evaluation.ts                      # EvaluationReport and all nested types (V2)
│   │   ├── common.ts                          # Shared enums (Verdict, HealthVerdict, etc.)
│   │   └── newsSentiment.ts                   # NewsSentimentAnalysis type
│   │
│   ├── utils/
│   │   ├── sectorThresholds.ts                # Hardcoded sector-specific benchmarks
│   │   ├── newsHelpers.ts                     # Trust/relevance/recency scoring, dedup
│   │   ├── validators.ts                      # Zod schemas for all Claude output types (V2)
│   │   └── display.ts                         # Terminal chalk formatting
│   │
│   └── config/
│       └── env.ts                             # Env var loader + validation
│
├── profiles/
│   └── default.json                           # CLI investor profile
│
├── reports/                                   # Generated JSON/HTML reports (gitignored)
│
└── frontend/
    ├── package.json                           # React + Supabase deps
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── .env                                   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
    ├── .env.example
    └── src/
        ├── main.tsx                           # React DOM render entry
        ├── App.tsx                            # Root component: AuthProvider, tab routing
        ├── api.ts                             # evaluate() — POST /api/evaluate
        ├── types.ts                           # Frontend types (mirrors backend + extends)
        ├── vite-env.d.ts                      # ImportMeta env type declarations
        │
        ├── lib/
        │   ├── supabase.ts                    # Supabase JS client instance
        │   └── db.ts                          # DB helpers: profile + reports CRUD
        │
        ├── contexts/
        │   └── AuthContext.tsx                # user, session, profile, signIn, signOut
        │
        └── components/
            ├── EvaluateForm.tsx               # Ticker + InvestorProfile form
            ├── LoadingOverlay.tsx             # 6-step animated progress overlay
            ├── auth/
            │   └── AuthButton.tsx             # Google sign-in / avatar dropdown
            ├── reports/
            │   └── SavedReports.tsx           # My Reports page (list + view + delete)
            ├── news/
            │   ├── StockNews.tsx              # News cards (official + media, filterable)
            │   └── NewsSentiment.tsx          # Institutional sentiment display
            └── report/
                ├── ReportPage.tsx             # Full report layout + Save/Print toolbar
                ├── CoverSection.tsx
                ├── VerdictSection.tsx         # Verdict + thesis_breakers + conviction signals
                ├── FlagsSection.tsx
                ├── SnapshotGrid.tsx
                ├── FinancialsSection.tsx      # Includes OCF/PAT, FCF, working capital
                ├── ValuationSection.tsx       # Includes IV range, R/R ratio, margin of safety
                ├── MarketExpectationsSection.tsx  # NEW — market-implied expectations
                ├── EntryStrategySection.tsx       # NEW — entry mode, position size, exit signal
                ├── QualityChecks.tsx
                ├── CompatibilitySection.tsx
                ├── BenchmarksSection.tsx
                ├── SwotSection.tsx            # Includes evidence + strength per item
                └── TrendlyneSection.tsx
```

---

## API ROUTES (`src/api/server.ts`)

### `POST /api/evaluate`
Main evaluation endpoint.

**Request body:**
```json
{
  "ticker": "NATCOPHARM",
  "entry_context": "first_purchase",
  "thesis": "Optional string",
  "profile": { ...InvestorProfile }
}
```

**Pipeline execution order:**
1. Zod schema validation of request body
2. **Parallel block A** — all run at the same time:
   - Screener.in scrape + parse → `StockData`
   - Rule-based SWOT → `SwotResult`
   - Trendlyne fetch → `TrendlyneData | null` (best-effort)
   - News aggregation → `NewsResponse | null` (best-effort)
3. **Parallel block B** — both run simultaneously (zero extra latency vs just evaluation):
   - Claude 15-step evaluation → `EvaluationReport`
   - Claude news sentiment → `NewsSentimentAnalysis | null` (returns null if < 3 news items)
4. Return combined `EvaluateResponse`

**Response shape:**
```typescript
{
  stock: StockData,
  swot: SwotResult,
  trendlyne: TrendlyneData | null,
  news: NewsResponse | null,
  sentiment: NewsSentimentAnalysis | null,
  evaluation: EvaluationReport,
  input: EvaluationInput
}
```

### `POST /api/evaluate/html`
Same pipeline — returns printable HTML string (for Print/PDF).

### `GET /api/stocks/:symbol/news`
Independent news endpoint with 15-minute in-memory TTL cache per symbol.
Query params: `companyName`, `bseCode` (both optional).
Returns: `NewsResponse` JSON.

### `GET /health`
Returns `{ status: "ok", service: "quantsieve" }`.

### `GET /*`
SPA catch-all — serves built React frontend from `dist/public/index.html`.

---

## DATA PIPELINE IN DETAIL

### 1. Screener.in Scraping

**URL:** `https://www.screener.in/company/{TICKER}/consolidated/`

**Parser sections (`src/services/parser.ts`):**
- `#top-ratios` — Market Cap, Current Price, P/E, Book Value, Dividend Yield, ROCE, ROE, Face Value
- `section#profit-loss table` — 10 years of Sales, Expenses, OPM%, Net Profit, EPS + TTM column
- `section#balance-sheet table` — Equity, Reserves, Borrowings, Total Assets (last 3 years)
- `section#cash-flow table` — Operating / Investing / Financing cash flows
- `section#ratios table` — ROCE% (5 years)
- `section#shareholding table` — Promoters, FII, DII, Public (quarterly trend)
- `.compound-growth` — Sales + Profit CAGR: 10Y/5Y/3Y/TTM; Stock CAGR: 10Y/5Y/3Y/1Y; ROE history
- BSE scrip code — parsed from page, used for BSE news fetch

Indian number formatting handled: `1,234` commas, `Cr` suffix, `%` symbol, `—` → `null`.

### 2. Rule-Based SWOT (`src/services/swotEngine.ts`)

No external API — runs instantly on `StockData`. Every signal includes:
- `point` — what was detected
- `evidence` — the specific metric values that triggered it (e.g., "ROE 24.3% vs threshold 15%")
- `strength` — `"HIGH" | "MEDIUM" | "LOW"` — items sorted HIGH first within each quadrant

**Strengths detected:** ROE/ROCE above sector threshold, strong 5Y revenue CAGR, profit CAGR > revenue CAGR (margin expansion), low D/E, stable/increasing promoter holding, expanding OPM, strong interest coverage, consistently positive OCF, debt-free balance sheet.

**Weaknesses detected:** ROE/ROCE below threshold, leverage above sector threshold, compressing OPM, weak interest coverage, one or more negative OCF years, borrowings large relative to reserves, TTM profit growth decelerating vs 3Y CAGR.

**Opportunities detected:** Mid/Small cap with demonstrated growth runway, OPM expansion headroom, balance sheet deleveraging, high ROCE + low leverage (capacity for high-return reinvestment), meaningful FII presence.

**Threats detected:** Promoter pledge > 10%, consecutive quarter promoter stake decline (≥ 3 quarters), sharp total promoter stake reduction (> 5pp), low FII ownership, valuation above sector PE ceiling, leverage above norms, micro-cap exit liquidity risk.

**`SwotResult` shape:**
```typescript
interface SwotItem {
  point: string;
  evidence: string;         // specific metric values that triggered this signal
  strength: "HIGH" | "MEDIUM" | "LOW";
}

interface SwotSummary {
  strengths: number;
  weaknesses: number;
  opportunities: number;
  threats: number;
  posture: string;          // one-line overall posture: CONSTRUCTIVE / CAUTION / MIXED_POSITIVE / etc.
}

interface SwotResult {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  summary: SwotSummary;
}
```

The SWOT result is passed to Claude as a pre-computed starting reference — Claude validates every
point against raw data and is not obligated to agree. It never overrides the 15-step reasoning.

### 3. Trendlyne Scraping (`src/services/trendlyneScraper.ts`)

Fetches from Trendlyne widget endpoints. Best-effort — evaluation continues if it fails.

Data fetched:
- **Beta** — market sensitivity score
- **DVM Scores** — Durability / Valuation / Momentum (each 0–100) + classification label
- **Analyst consensus** — target price, analyst count
- **Retail sentiment** — % Buy / Hold / Sell

### 4. News Aggregation (`src/services/news/`)

All providers called via `Promise.allSettled` — one failure never blocks others.

| Provider | Endpoint | Auth Required | Trust Score | Key Notes |
|----------|----------|--------------|-------------|-----------|
| BSE India | `api.bseindia.com/BseIndiaAPI/api/AnnGetData/w` | None (scraping) | 95 | Needs BSE scrip code from Screener parser. No official API. |
| NSE India | `www.nseindia.com/api/corporate-announcements` | Session cookie | 95 | Must hit NSE homepage first to get cookie. Often 401/403. |
| Google News | RSS feed (free) | None | 60 | Most reliable free source. No rate limits. 10–20 articles. |
| NewsData.io | `newsdata.io/api/1/latest` | `NEWSDATA_API_KEY` | 65 | Free tier: 200 req/day. Skipped if no key. |
| NewsAPI.org | `newsapi.org/v2/everything` | `NEWSAPI_KEY` | 65 | Dev tier: 100 req/day. **Production use blocked by ToS.** |

**Aggregation logic (`newsAggregator.ts`):**
1. All 5 providers run in parallel via `Promise.allSettled`
2. Each item assigned a `finalScore = trustScore×0.3 + relevanceScore×0.3 + recencyScore×0.25 + sourceTypeBonus×0.15`
3. Deduplication via word-overlap algorithm (threshold: 0.8) — keeps higher-trust version
4. Sorted: official exchange items first, then by finalScore descending
5. Capped at 30 items

**Scoring helpers (`src/utils/newsHelpers.ts`):**
- `recencyScore()` — 100 if < 24h, 80 if < 7d, 50 if < 30d, 20 otherwise
- `getTrustScore()` — 95 for exchanges, 75 for Moneycontrol/ET/Business Standard, 50 default
- `getRelevanceScore()` — 90 if symbol or company name in title/summary, 60 otherwise
- `categorizeAnnouncement()` — regex → `result | board_meeting | corporate_action | insider_trade | announcement | article`

### 5. Claude 15-Step Evaluation (`src/services/claude.ts`)

**Model:** `claude-sonnet-4-20250514`
**Max tokens:** 8000
**System prompt:** `STOCK_EVALUATOR_PROMPT` from `src/prompts/stockEvaluator.ts`
**User message prefix:** `EVALUATION_USER_PREFIX` from `src/prompts/stockEvaluator.ts`

**User message sections (in order):**
1. `EVALUATION_USER_PREFIX` — instruction header
2. Full `StockData` JSON
3. `InvestorProfile` JSON
4. Entry context + optional thesis
5. Pre-computed SWOT (rule-based, to guide Claude's reasoning, not override it)
6. Trendlyne supplementary data (if available)
7. Top 10 recent news items (official exchange first, then media)

**Output validation:** `evaluationReportSchema` (Zod). Throws `Error` with raw Claude response if Zod fails.

**The 15 evaluation steps Claude executes internally:**

| Step | Name | Output |
|------|------|--------|
| 0 | Company Anchor | What the business is, scale, revenue driver |
| 1 | Data Quality Gate | HIGH_INTEGRITY / ADEQUATE / FRAGMENTED / WEAK — caps confidence if poor |
| 2 | Business Model & Economic Quality | business_quality: ELITE / STRONG / AVERAGE / FRAGILE |
| 3 | Competitive Moat Analysis | moat_type, moat_width (WIDE/NARROW/NONE), STRUCTURAL vs CYCLICAL |
| 4 | Financial Strength | health_verdict, growth_type, revenue/profit CAGR, ROE/ROCE, D/E, coverage |
| 5 | Earnings Quality & Cash Conversion | OCF/PAT ratio, FCF quality, working capital, other income %, tax rate |
| 6 | Governance & Management Quality | governance_posture, promoter trend (8Q), pledge, capital allocation |
| 7 | Valuation Analysis | IV range, justified PE, implied growth rate, risk/reward ratio, margin of safety |
| 8 | Trendlyne Integration | DVM scores corroborate or conflict with independent analysis |
| 9 | Market Expectation Analysis | Implied EPS CAGR required, de-rating risks, story type |
| 10 | News & Event Risk | THESIS_CONFIRMING / NEUTRAL / RISKING / CHANGING per item |
| 11 | Investor Fit & Compatibility | 9 dimensions: MATCH / CONCERN / MISMATCH |
| 12 | Scenario Framework | Bull/Base/Bear with probabilities summing to 100, weighted expected return |
| 13 | Entry Strategy & Position Sizing | Entry mode, position size, exit signal, time-bound re-evaluation triggers |
| 14 | Thesis Breakers & Monitorables | 3–5 breakers, 3–5 quantified monitorables, conviction improvers/reducers |
| 15 | Final Verdict | BUY / BUY_WITH_CAUTION / WAIT / NOT_SUITABLE / AVOID — 9 guard rails enforced |

**Verdict guard rails — BUY requires ALL of:**
- business_quality is STRONG or ELITE
- financial_health_verdict is STRONG or ADEQUATE
- earnings_quality is CLEAN or ACCEPTABLE
- governance_posture is STRONG or ACCEPTABLE
- valuation_zone is UNDERVALUED or FAIR
- moat_width is WIDE or NARROW (never NONE)
- risk_reward_ratio ≥ 3:1
- compatibility_overall is STRONG or MODERATE
- weighted_expected_return > 20% over base case horizon

**AVOID requires evidence of at least ONE hard condition:**
- governance_posture is HIGH_RISK
- earnings_quality is WEAK with systematic pattern
- financial_health_verdict is DISTRESSED
- valuation is EXPENSIVE AND business_quality is AVERAGE or FRAGILE
- THESIS_CHANGING news event with no management response

### 6. Institutional News Sentiment (`src/services/newsSentimentService.ts`)

**Second Claude call** — runs in parallel with evaluation (no added latency).
**Model:** `claude-sonnet-4-20250514`
**Max tokens:** 2000 (focused, fast)
**System prompt:** `NEWS_SENTIMENT_SYSTEM_PROMPT` from `src/prompts/newsSentimentPrompt.ts`
**User prefix:** `NEWS_SENTIMENT_USER_PREFIX` from `src/prompts/newsSentimentPrompt.ts`

Returns `null` if fewer than 3 news items. UI shows a descriptive placeholder.
Output validated with `newsSentimentAnalysisSchema` (Zod).

**Framing:** Senior buy-side research analyst. Prioritises: exchange disclosures > insider trades > corporate actions > media. Regulatory events in India are never treated as routine.

**`NewsSentimentAnalysis` shape:**
```typescript
{
  overall: {
    score: "STRONGLY_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONGLY_BEARISH";
    confidence: "HIGH" | "MODERATE" | "LOW";
    summary: string;  // 2-sentence institutional briefing
  };
  signal_breakdown: {
    official_disclosures: { sentiment: "POSITIVE"|"NEUTRAL"|"NEGATIVE"|"MIXED"; key_findings: string[] };
    media_coverage:       { sentiment: "POSITIVE"|"NEUTRAL"|"NEGATIVE"|"MIXED"; key_findings: string[] };
  };
  institutional_flags: {
    type: "RISK" | "OPPORTUNITY" | "WATCH";
    category: string;
    title: string;
    detail: string;
    news_count: number;
  }[];
  price_catalysts: {
    horizon: "NEAR_TERM" | "MEDIUM_TERM" | "LONG_TERM";
    direction: "POSITIVE" | "NEGATIVE";
    description: string;
  }[];
  institutional_verdict: {
    action: "ACCUMULATE" | "HOLD" | "REDUCE" | "MONITOR";
    rationale: string;
    key_risks: string[];
  };
  data_quality: {
    total_items_analyzed: number;
    official_sources: number;
    media_sources: number;
    freshness: "FRESH" | "RECENT" | "STALE";
  };
}
```

---

## CORE TYPES

### `StockData` (`src/types/stock.ts`)
42 fields: `ticker`, `company_name`, `sector`, `industry`, `current_price`, `high_52w`, `low_52w`, `market_cap`, `market_cap_category`, `pe_ratio`, `pb_ratio`, `ev_ebitda`, `dividend_yield`, `book_value`, `face_value`, `revenue[]`, `net_profit[]`, `opm[]`, `npm[]`, `eps[]`, `roe`, `roce[]`, `ttm_revenue`, `ttm_net_profit`, `ttm_eps`, `debt_to_equity`, `interest_coverage`, `current_ratio`, `total_assets`, `borrowings`, `reserves`, `cash_flow[]`, `promoter_holding`, `promoter_holding_trend[]`, `promoter_pledge`, `fii_holding`, `dii_holding`, `public_holding`, `compounded_sales_growth`, `compounded_profit_growth`, `stock_price_cagr`, `roe_history`, `listed_since`, `bse_code`, `data_source`, `fetched_at`.

### `InvestorProfile` (`src/types/profile.ts`)
```typescript
{
  age: number;
  investment_goal: "retirement"|"education"|"wealth_creation"|"home_purchase"|"short_term"|"other";
  investment_horizon: string;           // "5-7 years" etc.
  investment_mode: "lump_sum"|"staggered"|"adding";
  portfolio_type: "diversified_10plus"|"concentrated_3to5"|"mostly_mf"|"first_investment";
  position_sizing: "under_5"|"5_to_10"|"10_to_20"|"over_20";
  risk_tolerance: "low"|"medium"|"high";
  volatility_preference: "low"|"medium"|"high";
  tax_bracket: "30pct"|"20pct"|"5to10pct"|"not_sure";
}
```

### `EvaluationReport` (`src/types/evaluation.ts`)

All root-level sections:

| Section | Type | Description |
|---------|------|-------------|
| `overview` | `EvaluationOverview` | Company anchor, data quality, business quality, moat, earnings quality, governance, executive summary, what works, what worries |
| `flags[]` | `EvaluationFlag[]` | RED / AMBER / GREEN signals with data-backed descriptions |
| `financials` | `EvaluationFinancials` | Health verdict, CAGRs, OCF/PAT assessment, FCF, working capital, weighted expected return |
| `valuation` | `EvaluationValuation` | Zone, justified PE, IV range, risk/reward ratio, margin of safety, trendlyne integration |
| `market_expectation_analysis` | `MarketExpectationAnalysis` | Implied EPS CAGR, de-rating risks, story type, what market gets wrong |
| `scenarios` | `EvaluationScenarios` | Bull/Base/Bear — conditions, what breaks, target price, probability (must sum to 100) |
| `entry_strategy` | `EntryStrategy` | Entry mode, position size, thesis horizon, exit signal |
| `quality_checks[]` | `QualityCheck[]` | 17 checks — PASS/FAIL/CONDITIONAL/DATA_UNAVAILABLE with finding per check |
| `quality_score` | `QualityScore` | earned/total/percentage/label (GOOD/MODERATE/BAD) |
| `compatibility[]` | `CompatibilityItem[]` | 9 investor profile dimensions — MATCH/CONCERN/MISMATCH |
| `compatibility_overall` | `CompatibilityOverall` | STRONG / MODERATE / POOR |
| `thesis_breakers[]` | `string[]` | 3–5 specific non-negotiable exit events |
| `monitorables[]` | `string[]` | 3–5 quantified per-quarter metrics to track |
| `conviction_improvers[]` | `string[]` | Exactly 3 events that would justify adding to position |
| `conviction_reducers[]` | `string[]` | Exactly 3 events that would trigger trimming |
| `benchmarks` | `EvaluationBenchmarks` | Sector index, broad index, index fund alternative, opportunity cost note |
| `news_assessment` | `NewsAssessment` | Overall impact, key findings, official + media summaries |
| `verdict` | `Verdict` | BUY / BUY_WITH_CAUTION / WAIT / NOT_SUITABLE / AVOID |
| `verdict_summary` | `string` | 2–3 sentence institutional rationale |
| `review_triggers[]` | `string[]` | Time-bound re-evaluation triggers |
| `confidence` | `ConfidenceLevel` | HIGH / MODERATE / LOW |
| `confidence_rationale` | `string` | What drives this confidence level |
| `data_gaps[]` | `DataGap[]` | field + MATERIAL/MINOR + impact on verdict |

**Key classification enums:**

```typescript
type BusinessQuality  = "ELITE" | "STRONG" | "AVERAGE" | "FRAGILE"
type MoatType         = "COST_ADVANTAGE" | "SWITCHING_COSTS" | "NETWORK_EFFECTS"
                      | "INTANGIBLE_ASSETS" | "EFFICIENT_SCALE" | "NO_MOAT_IDENTIFIED"
type MoatWidth        = "WIDE" | "NARROW" | "NONE"
type MoatNature       = "STRUCTURAL" | "CYCLICAL" | "UNCLEAR"
type GrowthType       = "EFFICIENT_COMPOUNDING" | "MARGIN_EXPANSION_STORY" | "DEBT_FUELED_GROWTH"
                      | "CYCLICAL_PEAK" | "DETERIORATING" | "EARLY_STAGE" | "LOW_QUALITY"
type EarningsQuality  = "CLEAN" | "ACCEPTABLE" | "QUESTIONABLE" | "WEAK"
type GovernancePosture= "STRONG" | "ACCEPTABLE" | "WATCHLIST" | "HIGH_RISK"
type EntryMode        = "LUMP_SUM" | "STAGGERED_3_TRANCHES" | "STAGGERED_5_TRANCHES" | "WAIT_FOR_TRIGGER"
type StoryType        = "COMPOUNDING" | "RE_RATING" | "CYCLICAL_TRADE"
type NewsImpact       = "THESIS_CONFIRMING" | "THESIS_NEUTRAL" | "THESIS_RISKING" | "THESIS_CHANGING"
```

### `common.ts` (`src/types/common.ts`)
```typescript
type Verdict        = "BUY" | "BUY_WITH_CAUTION" | "WAIT" | "NOT_SUITABLE" | "AVOID"
type HealthVerdict  = "STRONG" | "ADEQUATE" | "WEAK" | "DISTRESSED"
type ValuationZone  = "UNDERVALUED" | "FAIR" | "OVERVALUED" | "EXPENSIVE"
type DataQuality    = "HIGH_INTEGRITY" | "ADEQUATE" | "FRAGMENTED" | "WEAK"
type NewsCategory   = "result" | "board_meeting" | "corporate_action" | "insider_trade" | "announcement" | "article"
type NewsTrustTier  = "EXCHANGE" | "PREMIUM_MEDIA" | "MEDIA" | "DEFAULT"
```

---

## ZOD VALIDATORS (`src/utils/validators.ts`)

Two root schemas validate all Claude API output:

**`evaluationReportSchema`** — validates the full `EvaluationReport` from the 15-step evaluation call.

Critical validations:
- `overview.moat_type`, `moat_width`, `moat_structural_or_cyclical` — all required enums
- `overview.growth_type`, `earnings_quality`, `governance_posture` — all required enums
- `financials.ocf_to_pat_assessment`, `fcf_assessment`, `working_capital_assessment` — required strings
- `financials.weighted_expected_return_pct` — number or null
- `valuation.justified_pe`, `iv_conservative`, `iv_optimistic` — number or null
- `valuation.risk_reward_ratio`, `margin_of_safety_pct` — number or null
- `scenarios` — refined: `bull.probability_pct + base.probability_pct + bear.probability_pct` must equal 99–101
- `quality_checks` — min 10, max 17; each id must match `/^QC\d{2}$/`
- `conviction_improvers` — exactly 3 items
- `conviction_reducers` — exactly 3 items
- `thesis_breakers` — 3 to 5 items

**`newsSentimentAnalysisSchema`** — validates `NewsSentimentAnalysis` from the sentiment call.

Both schemas export inferred TypeScript types:
```typescript
export type EvaluationReportValidated = z.infer<typeof evaluationReportSchema>
export type NewsSentimentValidated    = z.infer<typeof newsSentimentAnalysisSchema>
```

---

## PROMPTS (`src/prompts/`)

### `stockEvaluator.ts`
Exports two constants used in `src/services/claude.ts`:

```typescript
// Goes into the `system` field of the Claude API call
export const STOCK_EVALUATOR_PROMPT: string

// Prepended to the user message before StockData JSON
export const EVALUATION_USER_PREFIX: string
```

The system prompt instructs Claude to reason as a 30+ year buy-side institutional analyst
covering Indian equities. It enforces the 15-step framework, India-specific discipline
(promoter dynamics, IndAS artifacts, rupee sensitivity, regulatory exposure, liquidity constraints),
and hard verdict guard rails. Claude must return only valid JSON matching EvaluationReport.

### `newsSentimentPrompt.ts`
Exports two constants used in `src/services/newsSentimentService.ts`:

```typescript
export const NEWS_SENTIMENT_SYSTEM_PROMPT: string
export const NEWS_SENTIMENT_USER_PREFIX: string
```

Frames Claude as a senior buy-side analyst extracting actionable intelligence from news.
Enforces: exchange disclosures > insider trades > corporate actions > media.
Regulatory events are never routine. Media tone never overrides balance sheet evidence.

---

## QUALITY CHECKS — 17-POINT CHECKLIST

Run by Claude on every evaluation. Each returns `PASS | FAIL | CONDITIONAL | DATA_UNAVAILABLE`.

**Financial Health (QC01–QC08):**
- QC01 — Revenue CAGR (3Y) above sector baseline (~10–12%)
- QC02 — Net Profit CAGR (3Y) above or equal to Revenue CAGR
- QC03 — ROE above sector threshold
- QC04 — ROCE above sector threshold (skipped for Banking/NBFC)
- QC05 — D/E within sector acceptable range
- QC06 — Interest coverage ≥ 2.5×
- QC07 — OPM stable or improving over 3Y (not compressing > 3pp)
- QC08 — Borrowings not growing faster than revenue

**Earnings & Cash Quality (QC09–QC13):**
- QC09 — OCF / PAT ≥ 0.7 for most recent 2 available years
- QC10 — FCF positive in most recent available year
- QC11 — Other income < 15% of PBT
- QC12 — No significant working capital deterioration
- QC13 — Consistent EPS growth trend (not a single exceptional year)

**Governance & Ownership (QC14–QC17):**
- QC14 — Promoter holding ≥ 40%
- QC15 — Promoter pledge ≤ 10%
- QC16 — No consistent multi-quarter promoter decline (≥ 3 consecutive quarters)
- QC17 — FII and/or DII holding stable or increasing

**Quality Score:**
- earned = PASS count (CONDITIONAL = 0.5)
- total = 17 minus DATA_UNAVAILABLE count
- percentage = earned / total × 100
- label = GOOD (≥ 70%) | MODERATE (50–69%) | BAD (< 50%)

---

## SECTOR THRESHOLDS (`src/utils/sectorThresholds.ts`)

| Sector | Good ROE | Good ROCE | Acceptable D/E | P/E Range |
|--------|----------|-----------|----------------|-----------|
| Banking / NBFC | 14% | — (ROA > 1.2%) | N/A | 10–25 |
| IT / Technology | 20% | 25% | 0.5 | 20–35 |
| Pharma / Healthcare | 15% | 18% | 0.8 | 20–35 |
| FMCG / Consumer | 25% | 30% | 0.5 | 35–60 |
| Auto / Auto ancillary | 14% | 18% | 1.0 | 15–30 |
| Metal / Mining | 12% | 15% | 1.5 | 8–15 |
| Real Estate | 10% | 12% | 1.5 | 15–30 |
| Infrastructure / Capital Goods | 12% | 15% | 1.5 | 20–35 |
| Power / Utilities | 10% | 12% | 2.0 | 10–20 |
| Chemicals | 15% | 18% | 1.0 | 20–35 |
| General (fallback) | 15% | 18% | 1.0 | 15–25 |

---

## FRONTEND UI

### App Shell (`App.tsx`)
- Wraps everything in `AuthProvider`
- Top nav: **⚡ QUANTSIEVE** logo | Evaluate / My Reports tabs | `AuthButton`
- My Reports tab only visible when signed in
- When a result is set, renders full-screen `ReportPage` (no nav chrome)

### Evaluate Tab
1. `EvaluateForm` — ticker input, entry context, thesis, 9 investor profile fields
2. Submit → `POST /api/evaluate` → `LoadingOverlay` with 6 animated steps (~30–35 seconds)
3. On success → `ReportPage` replaces form

### Report Page Sections (top to bottom)

| # | Component | Content |
|---|-----------|---------|
| 1 | `CoverSection` | Company name, sector, market cap, verdict badge |
| 2 | `SnapshotGrid` | 8 key metrics at a glance (P/E, ROE, ROCE, D/E, OPM, etc.) |
| 3 | `SwotSection` | Rule-based color-coded cards; each item shows evidence + strength dot (HIGH=red, MEDIUM=yellow, LOW=grey) |
| 4 | `TrendlyneSection` | DVM score bars, beta, analyst target (if fetched) |
| 5 | `FlagsSection` | RED / AMBER / GREEN signal cards with data-backed descriptions |
| 6 | `FinancialsSection` | Revenue + profit trend charts, balance sheet, cash flow table, health verdict, OCF/PAT assessment, FCF assessment, working capital assessment, weighted expected return |
| 7 | `ValuationSection` | Metrics vs sector thresholds, zone badge, justified PE vs actual, IV range band (conservative–optimistic), risk/reward ratio badge, margin of safety badge, trendlyne integration note |
| 8 | `MarketExpectationsSection` | Implied EPS CAGR required, story type badge, what market gets wrong, de-rating risks list |
| 9 | `EntryStrategySection` | Entry mode badge + rationale, suggested position size, thesis horizon chip, exit signal callout |
| 10 | `QualityChecks` | 17 pass/fail checks, quality score badge (% + GOOD/MODERATE/BAD) |
| 11 | `CompatibilitySection` | 9 investor profile dimensions: MATCH / CONCERN / MISMATCH |
| 12 | `VerdictSection` | Large verdict badge, summary, what works[], what worries[], thesis breakers (red list), conviction improvers (green list), conviction reducers (amber list), confidence badge + rationale, review triggers |
| 13 | `BenchmarksSection` | Sector index + broad index + index fund alternative, opportunity cost note |
| 14 | News & Disclosures | `StockNews` — 30 items, filterable All / Official / Media; category badges |
| 15 | Institutional Sentiment | `NewsSentiment` — score, signal breakdown, flags, catalysts, verdict; or placeholder if < 3 news items |
| 16 | Data Gaps | MATERIAL vs MINOR missing metrics with impact description |

### Report Toolbar (sticky at top)
- **← New Evaluation** — resets to form
- **Save Report** — visible only when signed in; states: idle → Saving… → ✓ Saved → Save failed
- **⬇ Print / PDF** — `window.print()` (print-optimized CSS strips toolbar/nav)

### My Reports Tab
Cards showing: ticker, verdict badge, company + sector, quality %, time ago, thesis excerpt.
- **View** — reopens full `ReportPage` with saved `report_data`
- **Delete** — removes from Supabase and list

### Auth Button
- Signed out: Google logo + "Sign in" button
- Signed in: avatar + name → dropdown → "Sign out"

### Important: Saved Report Compatibility
Old reports saved before V2 will not have fields like `entry_strategy`, `market_expectation_analysis`,
`moat_type`, etc. All new-field accesses in components must use optional chaining:
```tsx
{report.entry_strategy?.suggested_position_size ?? "—"}
{report.valuation?.risk_reward_ratio ?? null}
```

---

## AUTHENTICATION & DATABASE (Supabase)

### First-Time Setup
1. Create project at supabase.com
2. Run `supabase_setup.sql` in SQL Editor → creates tables, RLS policies, auth trigger
3. Enable Google OAuth: Authentication → Providers → Google
4. Create OAuth credentials at console.cloud.google.com → APIs & Services → Credentials
5. Add `https://<project-id>.supabase.co/auth/v1/callback` as authorized redirect URI
6. Paste Client ID + Secret into Supabase
7. Add to `frontend/.env`

### Database Schema

**`public.profiles`** (auto-created on first sign-in via trigger)
```sql
id               uuid PRIMARY KEY  -- references auth.users(id) ON DELETE CASCADE
email            text
display_name     text              -- from Google OAuth
avatar_url       text              -- Google profile picture URL
investor_profile jsonb             -- saved InvestorProfile JSON
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()
```
RLS: users can only SELECT / INSERT / UPDATE their own row (`auth.uid() = id`).

**`public.reports`**
```sql
id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY
user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE
ticker              text NOT NULL
company_name        text
sector              text
market_cap_category text
verdict             text           -- BUY | BUY_WITH_CAUTION | WAIT | NOT_SUITABLE | AVOID
verdict_color       text           -- green | amber | red
verdict_summary     text
quality_score       jsonb          -- { earned, total, percentage, label }
entry_context       text
thesis              text
investor_profile    jsonb          -- snapshot at time of report
report_data         jsonb NOT NULL -- full EvaluateResponse (self-contained)
created_at          timestamptz DEFAULT now()
```
RLS: users can only SELECT / INSERT / DELETE their own rows (`auth.uid() = user_id`).

### Auth Flow
1. "Sign in with Google" → `supabase.auth.signInWithOAuth({ provider: "google" })`
2. Redirect to Google → redirect back to app
3. `onAuthStateChange` fires → `AuthContext` loads `user`, `session`, `profile`
4. `EvaluateForm` detects `profile.investor_profile` → auto-fills all 9 form fields
5. On form submit → `saveInvestorProfile()` updates profile row (fire-and-forget)
6. After evaluation → "Save Report" button → `saveReport()` inserts row
7. "My Reports" tab → `getReports()` lists newest-first; "View" reopens full ReportPage

### Frontend DB Helpers (`frontend/src/lib/db.ts`)

| Function | Table | Action |
|----------|-------|--------|
| `getProfile()` | profiles | SELECT own row |
| `saveInvestorProfile(profile)` | profiles | UPDATE investor_profile + updated_at |
| `saveReport(result, entryContext, thesis?)` | reports | INSERT full EvaluateResponse |
| `getReports()` | reports | SELECT all, ORDER BY created_at DESC |
| `deleteReport(id)` | reports | DELETE by id |

---

## ENVIRONMENT VARIABLES

### Backend (`.env`)
```bash
ANTHROPIC_API_KEY=sk-ant-...       # Required

# Optional — news enrichment
NEWSDATA_API_KEY=...               # NewsData.io — 200 req/day free
NEWSAPI_KEY=...                    # NewsAPI.org — 100 req/day (developer plan only)
```

### Frontend (`frontend/.env`)
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## IMPORTANT CONSTRAINTS

1. **No `any` types** — all variables, parameters, and return types explicitly typed.
2. **Zod validation on all Claude output** — never trust AI response shape without validation. If Zod throws, log the raw Claude response and surface the error.
3. **Graceful degradation** — Trendlyne, news, and sentiment are best-effort. Their failure never blocks evaluation.
4. **BSE code required for BSE news** — extracted by the Screener parser. If missing, BSE news is silently skipped.
5. **NSE cookie handling** — NSE blocks direct API calls. Hit NSE homepage first to get a session cookie, then make the API call with that cookie.
6. **News deduplication** — word-overlap algorithm (threshold 0.8) prevents duplicate stories across providers.
7. **15-minute news cache** — `/api/stocks/:symbol/news` uses an in-memory `Map` with TTL to avoid hammering providers on every report load.
8. **Sentiment requires ≥ 3 news items** — `analyzeNewsSentiment()` returns `null` if insufficient data.
9. **Reports are self-contained** — `report_data` JSONB stores the entire `EvaluateResponse`. Re-viewing a saved report shows exactly what was generated, regardless of subsequent price changes.
10. **RLS enforced on all tables** — Supabase Row Level Security ensures users can only read/write their own data.
11. **Scenario probabilities must sum to 100** — enforced by Zod refinement. If Claude returns probabilities that don't sum to 99–101, Zod throws.
12. **Optional chaining on all new fields when rendering saved reports** — old reports won't have V2 fields. Never assume their presence.
13. **Token budget** — System prompt is ~4,200 tokens. Claude response is ~2,500–3,500 tokens. Max tokens set to 8,000 — sufficient headroom. Do not reduce this.

---

## NEWS PROVIDER STATUS

| Provider | Status | Notes |
|----------|--------|-------|
| BSE India | Working | No official API — internal BSE endpoint. May break if BSE changes schema. |
| NSE India | Unreliable | Aggressively rate-limits scrapers. Cookie approach is fragile. Often returns 0 items. |
| Google News RSS | Working (free) | Most reliable. No key. 10–20 relevant articles per query. |
| NewsData.io | Working with key | 200 req/day free. Returns Indian business news. |
| NewsAPI.org | Working with key | Dev plan: 100 req/day. **Cannot be used in production** (ToS restriction). |

---

## RUNNING THE PROJECT

### Development
```bash
# Backend
npm install
npx tsx src/server.ts         # Starts on port 3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # Starts Vite dev server on port 5173
```

Vite dev server proxies `/api/*` requests to backend at `localhost:3000`.

### Production Build
```bash
cd frontend && npm run build && cd ..   # Outputs to dist/public
npm run build                            # Compiles backend
node dist/server.js                      # Serves frontend + API on port 3000
```

---

## CLI COMMANDS

### `quantsieve evaluate <TICKER>`
```bash
npx tsx src/index.ts evaluate NATCOPHARM
npx tsx src/index.ts evaluate NATCOPHARM --context adding --thesis "Adding on dip"
npx tsx src/index.ts evaluate NATCOPHARM --json
npx tsx src/index.ts evaluate NATCOPHARM --output ./my-report.json
```

### `quantsieve profile`
```bash
npx tsx src/index.ts profile         # Interactive setup (inquirer)
npx tsx src/index.ts profile --show  # Display current saved profile
```

---

## PHASE 3 PLACEHOLDERS (not yet built)

- `src/commands/screen.ts` — `quantsieve screen` bulk screening command
- `src/prompts/mfEvaluator.ts` — Mutual fund evaluation framework
- Screener-based stock screening with custom filter support