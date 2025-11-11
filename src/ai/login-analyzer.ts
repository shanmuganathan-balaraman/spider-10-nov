/**
 * AI-Based Login Analyzer for Spider-10-Nov
 * Adapted from crawl-agent with browser-manager integration
 * Uses AI to detect login pages and identify form elements semantically
 * NO HARDCODED PATTERNS OR SELECTORS - Pure AI decision making
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import * as browserManager from '../browser/browser-manager';
import { LLMFactory } from './llm-factory';

const logger = createLogger('LoginAnalyzer');

// Simple mutex to prevent concurrent login operations
let loginOperationInProgress = false;
const loginQueue: (() => void)[] = [];

/**
 * Acquire login operation lock
 */
async function acquireLoginLock(): Promise<void> {
  return new Promise((resolve) => {
    if (!loginOperationInProgress) {
      loginOperationInProgress = true;
      resolve();
    } else {
      loginQueue.push(() => resolve());
    }
  });
}

/**
 * Release login operation lock
 */
function releaseLoginLock(): void {
  loginOperationInProgress = false;
  const next = loginQueue.shift();
  if (next) {
    loginOperationInProgress = true;
    next();
  }
}

/**
 * Create LLM for login analysis
 */
function createLoginAnalyzerLLM(): ChatOpenAI {
  return LLMFactory.createLoginAnalyzerLLM();
}

/**
 * Login analysis result interface
 */
export interface LoginAnalysisResult {
  isLoginPage: boolean;
  confidence: number;
  reasoning: string;
  actionPlan?: {
    usernameField?: {
      selector: string;
      type: string;
      label: string;
    };
    passwordField?: {
      selector: string;
      type: string;
      label: string;
    };
    submitButton?: {
      selector: string;
      type: string;
      label: string;
    };
  };
}

/**
 * Cache for login analysis results to avoid duplicate AI calls
 */
let lastLoginAnalysis: LoginAnalysisResult | null = null;

/**
 * Clear the cached login analysis
 */
export function clearLoginAnalysisCache(): void {
  lastLoginAnalysis = null;
  logger.info('Login analysis cache cleared');
}

/**
 * Extract complete DOM snapshot for AI analysis
 * PURE RAW DATA - No processing, filtering, or interpretation
 */
async function extractDOMSnapshot(pageId: string = 'default'): Promise<string> {
  try {
    // Get raw page data
    const dom = await browserManager.getPageDOM(pageId);
    const text = await browserManager.getPageText(pageId);
    const url = browserManager.getCurrentPageUrl(pageId);
    const title = await browserManager.getPageTitle(pageId);

    const snapshot = {
      url,
      title,
      documentHTML: dom,
      bodyText: text,
      extractedAt: new Date().toISOString(),
    };

    return JSON.stringify(snapshot, null, 2);
  } catch (error) {
    logger.error('Failed to extract DOM snapshot:', error);
    throw error;
  }
}

/**
 * Single AI call for complete login analysis and action planning
 */
