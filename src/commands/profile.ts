import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import type { InvestorProfile } from "../types/profile.js";

const PROFILES_DIR = path.join(process.cwd(), "profiles");
const PROFILE_PATH = path.join(PROFILES_DIR, "default.json");

export async function profileCommand(options: { show: boolean }): Promise<void> {
  if (options.show) {
    await showProfile();
    return;
  }
  await createProfile();
}

async function showProfile(): Promise<void> {
  let profile: InvestorProfile;
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    profile = JSON.parse(raw) as InvestorProfile;
  } catch {
    console.log(chalk.yellow("No profile found. Run `quantsieve profile` to create one."));
    return;
  }

  console.log("\n" + chalk.bold.cyan("Your Investor Profile"));
  console.log(chalk.gray("─".repeat(40)));
  console.log(chalk.white(`  Age:                 ${profile.age}`));
  console.log(chalk.white(`  Goal:                ${profile.investment_goal}`));
  console.log(chalk.white(`  Horizon:             ${profile.investment_horizon}`));
  console.log(chalk.white(`  Mode:                ${profile.investment_mode}`));
  console.log(chalk.white(`  Portfolio type:      ${profile.portfolio_type}`));
  console.log(chalk.white(`  Position sizing:     ${profile.position_sizing}`));
  console.log(chalk.white(`  Risk tolerance:      ${profile.risk_tolerance}`));
  console.log(chalk.white(`  Volatility pref:     ${profile.volatility_preference}`));
  console.log(chalk.white(`  Tax bracket:         ${profile.tax_bracket}`));
  console.log(chalk.gray("─".repeat(40)) + "\n");
}

async function createProfile(): Promise<void> {
  console.log("\n" + chalk.bold.cyan("QuantSieve — Investor Profile Setup"));
  console.log(chalk.gray("Answer a few questions to personalise your evaluations.\n"));

  const answers = await inquirer.prompt([
    {
      type: "number",
      name: "age",
      message: "Q1. What is your age?",
      validate: (v: number) => (v > 0 && v < 120 ? true : "Enter a valid age."),
    },
    {
      type: "list",
      name: "investment_goal",
      message: "Q2. What is your primary investment goal?",
      choices: [
        { name: "Retirement corpus", value: "retirement" },
        { name: "Child's education", value: "education" },
        { name: "Wealth creation", value: "wealth_creation" },
        { name: "Home purchase", value: "home_purchase" },
        { name: "Short-term goal (< 3 years)", value: "short_term" },
        { name: "Other", value: "other" },
      ],
    },
    {
      type: "list",
      name: "investment_horizon",
      message: "Q3. What is your investment horizon for this stock?",
      choices: [
        { name: "Less than 1 year", value: "< 1 year" },
        { name: "1–3 years", value: "1-3 years" },
        { name: "3–5 years", value: "3-5 years" },
        { name: "5–7 years", value: "5-7 years" },
        { name: "7+ years", value: "7+ years" },
      ],
    },
    {
      type: "list",
      name: "investment_mode",
      message: "Q4. How are you investing?",
      choices: [
        { name: "Lump sum (one-time)", value: "lump_sum" },
        { name: "Staggered over time (SIP-style)", value: "staggered" },
        { name: "Adding to an existing position", value: "adding" },
      ],
    },
    {
      type: "list",
      name: "portfolio_type",
      message: "Q5. How would you describe your overall stock portfolio?",
      choices: [
        { name: "Diversified (10+ stocks)", value: "diversified_10plus" },
        { name: "Concentrated (3–5 stocks)", value: "concentrated_3to5" },
        { name: "Mostly mutual funds, few direct stocks", value: "mostly_mf" },
        { name: "This is my first direct stock investment", value: "first_investment" },
      ],
    },
    {
      type: "list",
      name: "position_sizing",
      message: "Q6. What % of your portfolio will this stock be?",
      choices: [
        { name: "Under 5%", value: "under_5" },
        { name: "5–10%", value: "5_to_10" },
        { name: "10–20%", value: "10_to_20" },
        { name: "Over 20%", value: "over_20" },
      ],
    },
    {
      type: "list",
      name: "risk_tolerance",
      message: "Q7. What is your risk tolerance?",
      choices: [
        { name: "Low — I prefer capital preservation", value: "low" },
        { name: "Medium — I can handle moderate drawdowns", value: "medium" },
        { name: "High — I'm comfortable with large swings for higher returns", value: "high" },
      ],
    },
    {
      type: "list",
      name: "volatility_preference",
      message: "Q8. How do you handle short-term price volatility?",
      choices: [
        { name: "Low — sharp drops make me anxious", value: "low" },
        { name: "Medium — I can hold through 20–30% corrections", value: "medium" },
        { name: "High — I stay calm through 40%+ drawdowns", value: "high" },
      ],
    },
    {
      type: "list",
      name: "tax_bracket",
      message: "Q9. What income tax bracket are you in?",
      choices: [
        { name: "30%", value: "30pct" },
        { name: "20%", value: "20pct" },
        { name: "5–10%", value: "5to10pct" },
        { name: "Not sure", value: "not_sure" },
      ],
    },
  ]);

  const profile: InvestorProfile = {
    age: answers.age as number,
    investment_goal: answers.investment_goal as InvestorProfile["investment_goal"],
    investment_horizon: answers.investment_horizon as string,
    investment_mode: answers.investment_mode as InvestorProfile["investment_mode"],
    portfolio_type: answers.portfolio_type as InvestorProfile["portfolio_type"],
    position_sizing: answers.position_sizing as InvestorProfile["position_sizing"],
    risk_tolerance: answers.risk_tolerance as InvestorProfile["risk_tolerance"],
    volatility_preference: answers.volatility_preference as InvestorProfile["volatility_preference"],
    tax_bracket: answers.tax_bracket as InvestorProfile["tax_bracket"],
  };

  await fs.mkdir(PROFILES_DIR, { recursive: true });
  await fs.writeFile(PROFILE_PATH, JSON.stringify(profile, null, 2), "utf-8");

  console.log("\n" + chalk.green("✓ Profile saved to profiles/default.json"));
  console.log(chalk.gray("Run `quantsieve evaluate <TICKER>` to start an evaluation.\n"));
}

export async function loadProfile(): Promise<InvestorProfile> {
  try {
    const raw = await fs.readFile(PROFILE_PATH, "utf-8");
    return JSON.parse(raw) as InvestorProfile;
  } catch {
    throw new Error(
      "No investor profile found.\n" +
        "Run `quantsieve profile` first to create your profile."
    );
  }
}
