/**
 * AI-First Page Analyzer for Spider-10-Nov
 * Sends raw page data to AI for complete autonomous analysis
 * Adapted from crawl-agent with browser-manager integration
 * NO PRE-PROCESSING - Pure AI-driven exploration decisions
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import * as browserManager from '../browser/browser-manager';
import { LLMFactory } from './llm-factory';

const logger = createLogger('RawPageAnalyzer');

/**
 * Raw page data extracted without pre-processing for AI analysis
 */
export interface RawPageData {
  url: string;
  title: string;
  html: string;
  text: string;
  viewport: { width: number; height: number };
  extractedAt: string;
}

/**
 * AI page analysis result
 */
export interface AIPageAnalysis {
  pageType: 'landing' | 'form' | 'list' | 'detail' | 'dashboard' | 'other';
  mainPurpose: string;
  pageBusinessSummary: {
    businessValue: string;
    primaryActions: string[];
    secondaryActions: string[];
    userJourney: string;
  };
  actions: Array<{
    type: 'click' | 'type' | 'navigate' | 'wait' | 'extract';
    category: 'non_navigation' | 'navigation' | 'cross_feature';
    target: string;
    value?: string;
    description: string;
    confidence: number;
    reasoning: string;
    navigatesAway: boolean;
    targetUrl?: string;
    likelyTriggersModal: boolean;
    modalTriggerConfidence: number;
  }>;
  navigationElements: Array<{
    selector: string;
    description: string;
    type: 'local' | 'cross-feature';
    confidence: number;
  }>;
  insights: {
    hasLogin: boolean;
    hasForms: boolean;
    hasDataTables: boolean;
    hasNavigation: boolean;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedActions: number;
  };
}

/**
 * Create LLM for raw page analysis
 */
function createRawPageAnalyzerLLM(): ChatOpenAI {
  return LLMFactory.createRawPageAnalyzerLLM();
}

/**
 * Extract raw page data without any processing for pure AI analysis
 */
