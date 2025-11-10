/**
 * Page Analyzer
 * AI-powered analysis of page content and interactions
 */

import { ChatOpenAI } from "@langchain/openai";
import { createLogger } from "../utils/logger";
import { config } from "../config";
import { z } from "zod";

const logger = createLogger("PageAnalyzer");

/**
 * Configuration for page analysis
 */
export interface PageAnalysisConfig {
  allowDestructiveActions?: boolean;
  allowFormFilling?: boolean;
}

/**
 * Analyzed interactive element
 */
export interface InteractiveElement {
  id: string;
  selector: string;
  type: string;
  text?: string;
  href?: string;
  description: string;
  actionType: "navigation" | "non_navigation" | "cross_feature" | "form" | "modal_trigger";
  targetUrl?: string;
  targetFeature?: string;
  businessContext?: string;
  userIntent?: string;
  confidence: number;
}

/**
 * Page analysis result
 */
export interface PageAnalysisResult {
  pageUrl: string;
  pageTitle: string;
  pageType: string;
  pageDescription: string;
  elements: InteractiveElement[];
  navigationLinks: string[];
  crossFeatureLinks: Map<string, string[]>;
  forms: Array<{
    id: string;
    type: string;
    fields: string[];
    actionType: "submit" | "modal" | "state_change";
  }>;
  modals: string[];
  businessValue: "primary" | "secondary" | "utility";
  confidence: number;
  recommendations?: string[];
}

/**
 * Analyze page using AI
 */
export async function analyzePage(
  pageUrl: string,
  pageTitle: string,
  rawPageData: {
    html: string;
    text: string;
    dom: any;
  },
  pageConfig: PageAnalysisConfig = {}
): Promise<PageAnalysisResult> {
  try {
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || config.togetherAiApiKey,
      model: config.togetherAiModel,
      configuration: {
        baseURL: "https://api.together.xyz/v1",
      },
      temperature: 0.1,
    });

    logger.info(`Analyzing page: ${pageUrl}`);

    // Create analysis prompt
    const analysisPrompt = createAnalysisPrompt(
      pageUrl,
      pageTitle,
      rawPageData,
      pageConfig
    );

    // Call AI model
    const response = await model.invoke([
      {
        role: "user",
        content: analysisPrompt,
      },
    ]);

    // Parse response
    const content = response.content as string;
    const analysis = parseAnalysisResponse(content, pageUrl);

    logger.info(
      `Page analysis complete: ${analysis.elements.length} interactive elements found`
    );

    return analysis;
  } catch (error) {
    logger.error(`Failed to analyze page: ${error}`);
    throw error;
  }
}

/**
 * Analyze page structure for pattern matching
 */
export async function analyzePageStructure(
  pageUrl: string,
  rawPageData: {
    html: string;
    text: string;
    dom: any;
  }
): Promise<Record<string, any>> {
  try {
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || config.togetherAiApiKey,
      model: config.togetherAiModel,
      configuration: {
        baseURL: "https://api.together.xyz/v1",
      },
      temperature: 0.1,
    });

    const structurePrompt = `Analyze the page structure and return a JSON object with:
{
  "layout": "single_column|multi_column|grid|other",
  "mainContentArea": "identified|not_found",
  "navigationPresent": boolean,
  "sidebarPresent": boolean,
  "hasHeader": boolean,
  "hasFooter": boolean,
  "formCount": number,
  "buttonCount": number,
  "linkCount": number,
  "imageCount": number,
  "textSections": number,
  "uniqueIdentifiers": ["class_names", "ids"],
  "semanticType": "list|grid|table|form|gallery|other"
}

Page HTML:
${rawPageData.html.substring(0, 5000)}`;

    const response = await model.invoke([
      {
        role: "user",
        content: structurePrompt,
      },
    ]);

    const content = response.content as string;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {};
  } catch (error) {
    logger.error(`Failed to analyze page structure: ${error}`);
    return {};
  }
}

/**
 * Detect modal dialogs
 */
export async function detectModals(
  pageUrl: string,
  rawPageData: {
    html: string;
    text: string;
    dom: any;
  }
): Promise<
  Array<{
    type: string;
    selector?: string;
    closeTrigger?: string;
    title?: string;
  }>
> {
  try {
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || config.togetherAiApiKey,
      model: config.togetherAiModel,
      configuration: {
        baseURL: "https://api.together.xyz/v1",
      },
      temperature: 0.1,
    });

    const modalPrompt = `Identify all modal dialogs, popups, or overlay elements in this page.
Return JSON array of modals found:
[
  {
    "type": "modal|popover|toast|dialog|overlay",
    "selector": "css_selector_if_found",
    "closeTrigger": "close_button_selector",
    "title": "modal_title_if_present",
    "purpose": "brief_description"
  }
]

If no modals found, return empty array: []

Page HTML (first 4000 chars):
${rawPageData.html.substring(0, 4000)}`;

    const response = await model.invoke([
      {
        role: "user",
        content: modalPrompt,
      },
    ]);

    const content = response.content as string;

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    logger.error(`Failed to detect modals: ${error}`);
    return [];
  }
}

