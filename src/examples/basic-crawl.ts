/**
 * Basic Example: Simple Web Crawl
 * Using functional approach - no classes
 */

import { executeCrawl } from "../crawler";

async function basicCrawlExample() {
  try {
    console.log("=== Basic Web Crawl Example ===\n");

    const result = await executeCrawl({
      url: "https://example.com",
      objective: "Extract the main heading and summarize the page content",
      maxIterations: 5,
    });

    console.log("\n=== Crawl Results ===");
    console.log(`Success: ${result.success}`);
    console.log(`URL: ${result.url}`);
    console.log(`Objective: ${result.objective}`);
    console.log(`Duration: ${result.duration_ms}ms`);
    console.log(`Steps Taken: ${result.steps_taken}`);
    console.log("\nFindings:");
    console.log(result.findings);

    if (result.error) {
      console.log(`\nError: ${result.error}`);
    }
  } catch (error) {
    console.error("Example failed:", error);
  }
}

// Run the example
basicCrawlExample();
