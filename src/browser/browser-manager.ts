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
 * Check if browser is initialized
 */
export function isBrowserInitialized(): boolean {
  return !!(browserState.browser && browserState.context);
}

/**
 * Initialize the browser
 */
export async function initializeBrowser(): Promise<void> {
  try {
    // Check if browser is already initialized
    if (isBrowserInitialized()) {
      logger.info("Browser already initialized, skipping...");
      return;
    }

    logger.info("Initializing browser...");
    browserState.browser = await chromium.launch({
      headless: config.headlessMode,
    });

    browserState.context = await browserState.browser.newContext({
      viewport: { width: config.viewportWidth, height: config.viewportHeight },
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

    // Wait for networkidle for JS-heavy sites (React, Vue, Next.js, etc.)
    // Playwright's "networkidle" waits for network to be idle (similar to Puppeteer's networkidle2)
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    } catch (timeoutError) {
      logger.debug("networkidle timeout, retrying with load");
      // Fallback to just page load for very slow sites
      await page.goto(url, { waitUntil: "load", timeout: 45000 });
    }

    // Additional wait for SPAs and dynamic content to render
    try {
      // Wait for React/Vue app to mount and render content
      await page.waitForFunction(
        () => {
          const body = document.body;
          return body && (
            body.children.length > 1 ||  // Multiple child elements
            body.innerText.trim().length > 50 || // Meaningful text content
            document.querySelectorAll('div[id*="root"], div[id*="app"], div[class*="app"]').length > 0 // SPA containers
          );
        },
        { timeout: 10000 }
      );
      logger.info("Dynamic content detected and loaded");
    } catch (contentWaitError) {
      // If dynamic content doesn't load, continue anyway
      logger.debug("No dynamic content detected, continuing with static content");
    }

    // Additional 2-second wait for lazy-loaded components
    await new Promise(resolve => setTimeout(resolve, 2000));

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
    // Wait a bit more for dynamic content if needed
    await page.waitForTimeout(1000);
    
    const dom = await page.content();
    logger.debug(`Retrieved DOM for page ${pageId}, length: ${dom.length}`);
    
    // Log if DOM seems empty (likely SPA not rendered)
    if (dom.length < 500 || !dom.includes('<body>')) {
      logger.warn(`DOM appears minimal for page ${pageId} - possible SPA requiring more wait time`);
    }
    
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
    // Wait a bit more for dynamic content if needed
    await page.waitForTimeout(1000);
    
    const text = await page.evaluate(() => {
      return document.body ? document.body.innerText.trim() : '';
    });
    
    logger.debug(`Retrieved text for page ${pageId}, length: ${text.length}`);
    
    // Log if text seems empty (likely SPA not rendered)
    if (text.length < 50) {
      logger.warn(`Text content appears minimal for page ${pageId} - possible SPA requiring more wait time`);
    }
    
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
 * Get current page URL
 */
export function getCurrentPageUrl(pageId: string = "default"): string {
  const page = getPage(pageId);
  if (!page) {
    return "";
  }
  return page.url();
}

/**
 * Get current page title
 */
export async function getPageTitle(pageId: string = "default"): Promise<string> {
  const page = getPage(pageId);
  if (!page) {
    return "";
  }
  return await page.title();
}

/**
 * Get current browser state
 */
export function getBrowserState(): BrowserState {
  return browserState;
}

/**
 * Wait for dynamic content to load (helper for modern JS frameworks)
 */
export async function waitForDynamicContent(
  pageId: string = "default",
  timeout: number = 10000
): Promise<boolean> {
  const page = getPage(pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }

  try {
    // Wait for any body content to be present
    await page.waitForFunction(
      () => {
        const body = document.body;
        return body && body.children.length > 0 && body.innerText.length > 100;
      },
      { timeout }
    );
    logger.info(`Dynamic content loaded for page ${pageId}`);
    return true;
  } catch (error) {
    logger.warn(`Timeout waiting for dynamic content on page ${pageId}`);
    return false;
  }
}

/**
 * Add delay for lazy-loaded content
 */
export async function addLoadingDelay(
  delayMs: number = 2000
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
