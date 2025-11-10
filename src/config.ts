import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",

  // TogetherAI Configuration
  togetherAiApiKey: process.env.TOGETHER_API_KEY,
  togetherAiModel: process.env.TOGETHER_MODEL || "meta-llama/Llama-3-70b-chat-hf",

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
if (config.isProduction && !config.togetherAiApiKey) {
  console.warn("Warning: TOGETHER_API_KEY is not set");
}
