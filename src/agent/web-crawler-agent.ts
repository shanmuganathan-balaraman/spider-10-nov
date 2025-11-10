import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "@langchain/classic/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { Tool } from "@langchain/core/tools";
import { getBrowserTools } from "../tools/browser-tools";
import { getAnalysisTools } from "../tools/analysis-tools";
import { createLogger } from "../utils/logger";
import { config } from "../config";

const logger = createLogger("WebCrawlerAgent");

export interface CrawlOptions {
  url: string;
  objective: string;
  maxIterations?: number;
  pageId?: string;
}

export interface CrawlResult {
  success: boolean;
  url: string;
  objective: string;
  findings: string;
  steps_taken: number;
  duration_ms: number;
  error?: string;
}

interface AgentState {
  model: ChatOpenAI | null;
  tools: Tool[];
  executor: AgentExecutor | null;
}

// Global agent state
let agentState: AgentState = {
  model: null,
  tools: [],
  executor: null,
};

/**
 * Initialize the agent with LLM and tools
 */
export async function initializeAgent(): Promise<void> {
  try {
    logger.info("Initializing WebCrawlerAgent...");

    // Set OPENAI_API_KEY for the OpenAI client (TogetherAI is OpenAI-compatible)
    if (config.togetherAiApiKey) {
      process.env.OPENAI_API_KEY = config.togetherAiApiKey;
    }

    // Initialize the LLM using TogetherAI with OpenAI compatibility
    agentState.model = new ChatOpenAI({
      apiKey: config.togetherAiApiKey,
      model: config.togetherAiModel,
      configuration: {
        baseURL: "https://api.together.xyz/v1",
      },
      temperature: 0,
    });

    // Collect all tools
    agentState.tools = [...getBrowserTools(), ...getAnalysisTools()];

    logger.info(`Agent initialized with ${agentState.tools.length} tools`);
    logger.info(`Using model: ${config.togetherAiModel}`);
  } catch (error) {
    logger.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Crawl a website with the agent
 */
export async function crawl(options: CrawlOptions): Promise<CrawlResult> {
  const startTime = Date.now();

  if (!agentState.model) {
    throw new Error("Agent not initialized. Call initializeAgent() first.");
  }

  try {
    logger.info(`Starting crawl: ${options.url}`);
    logger.info(`Objective: ${options.objective}`);

    // Create the agent prompt
    const systemPrompt = `You are an autonomous web crawler agent powered by LLaMA. Your task is to:
1. Navigate to the provided URL
2. Analyze the page content and structure
3. Follow the exploration objective
4. Report findings and insights

Available tools:
- Navigate to pages (navigate_to_page)
- Extract page content (get_page_dom, get_page_text)
- Interact with elements (click_element, fill_input)
- Analyze content (analyze_page_content)
- Wait for dynamic content (wait_for_element)
- Take screenshots (take_screenshot)

Instructions:
- Always start by navigating to the target URL
- Use get_page_dom and get_page_text to understand page structure
- Create an exploration plan based on the objective
- Execute the plan systematically
- Report findings with specific details
- If you encounter errors, document them and try alternative approaches
- Be concise and focused on the objective

Objective: ${options.objective}
Target URL: ${options.url}`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create the agent
    const agent = await createToolCallingAgent({
      llm: agentState.model,
      tools: agentState.tools,
      prompt: prompt,
    });

    // Create the executor
    const executor = new AgentExecutor({
      agent: agent,
      tools: agentState.tools,
      verbose: config.isDevelopment,
      maxIterations: options.maxIterations || 10,
    });

    // Run the agent
    const result = await executor.invoke({
      input: `Please crawl ${options.url} with the following objective: ${options.objective}`,
      chat_history: [],
    });

    const duration = Date.now() - startTime;

    logger.info(`Crawl completed in ${duration}ms`);

    return {
      success: true,
      url: options.url,
      objective: options.objective,
      findings: result.output || "No findings reported",
      steps_taken: result.steps || 0,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error(`Crawl failed: ${errorMsg}`);

    return {
      success: false,
      url: options.url,
      objective: options.objective,
      findings: "",
      steps_taken: 0,
      duration_ms: duration,
      error: errorMsg,
    };
  }
}

/**
 * Get all available tools
 */
export function getTools(): Tool[] {
  return agentState.tools;
}

/**
 * Close agent and cleanup
 */
export async function closeAgent(): Promise<void> {
  logger.info("Closing agent...");
  agentState = {
    model: null,
    tools: [],
    executor: null,
  };
}

/**
 * Get current agent state
 */
export function getAgentState(): AgentState {
  return agentState;
}
