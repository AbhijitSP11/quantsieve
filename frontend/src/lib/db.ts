import { supabase } from "./supabase";
import type { InvestorProfile, EvaluateResponse } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  investor_profile: InvestorProfile | null;
  created_at: string;
  updated_at: string;
}

export interface SavedReport {
  id: string;
  user_id: string;
  ticker: string;
  company_name: string | null;
  sector: string | null;
  market_cap_category: string | null;
  verdict: string | null;
  verdict_color: string | null;
  verdict_summary: string | null;
  quality_score: { earned: number; total: number; percentage: number; label: string } | null;
  entry_context: string | null;
  thesis: string | null;
  investor_profile: InvestorProfile | null;
  report_data: EvaluateResponse;
  created_at: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no row found
    console.error("[DB] getProfile error:", error.message);
    return null;
  }
  return data as UserProfile;
}

export async function saveInvestorProfile(
  profile: InvestorProfile
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ investor_profile: profile, updated_at: new Date().toISOString() })
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

  if (error) console.error("[DB] saveInvestorProfile error:", error.message);
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function saveReport(
  result: EvaluateResponse,
  entryContext: string,
  thesis?: string
): Promise<SavedReport | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ev = result.evaluation;
  const verdictColor =
    ev.verdict === "BUY" ? "green"
    : ev.verdict === "BUY_WITH_CAUTION" || ev.verdict === "WAIT" ? "amber"
    : "red";
  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      ticker: result.stock.ticker,
      company_name: result.stock.company_name,
      sector: result.stock.sector,
      market_cap_category: result.stock.market_cap_category,
      verdict: ev.verdict,
      verdict_color: verdictColor,
      verdict_summary: ev.verdict_summary ?? null,
      quality_score: ev.quality_score,
      entry_context: entryContext,
      thesis: thesis ?? null,
      investor_profile: null,
      report_data: result,
    })
    .select()
    .single();

  if (error) {
    console.error("[DB] saveReport error:", error.message);
    return null;
  }
  return data as SavedReport;
}

export async function getReports(): Promise<SavedReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DB] getReports error:", error.message);
    return [];
  }
  return (data ?? []) as SavedReport[];
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) console.error("[DB] deleteReport error:", error.message);
}
