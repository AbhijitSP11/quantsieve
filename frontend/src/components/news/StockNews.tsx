import { useState, useEffect, useCallback } from "react";
import type { NewsItem, NewsResponse } from "../../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    result: "Result",
    board_meeting: "Board Meeting",
    corporate_action: "Corp Action",
    insider_trade: "Insider",
    announcement: "Announcement",
    article: "Article",
    other: "Other",
  };
  return map[cat] ?? cat;
}

function trustColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 50) return "bg-slate-100 text-slate-500";
  return "bg-slate-50 text-slate-400";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
          <div className="h-4 w-3/4 bg-slate-200 rounded" />
          <div className="h-3 w-1/2 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function PartialFailureBanner({ providers }: { providers: NewsResponse["providers"] }) {
  const failed = providers.filter((p) => p.status === "failed");
  if (failed.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <span>⚠</span>
      <span>
        Some sources unavailable ({failed.map((p) => p.name).join(", ")}) — showing partial results
      </span>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);
  const isOfficial = item.sourceType === "official_exchange";

  return (
    <div
      className={`bg-white border rounded-xl p-4 space-y-2 ${
        isOfficial
          ? "border-l-4 border-l-green-400 border-slate-200"
          : "border-slate-200"
      }`}
    >
      {/* Top row: badges + timestamp */}
      <div className="flex flex-wrap items-center gap-1.5">
        {isOfficial ? (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded">
            Official {item.exchange && `· ${item.exchange}`}
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
            News
          </span>
        )}
        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
          {categoryLabel(item.category)}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${trustColor(item.trustScore)}`}>
          {item.publisher}
        </span>
        <span className="text-[10px] text-slate-400">{relativeTime(item.publishedAt)}</span>
      </div>

      {/* Title */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-semibold text-slate-800 hover:text-blue-600 leading-snug"
      >
        {item.title}
      </a>

      {/* Summary */}
      {item.summary && (
        <div className="text-xs text-slate-500 leading-relaxed">
          <span className={expanded ? "" : "line-clamp-2"}>{item.summary}</span>
          {item.summary.length > 120 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="ml-1 text-blue-500 hover:underline font-medium"
            >
              {expanded ? "less" : "more"}
            </button>
          )}
        </div>
      )}

      {/* Attachment */}
      {item.attachmentUrl && (
        <a
          href={item.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
        >
          <span>📎</span> View attachment
        </a>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Filter = "all" | "official" | "media";

interface Props {
  symbol: string;
  companyName?: string;
  bseCode?: string;
}

export default function StockNews({ symbol, companyName, bseCode }: Props) {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (companyName) params.set("companyName", companyName);
      if (bseCode) params.set("bseCode", bseCode);
      const res = await fetch(
        `/api/stocks/${encodeURIComponent(symbol)}/news?${params.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as NewsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  }, [symbol, companyName, bseCode]);

  useEffect(() => { void load(); }, [load]);

  const filtered =
    data?.items.filter((item) => {
      if (filter === "official") return item.sourceType === "official_exchange";
      if (filter === "media") return item.sourceType === "media";
      return true;
    }) ?? [];

  const officialCount = data?.items.filter((i) => i.sourceType === "official_exchange").length ?? 0;
  const mediaCount = data?.items.filter((i) => i.sourceType === "media").length ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Latest News & Disclosures
        </span>
        {data && (
          <span className="text-xs text-slate-400">
            {data.items.length} items · updated {relativeTime(data.fetchedAt)}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Partial failure banner */}
        {data && <PartialFailureBanner providers={data.providers} />}

        {/* Filter tabs */}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="flex gap-1">
            {(
              [
                { key: "all" as Filter, label: `All (${data.items.length})` },
                { key: "official" as Filter, label: `Official (${officialCount})` },
                { key: "media" as Filter, label: `News (${mediaCount})` },
              ] as { key: Filter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                  filter === key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading && <Skeleton />}

        {!loading && error && (
          <div className="text-center py-6 space-y-2">
            <div className="text-sm text-red-600">{error}</div>
            <button
              onClick={() => void load()}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="text-center py-6 text-sm text-slate-400">
            No recent news found for {symbol}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && data && data.items.length > 0 && (
          <div className="text-center py-4 text-sm text-slate-400">
            No {filter} items found
          </div>
        )}
      </div>
    </div>
  );
}
