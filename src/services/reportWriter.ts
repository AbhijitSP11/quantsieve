import fs from "fs/promises";
import path from "path";
import type { EvaluationReport } from "../types/evaluation.js";
import type { StockData } from "../types/stock.js";
import type { EvaluationInput } from "../types/profile.js";

const REPORTS_DIR = path.join(process.cwd(), "reports");

export interface FullReport {
  generated_at: string;
  input: EvaluationInput;
  stock_data: StockData;
  evaluation: EvaluationReport;
}

export async function saveReport(
  stock: StockData,
  input: EvaluationInput,
  evaluation: EvaluationReport,
  outputPath?: string
): Promise<string> {
  const date = new Date().toISOString().split("T")[0] ?? new Date().toISOString().slice(0, 10);
  const fileName = `${stock.ticker}_${date}.json`;

  const filePath = outputPath ?? path.join(REPORTS_DIR, fileName);

  const report: FullReport = {
    generated_at: new Date().toISOString(),
    input,
    stock_data: stock,
    evaluation,
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf-8");

  return filePath;
}
