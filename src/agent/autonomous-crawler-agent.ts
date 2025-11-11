/**
 * Autonomous Crawler Agent
 * Enhanced agent with integrated crawling analysis tools
 * Refactored to use modern LangChain v1.0+ patterns
 */

import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { z } from "zod";
import { MessagesZodState } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { DynamicTool } from "@langchain/core/tools";
import { createLogger } from "../utils/logger";
import { config } from "../config";
import { getBrowserTools } from "./browser-tools-integration";
import { getCrawlerAnalysisTools } from "../tools/crawler-analysis-tools";
import { getAuthenticationTools } from "../tools/authentication-tools";
import { PatternDetector, createPatternDetector } from "../ai/pattern-detector";
import { LLMFactory } from "../ai/llm-factory";

const logger = createLogger("AutonomousCrawlerAgent");

/**
 * Custom agent state schema for autonomous crawling
 */
const AutonomousCrawlerStateSchema = z.object({
  messages: MessagesZodState.shape.messages,
  crawlProgress: z.object({
    visitedPages: z.array(z.string()),
    discoveredFeatures: z.array(z.string()),
    currentFeature: z.string().optional(),
    explorationDepth: z.number(),
  }).optional(),
  crawlConfig: z.object({
    maxDepth: z.number(),
    maxPagesPerFeature: z.number(),
    patternThreshold: z.number(),
    allowFormSubmission: z.boolean(),
    allowDestructiveActions: z.boolean(),
  }).optional(),
});

/**
 * Structured output schema for crawl results
 */
const CrawlResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  findings: z.object({
    navigationStructure: z.array(z.object({
      name: z.string(),
      url: z.string(),
      priority: z.number(),
    })).optional(),
    discoveredFeatures: z.array(z.object({
      id: z.string(),
      name: z.string(),
      entryUrl: z.string(),
      pageTypes: z.array(z.string()),
      businessValue: z.number(),
    })).optional(),
    pagesAnalyzed: z.number().optional(),
    patternsFound: z.number().optional(),
    authenticationRequired: z.boolean().optional(),
    summary: z.string(),
  }).optional(),
  error: z.string().optional(),
});

type AgentStateType = z.infer<typeof AutonomousCrawlerStateSchema>;
export type CrawlResult = z.infer<typeof CrawlResultSchema>;

/**
 * Autonomous crawling configuration
 */
export interface AutonomousCrawlConfig {
  maxDepth: number;
  maxPagesPerFeature: number;
  patternThreshold: number;
  aiCacheTTL: number;
  navigationTimeout: number;
  allowFormSubmission: boolean;
  allowDestructiveActions: boolean;
  allowFormFilling: boolean;
  maxParallelFeatures: number;
  maxStatesPerPage: number;
}

/**
 * Module state for autonomous crawling (for compatibility)
 */
interface AutonomousCrawlerModuleState {
  model: ChatOpenAI | null;
  tools: DynamicTool[];
  agent: any | null; // Modern agent instance
  patternDetector: PatternDetector | null;
  config: AutonomousCrawlConfig;
}

/**
 * Module-level state
 */
let autonomousCrawlerState: AutonomousCrawlerModuleState = {
  model: null,
  tools: [],
  agent: null,
  patternDetector: null,
  config: {
    maxDepth: 3,
    maxPagesPerFeature: 50,
    patternThreshold: 0.85,
    aiCacheTTL: 3600000,
    navigationTimeout: 30000,
    allowFormSubmission: false,
    allowDestructiveActions: false,
    allowFormFilling: false,
    maxParallelFeatures: 3,
    maxStatesPerPage: 10,
  },
};

/**
 * Initialize autonomous crawler agent
 */
