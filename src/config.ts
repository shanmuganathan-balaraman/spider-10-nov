import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",

  // AI Provider Configuration (Simplified)
  aiProvider: process.env.AI_PROVIDER || "openai",
  aiModel: process.env.AI_MODEL || "gpt-4o-mini",
  aiTemperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || "4000"),

  // API Keys
  openaiApiKey: process.env.OPENAI_API_KEY,
  togetherAiApiKey: process.env.TOGETHER_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // Optional API Endpoints
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  togetherBaseUrl: process.env.TOGETHER_BASE_URL,

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
