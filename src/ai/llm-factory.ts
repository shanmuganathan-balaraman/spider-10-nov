import { ChatOpenAI } from '@langchain/openai';

interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export function createLLM(options: LLMOptions = {}): ChatOpenAI {
  const provider = process.env.AI_PROVIDER || 'openai';
  const modelName = process.env.AI_MODEL;
  const temperature = options.temperature ?? parseFloat(process.env.AI_TEMPERATURE || '0.7');
  const maxTokens = options.maxTokens ?? parseInt(process.env.AI_MAX_TOKENS || '4000');

  if (!modelName) {
    throw new Error('AI_MODEL environment variable is required');
  }

  console.log(`Creating LLM: ${provider}/${modelName} (temp: ${temperature}, maxTokens: ${maxTokens})`);

  switch (provider.toLowerCase()) {
    case 'openai':
      return createOpenAILLM({ modelName, temperature, maxTokens });
      
    case 'togetherai':
      return createTogetherAILLM({ modelName, temperature, maxTokens });
      
    case 'anthropic':
      // Future: Add Anthropic support
      throw new Error('Anthropic provider not yet implemented');
      
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

function createOpenAILLM({ 
  modelName, 
  temperature, 
  maxTokens 
}: { 
  modelName: string; 
  temperature: number; 
  maxTokens: number; 
}): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  console.log(`Using OpenAI API key ending in: ...${apiKey.slice(-4)}`);
  
  return new ChatOpenAI({
    apiKey,
    modelName,
    temperature,
    maxTokens,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    }
  });
}

function createTogetherAILLM({ 
  modelName, 
  temperature, 
  maxTokens 
}: { 
  modelName: string; 
  temperature: number; 
  maxTokens: number; 
}): ChatOpenAI {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error('TOGETHER_API_KEY environment variable is required');
  }

  return new ChatOpenAI({
    apiKey,
    modelName,
    temperature,
    maxTokens,
    configuration: {
      baseURL: process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1'
    }
  });
}

// Simple factory object that just uses the configured model for everything
export const LLMFactory = {
  createRawPageAnalyzerLLM: (): ChatOpenAI => createLLM({ temperature: 0.2, maxTokens: 16384 }),
  createLoginAnalyzerLLM: (): ChatOpenAI => createLLM({ temperature: 0.1, maxTokens: 4096 }),
  createModalDetectorLLM: (): ChatOpenAI => createLLM({ temperature: 0.1, maxTokens: 4096 }),
  createAutonomousCrawlerLLM: (): ChatOpenAI => createLLM({ temperature: 0.3, maxTokens: 8192 }),
  createNavigationAnalyzerLLM: (): ChatOpenAI => createLLM({ temperature: 0.1, maxTokens: 16384 }),
  createCrawlerPlannerLLM: (): ChatOpenAI => createLLM({ temperature: 0.3, maxTokens: 8192 }),
  create: createLLM
};

export default LLMFactory;