export async function extractRawPageData(pageId: string = 'default'): Promise<RawPageData> {
  try {
    const url = browserManager.getCurrentPageUrl(pageId);
    const title = await browserManager.getPageTitle(pageId);
    const html = await browserManager.getPageDOM(pageId);
    const text = await browserManager.getPageText(pageId);

    // Get page/browser instance to extract viewport
    const page = browserManager.getPage(pageId);
    const viewport = page ? await page.viewportSize() : { width: 1920, height: 1080 };

    return {
      url,
      title,
      html,
      text,
      viewport: viewport || { width: 1920, height: 1080 },
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to extract raw page data:', error);
    throw error;
  }
}

/**
 * Analyze raw page data with AI to determine all exploration decisions
 */
export async function analyzePageWithAI(
  rawData: RawPageData,
  context?: {
    currentFeature?: string;
    explorationGoal?: string;
    visitedPages?: string[];
    config?: any;
  }
): Promise<AIPageAnalysis> {
  logger.info('Starting AI-driven page analysis...');

  const llm = createRawPageAnalyzerLLM();

  // Get configuration settings with defaults
  const configSettings = context?.config || {};
  const allowDestructiveActions = configSettings.allowDestructiveActions || false;
  const allowFormFilling = configSettings.allowFormFilling || false;
  
  const systemPrompt = `You are an autonomous web exploration agent. Analyze the provided raw page data and make ALL exploration decisions.

Your task: Completely analyze the page and determine what actions to take, what elements are interactive, and how to explore this page.

IMPORTANT: You receive RAW page data. No pre-processing has been done. You must:
1. Identify all interactive elements yourself
2. Determine element types and purposes
3. Prioritize exploration actions
4. Classify navigation vs content actions
5. Assess page complexity and purpose
6. Provide business analysis and insights

CONFIGURATION CONSTRAINTS:
- Allow Destructive Actions: ${allowDestructiveActions} (if false, exclude delete, logout, move, etc.)
- Allow Form Filling: ${allowFormFilling} (if false, understand forms but don't include fill actions)

CORE AI-FIRST BEHAVIORS (always enabled):
- EXCLUDE global navigation elements (sidebar, header nav, footer links) - focus on page-specific content
- SMART URL deduplication - for list views, only include ONE representative item
- EXCLUDE non-revealing actions (filters, pagination, sorting) - focus on feature discovery

SMART DEDUPLICATION RULES:
When you detect URL patterns like /tickets/1, /tickets/2, /tickets/3:
- Include only ONE representative (e.g., /tickets/1)
- Note the pattern in your reasoning
- Focus on unique flows, not repetitive content

ACTION FILTERING RULES:
${allowDestructiveActions ? '' : '- EXCLUDE destructive actions: delete, remove, logout, move, archive, disable'}
${allowFormFilling ? '' : '- UNDERSTAND forms but EXCLUDE fill/type actions (focus on navigation and clicks)'}
- EXCLUDE global navigation elements (sidebar, header nav, footer links)
- EXCLUDE actions that only filter/sort content: search filters, pagination, sorting

FOCUS ON FEATURE-REVEALING ACTIONS:
- Actions that reveal new workflows or functionality
- Navigation to different page types or features
- Actions that change application state meaningfully
- Form submissions that create/update data (if allowed)
- Modal/dialog triggers that reveal new interfaces

CRITICAL: CATEGORIZE ACTIONS BY NAVIGATION IMPACT:

1. **NON_NAVIGATION ACTIONS** (execute first, stay on same page):
   - Click buttons that open modals, dropdowns, tabs
   - Focus input fields, toggle checkboxes
   - Form interactions that don't submit
   - UI state changes (expand/collapse, show/hide)
   - Filter/sort actions that modify page content

2. **NAVIGATION ACTIONS** (execute with return navigation):
   - Click links that navigate to different pages
   - Form submissions that navigate away
   - Buttons that change the URL
   - Any action that leaves the current page

3. **CROSS_FEATURE ACTIONS** (catalog only, don't execute):
   - Links to different application features
   - Global navigation elements
   - Footer links, external links

MODAL/POPOVER DETECTION:
For each action, analyze whether it is likely to trigger a modal, popover, dialog, or overlay:
- Consider button/link text (e.g., "Settings", "Help", "More info", "Details", "Edit", "Add", "Create")
- Consider element attributes (e.g., data-toggle="modal", aria-haspopup="dialog")
- Consider element type and context (e.g., icon buttons, "..." menus, info icons)
- Provide confidence score (0.0-1.0) for modal trigger likelihood
- High confidence (>0.7): Elements clearly designed to open modals
- Medium confidence (0.4-0.7): Elements that might open modals
- Low confidence (<0.4): Elements unlikely to open modals

IMPORTANT: CSS SELECTOR REQUIREMENTS:
- Use ONLY valid CSS selectors (no :contains() or jQuery-style selectors)
- For text-based selection, use clear descriptions instead
- Examples: 
  ✅ "button.btn-primary" (good)
  ✅ "a[href='/tickets']" (good)  
  ❌ "button:contains('Cancel')" (invalid CSS)
  ✅ Instead describe: "Cancel button with class btn-secondary"
- If text matching needed, describe the element clearly in the description field

Return analysis in this JSON format:
{
  "pageType": "landing|form|list|detail|dashboard|other",
  "mainPurpose": "brief description of page purpose",
  "pageBusinessSummary": {
    "businessValue": "What business value this page provides to users",
    "primaryActions": ["main actions users perform here - for analytics tracking"],
    "secondaryActions": ["secondary actions available - for analytics tracking"],
    "userJourney": "Where this page fits in typical user workflow"
  },
  "actions": [
    {
      "type": "click|type|navigate|wait|extract",
      "category": "non_navigation|navigation|cross_feature",
      "target": "css selector or element description",
      "value": "text to type (if applicable)",
      "description": "what this action does",
      "confidence": 0.0-1.0,
      "reasoning": "why this action is important for exploration",
      "navigatesAway": true/false,
      "targetUrl": "expected URL after action (if navigates)",
      "likelyTriggersModal": true/false,
      "modalTriggerConfidence": 0.0-1.0
    }
  ],
  "navigationElements": [
    {
      "selector": "css selector",
      "description": "element description",
      "type": "local|cross-feature",
      "confidence": 0.0-1.0
    }
  ],
  "insights": {
    "hasLogin": true/false,
    "hasForms": true/false,
    "hasDataTables": true/false,
    "hasNavigation": true/false,
    "complexity": "simple|medium|complex",
    "estimatedActions": number
  }
}`;

  const contextInfo = context ? `
**Exploration Context:**
- Current Feature: ${context.currentFeature || 'None'}
- Goal: ${context.explorationGoal || 'General exploration'}
- Visited Pages: ${context.visitedPages?.slice(-5).join(', ') || 'None'}
` : '';

  const userPrompt = `Analyze this raw page data and determine exploration strategy:

**Page URL:** ${rawData.url}
**Page Title:** ${rawData.title}
**Viewport:** ${rawData.viewport.width}x${rawData.viewport.height}

**Raw HTML Content:**
${rawData.html.substring(0, 60000)} ${rawData.html.length > 60000 ? '...[truncated]' : ''}

${contextInfo}

Provide complete autonomous analysis and action plan.`;

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

  try {
    const analysis: AIPageAnalysis = JSON.parse(jsonContent);
    logger.info('AI Analysis received:', analysis.pageType, analysis.mainPurpose);
    return analysis;
  } catch (error) {
    logger.error('Failed to parse AI response:', error);
    logger.error('Response content:', content);
    
    // Return fallback analysis
    return {
      pageType: 'other',
      mainPurpose: 'Unknown - AI parsing failed',
      pageBusinessSummary: {
        businessValue: 'Unknown',
        primaryActions: [],
        secondaryActions: [],
        userJourney: 'Unknown'
      },
      actions: [],
      navigationElements: [],
      insights: {
        hasLogin: false,
        hasForms: false,
        hasDataTables: false,
        hasNavigation: false,
        complexity: 'medium',
        estimatedActions: 0
      }
    };
  }
}

/**
 * Quick AI-based page classification for stopping conditions
 */
export async function classifyPageWithAI(rawData: RawPageData): Promise<{
  isLandingPage: boolean;
  confidence: number;
  reasoning: string;
}> {
  const llm = createRawPageAnalyzerLLM();

  const systemPrompt = `You are an expert at identifying web page types. Analyze the raw page data to determine if this is a landing/dashboard page.

Landing pages typically:
- Are entry points after login
- Have navigation to multiple features
- Show overviews or summaries
- Are not deeply nested content pages

Return JSON: { "isLandingPage": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation" }`;

  const userPrompt = `Analyze this page:

**URL:** ${rawData.url}
**Title:** ${rawData.title}

**HTML Sample:**
${rawData.html.substring(0, 3000)}

Is this a landing/dashboard page?`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt)
  ]);

  const content = response.content as string;
  let jsonContent = content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(jsonContent);
  } catch (error) {
    return {
      isLandingPage: false,
      confidence: 0.5,
      reasoning: 'AI parsing failed'
    };
  }
}

/**
 * Analyze current page using browser manager
 */
export async function analyzeCurrentPage(
  pageId: string = 'default',
  context?: {
    currentFeature?: string;
    explorationGoal?: string;
    visitedPages?: string[];
    config?: any;
  }
): Promise<AIPageAnalysis> {
  const rawData = await extractRawPageData(pageId);
  return analyzePageWithAI(rawData, context);
}