export async function analyzePageForLogin(pageId: string = 'default'): Promise<LoginAnalysisResult> {
  logger.info('Performing comprehensive login analysis...');

  try {
    const domSnapshot = await extractDOMSnapshot(pageId);
    const llm = createLoginAnalyzerLLM();

    const systemPrompt = `You are an expert at identifying login/authentication pages and planning login actions.

Your task: Analyze the complete DOM structure and provide a comprehensive assessment.

You will receive the ENTIRE page DOM. Perform a complete analysis to:

1. DETERMINE if this is a login/authentication page
2. IF IT IS A LOGIN PAGE, identify the specific elements needed for login
3. PROVIDE action planning for login execution

Key indicators to consider:
- Password input fields anywhere on the page
- Username/email input fields
- Authentication buttons or submit actions  
- Page titles, headings, or text suggesting authentication
- URL patterns that suggest login functionality
- Overall page layout and structure

Return valid JSON with this structure:
{
  "isLoginPage": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation of your analysis",
  "actionPlan": {
    "usernameField": {
      "selector": "CSS selector for the element",
      "type": "input type or element type",
      "label": "field label/placeholder/associated text"
    },
    "passwordField": {
      "selector": "CSS selector for the element", 
      "type": "password",
      "label": "field label/placeholder/associated text"
    },
    "submitButton": {
      "selector": "CSS selector for the element",
      "type": "button/submit/input type",
      "label": "button text or label"
    }
  }
}

If NOT a login page, set isLoginPage to false and omit actionPlan.
If IS a login page, provide both analysis AND actionPlan for execution.`;

    const userPrompt = `Analyze this COMPLETE page DOM structure for login capabilities and provide action planning:

COMPLETE DOM DATA:
${domSnapshot}

Provide comprehensive analysis and action planning in JSON format.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    const content = response.content as string;

    // Parse JSON response
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result: LoginAnalysisResult = JSON.parse(jsonContent);

    logger.info(`Comprehensive analysis complete: ${result.isLoginPage} (confidence: ${result.confidence})`);
    logger.info(`Reasoning: ${result.reasoning}`);

    return result;

  } catch (error) {
    logger.error('Failed to analyze page:', error);

    return {
      isLoginPage: false,
      confidence: 0,
      reasoning: 'Failed to analyze page with AI'
    };
  }
}

/**
 * Detect if current page is a login page and store result for reuse
 */
export async function detectLoginPage(pageId: string = 'default'): Promise<boolean> {
  // Perform AI analysis and store result
  lastLoginAnalysis = await analyzePageForLogin(pageId);
  return lastLoginAnalysis.isLoginPage && lastLoginAnalysis.confidence > 0.7;
}

/**
 * Execute login using AI-determined actions
 */
export async function fillLoginFormWithAI(
  pageId: string = 'default',
  analysis: LoginAnalysisResult,
  credentials: { username?: string; password?: string }
): Promise<boolean> {
  logger.info('Executing AI-determined login actions...');

  if (!analysis.actionPlan) {
    logger.info('No action plan provided by AI');
    return false;
  }

  const { usernameField, passwordField, submitButton } = analysis.actionPlan;
  const username = credentials?.username || 'admin@example.com';
  const password = credentials?.password || 'password';

  try {
    // Fill username field using AI-provided selector
    if (usernameField?.selector) {
      logger.info(`Filling username: ${usernameField.selector}`);
      const result = await browserManager.fillInput(usernameField.selector, username, pageId);
      if (result.status !== 'success') {
        logger.error(`Failed to fill username: ${result.message}`);
        return false;
      }
    }

    // Fill password field using AI-provided selector  
    if (passwordField?.selector) {
      logger.info(`Filling password: ${passwordField.selector}`);
      const result = await browserManager.fillInput(passwordField.selector, password, pageId);
      if (result.status !== 'success') {
        logger.error(`Failed to fill password: ${result.message}`);
        return false;
      }
    }

    // Click submit using AI-provided selector
    if (submitButton?.selector) {
      logger.info(`Clicking submit: ${submitButton.selector}`);
      const result = await browserManager.clickElement(submitButton.selector, pageId);
      if (result.status !== 'success') {
        logger.error(`Failed to click submit: ${result.message}`);
        return false;
      }
    }

    // Wait for page to settle after login attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;

  } catch (error) {
    logger.error('Error executing login actions:', error);
    return false;
  }
}

/**
 * Handle complete login flow using stored analysis result
 */
export async function handleLogin(
  pageId: string = 'default',
  credentials?: { username?: string; password?: string }
): Promise<boolean> {
  logger.info('Starting optimized AI-driven login flow...');

  try {
    // Use the stored analysis result instead of calling AI again
    if (!lastLoginAnalysis) {
      logger.error('No login analysis available! Call detectLoginPage first.');
      return false;
    }

    const analysis = lastLoginAnalysis;

    if (!analysis.isLoginPage || analysis.confidence < 0.7) {
      logger.info('Stored analysis indicates this is not a login page');
      return false;
    }

    if (!analysis.actionPlan) {
      logger.info('No actionable login plan in stored analysis');
      return false;
    }

    logger.info('Using stored AI-generated action plan for login');

    // Execute AI-identified actions
    const actionSuccess = await fillLoginFormWithAI(pageId, analysis, credentials || {});
    
    if (!actionSuccess) {
      logger.info('Failed to execute login actions');
      return false;
    }

    // Let AI determine if login was successful
    const postLoginSuccess = await validateLoginSuccess(pageId);
    
    logger.info(`AI validation result: ${postLoginSuccess ? 'SUCCESS' : 'FAILED'}`);
    return postLoginSuccess;

  } catch (error) {
    logger.error('Error during AI-driven login:', error);
    return false;
  }
}

/**
 * Use AI to validate if login was successful
 * Pure AI decision - no hardcoded success criteria
 */
async function validateLoginSuccess(pageId: string = 'default'): Promise<boolean> {
  logger.info('Using AI to validate login success...');

  try {
    const currentPageSnapshot = await extractDOMSnapshot(pageId);
    const llm = createLoginAnalyzerLLM();

    const systemPrompt = `You are an expert at determining if a login attempt was successful.

Analyze the current page state and determine if the user has successfully logged in.

Consider these indicators:
- Is this still a login page? (unsuccessful if yes)
- Are there user account indicators (profile, dashboard, logout, user menu)?
- Did the URL change to suggest successful authentication?
- Are there welcome messages or authenticated content?
- Overall page structure suggesting user is now logged in

Provide your analysis as JSON:
{
  "loginSuccessful": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation of your analysis"
}`;

    const userPrompt = `Analyze this page state and determine if login was successful:

${currentPageSnapshot}

Provide your assessment in JSON format.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    const content = response.content as string;
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonContent);
    
    logger.info(`AI assessment: ${result.loginSuccessful} (confidence: ${result.confidence})`);
    logger.info(`AI reasoning: ${result.reasoning}`);

    return result.loginSuccessful && result.confidence > 0.6;

  } catch (error) {
    logger.error('Error validating login success:', error);
    return false;
  }
}

/**
 * Ensure user is logged in - delegates all decisions to AI
 * Returns true if already logged in or login successful
 */
export async function ensureLoggedIn(
  pageId: string = 'default',
  credentials?: { username?: string; password?: string }
): Promise<boolean> {
  // Prevent concurrent login operations
  await acquireLoginLock();
  
  try {
    logger.info('Using AI to check if login is required...');

    const isLoginPage = await detectLoginPage(pageId);

    if (!isLoginPage) {
      logger.info('AI determined no login required');
      return true;
    }

    logger.info('AI detected login page, attempting login...');
    const loginSuccess = await handleLogin(pageId, credentials);

    return loginSuccess;
  } finally {
    releaseLoginLock();
  }
}