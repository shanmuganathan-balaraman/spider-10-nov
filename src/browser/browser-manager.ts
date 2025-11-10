import { Browser, BrowserContext, Page, chromium } from "playwright";
import { config } from "../config";
import { createLogger } from "../utils/logger";

const logger = createLogger("BrowserManager");

interface BrowserState {
  browser: Browser | null;
  context: BrowserContext | null;
  pages: Map<string, Page>;
}

// Global browser state
let browserState: BrowserState = {
  browser: null,
  context: null,
  pages: new Map(),
};

/**
 * Initialize the browser
 */
export async function initializeBrowser(): Promise<void> {
  try {
    logger.info("Initializing browser...");
    browserState.browser = await chromium.launch({
      headless: config.headlessMode,
    });

    browserState.context = await browserState.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });

    logger.info("Browser initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize browser:", error);
    throw error;
  }
}

/**
 * Create a new page
 */
export async function createPage(pageId: string = "default"): Promise<Page> {
  if (!browserState.context) {
    throw new Error("Browser context not initialized. Call initializeBrowser() first.");
  }

  if (browserState.pages.has(pageId)) {
    return browserState.pages.get(pageId)!;
  }

  const page = await browserState.context.newPage();
  browserState.pages.set(pageId, page);

  // Set timeout
  page.setDefaultTimeout(config.browserTimeout);
  page.setDefaultNavigationTimeout(config.browserTimeout);

  logger.info(`Page created with ID: ${pageId}`);
  return page;
}

/**
 * Get an existing page
 */
export function getPage(pageId: string = "default"): Page | null {
  return browserState.pages.get(pageId) || null;
}

/**
 * Navigate to a URL
 */
export async function navigateToUrl(
  url: string,
  pageId: string = "default"
): Promise<{ status: string; url: string }> {
  try {
    const page = await createPage(pageId);
    logger.info(`Navigating to ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded" });

    logger.info(`Successfully navigated to ${url}`);
    return {
      status: "success",
      url: page.url(),
    };
  } catch (error) {
    logger.error(`Failed to navigate to ${url}:`, error);
    throw error;
  }
}

/**
 * Get page DOM
 */
export async function getPageDOM(pageId: string = "default"): Promise<string> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    const dom = await page.content();
    logger.debug(`Retrieved DOM for page ${pageId}`);
    return dom;
  } catch (error) {
    logger.error(`Failed to get DOM for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Get page text content
 */
export async function getPageText(pageId: string = "default"): Promise<string> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    const text = await page.evaluate(() => document.body.innerText);
    logger.debug(`Retrieved text for page ${pageId}`);
    return text;
  } catch (error) {
    logger.error(`Failed to get text for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Click an element
 */
export async function clickElement(
  selector: string,
  pageId: string = "default"
): Promise<{ status: string; message: string }> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    await page.click(selector);
    logger.info(`Clicked element: ${selector}`);
    return { status: "success", message: `Clicked element: ${selector}` };
  } catch (error) {
    logger.error(`Failed to click element ${selector}:`, error);
    throw error;
  }
}

/**
 * Fill input field
 */
export async function fillInput(
  selector: string,
  value: string,
  pageId: string = "default"
): Promise<{ status: string; message: string }> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    await page.fill(selector, value);
    logger.info(`Filled input: ${selector} with value`);
    return { status: "success", message: `Filled input: ${selector}` };
  } catch (error) {
    logger.error(`Failed to fill input ${selector}:`, error);
    throw error;
  }
}

/**
 * Get element text
 */
export async function getElementText(
  selector: string,
  pageId: string = "default"
): Promise<string> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    const text = await page.textContent(selector);
    logger.debug(`Retrieved text for element: ${selector}`);
    return text || "";
  } catch (error) {
    logger.error(`Failed to get text for element ${selector}:`, error);
    throw error;
  }
}

/**
 * Wait for element to appear
 */
export async function waitForElement(
  selector: string,
  pageId: string = "default",
  timeout: number = 5000
): Promise<{ status: string; message: string }> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    await page.waitForSelector(selector, { timeout });
    logger.info(`Element appeared: ${selector}`);
    return { status: "success", message: `Element appeared: ${selector}` };
  } catch (error) {
    logger.error(`Timeout waiting for element ${selector}:`, error);
    throw error;
  }
}

/**
 * Take screenshot
 */
export async function takeScreenshot(
  filePath: string,
  pageId: string = "default"
): Promise<{ status: string; message: string }> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    await page.screenshot({ path: filePath, fullPage: true });
    logger.info(`Screenshot saved to ${filePath}`);
    return { status: "success", message: `Screenshot saved to ${filePath}` };
  } catch (error) {
    logger.error(`Failed to take screenshot:`, error);
    throw error;
  }
}

/**
 * Close a specific page
 */
export async function closePage(pageId: string = "default"): Promise<void> {
  const page = browserState.pages.get(pageId);
  if (page) {
    await page.close();
    browserState.pages.delete(pageId);
    logger.info(`Page closed: ${pageId}`);
  }
}

/**
 * Cleanup all resources
 */
export async function cleanupBrowser(): Promise<void> {
  try {
    for (const [pageId] of browserState.pages) {
      await closePage(pageId);
    }

    if (browserState.context) {
      await browserState.context.close();
    }

    if (browserState.browser) {
      await browserState.browser.close();
    }

    browserState = {
      browser: null,
      context: null,
      pages: new Map(),
    };

    logger.info("Browser cleanup completed");
  } catch (error) {
    logger.error("Error during cleanup:", error);
    throw error;
  }
}

/**
 * Get current browser state
 */
export function getBrowserState(): BrowserState {
  return browserState;
}
