/**
 * Authentication Tools for Autonomous Agent
 * LangChain tools for handling login and protected content
 * Enhanced with AI-driven login detection and execution
 */

import { DynamicTool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createLogger } from "../utils/logger";
import * as loginAnalyzer from "../ai/login-analyzer";

const logger = createLogger("AuthenticationTools");

/**
 * Tool 1: Detect Login Page
 */
export const createDetectLoginPageTool = (): DynamicTool => {
  return new DynamicTool({
    name: "detect_login_page",
    description: `Uses AI to detect if the current page is a login page.
Returns true if the page contains login-related elements and forms identified by AI analysis.
This is completely AI-driven without hardcoded patterns.
Input: JSON object with optional page_id field. Example: {} or {"page_id":"my_page"}`,
    func: async (input: string): Promise<string> => {
      try {
        // Parse input
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          parsed = { page_id: "default" };
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            parsed = { page_id: "default" };
          }
        }

        const pageId = parsed.page_id || "default";
        const isLoginPage = await loginAnalyzer.detectLoginPage(pageId);

        return JSON.stringify({
          success: true,
          isLoginPage,
          message: isLoginPage
            ? "AI detected this is a login page"
            : "AI determined this is not a login page",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`AI login detection error: ${errorMsg}`);
        return JSON.stringify({
          success: false,
          error: errorMsg,
          isLoginPage: false,
        });
      }
    },
  });
};

/**
 * Tool 2: Check Login Status
 */
export const createCheckLoginStatusTool = (): DynamicTool => {
  return new DynamicTool({
    name: "check_login_status",
    description: `Uses AI to check if the user is currently logged in.
AI analyzes the page for logged-in indicators like user profiles, logout buttons, authenticated content.
Returns true if user appears to be logged in based on AI analysis.
Input: JSON object with optional page_id field. Example: {} or {"page_id":"my_page"}`,
    func: async (input: string): Promise<string> => {
      try {
        // Parse input
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          parsed = { page_id: "default" };
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            parsed = { page_id: "default" };
          }
        }

        const pageId = parsed.page_id || "default";
        
        // Use AI login detection - if it's NOT a login page, we're likely logged in
        const isLoginPage = await loginAnalyzer.detectLoginPage(pageId);
        const isLoggedIn = !isLoginPage;

        return JSON.stringify({
          success: true,
          isLoggedIn,
          message: isLoggedIn
            ? "AI indicates user appears to be logged in"
            : "AI indicates user needs to log in",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`AI login status check error: ${errorMsg}`);
        return JSON.stringify({
          success: false,
          error: errorMsg,
          isLoggedIn: false,
        });
      }
    },
  });
};

/**
 * Tool 3: Attempt Login
 */
export const createAttemptLoginTool = (): DynamicTool => {
  return new DynamicTool({
    name: "attempt_login",
    description: `Uses AI to attempt login with provided credentials.
AI identifies username/password fields and submit buttons, then executes login.
Completely autonomous - no hardcoded selectors or patterns.
Input: JSON object with optional username_or_email, password, page_id fields. Example: {"username_or_email":"user@test.com","password":"pass123"}`,
    func: async (input: string): Promise<string> => {
      try {
        // Parse input
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          parsed = {};
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            parsed = {};
          }
        }

        const pageId = parsed.page_id || "default";
        const credentials = {
          username: parsed.username_or_email || 'admin@example.com',
          password: parsed.password || 'password'
        };

        const result = await loginAnalyzer.handleLogin(pageId, credentials);

        return JSON.stringify({
          success: result,
          message: result
            ? "AI successfully completed login"
            : "AI failed to complete login",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`AI login attempt error: ${errorMsg}`);
        return JSON.stringify({
          success: false,
          error: errorMsg,
        });
      }
    },
  });
};

/**
 * Tool 4: Handle Two-Factor Authentication
 */
export const createHandle2FATool = (): DynamicTool => {
  return new DynamicTool({
    name: "handle_2fa",
    description: `Handles two-factor authentication if present.
Uses AI to detect 2FA forms and enter the provided code.
Currently basic implementation - can be enhanced with AI detection.
Input: JSON object with required otp_code and optional page_id fields. Example: {"otp_code":"123456"}`,
    func: async (input: string): Promise<string> => {
      try {
        // Parse input
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          throw new Error('Missing required otp_code parameter');
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            throw new Error('Invalid JSON input');
          }
        }

        if (!parsed.otp_code) {
          throw new Error('Missing required otp_code field');
        }

        const pageId = parsed.page_id || "default";
        
        // TODO: Implement AI-driven 2FA detection and handling
        logger.warn("2FA handling not yet implemented with AI");
        
        return JSON.stringify({
          success: false,
          message: "2FA handling not yet implemented with AI",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`2FA handling error: ${errorMsg}`);
        return JSON.stringify({
          success: false,
          error: errorMsg,
        });
      }
    },
  });
};

/**
 * Tool 5: Auto Login
 */
export const createAutoLoginTool = (): DynamicTool => {
  return new DynamicTool({
    name: "auto_login",
    description: `Automatically detects login page and logs in with provided credentials.
Combines login detection and login attempt in one AI-driven operation.
Default credentials are admin@example.com / password.
Input: JSON object with optional username_or_email, password, page_id fields. Example: {} or {"username_or_email":"user@test.com","password":"pass123"}`,
    func: async (input: string): Promise<string> => {
      try {
        // Parse input
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          parsed = {};
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            parsed = {};
          }
        }

        const pageId = parsed.page_id || "default";
        const credentials = {
          username: parsed.username_or_email || 'admin@example.com',
          password: parsed.password || 'password'
        };

        const result = await loginAnalyzer.ensureLoggedIn(pageId, credentials);

        return JSON.stringify({
          success: result,
          message: result
            ? "AI successfully ensured user is logged in"
            : "AI failed to ensure user is logged in",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Auto login error: ${errorMsg}`);
        return JSON.stringify({
          success: false,
          error: errorMsg,
        });
      }
    },
  });
};

/**
 * Tool 6: Logout
 */
export const createLogoutTool = (): DynamicTool => {
  return new DynamicTool({
    name: "logout",
    description: `Logs out the current user session.
TODO: Implement AI-driven logout detection and execution.
Currently basic implementation.
Input: JSON object with optional page_id field. Example: {} or {"page_id":"my_page"}`,
    func: async (input: string): Promise<string> => {
      try {
        // Parse input
        let parsed: any = {};
        if (!input || input === 'undefined' || input.trim() === '') {
          parsed = { page_id: "default" };
        } else {
          try {
            parsed = JSON.parse(input);
          } catch {
            parsed = { page_id: "default" };
          }
        }

        const pageId = parsed.page_id || "default";
        
        // TODO: Implement AI-driven logout detection and execution
        logger.warn("AI-driven logout not yet implemented");
        
        return JSON.stringify({
          success: false,
          message: "AI-driven logout not yet implemented",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Logout error: ${errorMsg}`);
        return JSON.stringify({
          success: false,
          error: errorMsg,
        });
      }
    },
  });
};

/**
 * Export all authentication tools
 */
export function getAuthenticationTools(): DynamicTool[] {
  return [
    createDetectLoginPageTool(),
    createCheckLoginStatusTool(),
    createAttemptLoginTool(),
    createHandle2FATool(),
    createAutoLoginTool(),
    createLogoutTool(),
  ];
}