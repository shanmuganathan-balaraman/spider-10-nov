/**
 * Authentication Handler
 * Handles login detection and form submission for protected content
 */

import * as browser from "../browser/browser-manager";
import { createLogger } from "../utils/logger";

const logger = createLogger("AuthenticationHandler");

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  phone?: string;
  otp?: string;
}

export interface LoginConfig {
  credentials: LoginCredentials;
  usernameSelector?: string;
  emailSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  phoneSelector?: string;
  otpSelector?: string;
  maxRetries?: number;
  waitAfterSubmit?: number;
}

export interface LoginResult {
  success: boolean;
  message: string;
  isLoggedIn: boolean;
  sessionToken?: string;
  cookies?: string;
  error?: string;
}

/**
 * Detect if current page is a login page
 */
export async function detectLoginPage(pageId: string = "default"): Promise<boolean> {
  try {
    const pageText = await browser.getPageText(pageId).catch(() => "");
    const pageDOM = await browser.getPageDOM(pageId).catch(() => "");
    const pageUrl = browser.getCurrentPageUrl(pageId);

    const loginIndicators = [
      "login",
      "signin",
      "sign in",
      "sign-in",
      "auth",
      "authenticate",
      "password",
      "username",
      "email",
      "credentials",
    ];

    const textLower = pageText.toLowerCase() + pageDOM.toLowerCase() + pageUrl.toLowerCase();

    // Check for login-related keywords
    const hasLoginKeyword = loginIndicators.some((keyword) =>
      textLower.includes(keyword)
    );

    // Check for login form elements
    const hasLoginForm =
      pageDOM.includes('type="password"') ||
      pageDOM.includes('name="password"') ||
      pageDOM.includes('id="password"') ||
      pageDOM.includes('type="email"') ||
      pageDOM.includes('type="text"') && pageDOM.includes('name="username"');

    const isLoginPage = hasLoginKeyword && hasLoginForm;

    logger.info(
      `Login page detection: ${isLoginPage} (keyword: ${hasLoginKeyword}, form: ${hasLoginForm})`
    );

    return isLoginPage;
  } catch (error) {
    logger.error("Error detecting login page:", error);
    return false;
  }
}

/**
 * Attempt to login with provided credentials
 */
