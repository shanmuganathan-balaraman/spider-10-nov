import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import * as browserManager from "../browser/browser-manager";
import { createLogger } from "../utils/logger";

const logger = createLogger("BrowserTools");

/**
 * Navigate to page tool
 */
export const createNavigatePageTool = (): Tool => {
  return {
    name: "navigate_to_page",
    description: "Navigate to a specific URL and load the page. Returns the loaded URL and status.",
    schema: z.object({
      url: z.string().url("Must be a valid URL").describe("The URL to navigate to"),
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { url: string; page_id?: string }): Promise<string> => {
      try {
        const result = await browserManager.navigateToUrl(input.url, input.page_id || "default");
        return JSON.stringify(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`NavigatePageTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Get page DOM tool
 */
export const createGetPageDOMTool = (): Tool => {
  return {
    name: "get_page_dom",
    description:
      "Get the complete DOM (HTML) content of the current page. Useful for analyzing page structure and content.",
    schema: z.object({
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { page_id?: string }): Promise<string> => {
      try {
        const dom = await browserManager.getPageDOM(input.page_id || "default");
        if (dom.length > 10000) {
          return JSON.stringify({
            status: "success",
            dom_length: dom.length,
            dom_preview: dom.substring(0, 5000) + "...[truncated]",
            note: "DOM content is large. Use get_page_summary for analysis.",
          });
        }
        return JSON.stringify({
          status: "success",
          dom_length: dom.length,
          dom: dom,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`GetPageDOMTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Get page text tool
 */
export const createGetPageTextTool = (): Tool => {
  return {
    name: "get_page_text",
    description: "Get the plain text content of the page (without HTML tags). Useful for reading page content.",
    schema: z.object({
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { page_id?: string }): Promise<string> => {
      try {
        const text = await browserManager.getPageText(input.page_id || "default");
        if (text.length > 5000) {
          return JSON.stringify({
            status: "success",
            text_length: text.length,
            text_preview: text.substring(0, 2500) + "...[truncated]",
            note: "Text content is large. Consider requesting specific sections.",
          });
        }
        return JSON.stringify({
          status: "success",
          text_length: text.length,
          text: text,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`GetPageTextTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Click element tool
 */
export const createClickElementTool = (): Tool => {
  return {
    name: "click_element",
    description:
      "Click on a specific element on the page using a CSS selector. Useful for navigating or triggering actions.",
    schema: z.object({
      selector: z
        .string()
        .describe("CSS selector of the element to click (e.g., '#submit-btn', '.nav-link')"),
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { selector: string; page_id?: string }): Promise<string> => {
      try {
        const result = await browserManager.clickElement(input.selector, input.page_id || "default");
        return JSON.stringify(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`ClickElementTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Fill input tool
 */
export const createFillInputTool = (): Tool => {
  return {
    name: "fill_input",
    description: "Fill an input field with text. Useful for form submissions and searches.",
    schema: z.object({
      selector: z
        .string()
        .describe("CSS selector of the input element (e.g., 'input[name=search]')"),
      value: z.string().describe("The value to fill in the input"),
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { selector: string; value: string; page_id?: string }): Promise<string> => {
      try {
        const result = await browserManager.fillInput(
          input.selector,
          input.value,
          input.page_id || "default"
        );
        return JSON.stringify(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`FillInputTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Get element text tool
 */
export const createGetElementTextTool = (): Tool => {
  return {
    name: "get_element_text",
    description: "Get the text content of a specific element using a CSS selector.",
    schema: z.object({
      selector: z.string().describe("CSS selector of the element"),
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { selector: string; page_id?: string }): Promise<string> => {
      try {
        const text = await browserManager.getElementText(input.selector, input.page_id || "default");
        return JSON.stringify({
          status: "success",
          text: text,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`GetElementTextTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Wait for element tool
 */
export const createWaitForElementTool = (): Tool => {
  return {
    name: "wait_for_element",
    description: "Wait for an element to appear on the page. Useful for handling dynamic content loading.",
    schema: z.object({
      selector: z.string().describe("CSS selector of the element to wait for"),
      timeout: z
        .number()
        .optional()
        .describe("Maximum time to wait in milliseconds (default: 5000)"),
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { selector: string; timeout?: number; page_id?: string }): Promise<string> => {
      try {
        const result = await browserManager.waitForElement(
          input.selector,
          input.page_id || "default",
          input.timeout || 5000
        );
        return JSON.stringify(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`WaitForElementTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Take screenshot tool
 */
export const createScreenshotTool = (): Tool => {
  return {
    name: "take_screenshot",
    description: "Take a screenshot of the current page and save it to a file. Useful for visual inspection.",
    schema: z.object({
      file_path: z.string().describe("File path where to save the screenshot"),
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { file_path: string; page_id?: string }): Promise<string> => {
      try {
        const result = await browserManager.takeScreenshot(input.file_path, input.page_id || "default");
        return JSON.stringify(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`ScreenshotTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Get all browser tools
 */
export function getBrowserTools(): Tool[] {
  return [
    createNavigatePageTool(),
    createGetPageDOMTool(),
    createGetPageTextTool(),
    createClickElementTool(),
    createFillInputTool(),
    createGetElementTextTool(),
    createWaitForElementTool(),
    createScreenshotTool(),
  ];
}