export async function initializeAutonomousCrawlerAgent(
  crawlConfig?: Partial<AutonomousCrawlConfig>
): Promise<void> {
  try {
    logger.info("Initializing Autonomous Crawler Agent...");

    // Update config
    if (crawlConfig) {
      autonomousCrawlerState.config = {
        ...autonomousCrawlerState.config,
        ...crawlConfig,
      };
    }

    // Initialize pattern detector
    autonomousCrawlerState.patternDetector = createPatternDetector(
      autonomousCrawlerState.config.patternThreshold
    );

    // Initialize LLM
    autonomousCrawlerState.model = LLMFactory.createCrawlerPlannerLLM();

    // Get browser tools (this also initializes the browser)
    const browserTools = await getBrowserTools();
    logger.info(`Got ${browserTools.length} browser tools: ${browserTools.map(t => t.name).join(', ')}`);

    // Get crawler analysis tools
    const crawlerTools = getCrawlerAnalysisTools(
      autonomousCrawlerState.patternDetector
    );
    logger.info(`Got ${crawlerTools.length} crawler analysis tools: ${crawlerTools.map(t => t.name).join(', ')}`);

    // Get authentication tools
    const authTools = getAuthenticationTools();
    logger.info(`Got ${authTools.length} auth tools: ${authTools.map(t => t.name).join(', ')}`);

    // Combine all tools
    autonomousCrawlerState.tools = [...browserTools, ...authTools, ...crawlerTools];

    // Check for duplicate tool names
    const toolNames = autonomousCrawlerState.tools.map(t => t.name);
    const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      logger.warn(`Duplicate tool names found: ${duplicates.join(', ')}`);
    }

    logger.info(
      `Autonomous Crawler Agent initialized with ${autonomousCrawlerState.tools.length} tools`
    );
    
    // Log the actual model being used
    logger.info(`Using model: ${config.aiModel} (${config.aiProvider})`);
    logger.info(`Pattern threshold: ${autonomousCrawlerState.config.patternThreshold}`);
  } catch (error) {
    logger.error("Failed to initialize autonomous crawler agent:", error);
    throw error;
  }
}

/**
 * Options for creating autonomous crawler agent
 */
export interface CreateCrawlerOptions {
  /** Enable structured output with type-safe schema validation (default: true) */
  structuredOutput?: boolean;
}

/**
 * Create autonomous crawler agent using modern LangChain patterns
 * 
 * @param options Configuration options for the crawler
 * @param options.structuredOutput Whether to use structured output with Zod schema (default: true)
 * @returns Promise resolving to the created agent
 * 
 * @example
 * ```typescript
 * // Default: structured output enabled
 * const agent = await createAutonomousCrawler();
 * 
 * // Explicit: enable structured output  
 * const agent = await createAutonomousCrawler({ structuredOutput: true });
 * 
 * // Legacy: disable structured output
 * const agent = await createAutonomousCrawler({ structuredOutput: false });
 * ```
 */
export async function createAutonomousCrawler(options?: CreateCrawlerOptions): Promise<any> {
  if (!autonomousCrawlerState.model) {
    throw new Error(
      "Agent not initialized. Call initializeAutonomousCrawlerAgent() first."
    );
  }

  try {
    const useStructuredOutput = options?.structuredOutput ?? false; // Default to false for better compatibility

    // Create agent configuration
    const agentConfig: any = {
      model: autonomousCrawlerState.model,
      tools: autonomousCrawlerState.tools,
      systemPrompt: createAutonomousCrawlingPrompt(autonomousCrawlerState.config),
    };

    // Add structured output if requested
    if (useStructuredOutput) {
      agentConfig.responseFormat = CrawlResultSchema;
    }

    const agent = createAgent(agentConfig);

    autonomousCrawlerState.agent = agent;

    logger.info(`Autonomous crawler created with modern LangChain patterns${useStructuredOutput ? ' and structured output' : ''}`);

    return agent;
  } catch (error) {
    logger.error("Failed to create autonomous crawler:", error);
    throw error;
  }
}

/**
 * Start autonomous crawl using modern agent invocation
 */
