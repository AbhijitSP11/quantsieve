export type SourceType = "official_exchange" | "media";
export type Exchange = "NSE" | "BSE" | null;
export type Category =
  | "announcement"
  | "result"
  | "corporate_action"
  | "board_meeting"
  | "insider_trade"
  | "article"
  | "other";

export interface NewsItem {
  id: string;
  sourceType: SourceType;
  exchange: Exchange;
  publisher: string;
  title: string;
  summary: string | null;
  publishedAt: string; // ISO date
  url: string;
  attachmentUrl: string | null;
  category: Category;
  trustScore: number;    // 0-100
  relevanceScore: number; // 0-100
  finalScore: number;    // computed from trust + relevance + recency + sourceType
  raw?: unknown;         // original response for debugging
}

export interface NewsResponse {
  symbol: string;
  companyName: string | null;
  fetchedAt: string;
  providers: {
    name: string;
    status: "success" | "failed" | "skipped";
    itemCount: number;
    latencyMs: number;
    error?: string;
  }[];
  items: NewsItem[];
}

export interface ProviderResult {
  providerName: string;
  items: NewsItem[];
  latencyMs: number;
  error?: string;
}
