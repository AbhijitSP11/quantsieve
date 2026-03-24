const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface ScraperResult {
  html: string;
  url: string;
}

export async function fetchScreenerPage(ticker: string): Promise<ScraperResult> {
  const url = `https://www.screener.in/company/${ticker.toUpperCase()}/consolidated/`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    },
  });

  if (response.status === 404) {
    throw new Error(
      `Ticker "${ticker}" not found on Screener.in. Check the ticker symbol and try again.`
    );
  }

  if (response.status === 429) {
    throw new Error(
      "Screener.in rate limit hit. Please wait a minute and try again."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch data from Screener.in (HTTP ${response.status}). Check your internet connection and try again.`
    );
  }

  const html = await response.text();

  // Screener redirects standalone companies to /consolidated/ — if the page
  // has no consolidated data it falls back to standalone. Detect this.
  if (html.includes("Page not found") || html.includes("No company found")) {
    throw new Error(
      `Ticker "${ticker}" not found on Screener.in. Check the ticker symbol and try again.`
    );
  }

  return { html, url };
}
