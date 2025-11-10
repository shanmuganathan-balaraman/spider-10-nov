import * as browserManager from "./browser/browser-manager";
import * as agentModule from "./agent/web-crawler-agent";
import { createLogger } from "./utils/logger";

const logger = createLogger("CrawlerOrchestrator");

export interface CrawlerConfig {
  url: string;
  objective: string;
  maxIterations?: number;
  headless?: boolean;
}

export interface CrawlerResult {
  success: boolean;
  url: string;
  objective: string;
  findings: string;
  steps_taken: number;
  duration_ms: number;
  error?: string;
}

/**
 * Initialize crawler (browser and agent)
 */
export async function initializeCrawler(): Promise<void> {
  try {
    logger.info("Initializing Crawler...");
    await browserManager.initializeBrowser();
    await agentModule.initializeAgent();
    logger.info("Crawler initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize crawler:", error);
    throw error;
  }
}

/**
 * Run a crawl operation
 */
export async function runCrawl(config: CrawlerConfig): Promise<CrawlerResult> {
  try {
    logger.info(`Starting crawl with config: ${JSON.stringify(config)}`);

    const result = await agentModule.crawl({
      url: config.url,
      objective: config.objective,
      maxIterations: config.maxIterations || 10,
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Crawl failed: ${errorMsg}`);

    return {
      success: false,
      url: config.url,
      objective: config.objective,
      findings: "",
      steps_taken: 0,
      duration_ms: 0,
      error: errorMsg,
    };
  }
}

/**
 * Cleanup crawler resources
 */
export async function cleanupCrawler(): Promise<void> {
  try {
    logger.info("Cleaning up Crawler...");
    await agentModule.closeAgent();
    await browserManager.cleanupBrowser();
    logger.info("Crawler cleanup completed");
  } catch (error) {
    logger.error("Error during cleanup:", error);
    throw error;
  }
}

/**
 * Execute a single crawl (initializes, crawls, and cleans up)
 */
export async function executeCrawl(config: CrawlerConfig): Promise<CrawlerResult> {
  await initializeCrawler();

  try {
    const result = await runCrawl(config);
    return result;
  } finally {
    await cleanupCrawler();
  }
}
