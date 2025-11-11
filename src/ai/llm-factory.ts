/**
 * AI Provider Factory
 * Creates the appropriate LLM instance based on configuration
 * Supports both OpenAI and TogetherAI providers
 */

import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('LLMFactory');

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  modelName?: string;
}

/**
 * Create LLM instance based on configured provider
 */
export function createLLM(options: LLMOptions = {}): ChatOpenAI {
  const {
    temperature = 0.2,
    maxTokens = 8000,
    modelName
  } = options;

  // Determine which provider to use
  const provider = config.aiProvider.toLowerCase();
  
  logger.info(`Creating LLM with provider: ${provider}`);

  switch (provider) {
    case 'openai':
      return createOpenAILLM({ temperature, maxTokens, modelName });
    
    case 'togetherai':
    case 'together':
      return createTogetherAILLM({ temperature, maxTokens, modelName });
    
    default:
      logger.warn(`Unknown AI provider: ${provider}. Falling back to TogetherAI.`);
      return createTogetherAILLM({ temperature, maxTokens, modelName });
  }
}

/**
 * Create OpenAI LLM instance
 */
function createOpenAILLM(options: LLMOptions): ChatOpenAI {
  const { temperature, maxTokens, modelName } = options;
  
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required when using OpenAI provider');
  }

  const llmConfig: any = {
    apiKey: config.openaiApiKey,
    model: modelName || config.openaiModel,
    temperature,
    maxTokens,
  };

  // Add custom base URL if provided
  if (config.openaiBaseUrl) {
    llmConfig.configuration = {
      baseURL: config.openaiBaseUrl,
    };
  }

  logger.info(`Created OpenAI LLM with model: ${llmConfig.model}`);
  return new ChatOpenAI(llmConfig);
}

/**
 * Create TogetherAI LLM instance (OpenAI-compatible)
 */
function createTogetherAILLM(options: LLMOptions): ChatOpenAI {
  const { temperature, maxTokens, modelName } = options;
  
  if (!config.togetherAiApiKey) {
    throw new Error('TOGETHER_API_KEY is required when using TogetherAI provider');
  }

  const llmConfig = {
    apiKey: config.togetherAiApiKey,
    model: modelName || config.togetherAiModel,
    configuration: {
      baseURL: 'https://api.together.xyz/v1',
    },
    temperature,
    maxTokens,
  };

  logger.info(`Created TogetherAI LLM with model: ${llmConfig.model}`);
  return new ChatOpenAI(llmConfig);
}

/**
 * Create LLM for different AI analyzer types with appropriate defaults
 */
export const LLMFactory = {
  /**
   * For raw page analysis - needs more tokens for complex HTML analysis
   */
  createRawPageAnalyzerLLM: (): ChatOpenAI => {
    return createLLM({
      temperature: 0.2,
      maxTokens: 8000,
    });
  },

  /**
   * For login analysis - lower temperature for consistent detection
   */
  createLoginAnalyzerLLM: (): ChatOpenAI => {
    return createLLM({
      temperature: 0.1,
      maxTokens: 2000,
    });
  },

  /**
   * For modal detection - deterministic detection
   */
  createModalDetectorLLM: (): ChatOpenAI => {
    return createLLM({
      temperature: 0.1,
      maxTokens: 2000,
    });
  },

  /**
   * For navigation analysis - comprehensive navigation analysis
   */
  createNavigationAnalyzerLLM: (): ChatOpenAI => {
    return createLLM({
      temperature: 0.1,
      maxTokens: 8000,
    });
  },

  /**
   * For autonomous crawler planning
   */
  createCrawlerPlannerLLM: (): ChatOpenAI => {
    return createLLM({
      temperature: 0.3,
      maxTokens: 4000,
    });
  },

  /**
   * Generic LLM factory method
   */
  create: createLLM,
};

export default LLMFactory;