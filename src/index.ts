/**
 * Main Entry Point for Spider Web Crawler
 * Use npm run crawl <URL> [maxDepth] to crawl websites
 */

// Autonomous Crawler Agent functions
export {
  initializeAutonomousCrawlerAgent,
  createAutonomousCrawler,
  startAutonomousCrawl,
  closeAutonomousCrawlerAgent,
  getAutonomousCrawlerState,
  createFullAutonomousCrawler,
  type AutonomousCrawlConfig,
} from "./agent/autonomous-crawler-agent";

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
  waitForDynamicContent,
  addLoadingDelay,
  getCurrentPageUrl,
  getPageTitle,
} from "./browser/browser-manager";

// Logger function
export { createLogger, LogLevel } from "./utils/logger";