/**
 * Create analysis prompt
 */
function createAnalysisPrompt(
  pageUrl: string,
  pageTitle: string,
  rawPageData: {
    html: string;
    text: string;
    dom: any;
  },
  config: PageAnalysisConfig
): string {
  const destructiveWarning = config.allowDestructiveActions
    ? ""
    : "IMPORTANT: Exclude destructive actions like delete, remove, logout, or clear.";

  const formWarning = config.allowFormFilling
    ? ""
    : "IMPORTANT: Identify forms but do NOT recommend filling/submitting them.";

  return `Analyze this web page and identify all interactive elements.

Page URL: ${pageUrl}
Page Title: ${pageTitle}

${destructiveWarning}
${formWarning}

Return a detailed JSON analysis with this structure:
{
  "pageType": "dashboard|list|detail|form|settings|search|profile|cart|checkout|other",
  "pageDescription": "brief description of page purpose",
  "businessValue": "primary|secondary|utility",
  "elements": [
    {
      "id": "unique_id",
      "selector": "css_selector",
      "type": "link|button|input|select|form|dropdown|tab|modal_trigger|other",
      "text": "visible_text",
      "href": "link_target_if_applicable",
      "actionType": "navigation|non_navigation|cross_feature|form|modal_trigger",
      "targetUrl": "url_if_navigation",
      "targetFeature": "feature_name_if_cross_feature",
      "description": "what_does_this_element_do",
      "businessContext": "why_this_element_matters",
      "userIntent": "what_user_wants_to_accomplish",
      "confidence": 0.95
    }
  ],
  "navigationLinks": ["url1", "url2"],
  "crossFeatureLinks": {"feature_name": ["url1", "url2"]},
  "forms": [
    {
      "id": "form_id",
      "type": "login|search|filter|contact|other",
      "fields": ["field_names"],
      "actionType": "submit|modal|state_change"
    }
  ],
  "modals": ["modal_types_detected"],
  "recommendations": ["optimization_suggestions"],
  "confidence": 0.9
}

Page HTML (first 8000 characters):
${rawPageData.html.substring(0, 8000)}

Page Text Content:
${rawPageData.text.substring(0, 2000)}`;
}

/**
 * Parse AI response
 */
function parseAnalysisResponse(
  content: string,
  pageUrl: string
): PageAnalysisResult {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      logger.warn(`No JSON found in analysis response for ${pageUrl}`);
      return createEmptyAnalysis(pageUrl);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Convert to typed result
    const crossFeatureLinks = new Map<string, string[]>();
    if (parsed.crossFeatureLinks) {
      Object.entries(parsed.crossFeatureLinks).forEach(([feature, urls]) => {
        crossFeatureLinks.set(feature, urls as string[]);
      });
    }

    return {
      pageUrl,
      pageTitle: parsed.pageTitle || "Untitled",
      pageType: parsed.pageType || "other",
      pageDescription: parsed.pageDescription || "",
      elements: (parsed.elements || []).map((el: any) => ({
        id: el.id || `element_${Math.random()}`,
        selector: el.selector || "",
        type: el.type || "unknown",
        text: el.text,
        href: el.href,
        description: el.description || "",
        actionType: el.actionType || "non_navigation",
        targetUrl: el.targetUrl,
        targetFeature: el.targetFeature,
        businessContext: el.businessContext,
        userIntent: el.userIntent,
        confidence: el.confidence || 0.8,
      })),
      navigationLinks: parsed.navigationLinks || [],
      crossFeatureLinks,
      forms: parsed.forms || [],
      modals: parsed.modals || [],
      businessValue: parsed.businessValue || "secondary",
      confidence: parsed.confidence || 0.8,
      recommendations: parsed.recommendations,
    };
  } catch (error) {
    logger.error(`Failed to parse analysis response: ${error}`);
    return createEmptyAnalysis(pageUrl);
  }
}

/**
 * Create empty analysis result
 */
function createEmptyAnalysis(pageUrl: string): PageAnalysisResult {
  return {
    pageUrl,
    pageTitle: "Unknown",
    pageType: "unknown",
    pageDescription: "",
    elements: [],
    navigationLinks: [],
    crossFeatureLinks: new Map(),
    forms: [],
    modals: [],
    businessValue: "utility",
    confidence: 0,
  };
}

/**
 * Batch analyze multiple pages
 */
export async function analyzePages(
  pages: Array<{
    url: string;
    title: string;
    rawData: {
      html: string;
      text: string;
      dom: any;
    };
  }>,
  config?: PageAnalysisConfig
): Promise<PageAnalysisResult[]> {
  const results: PageAnalysisResult[] = [];

  for (const page of pages) {
    try {
      const result = await analyzePage(page.url, page.title, page.rawData, config);
      results.push(result);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      logger.warn(`Skipped analysis for ${page.url}: ${error}`);
    }
  }

  return results;
}
