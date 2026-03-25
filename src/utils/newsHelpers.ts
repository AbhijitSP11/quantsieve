import type { Category, NewsItem, SourceType } from "../services/news/types.js";

// ─── Scoring ──────────────────────────────────────────────────────────────────

function recencyScore(publishedAt: string): number {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours <= 24) return 100;
  if (ageHours <= 24 * 7) return 80;
  if (ageHours <= 24 * 30) return 50;
  return 20;
}

export function computeFinalScore(item: NewsItem): number {
  const sourceTypeBonus = item.sourceType === "official_exchange" ? 100 : 40;
  const rec = recencyScore(item.publishedAt);
  return (
    item.trustScore * 0.3 +
    item.relevanceScore * 0.3 +
    rec * 0.25 +
    sourceTypeBonus * 0.15
  );
}

// ─── Trust & Relevance ────────────────────────────────────────────────────────

const HIGH_TRUST_PUBLISHERS = new Set([
  "moneycontrol", "economic times", "economictimes", "livemint",
  "business standard", "businessstandard", "mint", "the hindu businessline",
  "financial express", "reuters", "bloomberg", "ndtv profit",
]);

export function getTrustScore(publisher: string, sourceType: SourceType): number {
  if (sourceType === "official_exchange") return 95;
  const lower = publisher.toLowerCase();
  for (const name of HIGH_TRUST_PUBLISHERS) {
    if (lower.includes(name)) return 75;
  }
  return 50;
}

export function getRelevanceScore(
  title: string,
  summary: string | null,
  symbol: string,
  companyName: string
): number {
  const haystack = `${title} ${summary ?? ""}`.toLowerCase();
  const sym = symbol.toLowerCase();
  const co = companyName.toLowerCase().split(" ")[0] ?? ""; // first word
  if (haystack.includes(sym) || (co.length > 0 && haystack.includes(co))) return 90;
  return 60;
}

// ─── Categorisation ───────────────────────────────────────────────────────────

export function categorizeAnnouncement(title: string): Category {
  const t = title.toLowerCase();
  if (/financial results?|quarterly results?|annual results?|q[1-4]\s*(fy|result)/i.test(t))
    return "result";
  if (/board meeting|board of directors/i.test(t)) return "board_meeting";
  if (/sast|insider trading?|acquisition of shares|promoter buying|promoter selling/i.test(t))
    return "insider_trade";
  if (/corporate action|dividend|bonus|split|rights issue|buyback/i.test(t))
    return "corporate_action";
  if (/outcome|intimation|disclosure|regulation 30|reg 30|postal ballot|agm|egm/i.test(t))
    return "announcement";
  return "announcement";
}

// ─── Deduplication ────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "its", "it", "as", "this", "that",
]);

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

function wordOverlap(a: string, b: string): number {
  const wa = titleWords(a);
  const wb = titleWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) { if (wb.has(w)) common++; }
  return common / Math.max(wa.size, wb.size);
}

export function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const kept: NewsItem[] = [];
  for (const item of items) {
    const duplicate = kept.find((k) => wordOverlap(k.title, item.title) > 0.8);
    if (duplicate) {
      // Replace with higher-trust version
      if (item.trustScore > duplicate.trustScore) {
        kept.splice(kept.indexOf(duplicate), 1, item);
      }
    } else {
      kept.push(item);
    }
  }
  return kept;
}
