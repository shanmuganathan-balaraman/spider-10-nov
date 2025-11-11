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
import { 
  createSystemPrompt, 
  createExecutionInstructions,
  DEFAULT_ANALYTICS_OBJECTIVES,
  type CrawlerObjectives 
} from '../ai/prompts';

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
  objectives?: CrawlerObjectives; // Current crawl objectives
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
  /** Enable structured output with type-safe schema validation (default: false) */
  structuredOutput?: boolean;
  /** Custom business objectives - defaults to analytics discovery objectives */
  objectives?: CrawlerObjectives;
  /** Additional customization to append to system prompt */
  systemCustomization?: string;
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
    const objectives = options?.objectives ?? DEFAULT_ANALYTICS_OBJECTIVES;
    const systemCustomization = options?.systemCustomization;

    // Create agent configuration with centralized prompts
    const agentConfig: any = {
      model: autonomousCrawlerState.model,
      tools: autonomousCrawlerState.tools,
      systemPrompt: createSystemPrompt(systemCustomization),
    };

    // Add structured output if requested
    if (useStructuredOutput) {
      agentConfig.responseFormat = CrawlResultSchema;
    }

    const agent = createAgent(agentConfig);

    autonomousCrawlerState.agent = agent;
    autonomousCrawlerState.objectives = objectives; // Store objectives for use in execution

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

    // Use centralized prompt system for execution instructions
    const crawlInstructions = createExecutionInstructions(
      autonomousCrawlerState.objectives || DEFAULT_ANALYTICS_OBJECTIVES,
      credentials ? { username: credentials.username || '', password: credentials.password || '' } : undefined
    );
    // Use modern agent invocation with messages
    try {
      logger.info("Starting agent execution...");
      const result = await autonomousCrawlerState.agent.invoke({
        messages: [{ role: "user", content: crawlInstructions }],
      });

      logger.info("Autonomous crawl completed successfully");

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
    } catch (agentError) {
      logger.error("Agent execution failed:", agentError);
      
      // Return a partial success response for some common errors
      const errorMsg = agentError instanceof Error ? agentError.message : String(agentError);
      if (errorMsg.includes("Target page, context or browser has been closed")) {
        logger.warn("Browser was closed during execution, likely due to concurrent operations");
        return {
          success: false,
          message: "Crawl interrupted due to browser closure during concurrent operations",
          error: "Browser concurrency issue - this may be resolved by reducing parallel operations",
        };
      }
      
      throw agentError; // Re-throw for other errors
    }
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