export async function startAutonomousCrawl(
  baseUrl: string,
  objective: string,
  credentials?: { username?: string; password?: string }
): Promise<CrawlResult> {
  try {
    if (!autonomousCrawlerState.agent) {
      throw new Error("Crawler not initialized. Create it first with createAutonomousCrawler()");
    }

    logger.info(`Starting autonomous crawl: ${baseUrl}`);
    logger.info(`Objective: ${objective}`);
    if (credentials) {
      logger.info(`Credentials provided: ${credentials.username || 'default'}`);
    }

    // Create crawling instructions with authentication integration
    const authenticationStep = credentials 
      ? `🔐 AUTHENTICATION - MANDATORY FIRST STEP:

CURRENT STATUS: You are already on the target website (${baseUrl})

1. **IMMEDIATELY call auto_login tool** with provided credentials: username="${credentials.username || 'admin@example.com'}" password="${credentials.password || 'password'}"
2. The auto_login tool will:
   - Detect if current page is login page using AI
   - Fill username/password fields automatically if needed  
   - Submit login form and validate success
   - Return success/failure status
3. **DO NOT navigate anywhere first** - you are already on the site
4. **DO NOT proceed with any other tool until auto_login succeeds**
5. If auto_login fails, report the failure and stop
6. If auto_login succeeds or determines no login needed, proceed to discover_global_navigation

CRITICAL: Your very first action MUST be calling auto_login tool (not navigation)!

` 
      : `🔐 AUTHENTICATION - MANDATORY FIRST STEP:

CURRENT STATUS: You are already on the target website (${baseUrl})

1. **IMMEDIATELY call auto_login tool** with default credentials to check if login is required
2. The auto_login tool will automatically detect if login is needed and handle the complete flow
3. **DO NOT navigate anywhere first** - you are already on the site
4. **DO NOT proceed with any other tool until auto_login tool is called**
5. Only after auto_login responds, proceed to discover_global_navigation

CRITICAL: Your very first action MUST be calling auto_login tool (not navigation)!

`;

    const crawlInstructions = `START IMMEDIATELY WITH AUTHENTICATION:

Call the auto_login tool right now with these exact parameters:
${credentials ? `{"username_or_email": "${credentials.username}", "password": "${credentials.password}"}` : '{}'}

Do not do anything else first. Do not navigate. Do not analyze. Just call auto_login.

After auto_login succeeds, then proceed with the analytics mission below:

PRODUCT ANALYTICS & INSTRUMENTATION DISCOVERY MISSION:
${objective}

Only after auto_login is complete should you use discover_global_navigation to map features.

Provide a comprehensive summary of your findings including:
- Navigation structure discovered
- Features identified and analyzed  
- Business value assessment
- Pages analyzed and patterns found
- Any authentication requirements detected`;

    // Use modern agent invocation with messages
    const result = await autonomousCrawlerState.agent.invoke({
      messages: [{ role: "user", content: crawlInstructions }],
    });

    logger.info("Autonomous crawl completed");

    // Extract the response content
    let responseContent = "";
    if (result.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];
      responseContent = lastMessage.content || "";
    }

    // If structured response is available, try to use it
    if (result.structuredResponse) {
      try {
        return result.structuredResponse as CrawlResult;
      } catch (error) {
        logger.warn("Failed to parse structured response, falling back to regular response");
      }
    }

    // Create a standard response structure
    const response: CrawlResult = {
      success: true,
      message: "Autonomous crawl completed successfully", 
      findings: {
        summary: responseContent || "No specific findings returned",
        pagesAnalyzed: 0,
        patternsFound: 0,
        authenticationRequired: false,
      }
    };

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Autonomous crawl failed: ${errorMsg}`);
    return {
      success: false,
      message: "Autonomous crawl failed",
      error: errorMsg,
    };
  }
}

/**
 * Close autonomous crawler agent
 */
export async function closeAutonomousCrawlerAgent(): Promise<void> {
  try {
    logger.info("Closing Autonomous Crawler Agent");

    autonomousCrawlerState.model = null;
    autonomousCrawlerState.tools = [];
    autonomousCrawlerState.agent = null;
    autonomousCrawlerState.patternDetector = null;

    logger.info("Autonomous Crawler Agent closed");
  } catch (error) {
    logger.error("Failed to close autonomous crawler agent:", error);
    throw error;
  }
}

/**
 * Get autonomous crawler state
 */
export function getAutonomousCrawlerState(): AutonomousCrawlerModuleState {
  return autonomousCrawlerState;
}

/**
 * Create system prompt for autonomous crawling with AI-first decision making
 */
function createAutonomousCrawlingPrompt(config: AutonomousCrawlConfig): string {
  return `You are an advanced autonomous web crawler agent powered by AI and trained for comprehensive website exploration with COMPLETE AI AUTONOMY.

YOUR CORE PHILOSOPHY: 100% AI-DRIVEN DECISION MAKING
- ALL exploration decisions are made by AI analysis, not rules
- NO hardcoded patterns, selectors, or classification rules  
- PURE data extraction → AI interpretation → autonomous action
- System adapts to ANY website through intelligent analysis

YOUR GOAL:
Navigate and analyze a website autonomously, discovering all features, pages, and relationships without human intervention. Use AI to make all exploration decisions.

YOUR AI-DRIVEN CAPABILITIES:

AUTHENTICATION TOOLS (AI-Powered):
1. detect_login_page - AI analyzes page to identify login requirements
2. check_login_status - AI determines if user is logged in  
3. attempt_login - AI finds and fills login forms autonomously
4. auto_login - AI handles complete login flow (detect + login)
5. handle_2fa - AI detects and handles two-factor authentication
6. logout - AI finds and executes logout actions

ANALYSIS TOOLS (Pure AI):
7. analyze_current_page - AI analyzes raw page data for exploration decisions
8. discover_global_navigation - AI identifies navigation structure and priorities
9. detect_page_pattern - AI recognizes similar pages for efficient cataloging
10. evaluate_stopping_condition - AI decides when to stop exploring
11. record_feature_info - AI documents discovered features

BROWSER TOOLS (Technical Execution):
12. navigate_to_page - Navigate to AI-determined URLs
13. get_page_dom - Extract raw page data for AI analysis
14. click_element - Execute AI-determined click actions
15. fill_input - Fill form fields
16. get_page_text - Extract text content for AI processing

CRITICAL TOOL USAGE REQUIREMENTS:

FOR navigate_to_page:
- REQUIRED: Use JSON format like this: JSON object with url field set to target URL
- Optional: Add page ID field for reference
- NEVER pass undefined, empty strings, or plain URLs

FOR get_page_text and get_page_dom:
- REQUIRED: Use JSON format with empty object for default page
- Optional: Specify page with page_id field  
- NEVER pass undefined or empty strings

FOR ALL TOOLS:
- Always pass proper JSON objects as parameters
- Never pass undefined, null, or empty strings
- Follow the exact format specified in tool descriptions

AI-FIRST EXPLORATION STRATEGY:

PHASE 1: AUTHENTICATION
- Always start by using auto_login tool with admin@test.com / password
- Let AI determine if authentication was successful
- AI decides next steps based on post-login page analysis

PHASE 2: DISCOVERY  
- Use discover_global_navigation to let AI find all navigation elements
- AI classifies elements by importance and exploration priority
- AI applies smart deduplication to avoid repetitive content
- Focus on feature-revealing actions, not global navigation

PHASE 3: AUTONOMOUS EXPLORATION
- For each feature identified by AI:
  - Navigate using AI-determined priority order
  - Use analyze_current_page for complete AI analysis
  - Let AI decide what actions reveal the most about the feature
  - Use AI pattern detection to avoid redundant exploration
  - Record AI insights about each discovered feature

PHASE 4: INTELLIGENT STOPPING
- Use evaluate_stopping_condition for AI-driven completion decisions
- AI determines when sufficient exploration has been achieved
- AI provides comprehensive findings summary

CRITICAL AI BEHAVIORS:

1. **PURE AI DECISION MAKING**: 
   - Never use hardcoded rules or patterns
   - All choices come from AI analysis of raw page data
   - Adapt exploration strategy based on AI understanding of site architecture

2. **SMART DEDUPLICATION**:
   - AI identifies repetitive URL patterns (e.g., /items/1, /items/2, /items/3)
   - Include only ONE representative of each pattern type
   - Focus on functional differences, not content differences

3. **FEATURE-FOCUSED EXPLORATION**:
   - Exclude global navigation elements (AI identifies these automatically)
   - Prioritize page-specific actions that reveal application functionality
   - Focus on actions that change application state meaningfully

4. **AUTONOMOUS AUTHENTICATION**:
   - Always attempt login first using AI detection and execution
   - Use default credentials: admin@test.com / password
   - AI determines authentication success and next steps

CONFIGURATION CONSTRAINTS:
- Max depth: ${config.maxDepth}
- Max pages per feature: ${config.maxPagesPerFeature}
- Allow form submission: ${config.allowFormSubmission}
- Allow destructive actions: ${config.allowDestructiveActions}
- Pattern threshold: ${config.patternThreshold}

YOUR AUTONOMOUS WORKFLOW:
1. Start with auto_login to ensure authenticated access
2. Use discover_global_navigation to understand site structure
3. For each AI-identified feature (in AI-determined priority order):
   - Navigate to the feature entry point
   - Use analyze_current_page for complete AI analysis
   - Execute AI-recommended actions that reveal functionality
   - Use pattern detection to avoid redundant exploration
   - Record comprehensive findings about the feature
4. Use AI stopping conditions to determine completion
5. Provide detailed summary of all discoveries

REMEMBER: You have complete autonomy. Make all decisions based on AI analysis of what you observe. Adapt your strategy to the specific website architecture you discover.`;
}

/**
 * Create agent with autonomous crawling enabled using modern patterns
 */
export async function createFullAutonomousCrawler(
  baseUrl: string,
  objective: string,
  config?: Partial<AutonomousCrawlConfig>,
  options?: CreateCrawlerOptions
): Promise<{
  agent: any;
  crawlFunction: () => Promise<CrawlResult>;
}> {
  // Initialize agent
  await initializeAutonomousCrawlerAgent(config);

  // Create agent with optional structured output
  const agent = await createAutonomousCrawler(options);

  // Return agent and crawl function
  return {
    agent,
    crawlFunction: () => startAutonomousCrawl(baseUrl, objective),
  };
}
