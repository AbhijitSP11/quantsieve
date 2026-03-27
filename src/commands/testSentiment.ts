// Test sentiment service in isolation
// Usage: npx tsx src/commands/testSentiment.ts NATCOPHARM

import { analyzeNewsSentiment } from "../services/newsSentimentService.js";
import { fetchAllNews } from "../services/news/newsAggregator.js";

async function testSentiment() {
  const ticker = process.argv[2]?.toUpperCase();
  
  if (!ticker) {
    console.error("❌ Usage: npx tsx src/commands/testSentiment.ts <TICKER>");
    console.error("Example: npx tsx src/commands/testSentiment.ts NATCOPHARM");
    process.exit(1);
  }

  console.log(`\n🔍 Testing sentiment service for: ${ticker}\n`);

  try {
    // 1. Fetch news
    console.log(`📰 Fetching news for ${ticker}...`);
    const news = await fetchAllNews(ticker, undefined, undefined).catch(() => null);

    if (!news || !news.items || news.items.length === 0) {
      console.warn(`⚠️  No news found for ${ticker}`);
      console.log("\nTesting with MOCK sentiment instead...\n");

      // Use mock directly for testing
      const { generateMockSentiment } = await import("../services/newsSentimentService.mock.js");
      const mockSentiment = generateMockSentiment(`${ticker} Ltd`, ticker);
      console.log("✅ Mock Sentiment Result:");
      console.log(JSON.stringify(mockSentiment, null, 2));
      return;
    }

    console.log(`✅ Found ${news.items.length} news items\n`);

    // 2. Analyze sentiment
    console.log(`🧠 Analyzing sentiment...`);
    const sentiment = await analyzeNewsSentiment(
      news.items,
      `${ticker} Ltd`,
      ticker,
      "General"
    );

    if (!sentiment) {
      console.error("❌ Sentiment analysis returned null");
      process.exit(1);
    }

    // 3. Pretty print result
    console.log("\n✅ Sentiment Analysis Result:\n");
    console.log(JSON.stringify(sentiment, null, 2));

    console.log("\n📊 Summary:");
    console.log(`  Overall Score: ${sentiment.overall.score}`);
    console.log(`  Confidence: ${sentiment.overall.confidence}`);
    console.log(`  Recommendation: ${sentiment.institutional_action.recommendation}`);
    console.log(`  Items Analyzed: ${sentiment.meta.items_analyzed}`);
    console.log(`  Official Count: ${sentiment.meta.official_count}`);
    console.log(`  Media Count: ${sentiment.meta.media_count}`);

  } catch (err) {
    console.error("❌ Test failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

testSentiment();
