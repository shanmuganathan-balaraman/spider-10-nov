/**
 * Advanced Example: Multi-Page Crawling and Analysis
 * This example demonstrates crawling multiple pages and aggregating data using functional API.
 */

import * as browser from "../browser/browser-manager";
import * as agent from "../agent/web-crawler-agent";
import { createLogger } from "../utils/logger";

const logger = createLogger("AdvancedMultiPageExample");

interface PageAnalysis {
  url: string;
  title: string;
  content_summary: string;
  key_elements: string[];
}

async function advancedMultiPageExample() {
  const results: PageAnalysis[] = [];

  try {
    console.log("=== Advanced Multi-Page Crawling Example ===\n");

    await browser.initializeBrowser();
    await agent.initializeAgent();

    // Define pages to crawl
    const pagesToCrawl = [
      {
        url: "https://www.wikipedia.org/",
        objective: "Analyze the homepage structure and main sections",
      },
      {
        url: "https://www.wikipedia.org/wiki/Artificial_intelligence",
        objective: "Extract key information about artificial intelligence and main topics",
      },
    ];

    // Crawl each page
    for (const page of pagesToCrawl) {
      logger.info(`Crawling: ${page.url}`);

      const result = await agent.crawl({
        url: page.url,
        objective: page.objective,
        maxIterations: 8,
        pageId: `page_${results.length + 1}`,
      });

      if (result.success) {
        // Extract relevant information
        const analysis: PageAnalysis = {
          url: page.url,
          title: page.url.split("/").pop() || "Unknown",
          content_summary: result.findings.substring(0, 500), // First 500 chars
          key_elements: extractKeyPoints(result.findings),
        };

        results.push(analysis);
        console.log(`✓ Successfully crawled: ${page.url}`);
      } else {
        console.log(`✗ Failed to crawl: ${page.url}`);
        console.log(`  Error: ${result.error}`);
      }

      // Add delay between crawls to be respectful
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Aggregate and report findings
    console.log("\n=== Aggregated Findings ===\n");

    for (const analysis of results) {
      console.log(`URL: ${analysis.url}`);
      console.log(`Summary: ${analysis.content_summary}...`);
      console.log(`Key Elements: ${analysis.key_elements.join(", ")}`);
      console.log("---");
    }

    // Generate comparison report
    if (results.length > 1) {
      console.log("\n=== Comparison Report ===");
      console.log(`Total pages analyzed: ${results.length}`);
      console.log(`Pages crawled: ${results.map((r) => r.url).join(", ")}`);
    }
  } catch (error) {
    logger.error("Example failed:", error);
  } finally {
    await agent.closeAgent();
    await browser.cleanupBrowser();
  }
}

/**
 * Extract key points from crawl findings
 */
function extractKeyPoints(findings: string): string[] {
  // Simple extraction - splits by common delimiters
  const sentences = findings.match(/[^.!?]+[.!?]+/g) || [];
  return sentences
    .slice(0, 3) // Take first 3 sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

// Run the example
advancedMultiPageExample();
