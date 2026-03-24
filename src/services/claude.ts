import Anthropic from "@anthropic-ai/sdk";
import type { StockData } from "../types/stock.js";
import type { EvaluationInput } from "../types/profile.js";
import type { EvaluationReport } from "../types/evaluation.js";
import { STOCK_EVALUATOR_PROMPT } from "../prompts/stockEvaluator.js";
import { evaluationReportSchema } from "../utils/validators.js";
import { env } from "../config/env.js";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export async function evaluateStock(
  stockData: StockData,
  input: EvaluationInput
): Promise<EvaluationReport> {
  const userContent = [
    `LIVE STOCK DATA:\n${JSON.stringify(stockData, null, 2)}`,
    `\nINVESTOR PROFILE:\n${JSON.stringify(input.profile, null, 2)}`,
    `\nENTRY CONTEXT: ${input.entry_context}`,
    input.thesis ? `\nINVESTOR THESIS: ${input.thesis}` : "",
    `\nRun the complete 14-step evaluation. Return ONLY valid JSON matching the EvaluationReport schema. No markdown, no explanation outside the JSON.`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: STOCK_EVALUATOR_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error(
      "Claude returned an unexpected response format. Please try again."
    );
  }

  const text = firstBlock.text;
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Claude returned invalid JSON. Raw response:\n${text.slice(0, 500)}`
    );
  }

  const result = evaluationReportSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Claude response failed schema validation:\n${result.error.message}`
    );
  }

  return result.data;
}
