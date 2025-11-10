/**
 * Main Entry Point for Spider Web Crawler
 * Functional approach - all exports are functions, no classes
 */

// Crawler functions
export {
  initializeCrawler,
  runCrawl,
  cleanupCrawler,
  executeCrawl,
  type CrawlerConfig,
  type CrawlerResult,
} from "./crawler";

// Agent functions
export {
  initializeAgent,
  crawl,
  closeAgent,
  getTools,
  getAgentState,
  type CrawlOptions,
  type CrawlResult,
} from "./agent/web-crawler-agent";

// Browser functions
export {
  initializeBrowser,
  createPage,
  getPage,
  navigateToUrl,
  getPageDOM,
  getPageText,
  clickElement,
  fillInput,
  getElementText,
  waitForElement,
  takeScreenshot,
  closePage,
  cleanupBrowser,
  getBrowserState,
} from "./browser/browser-manager";

// Logger function
export { createLogger, LogLevel } from "./utils/logger";

// Configuration
export { config } from "./config";

// Tool creation functions
export {
  createNavigatePageTool,
  createGetPageDOMTool,
  createGetPageTextTool,
  createClickElementTool,
  createFillInputTool,
  createGetElementTextTool,
  createWaitForElementTool,
  createScreenshotTool,
  getBrowserTools,
} from "./tools/browser-tools";

export {
  createAnalyzePageContentTool,
  createCreateExplorationPlanTool,
  createSummarizeFindingsTool,
  getAnalysisTools,
} from "./tools/analysis-tools";
