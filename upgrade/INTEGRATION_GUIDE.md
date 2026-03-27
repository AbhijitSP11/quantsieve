# QuantSieve Engine Upgrade — Integration Guide

This document explains every change made in this upgrade and exactly what to update
in each file of the existing codebase to integrate the new engine.

---

## Files Delivered

| File | Destination | What Changed |
|---|---|---|
| `stockEvaluator_prompt.ts` | `src/prompts/stockEvaluator.ts` | Full rewrite — 15-step framework |
| `newsSentimentPrompt.ts` | `src/prompts/newsSentimentPrompt.ts` | New file — extract prompt from service |
| `evaluation.ts` | `src/types/evaluation.ts` | Full rewrite — new fields for all new steps |
| `common.ts` | `src/types/common.ts` | Minor additions only |
| `validators.ts` | `src/utils/validators.ts` | Full rewrite — Zod schemas for new types |
| `swotEngine.ts` | `src/services/swotEngine.ts` | Upgraded — moat proxies, OCF, promoter trend |

---

## Step-by-Step Integration

### 1. Replace `src/prompts/stockEvaluator.ts`

Drop in the new file. Two named exports:
- `STOCK_EVALUATOR_PROMPT` — goes into the `system` field of the Claude API call
- `EVALUATION_USER_PREFIX` — prepended to the user message before StockData JSON

Update `src/services/claude.ts`:

```typescript
import {
  STOCK_EVALUATOR_PROMPT,
  EVALUATION_USER_PREFIX,
} from "../prompts/stockEvaluator";

// In the Claude API call:
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 8000,
  system: STOCK_EVALUATOR_PROMPT,       // <-- new
  messages: [
    {
      role: "user",
      content: `${EVALUATION_USER_PREFIX}\n\n${JSON.stringify(payload, null, 2)}`,
    },
  ],
});
```

The old prompt prefix ("You are QuantSieve...") is now replaced by `EVALUATION_USER_PREFIX`.
The old system prompt string is replaced by `STOCK_EVALUATOR_PROMPT`.

---

### 2. Add `src/prompts/newsSentimentPrompt.ts`

Drop in the new file. Two exports:
- `NEWS_SENTIMENT_SYSTEM_PROMPT` — system field for the news sentiment Claude call
- `NEWS_SENTIMENT_USER_PREFIX` — prepended to the news payload

Update `src/services/newsSentimentService.ts`:

```typescript
import {
  NEWS_SENTIMENT_SYSTEM_PROMPT,
  NEWS_SENTIMENT_USER_PREFIX,
} from "../prompts/newsSentimentPrompt";

// Replace the inline system prompt string with NEWS_SENTIMENT_SYSTEM_PROMPT
// Replace the inline user prefix with NEWS_SENTIMENT_USER_PREFIX
```

---

### 3. Replace `src/types/evaluation.ts`

Full replacement. All old interfaces are superseded.

Key new types added:
- `MoatType`, `MoatWidth`, `MoatNature` — competitive moat classification
- `GrowthType` — growth quality classification (7 types)
- `EarningsQuality` — cash conversion quality (4 levels)
- `GovernancePosture` — governance classification (4 levels)
- `MarketExpectationAnalysis` — what the market is pricing in
- `EvaluationScenarios` — structured bull/base/bear with probability weights
- `EntryStrategy` — entry mode, position sizing, exit signal
- `NewsAssessment` — replaces inline news fields
- `ConfidenceLevel` — confidence with rationale

**Old fields removed or renamed:**

| Old | New |
|---|---|
| `overview.summary` | `overview.executive_summary` |
| `overview.data_quality_assessment` | `overview.data_quality` + `data_quality_notes` |
| Direct `verdict` on `overview` | Separate root-level `verdict` field (unchanged) |
| No moat fields | `moat_type`, `moat_width`, `moat_structural_or_cyclical`, `moat_rationale` |
| No growth_type | `overview.growth_type` |
| No earnings_quality | `overview.earnings_quality` + rationale |
| No governance_posture | `overview.governance_posture` + rationale |
| `financials.cash_flow_assessment` | `financials.ocf_to_pat_assessment` + `fcf_assessment` |
| No weighted_expected_return | `financials.weighted_expected_return_pct` |
| `valuation.peer_comparison[]` | Removed from type (Claude still produces it in narrative) |
| No iv_conservative / iv_optimistic | New in `valuation` |
| No risk_reward_ratio | New in `valuation` |
| No margin_of_safety_pct | New in `valuation` |
| No market_expectation_analysis | New root section |
| No entry_strategy | New root section |
| `what_to_watch[]` | Replaced by `monitorables[]`, `conviction_improvers[]`, `conviction_reducers[]` |
| No `news_assessment` section | New root section |

---

### 4. Update `src/types/common.ts`

Minor — add `NewsTrustTier` if not present. Existing enums unchanged.

---

### 5. Replace `src/utils/validators.ts`

Full replacement. Critical changes:

