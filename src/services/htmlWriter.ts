import fs from "fs/promises";
import path from "path";
import type { EvaluationReport } from "../types/evaluation.js";
import type { StockData } from "../types/stock.js";
import type { EvaluationInput } from "../types/profile.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(v: string | number | null | undefined, suffix = ""): string {
  if (v === null || v === undefined || v === "DATA_UNAVAILABLE") return '<span class="na">—</span>';
  return esc(v) + suffix;
}

function fmtCr(v: number | null | undefined): string {
  if (v === null || v === undefined) return '<span class="na">—</span>';
  return `₹${v.toLocaleString("en-IN")} Cr`;
}

function verdictClass(color: string): string {
  return color === "green" ? "verdict-buy" : color === "red" ? "verdict-avoid" : "verdict-wait";
}

function flagClass(type: string): string {
  return type === "green" ? "flag-green" : type === "red" ? "flag-red" : "flag-amber";
}

function resultClass(result: string): string {
  return result === "PASS" || result === "MATCH" ? "pass"
    : result === "FAIL" || result === "MISMATCH" ? "fail"
    : "conditional";
}

function resultIcon(result: string): string {
  return result === "PASS" || result === "MATCH" ? "✓"
    : result === "FAIL" || result === "MISMATCH" ? "✗"
    : "~";
}

function zoneClass(zone: string): string {
  return zone === "UNDERVALUED" ? "pass" : zone === "EXPENSIVE" ? "fail" : "conditional";
}

function cfClass(v: number): string {
  return v >= 0 ? "cf-positive" : "cf-negative";
}

function healthClass(h: string): string {
  return h === "STRONG" ? "pass" : h === "DISTRESSED" ? "fail" : "conditional";
}

// ─── CSS ────────────────────────────────────────────────────────────────────

