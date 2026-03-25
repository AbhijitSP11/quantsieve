import type { EvaluateRequest, EvaluateResponse } from "./types";

export async function evaluate(req: EvaluateRequest): Promise<EvaluateResponse> {
  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<EvaluateResponse>;
}