**New validations added:**
- `moat_type`, `moat_width`, `moat_structural_or_cyclical` on overview
- `growth_type`, `earnings_quality`, `governance_posture` on overview
- `EvaluationFinancialsSchema` — new fields: `ocf_to_pat_assessment`, `fcf_assessment`, `working_capital_assessment`, `weighted_expected_return_pct`
- `EvaluationValuationSchema` — new fields: `justified_pe`, `implied_growth_rate_priced_in`, `iv_conservative`, `iv_optimistic`, `risk_reward_ratio`, `margin_of_safety_pct`, `trendlyne_integration`
- `MarketExpectationAnalysisSchema` — entirely new
- `EvaluationScenariosSchema` — now validates that bull+base+bear probabilities sum to 100
- `EntryStrategySchema` — entirely new
- `NewsAssessmentSchema` — entirely new

**Zod refinement added:**
```typescript
// Probability sum validation on scenarios
.refine(data => {
  const total = data.bull.probability_pct + data.base.probability_pct + data.bear.probability_pct;
  return total >= 99 && total <= 101;
}, { message: "Scenario probabilities must sum to 100" })
```

---

### 6. Replace `src/services/swotEngine.ts`

Drop in the new file. The `SwotResult` interface is extended:

```typescript
// Old SwotItem
interface SwotItem { point: string }

// New SwotItem
interface SwotItem {
  point: string;
  evidence: string;   // <-- NEW: specific metric values
  strength: "HIGH" | "MEDIUM" | "LOW";  // <-- NEW: signal strength
}

// New SwotSummary
interface SwotSummary {
  strengths: number;
  weaknesses: number;
  opportunities: number;
  threats: number;
  posture: string;  // <-- NEW: one-line overall posture
}
```

**Update any frontend component that renders SwotSection** to display the new
`evidence` field and `strength` badge alongside the existing `point` text.
The `SwotSection.tsx` component should be updated to use these for richer display.

New signals added to the engine:
- OCF positive/negative across years (operating cash flow trend)
- Promoter consecutive decline count (using new helper)
- Sharp promoter stake total reduction over all quarters
- Borrowings vs reserves ratio check
- Profit growth deceleration (TTM vs 3Y CAGR divergence)
- Debt-free explicitly called out as HIGH strength
- High interest coverage explicitly called out

---

### 7. Update Frontend Components

The following report components will need updating to handle new fields:

**`ReportPage.tsx`** — Add two new sections:
```tsx
<MarketExpectationsSection data={report.market_expectation_analysis} />
<EntryStrategySection data={report.entry_strategy} />
```

**`VerdictSection.tsx`** — Add:
- `thesis_breakers` list (currently not displayed)
- `conviction_improvers` and `conviction_reducers` (new)
- `confidence_rationale` text under confidence badge

**`FinancialsSection.tsx`** — Add:
- `ocf_to_pat_assessment` text block
- `fcf_assessment` text block
- `working_capital_assessment` text block
- `weighted_expected_return_pct` as a metric

**`ValuationSection.tsx`** — Add:
- `justified_pe` vs actual PE comparison
- `iv_conservative` and `iv_optimistic` as a price range band
- `risk_reward_ratio` as a prominent metric
- `margin_of_safety_pct` as a badge (positive = green, negative = red)
- `trendlyne_integration` explanatory text

**`SwotSection.tsx`** — Update to display:
- `evidence` field under each point
- `strength` badge (HIGH = red/orange, MEDIUM = yellow, LOW = grey)

**`FlagsSection.tsx`** — No breaking changes; flag structure unchanged.

**`QualityChecks.tsx`** — No breaking changes; QC structure unchanged.

---

### 8. Update `src/api/server.ts`

No route changes required. The evaluation pipeline order is unchanged.

If you log or type-check the Claude response before Zod validation, update
any inline type assertions to use the new `EvaluationReport` type.

---

### 9. Supabase Schema

No schema changes required. `report_data` stores the full `EvaluateResponse`
as JSONB — the new fields will be stored automatically.

Existing saved reports will not have the new fields. When viewing old reports,
components should handle `undefined` gracefully with optional chaining:
```tsx
{report.entry_strategy?.suggested_position_size ?? "—"}
```

---

## Token Budget Note

The new system prompt is approximately 4,200 tokens.
Previous prompt was approximately 1,800 tokens.

The Claude response is richer (~400–600 tokens more per evaluation due to new fields).
The existing `max_tokens: 8000` cap is sufficient — no change needed.

Average evaluation time impact: +3–5 seconds (Claude reasoning depth increase).
This is acceptable for an evaluation that runs once per stock analysis session.

---

## Testing Checklist

After integration, run evaluations against at least three stocks:

- [ ] A high-quality compounder (e.g., PIDILITIND, TITAN) — expect BUY or BUY_WITH_CAUTION
- [ ] A cyclical at peak (e.g., a metal/steel stock at high margins) — expect moat = NO_MOAT_IDENTIFIED, growth_type = CYCLICAL_PEAK
- [ ] A governance-stressed company (high pledge, promoter selling) — expect governance = HIGH_RISK, likely AVOID

Verify for each:
- [ ] Zod validation passes without throwing
- [ ] Scenario probabilities sum to 100
- [ ] `iv_conservative` and `iv_optimistic` are numbers (not null) if PE data available
- [ ] `risk_reward_ratio` is present
- [ ] `entry_strategy` is fully populated
- [ ] All 17 QC checks present (some may be DATA_UNAVAILABLE)
- [ ] `conviction_improvers` has exactly 3 items
- [ ] `conviction_reducers` has exactly 3 items
- [ ] `thesis_breakers` has 3–5 items
- [ ] Verdict guard rails are respected (BUY only if all 9 conditions met)
