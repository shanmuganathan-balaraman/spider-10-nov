#!/usr/bin/env node
/**
 * Autonomous Web Crawler - Main Entry Point
 * Usage: npm run crawl <URL> [maxDepth]
 * Example: npm run crawl https://example.com 3
 */

import * as browser from "./browser/browser-manager";
import {
  initializeAutonomousCrawlerAgent,
  createAutonomousCrawler,
  startAutonomousCrawl,
  closeAutonomousCrawlerAgent,
} from "./agent/autonomous-crawler-agent";
import { createLogger } from "./utils/logger";
import { createSitemapBuilder } from "./state/sitemap-builder";
import { createArtifactStorage } from "./storage/artifact-storage";

const logger = createLogger("CrawlerMain");

function showUsage() {
  console.log(`
🕷️  Autonomous Web Crawler

Usage: npm run crawl <URL> [maxDepth] [username] [password]

Arguments:
  URL       - The website URL to crawl (required)
  maxDepth  - Maximum crawl depth (optional, default: 2)
  username  - Login username/email (optional, default: admin@example.com)
  password  - Login password (optional, default: password)

Examples:
  npm run crawl https://example.com
  npm run crawl https://shop.example.com 3
  npm run crawl https://docs.example.com 1
  npm run crawl https://app.example.com 2 user@example.com mypassword

Authentication:
✓ AI automatically detects login pages
✓ Uses provided credentials or defaults
✓ Handles form filling and submission
✓ Validates login success before crawling

The crawler will:
✓ Automatically discover navigation and features
✓ Analyze page structures and interactions
✓ Generate comprehensive site maps and reports
✓ Save results to runs/ directory
`);
}

async function main() {
  const targetUrl = process.argv[2];
  const maxDepth = parseInt(process.argv[3]) || 2;
  const username = process.argv[4] || "admin@example.com";
  const password = process.argv[5] || "password";

  if (!targetUrl) {
    showUsage();
    process.exit(1);
  }

  // Validate URL format
  try {
    new URL(targetUrl);
  } catch (error) {
    console.error(`❌ Invalid URL format: ${targetUrl}`);
    showUsage();
    process.exit(1);
  }

  console.log(`🕷️  Starting autonomous crawl of: ${targetUrl}`);
  console.log(`📊 Max depth: ${maxDepth}`);
  console.log(`🔐 Credentials: ${username} / ${'*'.repeat(password.length)}`);
  console.log(`⏳ Initializing...`);

  const objective = `PRODUCT ANALYTICS & INSTRUMENTATION DISCOVERY:

BUSINESS OBJECTIVES:
1. **Analytics Instrumentation Audit** - Identify all elements that should be tracked for product analytics
2. **User Journey Mapping** - Discover critical user flows and conversion paths  
3. **SDK Detection & Event Mapping** - Detect existing analytics SDKs and map UI interactions to tracking events
4. **Feature Discovery** - Catalog all product features, workflows, and user capabilities
5. **Conversion Funnel Analysis** - Identify signup, onboarding, purchase, and activation flows

INSTRUMENTATION PRIORITIES:
🎯 **Primary Actions** (Core Business Events):
   - User registration, login, account creation
   - Purchase flows, subscription upgrades, payment processes  
   - Feature activation, configuration, and first-use events
   - Content creation, file uploads, data submissions
   - Critical user decisions and conversion points

🎯 **Secondary Actions** (Supporting Analytics):
   - Navigation patterns, search behavior, filtering/sorting
   - Content engagement, modal opens, tab switches
   - Settings changes, preference updates, customizations
   - Social sharing, invitations, referral actions

🎯 **High-Value Business Events**:
   - Trial-to-paid conversions, subscription changes
   - Feature discovery moments, help/support interactions
   - Error states, abandonment points, friction detection
   - Cross-feature usage patterns, integration activations

DELIVERABLES:
✅ Complete sitemap with feature classification
✅ Analytics instrumentation recommendations for each page
✅ User journey flows with conversion tracking points  
✅ SDK detection results and event mapping
✅ Recommended tracking implementation plan
✅ Product metrics and KPI identification opportunities`;

  try {
    // Initialize browser
    logger.info("Initializing browser...");
    await browser.initializeBrowser();

    // Navigate to target
    logger.info(`Navigating to ${targetUrl}`);
    await browser.navigateToUrl(targetUrl);

    // Initialize autonomous crawler agent
    logger.info("Initializing autonomous crawler agent...");
    await initializeAutonomousCrawlerAgent({
      maxDepth: maxDepth,
      maxPagesPerFeature: 50,
      patternThreshold: 0.8,
      aiCacheTTL: 3600000,
      navigationTimeout: 30000,
      allowFormSubmission: false,
      allowDestructiveActions: false,
      allowFormFilling: true,
      maxParallelFeatures: 2,
      maxStatesPerPage: 15,
    });

    // Create crawler
    logger.info("Creating crawler executor...");
    const executor = await createAutonomousCrawler();

    // Start autonomous crawl
    console.log(`🚀 Starting crawl...`);
    const crawlResult = await startAutonomousCrawl(targetUrl, objective, {
      username,
      password,
    });

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("📋 CRAWL RESULTS");
    console.log("=".repeat(60));
    console.log(`✅ Success: ${crawlResult.success}`);
    console.log(`📝 Status: ${crawlResult.message}`);

    if (crawlResult.findings) {
      console.log("\n🔍 FINDINGS:");
      console.log(crawlResult.findings);
    }

    if (crawlResult.error) {
      console.log(`\n❌ Error: ${crawlResult.error}`);
    }

    // Initialize storage for results
    const sitemap = createSitemapBuilder(targetUrl, "Autonomous Crawl");
    const storage = createArtifactStorage("crawl", targetUrl);

    // Save results
    const finalSitemap = sitemap.finalize(maxDepth);
    storage.saveSitemap(sitemap.toJSON());
    storage.createSummaryReport({
      crawlStatus: crawlResult.success ? "completed" : "failed",
      objective,
      findings: crawlResult.findings,
      targetUrl,
      maxDepth,
    });

    console.log(`\n💾 Results saved to: ${storage.getArtifactDir()}`);

    // Cleanup
    logger.info("Cleaning up...");
    await closeAutonomousCrawlerAgent();
    await browser.cleanupBrowser();

    console.log("\n✅ Crawl completed successfully!");
  } catch (error) {
    console.error(`\n❌ Crawl failed: ${error}`);
    logger.error("Crawl failed:", error);

    try {
      await closeAutonomousCrawlerAgent();
      await browser.cleanupBrowser();
    } catch (cleanupError) {
      logger.error("Cleanup error:", cleanupError);
    }

    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully shutting down...');
  try {
    await closeAutonomousCrawlerAgent();
    await browser.cleanupBrowser();
  } catch (error) {
    console.error('Shutdown error:', error);
  }
  process.exit(0);
});

// Run the crawler only if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
