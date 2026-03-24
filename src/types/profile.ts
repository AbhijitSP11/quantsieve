export interface InvestorProfile {
  age: number;
  investment_goal:
    | "retirement"
    | "education"
    | "wealth_creation"
    | "home_purchase"
    | "short_term"
    | "other";
  investment_horizon: string;
  investment_mode: "lump_sum" | "staggered" | "adding";
  portfolio_type:
    | "diversified_10plus"
    | "concentrated_3to5"
    | "mostly_mf"
    | "first_investment";
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