function css(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #f5f6fa;
      --surface: #ffffff;
      --surface2: #eef0f8;
      --border: #dde1f0;
      --text: #1a1d2e;
      --muted: #6b7280;
      --green: #16a34a;
      --amber: #d97706;
      --red: #dc2626;
      --blue: #2563eb;
      --purple: #7c3aed;
    }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      line-height: 1.6;
      padding: 0;
    }

    /* ── Print button ──────────────────────────────────────────────── */
    #print-bar {
      position: fixed; top: 0; left: 0; right: 0;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 10px 24px;
      display: flex; align-items: center; justify-content: space-between;
      z-index: 100;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    #print-bar .logo { font-weight: 700; font-size: 14px; color: var(--blue); letter-spacing: 1px; }
    #print-bar .actions { display: flex; gap: 10px; }
    .btn {
      padding: 7px 18px; border-radius: 6px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .15s;
    }
    .btn:hover { opacity: .85; }
    .btn-pdf { background: var(--blue); color: #ffffff; }
    .btn-outline { background: transparent; color: var(--text); border: 1px solid var(--border); }

    /* ── Layout ────────────────────────────────────────────────────── */
    .page { max-width: 960px; margin: 0 auto; padding: 72px 24px 48px; }

    /* ── Cover ─────────────────────────────────────────────────────── */
    .cover {
      background: linear-gradient(135deg, #ffffff 0%, #eef2ff 100%);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 36px 40px;
      margin-bottom: 28px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: start;
    }
    .cover-ticker { font-size: 32px; font-weight: 800; color: var(--blue); letter-spacing: 1px; }
    .cover-name   { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
    .cover-meta   { color: var(--muted); font-size: 12px; }
    .cover-meta span { margin-right: 16px; }
    .cover-verdict {
      text-align: right;
      padding: 16px 24px;
      border-radius: 10px;
      min-width: 200px;
    }
    .verdict-buy   { background: #f0fdf4; border: 1.5px solid #86efac; }
    .verdict-wait  { background: #fffbeb; border: 1.5px solid #fcd34d; }
    .verdict-avoid { background: #fef2f2; border: 1.5px solid #fca5a5; }
    .verdict-label { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .verdict-buy   .verdict-label { color: var(--green); }
    .verdict-wait  .verdict-label { color: var(--amber); }
    .verdict-avoid .verdict-label { color: var(--red); }
    .verdict-sub   { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
    .confidence-bar {
      margin-top: 12px; font-size: 11px; color: var(--muted);
    }
    .bar-track {
      height: 4px; background: var(--border); border-radius: 99px; margin-top: 4px;
    }
    .bar-fill { height: 100%; border-radius: 99px; }
    .bar-high { background: var(--green); }
    .bar-moderate { background: var(--amber); }
    .bar-low { background: var(--red); }

    /* ── Snapshot grid ─────────────────────────────────────────────── */
    .snapshot-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 28px;
    }
    .snap-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 16px;
    }
    .snap-label { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin-bottom: 4px; }
    .snap-value { font-size: 18px; font-weight: 700; }
    .snap-sub   { font-size: 10px; color: var(--muted); margin-top: 2px; }

    /* ── Sections ──────────────────────────────────────────────────── */
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: var(--muted);
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
      display: flex; align-items: center; gap: 10px;
    }
    .section-title .badge {
      font-size: 11px; font-weight: 700; padding: 2px 8px;
      border-radius: 4px; letter-spacing: 0;
    }
    .badge.pass        { background: #dcfce7; color: var(--green); }
    .badge.fail        { background: #fee2e2; color: var(--red); }
    .badge.conditional { background: #fef3c7; color: var(--amber); }

    /* ── Flags ─────────────────────────────────────────────────────── */
    .flags { display: flex; flex-direction: column; gap: 8px; }
    .flag {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 14px; border-radius: 8px; border-left: 3px solid transparent;
    }
    .flag-green { background: #f0fdf4; border-color: #86efac; }
    .flag-amber { background: #fffbeb; border-color: #fcd34d; }
    .flag-red   { background: #fef2f2; border-color: #fca5a5; }
    .flag-dot   { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .flag-green .flag-dot { background: var(--green); }
    .flag-amber .flag-dot { background: var(--amber); }
    .flag-red   .flag-dot { background: var(--red);   }
    .flag-title { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
    .flag-desc  { font-size: 12px; color: var(--muted); }

    /* ── Tables ────────────────────────────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      text-align: right; padding: 6px 12px;
      font-size: 10px; text-transform: uppercase; letter-spacing: .5px;
      color: var(--muted); background: var(--surface2);
      border-bottom: 1px solid var(--border);
    }
    th:first-child { text-align: left; }
    td {
      text-align: right; padding: 7px 12px;
      border-bottom: 1px solid var(--border);
    }
    td:first-child { text-align: left; color: var(--muted); font-size: 11px; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8faff; }
    .na { color: var(--muted); }
    .cf-positive { color: var(--green); }
    .cf-negative { color: var(--red); }
    .table-wrap {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    /* ── Balance sheet inline ──────────────────────────────────────── */
    .bs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .bs-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
    }
    .bs-label { font-size: 10px; color: var(--muted); margin-bottom: 4px; }
    .bs-value { font-size: 15px; font-weight: 600; }

    /* ── Valuation zone ────────────────────────────────────────────── */
    .zone-pill {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 99px;
      font-size: 11px; font-weight: 700;
    }
    .zone-UNDERVALUED { background: #dcfce7; color: var(--green); }
    .zone-FAIR        { background: #dbeafe; color: var(--blue);  }
    .zone-OVERVALUED  { background: #fef3c7; color: var(--amber); }
    .zone-EXPENSIVE   { background: #fee2e2; color: var(--red);   }

    /* ── Quality checks ────────────────────────────────────────────── */
    .qc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .qc-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex; align-items: flex-start; gap: 10px;
    }
    .qc-icon {
      width: 22px; height: 22px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 1px;
    }
    .qc-icon.pass        { background: #dcfce7; color: var(--green); }
    .qc-icon.fail        { background: #fee2e2; color: var(--red);   }
    .qc-icon.conditional { background: #fef3c7; color: var(--amber); }
    .qc-name   { font-size: 12px; font-weight: 500; }
    .qc-detail { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .critical-tag {
      font-size: 9px; font-weight: 700; background: #fee2e2;
      color: var(--red); border-radius: 3px; padding: 1px 5px; margin-left: 5px;
      vertical-align: middle;
    }

    /* ── Compatibility ─────────────────────────────────────────────── */
    .compat-table td:nth-child(2) { text-align: center; }
    .pass-pill   { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #dcfce7; color: var(--green); }
    .fail-pill   { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #fee2e2; color: var(--red);   }
    .cond-pill   { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #fef3c7; color: var(--amber); }

    /* ── Verdict block ─────────────────────────────────────────────── */
    .verdict-block {
      border-radius: 12px;
      padding: 28px 32px;
      margin-bottom: 28px;
    }
    .verdict-summary { font-size: 14px; line-height: 1.7; margin-bottom: 20px; }
    .verdict-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
    .verdict-col-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
    .verdict-col-title.green { color: var(--green); }
    .verdict-col-title.amber { color: var(--amber); }
    ul.verdict-list { list-style: none; padding: 0; }
    ul.verdict-list li { padding: 5px 0; font-size: 12px; border-bottom: 1px solid var(--border); }
    ul.verdict-list li:last-child { border-bottom: none; }
    ul.verdict-list li::before { content: "•  "; color: var(--muted); }
    .verdict-triggers { margin-top: 16px; }
    .trigger-item {
      display: inline-block;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 99px;
      padding: 4px 12px;
      font-size: 11px;
      margin: 3px 4px 3px 0;
      color: var(--muted);
    }

    /* ── Benchmarks ────────────────────────────────────────────────── */
    .bench-row { display: flex; gap: 12px; }
    .bench-card {
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 16px;
    }
    .bench-label { font-size: 10px; color: var(--muted); margin-bottom: 4px; }
    .bench-value { font-size: 13px; font-weight: 600; color: var(--blue); }

    /* ── Data gaps ─────────────────────────────────────────────────── */
    .gap-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
    }
    .gap-item:last-child { border-bottom: none; }
    .gap-impact { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; white-space: nowrap; margin-top: 2px; }
    .gap-impact.material { background: #fee2e2; color: var(--red); }
    .gap-impact.minor    { background: #f3f4f6; color: var(--muted); }
    .gap-name { font-size: 12px; font-weight: 500; margin-bottom: 2px; }
    .gap-desc { font-size: 11px; color: var(--muted); }

    /* ── Footer ────────────────────────────────────────────────────── */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.8;
    }

    /* ── Print styles ──────────────────────────────────────────────── */
    @media print {
      body { font-size: 11px; }
      #print-bar { display: none !important; }
      .page { padding: 0; max-width: 100%; }
      .cover { break-inside: avoid; }
      .section { break-inside: avoid; }
      .qc-grid { grid-template-columns: 1fr 1fr; }
      a { color: var(--blue); text-decoration: none; }
    }
  `;
}

// ─── Sections ────────────────────────────────────────────────────────────────

function renderCover(report: EvaluationReport, stock: StockData, input: EvaluationInput): string {
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const vc = verdictClass(report.verdict.color);
  const confPct = Math.round((report.confidence.live_count / report.confidence.total) * 100);
  const barClass = report.confidence.level === "HIGH" ? "bar-high" : report.confidence.level === "LOW" ? "bar-low" : "bar-moderate";

  const verdictEmoji = report.verdict.color === "green" ? "🟢" : report.verdict.color === "red" ? "🔴" : "🟡";

  return `
  <div class="cover">
    <div>
      <div class="cover-ticker">${esc(stock.ticker)}</div>
      <div class="cover-name">${esc(stock.company_name)}</div>
      <div class="cover-meta">
        <span>${esc(report.overview["sector"] as string ?? stock.sector)}</span>
        <span>${esc(stock.market_cap_category ?? "")} Cap</span>
        <span>₹${esc(stock.current_price)} &nbsp;·&nbsp; P/E ${esc(stock.pe_ratio)}×</span>
        <span>Generated ${date}</span>
      </div>
      <div class="cover-meta" style="margin-top:8px">
        <span>Context: ${esc(input.entry_context.replace(/_/g, " "))}</span>
        ${input.thesis ? `<span>Thesis: ${esc(input.thesis)}</span>` : ""}
      </div>
    </div>
    <div class="cover-verdict ${vc}">
      <div class="verdict-sub">Verdict</div>
      <div class="verdict-label">${verdictEmoji} ${esc(report.verdict.label.replace(/_/g, " "))}</div>
      <div class="confidence-bar">
        <div>Confidence: ${esc(report.confidence.level)} &nbsp;(${report.confidence.live_count}/${report.confidence.total} metrics)</div>
        <div class="bar-track"><div class="bar-fill ${barClass}" style="width:${confPct}%"></div></div>
      </div>
    </div>
  </div>`;
}

function renderSnapshot(stock: StockData, report: EvaluationReport): string {
  const cards = [
    { label: "Market Cap", value: fmtCr(stock.market_cap), sub: `${stock.market_cap_category ?? ""} Cap` },
    { label: "Current Price", value: `₹${fmt(stock.current_price)}`, sub: `52W: ₹${fmt(stock.high_52w)} / ₹${fmt(stock.low_52w)}` },
    { label: "P/E Ratio", value: fmt(stock.pe_ratio, "×"), sub: `Book Value ₹${fmt(stock.book_value)}` },
    { label: "ROE", value: fmt(stock.roe, "%"), sub: `ROCE ${stock.roce.length ? stock.roce[stock.roce.length - 1] + "%" : "—"}` },
    { label: "Interest Cover", value: fmt(stock.interest_coverage, "×"), sub: `Reserves ${fmtCr(stock.reserves)}` },
    { label: "Div Yield", value: fmt(stock.dividend_yield, "%"), sub: `Face Value ₹${fmt(stock.face_value)}` },
    { label: "Promoter Hold", value: fmt(stock.promoter_holding, "%"), sub: `FII ${fmt(stock.fii_holding, "%")} · DII ${fmt(stock.dii_holding, "%")}` },
    { label: "Health", value: `<span class="${healthClass(report.financials.health_verdict)}">${esc(report.financials.health_verdict)}</span>`, sub: `Quality: ${report.quality_score.earned}/${report.quality_score.total} (${report.quality_score.percentage.toFixed(0)}%)` },
  ];

  return `
  <div class="snapshot-grid">
    ${cards.map(c => `
      <div class="snap-card">
        <div class="snap-label">${esc(c.label)}</div>
        <div class="snap-value">${c.value}</div>
        <div class="snap-sub">${c.sub}</div>
      </div>`).join("")}
  </div>`;
}

function renderFlags(report: EvaluationReport): string {
  return `
  <div class="section">
    <div class="section-title">Signals &amp; Flags</div>
    <div class="flags">
      ${report.flags.map(f => `
        <div class="flag ${flagClass(f.type)}">
          <div class="flag-dot"></div>
          <div>
            <div class="flag-title">${esc(f.title)}</div>
            <div class="flag-desc">${esc(f.description)}</div>
          </div>
        </div>`).join("")}
    </div>
  </div>`;
}

function renderFinancials(report: EvaluationReport): string {
  const prof = report.financials.profitability;
  const profKeys = Object.keys(prof);
  const firstKey = profKeys[0];
  const headerRow = firstKey !== undefined ? (prof[firstKey] ?? []) : [];

  const tableRows = profKeys.map(key => {
    const vals = prof[key] ?? [];
    return `<tr>
      <td>${esc(key)}</td>
      ${vals.slice(1).map(v => `<td>${v === "DATA_UNAVAILABLE" ? '<span class="na">—</span>' : esc(v)}</td>`).join("")}
    </tr>`;
  }).join("");

  const bs = report.financials.balance_sheet;
  const bsCards = [
    { label: "Debt / Equity", value: fmt(bs["Debt/Equity"]) },
    { label: "Interest Coverage", value: fmt(bs["Interest Coverage"], "×") },
    { label: "Current Ratio", value: fmt(bs["Current Ratio"]) },
    { label: "Total Assets", value: typeof bs["Total Assets"] === "number" ? fmtCr(bs["Total Assets"] as number) : "—" },
    { label: "Borrowings", value: typeof bs["Borrowings"] === "number" ? fmtCr(bs["Borrowings"] as number) : '<span class="na">—</span>' },
    { label: "Reserves", value: typeof bs["Reserves"] === "number" ? fmtCr(bs["Reserves"] as number) : "—" },
  ];

  const cfRows = report.financials.cash_flow.map(cf => `
    <tr>
      <td>${esc(cf.year)}</td>
      <td class="${cfClass(cf.operating)}">${cf.operating.toLocaleString("en-IN")}</td>
      <td class="${cfClass(cf.investing)}">${cf.investing.toLocaleString("en-IN")}</td>
      <td class="${cfClass(cf.financing)}">${cf.financing.toLocaleString("en-IN")}</td>
    </tr>`).join("");

  const healthBadgeClass = healthClass(report.financials.health_verdict);

  return `
  <div class="section">
    <div class="section-title">
      Financial Health
      <span class="badge ${healthBadgeClass}">${esc(report.financials.health_verdict)}</span>
    </div>

    <div class="table-wrap" style="margin-bottom:16px">
      <table>
        <thead><tr>
          <th>Metric</th>
          ${headerRow.slice(1).map(h => `<th>${esc(h)}</th>`).join("")}
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <div class="bs-grid" style="margin-bottom:16px">
      ${bsCards.map(c => `
        <div class="bs-card">
          <div class="bs-label">${esc(c.label)}</div>
          <div class="bs-value">${c.value}</div>
        </div>`).join("")}
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Cash Flow (₹Cr)</th><th>Operating</th><th>Investing</th><th>Financing</th></tr></thead>
        <tbody>${cfRows}</tbody>
      </table>
    </div>
  </div>`;
}

function renderValuation(report: EvaluationReport, stock: StockData): string {
  const { zone, metrics, peers, margin_of_safety } = report.valuation;

  const metricRows = metrics.map(m => `
    <tr>
      <td>${esc(m.metric)}</td>
      <td>${m.current === "DATA_UNAVAILABLE" ? '<span class="na">—</span>' : esc(m.current)}</td>
      <td>${m.median_5y === "DATA_UNAVAILABLE" ? '<span class="na">—</span>' : esc(m.median_5y)}</td>
      <td>${m.sector_median === "DATA_UNAVAILABLE" ? '<span class="na">—</span>' : esc(m.sector_median)}</td>
      <td>${m.assessment === "DATA_UNAVAILABLE" ? '<span class="na">—</span>' : `<span class="badge ${m.assessment === "CHEAP" ? "pass" : m.assessment === "EXPENSIVE" ? "fail" : "conditional"}">${esc(m.assessment)}</span>`}</td>
    </tr>`).join("");

  const peerRows = [
    `<tr>
      <td><strong>${esc(stock.company_name)}</strong></td>
      <td>${fmt(stock.pe_ratio, "×")}</td>
      <td>${fmt(stock.pb_ratio, "×")}</td>
      <td>${fmt(stock.roe, "%")}</td>
    </tr>`,
    ...peers.map(p => `
    <tr>
      <td>${esc(p.name)}</td>
      <td>${esc(p.pe)}</td>
      <td>${esc(p.pb)}</td>
      <td>${esc(p.roe)}</td>
    </tr>`)
  ].join("");

  return `
  <div class="section">
    <div class="section-title">
      Valuation
      <span class="zone-pill zone-${esc(zone)}">${esc(zone)}</span>
    </div>

    <div class="table-wrap" style="margin-bottom:16px">
      <table>
        <thead><tr><th>Metric</th><th>Current</th><th>5Y Median</th><th>Sector Median</th><th>Assessment</th></tr></thead>
        <tbody>${metricRows}</tbody>
      </table>
    </div>

    <div class="table-wrap" style="margin-bottom:16px">
      <table class="compat-table">
        <thead><tr><th>Peer</th><th>P/E</th><th>P/B</th><th>ROE</th></tr></thead>
        <tbody>${peerRows}</tbody>
      </table>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:12px;color:var(--muted)">
      📐 ${esc(margin_of_safety)}
    </div>
  </div>`;
}

function renderQualityChecks(report: EvaluationReport): string {
  const { earned, total, percentage, label } = report.quality_score;
  const scoreClass = label === "GOOD" ? "pass" : label === "BAD" ? "fail" : "conditional";

  const cards = report.quality_checks.map(qc => `
    <div class="qc-card">
      <div class="qc-icon ${resultClass(qc.result)}">${resultIcon(qc.result)}</div>
      <div>
        <div class="qc-name">
          ${esc(qc.name)}
          ${qc.critical ? '<span class="critical-tag">CRITICAL</span>' : ""}
        </div>
        ${qc.result !== "PASS" ? `<div class="qc-detail">${esc(qc.detail)}</div>` : ""}
      </div>
    </div>`).join("");

  return `
  <div class="section">
    <div class="section-title">
      Quality Checks
      <span class="badge ${scoreClass}">${earned}/${total} &nbsp;(${percentage.toFixed(0)}%) &nbsp;${esc(label)}</span>
    </div>
    <div class="qc-grid">${cards}</div>
  </div>`;
}

function renderCompatibility(report: EvaluationReport): string {
  const overallClass = report.compatibility_overall === "STRONG" ? "pass" : report.compatibility_overall === "POOR" ? "fail" : "conditional";

  const pillClass = (r: string) => r === "MATCH" ? "pass-pill" : r === "MISMATCH" ? "fail-pill" : "cond-pill";

  const rows = report.compatibility.map(c => `
    <tr>
      <td>${esc(c.code)}</td>
      <td>${esc(c.name)}</td>
      <td><span class="${pillClass(c.result)}">${esc(c.result)}</span></td>
      <td style="text-align:left">${esc(c.reason)}</td>
    </tr>`).join("");

  return `
  <div class="section">
    <div class="section-title">
      Investor Compatibility
      <span class="badge ${overallClass}">${esc(report.compatibility_overall)}</span>
    </div>
    <div class="table-wrap">
      <table class="compat-table">
        <thead><tr><th style="width:40px">Code</th><th>Check</th><th style="width:100px">Result</th><th style="text-align:left">Reason</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function renderVerdict(report: EvaluationReport): string {
  const vc = verdictClass(report.verdict.color);
  const emoji = report.verdict.color === "green" ? "🟢" : report.verdict.color === "red" ? "🔴" : "🟡";

  return `
  <div class="verdict-block ${vc}">
    <div style="font-size:22px;font-weight:800;margin-bottom:12px">${emoji} ${esc(report.verdict.label.replace(/_/g, " "))}</div>
    <div class="verdict-summary">${esc(report.verdict.summary)}</div>

    <div class="verdict-cols">
      <div>
        <div class="verdict-col-title green">✅ What works</div>
        <ul class="verdict-list">
          ${report.verdict.what_works.map(p => `<li>${esc(p)}</li>`).join("")}
        </ul>
      </div>
      <div>
        <div class="verdict-col-title amber">⚠️ What to watch</div>
        <ul class="verdict-list">
          ${report.verdict.what_to_watch.map(p => `<li>${esc(p)}</li>`).join("")}
        </ul>
      </div>
    </div>

    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
      📊 ${esc(report.verdict.index_comparison)}
    </div>

    <div class="verdict-triggers">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">🔔 Review Triggers</div>
      ${report.verdict.review_triggers.map(t => `<span class="trigger-item">${esc(t)}</span>`).join("")}
    </div>
  </div>`;
}

function renderBenchmarks(report: EvaluationReport): string {
  return `
  <div class="section">
    <div class="section-title">Benchmark Alternatives</div>
    <div class="bench-row">
      <div class="bench-card"><div class="bench-label">Sector Index</div><div class="bench-value">${esc(report.benchmarks.sector_index)}</div></div>
      <div class="bench-card"><div class="bench-label">Broad Index</div><div class="bench-value">${esc(report.benchmarks.broad_index)}</div></div>
      <div class="bench-card"><div class="bench-label">Passive Alternative</div><div class="bench-value">${esc(report.benchmarks.index_fund)}</div></div>
    </div>
  </div>`;
}

function renderDataGaps(report: EvaluationReport): string {
  if (report.data_gaps.length === 0) return "";
  const material = report.data_gaps.filter(g => g.impact === "MATERIAL").length;

  const items = report.data_gaps.map(g => `
    <div class="gap-item">
      <div class="gap-impact ${g.impact.toLowerCase()}">${esc(g.impact)}</div>
      <div>
        <div class="gap-name">${esc(g.metric)}</div>
        <div class="gap-desc">${esc(g.explanation)}</div>
      </div>
    </div>`).join("");

  return `
  <div class="section">
    <div class="section-title">
      Data Gaps
      <span class="badge fail">${material} material</span>
    </div>
    <div class="table-wrap">${items}</div>
    <div style="margin-top:8px;font-size:11px;color:var(--muted)">
      🔗 <a href="${esc(report.data_gaps[0]?.check_url ?? "")}" target="_blank">${esc(report.data_gaps[0]?.check_url ?? "")}</a>
    </div>
  </div>`;
}

function renderFooter(stock: StockData): string {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  return `
  <div class="footer">
    <div>Generated by <strong>QuantSieve</strong> · ${esc(stock.ticker)} · ${now} IST</div>
    <div style="margin-top:4px">Data sourced from <a href="https://www.screener.in/company/${esc(stock.ticker)}/" style="color:var(--blue)">Screener.in</a> · AI analysis via Claude (Anthropic)</div>
    <div style="margin-top:4px;font-size:10px">This report is for informational purposes only and does not constitute investment advice. Please do your own research.</div>
  </div>`;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

function buildHtml(
  report: EvaluationReport,
  stock: StockData,
  input: EvaluationInput
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuantSieve — ${esc(stock.ticker)} Evaluation</title>
  <style>${css()}</style>
</head>
<body>

<!-- Print / Download bar -->
<div id="print-bar">
  <div class="logo">⚡ QUANTSIEVE</div>
  <div class="actions">
    <button class="btn btn-outline" onclick="window.close()">Close</button>
    <button class="btn btn-pdf" onclick="window.print()">⬇ Download PDF</button>
  </div>
</div>

<div class="page">
  ${renderCover(report, stock, input)}
  ${renderSnapshot(stock, report)}
  ${renderFlags(report)}
  ${renderFinancials(report)}
  ${renderValuation(report, stock)}
  ${renderQualityChecks(report)}
  ${renderCompatibility(report)}
  ${renderVerdict(report)}
  ${renderBenchmarks(report)}
  ${renderDataGaps(report)}
  ${renderFooter(stock)}
</div>

</body>
</html>`;
}

// ─── Writer ──────────────────────────────────────────────────────────────────

const REPORTS_DIR = path.join(process.cwd(), "reports");

export async function saveHtmlReport(
  stock: StockData,
  input: EvaluationInput,
  evaluation: EvaluationReport,
  outputPath?: string
): Promise<string> {
  const date = new Date().toISOString().split("T")[0] ?? new Date().toISOString().slice(0, 10);
  const fileName = `${stock.ticker}_${date}.html`;
  const filePath = outputPath ?? path.join(REPORTS_DIR, fileName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buildHtml(evaluation, stock, input), "utf-8");

  return filePath;
}
