/**
 * Browser Tools Integration
 * Exports browser tools for agent use
 */

import { DynamicTool } from "@langchain/core/tools";
import { getBrowserTools as getBrowserToolsBase } from "../tools/browser-tools";
import { initializeBrowser, isBrowserInitialized } from "../browser/browser-manager";
import { createLogger } from "../utils/logger";

const logger = createLogger("BrowserToolsIntegration");

/**
 * Get browser tools for agent (with automatic browser initialization)
 */
export async function getBrowserTools(): Promise<DynamicTool[]> {
  try {
    if (isBrowserInitialized()) {
      logger.info("✅ Browser already initialized, using existing instance");
    } else {
      logger.info("🔄 Initializing browser for agent tools...");
      await initializeBrowser();
      logger.info("✅ Browser initialized for agent tools");
    }
    
    return getBrowserToolsBase();
  } catch (error) {
    logger.error("❌ Failed to initialize browser:", error);
    throw error;
  }
}

/**
 * Synchronous version that assumes browser is already initialized
 */
export function getBrowserToolsSync(): DynamicTool[] {
  return getBrowserToolsBase();
}
