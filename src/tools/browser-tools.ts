import { DynamicTool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as browserManager from "../browser/browser-manager";
import { createLogger } from "../utils/logger";

const logger = createLogger("BrowserTools");

/**
 * Navigate to page tool
 */
export const createNavigatePageTool = (): DynamicTool => {
  return new DynamicTool({
    name: "navigate_to_page",
    description: "Navigate to a specific URL and load the page. REQUIRED: Input must be JSON object with 'url' field. Example input: {\"url\":\"https://example.com\"} or {\"url\":\"https://example.com\",\"page_id\":\"my_page\"}. DO NOT pass undefined, empty string, or plain URLs.",
    func: async (input: any): Promise<string> => {
      try {
        logger.info(`NavigatePageTool called with: ${JSON.stringify(input)} (type: ${typeof input})`);
        
        // Handle different input types
        let parsed;
        if (typeof input === 'string') {
          // Validate input is not undefined or empty
          if (!input || input === 'undefined' || input.trim() === '') {
            throw new Error(`Invalid input. Expected JSON object like: {"url":"https://example.com"}. Got: ${input}`);
          }
          
          // Parse JSON input
          try {
            parsed = JSON.parse(input);
          } catch {
            // If input is not JSON but looks like a URL, create object
            if (input && (input.startsWith('http') || input.startsWith('/'))) {
              parsed = { url: input };
              logger.info(`NavigatePageTool: Converting plain URL to object: ${input}`);
            } else {
              throw new Error(`Invalid JSON format. Expected: {"url":"https://example.com"}. Got: ${input}`);
            }
          }
        } else if (typeof input === 'object' && input !== null) {
          // Input is already an object (newer LangChain versions)
          parsed = input;
          logger.info(`NavigatePageTool: Received object directly: ${JSON.stringify(input)}`);
        } else {
          throw new Error(`Invalid input type. Expected string or object. Got: ${typeof input}, value: ${input}`);
        }
        
        if (!parsed || !parsed.url) {
          throw new Error(`Missing required 'url' field. Expected: {"url":"https://example.com"}. Got: ${JSON.stringify(parsed)}`);
        }
        
        const result = await browserManager.navigateToUrl(parsed.url, parsed.page_id || "default");
        logger.info(`NavigatePageTool navigation successful to: ${parsed.url}`);
        return JSON.stringify(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`NavigatePageTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    }
  });
};

/**
 * Get page DOM tool
 */
export const createGetPageDOMTool = (): DynamicTool => {
  return new DynamicTool({
    name: "get_page_dom",
    description: "Get the complete DOM (HTML) content of the current page. REQUIRED: Input must be JSON object. Use {} for default page or {\"page_id\":\"my_page\"} for specific page. DO NOT pass undefined or empty strings.",
    func: async (input: string): Promise<string> => {
      try {
        logger.info(`GetPageDOMTool called with: ${input}`);
        
        // Handle empty or undefined input by using defaults
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          logger.info(`GetPageDOMTool: Using default page due to empty input: ${input}`);
          parsed = { page_id: "default" };
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            // If input is not JSON, use default
            logger.info(`GetPageDOMTool: Invalid JSON input, using default page: ${input}`);
            parsed = { page_id: "default" };
          }
        }
        
        const dom = await browserManager.getPageDOM(parsed.page_id || "default");
        logger.info(`GetPageDOMTool DOM length: ${dom.length}`);
        
        // For large DOM, extract meaningful content for AI analysis
        if (dom.length > 15000) {
          // Extract key sections for AI analysis
          const bodyMatch = dom.match(/<body[^>]*>(.*)<\/body>/s);
          const bodyContent = bodyMatch ? bodyMatch[1] : '';
          
          // Find content after the React root renders
          const rootMatch = bodyContent.match(/<div[^>]*id="root"[^>]*>(.*?)<\/div>/s);
          const rootContent = rootMatch ? rootMatch[1] : '';
          
          const result = JSON.stringify({
            status: "success",
            dom_length: dom.length,
            full_dom_available: true,
            body_content_length: bodyContent.length,
            react_root_content: rootContent.substring(0, 8000), // Give AI meaningful content
            head_section: dom.match(/<head[^>]*>(.*?)<\/head>/s)?.[1]?.substring(0, 2000) || '',
            note: "Large DOM detected. Extracted React root content and head section for analysis.",
          });
          
          logger.info(`GetPageDOMTool returning large DOM result, length: ${result.length}`);
          return result;
        }
        
        const result = JSON.stringify({
          status: "success",
          dom_length: dom.length,
          dom: dom,
        });
        
        logger.info(`GetPageDOMTool returning small DOM result, length: ${result.length}`);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`GetPageDOMTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    }
  });
};

/**
 * Get page text tool
 */
export const createGetPageTextTool = (): DynamicTool => {
  return new DynamicTool({
    name: "get_page_text",
    description: "Get the plain text content of the page (without HTML tags). REQUIRED: Input must be JSON object. Use {} for default page or {\"page_id\":\"my_page\"} for specific page. DO NOT pass undefined or empty strings.",
    func: async (input: string): Promise<string> => {
      try {
        logger.info(`GetPageTextTool called with: ${input}`);
        
        // Handle empty or undefined input by using defaults  
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          logger.info(`GetPageTextTool: Using default page due to empty input: ${input}`);
          parsed = { page_id: "default" };
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            // If input is not JSON, use default
            logger.info(`GetPageTextTool: Invalid JSON input, using default page: ${input}`);
            parsed = { page_id: "default" };
          }
        }
        
        const text = await browserManager.getPageText(parsed.page_id || "default");
        logger.info(`GetPageTextTool text length: ${text.length}`);
        
        // Always return the full text for AI analysis - text is usually much shorter than DOM
        // Only truncate if extremely long (over 10,000 characters)
        if (text.length > 10000) {
          const result = JSON.stringify({
            status: "success",
            text_length: text.length,
            text_preview: text.substring(0, 8000) + "...[truncated due to length]",
            note: "Text content is very large. Showing first 8000 characters.",
          });
          
          logger.info(`GetPageTextTool returning truncated result, length: ${result.length}`);
          return result;
        }
        
        const result = JSON.stringify({
          status: "success",
          text_length: text.length,
          text: text,
        });
        
        logger.info(`GetPageTextTool returning full text result, length: ${result.length}`);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`GetPageTextTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    }
  });
};

/**
 * Click element tool
 */
export const createClickElementTool = (): DynamicTool => {
  return {
    name: "click_element",
    description: "Click on an element using a CSS selector. Returns success status and any resulting navigation.",
    schema: z.object({
      selector: z.string().describe("CSS selector of the element to click"),
      page_id: z.string().optional().describe("Optional page identifier (default: 'default')"),
    }),
    _call: async (input: { selector: string; page_id?: string }): Promise<string> => {
      try {
        const result = await browserManager.clickElement(
          input.selector,
          input.page_id || "default"
        );
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
export const createFillInputTool = (): DynamicTool => {
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
export const createGetElementTextTool = (): DynamicTool => {
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
export const createWaitForElementTool = (): DynamicTool => {
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
export const createScreenshotTool = (): DynamicTool => {
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
export function getBrowserTools(): DynamicTool[] {
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
