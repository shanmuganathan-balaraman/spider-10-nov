/**
 * Navigation Analyzer
 * AI-powered detection and analysis of global navigation structure
 * Enhanced with advanced AI prompts from crawl-agent for better classification
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLogger } from "../utils/logger";
import { config } from "../config";
import { LLMFactory } from './llm-factory';

const logger = createLogger("NavigationAnalyzer");

/**
 * Detected navigation item
 */
export interface NavigationItem {
  id: string;
  text: string;
  selector: string;
  url: string;
  icon?: string;
  location: "sidebar" | "topbar" | "content" | "other";
  type: "primary_feature" | "secondary_feature" | "utility_page";
  priority: number; // 1-300: primary, 301-600: secondary, 601+: utility
  presumedGlobal: boolean; // AI prediction if element appears globally
  isFeatureEntry: boolean;
  featureName?: string;
  childItems?: NavigationItem[];
  confidence: number;
}

/**
 * Navigation structure analysis - enhanced format from crawl-agent
 */
export interface NavigationStructure {
  sideNavigation: NavigationItem[];
  topNavigation: NavigationItem[];
  primaryFeatures: NavigationItem[];
  utilityPages: NavigationItem[];
  explorationQueue: NavigationItem[];
  detectedAt: number;
  pageUrl: string;
  analysis: {
    totalElementsFound: number;
    navigationStyle: "sidebar" | "topbar" | "mixed" | "minimal";
    primaryFeaturesCount: number;
    estimatedComplexity: "simple" | "moderate" | "complex";
    recommendedStartingPoint: string;
    hasGlobalNav: boolean;
    hasSidebar: boolean;
    hasHeaderNav: boolean;
    hasFooterNav: boolean;
    navigationCoverage: number; // percentage of page links that are navigation
  };
}

/**
 * Analyze global navigation structure with enhanced AI prompts from crawl-agent
 */
