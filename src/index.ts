import { Command } from "commander";
import { evaluateCommand } from "./commands/evaluate.js";
import { profileCommand } from "./commands/profile.js";
import type { EvaluationInput } from "./types/profile.js";

const program = new Command();

program
  .name("quantsieve")
  .description("AI-powered stock evaluator for Indian retail investors")
  .version("1.0.0");

program
  .command("evaluate <ticker>")
  .description("Evaluate a stock using the 14-step framework")
  .option(
    "--context <context>",
    "Entry context: first_purchase | adding | hold_or_exit | comparing",
    "first_purchase"
  )
  .option("--thesis <thesis>", "Your investment thesis or reason for looking at this stock")
  .option("--json", "Output full JSON report to stdout instead of summary", false)
  .option("--output <path>", "Custom output path for the JSON report")
  .option("--no-html", "Skip generating the HTML report")
  .option("--open", "Auto-open the HTML report in your browser after evaluation", false)
  .action(async (ticker: string, options: {
    context: EvaluationInput["entry_context"];
    thesis?: string;
    json: boolean;
    output?: string;
    noHtml: boolean;
    open: boolean;
  }) => {
    await evaluateCommand(ticker, options);
  });

program
  .command("profile")
  .description("Create or update your investor profile")
  .option("--show", "Display your current saved profile", false)
  .action(async (options: { show: boolean }) => {
    await profileCommand(options);
  });

program.parse(process.argv);
