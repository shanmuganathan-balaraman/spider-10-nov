import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",

  // AI Provider Configuration
  aiProvider: process.env.AI_PROVIDER || "togetherai", // 'openai' or 'togetherai'
  
  // TogetherAI Configuration
  togetherAiApiKey: process.env.TOGETHER_API_KEY,
  togetherAiModel: process.env.TOGETHER_MODEL || "meta-llama/Llama-3-70b-chat-hf",

  // OpenAI Configuration
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4",
  openaiBaseUrl: process.env.OPENAI_BASE_URL, // Optional for custom endpoints

  // Browser
  headlessMode: process.env.HEADLESS_MODE !== "false",
  browserTimeout: parseInt(process.env.BROWSER_TIMEOUT || "30000", 10),

  // Application
  port: parseInt(process.env.PORT || "3000", 10),
  logLevel: process.env.LOG_LEVEL || "info",

  // Crawler Settings
  maxConcurrentPages: 5,
  maxRetries: 3,
  requestTimeout: 30000,
};

// Validation
if (config.isProduction) {
  if (config.aiProvider === "openai" && !config.openaiApiKey) {
    console.warn("Warning: OPENAI_API_KEY is not set but OpenAI provider is selected");
  } else if (config.aiProvider === "togetherai" && !config.togetherAiApiKey) {
    console.warn("Warning: TOGETHER_API_KEY is not set but TogetherAI provider is selected");
  }
}