export async function analyzeNavigationStructure(
  pageUrl: string,
  rawPageData: {
    html: string;
    text: string;
    dom?: any;
  }
): Promise<NavigationStructure> {
  try {
    const model = LLMFactory.createNavigationAnalyzerLLM();

    logger.info(`Analyzing navigation structure: ${pageUrl}`);

    const systemPrompt = `You are a web navigation analyzer that discovers and categorizes ALL interactive elements on landing pages with intelligent global vs page-specific classification  

CORE OBJECTIVES:
1. Find every clickable element (links, buttons, interactive divs/spans)
2. Classify elements by location AND predict if they are global or page-specific
3. Apply smart deduplication to avoid repetitive URL patterns
4. Generate reliable selectors and prioritized exploration map

ELEMENT DISCOVERY:
- Links: <a> tags with href, elements with role="link"
- Buttons: <button> elements, elements with role="button"  
- Interactive: onclick handlers, cursor:pointer styling, data-* interaction attributes
- Forms: inputs, selects, textareas with interaction potential
- Navigation: <nav> elements, semantic navigation structures

GLOBAL vs PAGE-SPECIFIC CLASSIFICATION:

**GLOBAL NAVIGATION (Likely to appear on multiple pages):**
- Elements in <nav>, <header>, persistent sidebars
- Common navigation text: "Home", "Dashboard", "Settings", "Profile", "Logout", "Search"
- Site-wide utility functions: user menus, notifications, help
- Stable selectors without dynamic IDs
- Elements with semantic navigation roles

**PAGE-SPECIFIC ELEMENTS (Likely only on specific pages):**
- Content area actions: "Edit", "Delete", "View Details", "Create New"
- Context-specific buttons within main content
- Dynamic content with IDs: /items/123, /tickets/456
- Data table actions, form-specific controls
- Workflow-specific navigation steps

LOCATION CLASSIFICATION:
**Sidebar Navigation**: Persistent vertical navigation areas
- Semantic indicators: <nav> in vertical layouts, role="navigation"
- Visual indicators: Fixed/absolute positioning on left/right, constrained width
- Common patterns: Vertical stacking, persistent background, hierarchical links
- PREDICTION: Elements here are HIGHLY LIKELY to be GLOBAL

**Top Navigation**: Header and horizontal navigation areas  
- Semantic indicators: <header> tags, horizontal nav bars
- Visual indicators: Fixed/sticky positioning at top, horizontal layouts
- Common patterns: Site-wide navigation, user controls, search functionality
- PREDICTION: Elements here are HIGHLY LIKELY to be GLOBAL

**Content Area**: Main content interactive elements
- Primary actions within content sections
- Data tables, cards, lists with interactive elements
- Context-specific buttons and links
- PREDICTION: Elements here are LIKELY to be PAGE-SPECIFIC

BUSINESS PRIORITY CLASSIFICATION:
- **PRIMARY (1-300)**: Core workflows, main features, revenue-critical functions
- **SECONDARY (301-600)**: Advanced features, configuration, reporting  
- **UTILITY (601+)**: Account settings, help pages, legal pages

SMART DEDUPLICATION:
Detect URL patterns with dynamic IDs and include only ONE representative:
- Pattern: /items/1, /items/2, /items/3 → Include: /items/1 (as representative)
- Keep functional differences: /items (list), /items/new (create), /items/1 (detail)
- Apply to all categories to prevent exploration inefficiency

SELECTOR STRATEGY:
- Prefer: Unique IDs, specific classes, href attributes
- Fallback: nth-child, xpath for elements without good identifiers
- Ensure: Selectors are stable and uniquely target elements

OUTPUT: Return valid JSON with this structure including global predictions:
{
  "sideNavigation": [{"text": "Dashboard", "selector": "nav a[href='/dashboard']", "type": "primary_feature", "priority": 100, "presumedGlobal": true}],
  "topNavigation": [{"text": "Search", "selector": "input[type='search']", "type": "utility_page", "priority": 500, "presumedGlobal": true}],
  "primaryFeatures": [{"text": "Projects", "selector": "a[href='/projects']", "type": "primary_feature", "priority": 150, "presumedGlobal": false}],
  "utilityPages": [{"text": "Settings", "selector": "a[href='/settings']", "type": "utility_page", "priority": 650, "presumedGlobal": true}],
  "explorationQueue": [],
  "analysis": {
    "totalElementsFound": 0,
    "navigationStyle": "sidebar|topbar|mixed|minimal", 
    "primaryFeaturesCount": 0,
    "estimatedComplexity": "simple|moderate|complex",
    "recommendedStartingPoint": "selector_of_best_first_action"
  }
}`;

    const userPrompt = `Analyze this landing page to discover and categorize ALL interactive elements with global/page-specific predictions:

**PAGE CONTEXT:**
URL: ${pageUrl}
Title: ${rawPageData.html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || 'No title'}

**DOM CONTENT:**
${rawPageData.html}

**ANALYSIS PROCESS:**

1. **DISCOVER ELEMENTS**: Find all interactive elements throughout the DOM
   - Links with href attributes
   - Button elements and elements with button roles
   - Form inputs and interactive controls
   - Elements with click handlers or interaction indicators

2. **CLASSIFY BY LOCATION**: Determine where elements are positioned
   - **Sidebar**: Persistent vertical navigation (PREDICT: likely global)
   - **Header**: Top navigation areas (PREDICT: likely global)  
   - **Content**: Main content area elements (PREDICT: likely page-specific)

3. **PREDICT GLOBAL vs PAGE-SPECIFIC**: For each element, predict if it will appear on other pages
   - Global indicators: nav location, common text, semantic roles, stable selectors
   - Page-specific indicators: content actions, dynamic IDs, context-specific text

4. **PRIORITIZE BY FUNCTION**: Assign business importance
   - Core workflows and main features get lower priority numbers (higher importance)
   - Utility and support pages get higher priority numbers (lower importance)

5. **APPLY DEDUPLICATION**: Avoid repetitive patterns
   - If you find /items/1, /items/2, /items/3 → include only /items/1 as representative
   - Keep functional differences like /items (list) vs /items/new (create)

6. **GENERATE SELECTORS**: Create reliable, unique CSS selectors for each element

**CLASSIFICATION RULES:**
- Elements can appear in multiple categories (e.g., a sidebar link can be both sideNavigation AND primaryFeatures)
- Location classification is based on DOM structure analysis, not just CSS classes
- Priority reflects business value: lower numbers = higher importance
- Include "presumedGlobal": true/false for each element based on analysis

**GLOBAL PREDICTION GUIDELINES:**
- sideNavigation and topNavigation elements → presumedGlobal: true (default)
- primaryFeatures in content area → presumedGlobal: false (default, unless clearly global)
- utilityPages → presumedGlobal: true (if common utility functions)

**OUTPUT FORMAT:**
Return valid JSON with discovered elements categorized by location and importance. Include presumedGlobal prediction for each element and enhanced analysis section.

Focus on accurate global/page-specific predictions as this will guide subsequent validation.`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    const content = response.content as string;
    logger.info('AI Response length:', content.length);

    // Parse the AI response as JSON
    let jsonContent = content.trim();
    
    // Check if response contains JSON (look for JSON block)
    if (jsonContent.includes('```json')) {
      // Extract JSON from markdown code block
      const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }
    } else if (jsonContent.includes('{') && jsonContent.includes('}')) {
      // Look for JSON object in the response
      const jsonStart = jsonContent.indexOf('{');
      const jsonEnd = jsonContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
      } else {
        throw new Error('AI response does not contain valid JSON structure');
      }
    }
    
    let analysisResult;
    try {
      analysisResult = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.error('JSON parsing failed:', parseError);
      logger.error('Content that failed to parse:', jsonContent.substring(0, 500));
      throw new Error(`AI response is not valid JSON: ${parseError}`);
    }

    // Use AI-generated navigation structure directly (no validation needed)
    const navigationStructure: NavigationStructure = {
      sideNavigation: analysisResult.sideNavigation || [],
      topNavigation: analysisResult.topNavigation || [],
      primaryFeatures: analysisResult.primaryFeatures || [],
      utilityPages: analysisResult.utilityPages || [],
      explorationQueue: analysisResult.explorationQueue || [],
      detectedAt: Date.now(),
      pageUrl,
      analysis: {
        totalElementsFound: analysisResult.analysis?.totalElementsFound || 0,
        navigationStyle: analysisResult.analysis?.navigationStyle || "minimal",
        primaryFeaturesCount: analysisResult.analysis?.primaryFeaturesCount || 0,
        estimatedComplexity: analysisResult.analysis?.estimatedComplexity || "simple",
        recommendedStartingPoint: analysisResult.analysis?.recommendedStartingPoint || "",
        hasGlobalNav: analysisResult.analysis?.hasGlobalNav || false,
        hasSidebar: analysisResult.analysis?.hasSidebar || false,
        hasHeaderNav: analysisResult.analysis?.hasHeaderNav || false,
        hasFooterNav: analysisResult.analysis?.hasFooterNav || false,
        navigationCoverage: analysisResult.analysis?.navigationCoverage || 0,
      }
    };

    // Sort exploration queue by priority
    navigationStructure.explorationQueue.sort((a, b) => a.priority - b.priority);

    logger.info('Navigation structure analyzed:');
    logger.info(`- Side Navigation: ${navigationStructure.sideNavigation.length} items`);
    logger.info(`- Top Navigation: ${navigationStructure.topNavigation.length} items`);
    logger.info(`- Primary Features: ${navigationStructure.primaryFeatures.length} items`);
    logger.info(`- Utility Pages: ${navigationStructure.utilityPages.length} items`);
    logger.info(`- Exploration Queue: ${navigationStructure.explorationQueue.length} items`);

    return navigationStructure;
  } catch (error) {
    logger.error(`Failed to analyze navigation: ${error}`);
    throw error;
  }
}

