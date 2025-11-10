/**
 * Autonomous Crawling Example - Agentic Flow
 * Demonstrates the integrated autonomous crawler with all tools
 */

import * as browser from "../browser/browser-manager";
import {
  initializeAutonomousCrawlerAgent,
  createAutonomousCrawler,
  startAutonomousCrawl,
  closeAutonomousCrawlerAgent,
} from "../agent/autonomous-crawler-agent";
import { createLogger } from "../utils/logger";
import { createSitemapBuilder } from "../state/sitemap-builder";
import { createArtifactStorage } from "../storage/artifact-storage";

const logger = createLogger("AutonomousCrawlExample");

/**
 * Run autonomous crawl example
 */
async function runAutonomousCrawlExample() {
  try {
    console.log("=== Autonomous Crawling with Agentic Flow ===\n");

    // Get URL and max depth from command line arguments
    const targetUrl = process.argv[2] || "https://www.basedynamics.com/";
    const maxDepth = parseInt(process.argv[3]) || 3;
    
    console.log(`Target URL: ${targetUrl}`);
    console.log(`Max depth: ${maxDepth}\n`);

    const objective = `Explore this website and discover:
1. All main features/sections accessible from navigation
2. Types of pages within each feature (list, detail, form, etc.)
3. Cross-feature relationships and links
4. Interactive elements and their purposes
Provide a comprehensive understanding of the site structure.`;

    // Initialize browser
    logger.info("Initializing browser...");
    await browser.initializeBrowser();

    // Navigate to target
    logger.info(`Navigating to ${targetUrl}`);
    await browser.navigateToUrl(targetUrl);

    // Initialize autonomous crawler agent with configuration
    logger.info("Initializing autonomous crawler agent...");
    await initializeAutonomousCrawlerAgent({
      maxDepth: maxDepth,
      maxPagesPerFeature: 30,
      patternThreshold: 0.85,
      aiCacheTTL: 3600000,
      navigationTimeout: 30000,
      allowFormSubmission: false,
      allowDestructiveActions: false,
      allowFormFilling: false,
      maxParallelFeatures: 3,
      maxStatesPerPage: 10,
    });

    // Create crawler
    logger.info("Creating crawler executor...");
    const executor = await createAutonomousCrawler();

    // Start autonomous crawl
    logger.info("Starting autonomous crawl...\n");
    const crawlResult = await startAutonomousCrawl(targetUrl, objective);

    // Display results
    console.log("\n=== Crawl Results ===");
    console.log(`Success: ${crawlResult.success}`);
    console.log(`Message: ${crawlResult.message}`);

    if (crawlResult.findings) {
      console.log("\nFindings:");
      console.log(crawlResult.findings);
    }

    if (crawlResult.error) {
      console.log(`\nError: ${crawlResult.error}`);
    }

    // Initialize sitemap for recording results
    const sitemap = createSitemapBuilder(targetUrl, "Example App");
    const storage = createArtifactStorage("Example", targetUrl);

    // Save results
    const finalSitemap = sitemap.finalize(0);
    storage.saveSitemap(sitemap.toJSON());
    storage.createSummaryReport({
      crawlStatus: crawlResult.success ? "completed" : "failed",
      objective,
      findings: crawlResult.findings,
    });

    logger.info("Artifacts saved to: " + storage.getArtifactDir());

    // Cleanup
    logger.info("Cleaning up...");
    await closeAutonomousCrawlerAgent();
    await browser.cleanupBrowser();

    console.log("\n✓ Autonomous crawl completed successfully!");
  } catch (error) {
    logger.error("Autonomous crawl example failed:", error);
    console.error("Error:", error);

    try {
      await closeAutonomousCrawlerAgent();
      await browser.cleanupBrowser();
    } catch (cleanupError) {
      logger.error("Cleanup error:", cleanupError);
    }

    process.exit(1);
  }
}

// Run the example
runAutonomousCrawlExample();