export async function attemptLogin(
  config: LoginConfig,
  pageId: string = "default"
): Promise<LoginResult> {
  try {
    const { credentials, maxRetries = 3, waitAfterSubmit = 5000 } = config;

    logger.info("Attempting login with provided credentials...");

    // Find input selectors if not provided
    const usernameSelector = config.usernameSelector || '[name="username"], [name="email"], [id="username"], [id="email"]';
    const passwordSelector = config.passwordSelector || '[name="password"], [id="password"]';
    const submitSelector = config.submitSelector || 'button[type="submit"], input[type="submit"], button:contains("Sign In"), button:contains("Login")';

    // Fill username/email if provided
    if (credentials.username || credentials.email) {
      const value = credentials.username || credentials.email || "";
      try {
        await browser.fillInput(usernameSelector, value, pageId);
        logger.info("Filled username/email field");
      } catch (e) {
        logger.warn("Could not fill username/email field:", e);
      }
    }

    // Fill password
    if (credentials.password) {
      try {
        await browser.fillInput(passwordSelector, credentials.password, pageId);
        logger.info("Filled password field");
      } catch (e) {
        logger.warn("Could not fill password field:", e);
      }
    }

    // Click submit button
    try {
      await browser.clickElement(submitSelector, pageId);
      logger.info("Clicked submit button");
    } catch (e) {
      logger.warn("Could not click submit button:", e);
    }

    // Wait for page to load after submission
    await browser.addLoadingDelay(waitAfterSubmit);

    // Check if login was successful
    const isLoggedIn = await checkLoginStatus(pageId);

    if (isLoggedIn) {
      logger.info("Login successful!");
      return {
        success: true,
        message: "Successfully logged in",
        isLoggedIn: true,
      };
    } else {
      logger.warn("Login may have failed");
      return {
        success: false,
        message: "Login attempt completed but verification inconclusive",
        isLoggedIn: false,
        error: "Could not verify login status",
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Login error:", errorMsg);
    return {
      success: false,
      message: "Login attempt failed",
      isLoggedIn: false,
      error: errorMsg,
    };
  }
}

/**
 * Check if user is currently logged in
 */
export async function checkLoginStatus(pageId: string = "default"): Promise<boolean> {
  try {
    const pageText = await browser.getPageText(pageId).catch(() => "");
    const pageDOM = await browser.getPageDOM(pageId).catch(() => "");
    const pageUrl = browser.getCurrentPageUrl(pageId);

    // Indicators that user is NOT logged in
    const logoutIndicators = [
      "logout",
      "sign out",
      "sign-out",
      "log out",
      "log-out",
      "profile",
      "account",
      "dashboard",
      "welcome",
    ];

    const loginPageIndicators = ["login", "signin", "sign in", "password"];

    const textLower = pageText.toLowerCase() + pageDOM.toLowerCase();

    const hasLogoutFeature = logoutIndicators.some((indicator) =>
      textLower.includes(indicator)
    );
    const hasLoginPage = loginPageIndicators.some((indicator) =>
      textLower.includes(indicator)
    );

    // If we see logout/profile/dashboard, user is likely logged in
    const isLoggedIn = hasLogoutFeature && !hasLoginPage;

    logger.info(
      `Login status check: ${isLoggedIn} (logout feature: ${hasLogoutFeature}, login page: ${hasLoginPage})`
    );

    return isLoggedIn;
  } catch (error) {
    logger.error("Error checking login status:", error);
    return false;
  }
}

/**
 * Handle two-factor authentication (if needed)
 */
export async function handle2FA(
  otpCode: string,
  otpSelector: string = '[name="otp"], [name="code"], [id="otp"], [id="code"]',
  pageId: string = "default"
): Promise<LoginResult> {
  try {
    logger.info("Handling 2FA with OTP code...");

    // Fill OTP
    await browser.fillInput(otpSelector, otpCode, pageId);
    logger.info("Filled OTP field");

    // Find and click submit
    const submitSelector = 'button[type="submit"], input[type="submit"], button:contains("Verify")';
    await browser.clickElement(submitSelector, pageId);
    logger.info("Clicked OTP submit button");

    // Wait for verification
    await browser.addLoadingDelay(3000);

    // Check status
    const isLoggedIn = await checkLoginStatus(pageId);

    return {
      success: isLoggedIn,
      message: isLoggedIn ? "2FA successful" : "2FA verification inconclusive",
      isLoggedIn,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("2FA error:", errorMsg);
    return {
      success: false,
      message: "2FA attempt failed",
      isLoggedIn: false,
      error: errorMsg,
    };
  }
}

/**
 * Auto-detect login form and attempt login
 */
export async function autoLogin(
  credentials: LoginCredentials,
  pageId: string = "default"
): Promise<LoginResult> {
  try {
    // Check if we're on a login page
    const isLoginPage = await detectLoginPage(pageId);

    if (!isLoginPage) {
      logger.warn("Current page does not appear to be a login page");
      return {
        success: false,
        message: "Not on a login page",
        isLoggedIn: false,
        error: "Current page does not appear to be a login page",
      };
    }

    // Attempt login with auto-detected selectors
    return await attemptLogin(
      {
        credentials,
        maxRetries: 3,
        waitAfterSubmit: 5000,
      },
      pageId
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Auto-login error:", errorMsg);
    return {
      success: false,
      message: "Auto-login failed",
      isLoggedIn: false,
      error: errorMsg,
    };
  }
}

/**
 * Clear session (logout)
 */
export async function clearSession(pageId: string = "default"): Promise<void> {
  try {
    logger.info("Clearing session...");

    // Try to find and click logout button
    const logoutSelectors = [
      'button:contains("Logout")',
      'button:contains("Log Out")',
      'a:contains("Logout")',
      'a:contains("Log Out")',
      '[onclick*="logout"]',
      '[href*="logout"]',
    ];

    for (const selector of logoutSelectors) {
      try {
        await browser.clickElement(selector, pageId);
        logger.info("Clicked logout button");
        await browser.addLoadingDelay(2000);
        return;
      } catch (e) {
        // Continue to next selector
      }
    }

    logger.warn("Could not find logout button");
  } catch (error) {
    logger.error("Error during logout:", error);
  }
}