/**
 * Identify feature entry points from enhanced navigation structure
 */
export async function identifyFeatureEntryPoints(
  navigation: NavigationStructure
): Promise<Array<{
  id: string;
  name: string;
  entryUrl: string;
  priority: number;
  description?: string;
}>> {
  const features: Array<{
    id: string;
    name: string;
    entryUrl: string;
    priority: number;
    description?: string;
  }> = [];

  // Combine all feature items from different categories
  const allFeatures = [
    ...navigation.primaryFeatures,
    ...navigation.sideNavigation.filter(item => item.type === 'primary_feature'),
    ...navigation.topNavigation.filter(item => item.type === 'primary_feature'),
  ];

  allFeatures.forEach((item) => {
    if (item.isFeatureEntry) {
      features.push({
        id: `feature_${Math.random().toString(36).substr(2, 9)}`,
        name: item.featureName || item.text,
        entryUrl: item.url,
        priority: item.priority,
        description: `Accessed from ${item.location} navigation`,
      });
    }
  });

  // Sort by priority (lower numbers = higher priority)
  features.sort((a, b) => a.priority - b.priority);

  logger.info(`Identified ${features.length} feature entry points`);
  return features;
}

/**
 * Get all explorable URLs from navigation structure
 */
export function getExploreableUrls(navigation: NavigationStructure): string[] {
  const urls = new Set<string>();
  
  // Add URLs from exploration queue (already sorted by priority)
  navigation.explorationQueue.forEach(item => {
    if (item.url && item.url !== '#') {
      urls.add(item.url);
    }
  });

  return Array.from(urls);
}
