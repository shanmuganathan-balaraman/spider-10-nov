# Functional Refactor - Complete Documentation

## Overview

The Spider Web Crawler has been completely refactored from a **class-based approach** to a **purely functional approach**. All components are now functions with state management using closures and module-level state.

## Key Changes

### 1. Browser Manager (Functional)

**Before (Class-Based):**
```typescript
class BrowserManager {
  private browser: Browser | null = null;
  async initialize() { ... }
  async navigateToUrl(url: string) { ... }
}

const browserManager = new BrowserManager();
await browserManager.initialize();
```

**After (Functional):**
```typescript
let browserState: BrowserState = { ... };

export async function initializeBrowser(): Promise<void> { ... }
export async function navigateToUrl(url: string): Promise<...> { ... }

// Usage
await initializeBrowser();
await navigateToUrl("https://example.com");
```

**Key Functions:**
- `initializeBrowser()` - Initialize browser
- `createPage(pageId)` - Create new page
- `navigateToUrl(url, pageId)` - Navigate to URL
- `getPageDOM(pageId)` - Extract DOM
- `getPageText(pageId)` - Extract text
- `clickElement(selector, pageId)` - Click element
- `fillInput(selector, value, pageId)` - Fill input
- `waitForElement(selector, pageId, timeout)` - Wait for element
- `takeScreenshot(filePath, pageId)` - Take screenshot
- `closePage(pageId)` - Close page
- `cleanupBrowser()` - Cleanup all resources

### 2. Logger (Functional)

**Before (Class-Based):**
```typescript
class Logger {
  constructor(module: string) { ... }
  info(message: string) { ... }
}

const logger = new Logger("MyModule");
logger.info("message");
```

**After (Functional):**
```typescript
interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export function createLogger(module: string): Logger { ... }

// Usage
const logger = createLogger("MyModule");
logger.info("message");
```

### 3. Agent (Functional)

**Before (Class-Based):**
```typescript
class WebCrawlerAgent {
  private model: ChatOpenAI | null = null;
  async initialize() { ... }
  async crawl(options) { ... }
}

const agent = new WebCrawlerAgent();
await agent.initialize();
```

**After (Functional):**
```typescript
let agentState: AgentState = { ... };

export async function initializeAgent(): Promise<void> { ... }
export async function crawl(options: CrawlOptions): Promise<CrawlResult> { ... }
export function getTools(): Tool[] { ... }
export async function closeAgent(): Promise<void> { ... }

// Usage
await initializeAgent();
const result = await crawl({ url: "...", objective: "..." });
```

### 4. Tools (Functional)

**Before (Class-Based):**
```typescript
export class NavigatePageTool extends Tool {
  name = "navigate_to_page";
  async _call(input) { ... }
}

export function getBrowserTools(): Tool[] {
  return [new NavigatePageTool(), ...];
}
```

**After (Functional):**
```typescript
export const createNavigatePageTool = (): Tool => {
  return {
    name: "navigate_to_page",
    schema: z.object({ ... }),
    _call: async (input) => { ... }
  } as Tool;
};

export function getBrowserTools(): Tool[] {
  return [
    createNavigatePageTool(),
    createGetPageDOMTool(),
    // ...
  ];
}
```

### 5. Crawler Orchestrator (Functional)

**Before (Class-Based):**
```typescript
class Crawler {
  private agent: WebCrawlerAgent;
  async initialize() { ... }
  async crawl(config) { ... }
  async cleanup() { ... }
}

const crawler = new Crawler();
await crawler.initialize();
```

**After (Functional):**
```typescript
export async function initializeCrawler(): Promise<void> { ... }
export async function runCrawl(config: CrawlerConfig): Promise<CrawlerResult> { ... }
export async function cleanupCrawler(): Promise<void> { ... }
export async function executeCrawl(config: CrawlerConfig): Promise<CrawlerResult> { ... }

// Usage - simple approach
const result = await executeCrawl({ url: "...", objective: "..." });

// Or step by step
await initializeCrawler();
const result = await runCrawl(config);
await cleanupCrawler();
```

## New API Usage Patterns

### Pattern 1: Simple One-Shot Crawl

```typescript
import { executeCrawl } from "./crawler";

const result = await executeCrawl({
  url: "https://example.com",
  objective: "Extract data",
  maxIterations: 5,
});

console.log(result.findings);
```

### Pattern 2: Step-by-Step Control

```typescript
import {
  initializeCrawler,
  runCrawl,
  cleanupCrawler
} from "./crawler";

await initializeCrawler();

try {
  const result = await runCrawl({
    url: "https://example.com",
    objective: "Extract data",
  });
  console.log(result.findings);
} finally {
  await cleanupCrawler();
}
```

### Pattern 3: Direct Browser Control

```typescript
import * as browser from "./browser/browser-manager";

await browser.initializeBrowser();
await browser.navigateToUrl("https://example.com");
const dom = await browser.getPageDOM();
console.log(dom);
await browser.cleanupBrowser();
```

### Pattern 4: Direct Agent Control

```typescript
import * as agent from "./agent/web-crawler-agent";
import * as browser from "./browser/browser-manager";

await browser.initializeBrowser();
await agent.initializeAgent();

const result = await agent.crawl({
  url: "https://example.com",
  objective: "Extract data",
});

console.log(result.findings);

await agent.closeAgent();
await browser.cleanupBrowser();
```

### Pattern 5: Custom Logger

```typescript
import { createLogger } from "./utils/logger";

const logger = createLogger("MyModule");
logger.info("Starting crawl");
logger.debug("Debug info");
logger.warn("Warning message");
logger.error("Error occurred");
```

### Pattern 6: Working with Tools

```typescript
import { getBrowserTools, getAnalysisTools } from "./tools";
import { createNavigatePageTool } from "./tools/browser-tools";

const allTools = [...getBrowserTools(), ...getAnalysisTools()];

// Or create individual tools
const navTool = createNavigatePageTool();
const domTool = createGetPageDOMTool();
```

## State Management

All state is managed at the module level using closures:

### BrowserManager State
```typescript
interface BrowserState {
  browser: Browser | null;
  context: BrowserContext | null;
  pages: Map<string, Page>;
}

let browserState: BrowserState = { ... };
```

### AgentModule State
```typescript
interface AgentState {
  model: ChatOpenAI | null;
  tools: Tool[];
  executor: AgentExecutor | null;
}

let agentState: AgentState = { ... };
```

### Benefits of Module-Level State
- No class instantiation overhead
- Easy to access from anywhere in the module
- Clear initialization/cleanup pattern
- Prevents multiple instances
- Type-safe with TypeScript interfaces

## Function Organization

### Browser Module (`browser/browser-manager.ts`)
Pure functional interface to Playwright:
- Initialization
- Page management
- Navigation
- Element interaction
- Content extraction
- Cleanup

### Agent Module (`agent/web-crawler-agent.ts`)
Pure functional interface to LangChain:
- Model initialization
- Tool management
- Crawl execution
- State querying
- Cleanup

### Logger Module (`utils/logger.ts`)
Factory function for logger instances:
- Creates logger per module
- Configurable log levels
- Formatted output
- Type-safe interface

### Tools Module (`tools/`)
Factory functions for LangChain tools:
- Browser tools (8 tools)
- Analysis tools (3 tools)
- Composable tool creation
- Type-safe schemas

### Crawler Module (`crawler.ts`)
Orchestration of browser and agent:
- Initialization
- Execution
- Cleanup
- Error handling

## Export Structure

### Main Export (`src/index.ts`)
All exports are functions or types:
```typescript
// Functions
export { initializeCrawler, runCrawl, cleanupCrawler, executeCrawl }
export { initializeAgent, crawl, closeAgent, getTools }
export { initializeBrowser, navigateToUrl, getPageDOM, ... }
export { createLogger }
export { createNavigatePageTool, createGetPageDOMTool, ... }

// Types
export type { CrawlerConfig, CrawlerResult }
export type { CrawlOptions, CrawlResult }
export { LogLevel }
```

## Migration from Class-Based

If you had class-based code:

```typescript
// OLD
class MyAgent extends WebCrawlerAgent { ... }
const agent = new MyAgent();
await agent.initialize();
```

Change to:

```typescript
// NEW
import { initializeAgent, crawl, closeAgent } from "./agent/web-crawler-agent";

await initializeAgent();
const result = await crawl({ ... });
await closeAgent();
```

## Advantages of Functional Approach

1. **Simpler Code**
   - No class instantiation
   - No `this` binding issues
   - Direct function calls

2. **Better Composition**
   - Mix and match functions
   - Easy to create variations
   - Functional pipelines

3. **Easier Testing**
   - Functions are easier to mock
   - No class inheritance complexity
   - Pure functions for utilities

4. **Better Scalability**
   - Multiple instances per module (if needed)
   - Flexible state management
   - Easy to extend

5. **Cleaner API**
   - Clear function names
   - Predictable behavior
   - Less abstraction

6. **Performance**
   - No class overhead
   - Direct function calls
   - Minimal memory overhead

## TypeScript Types

All types are exported for use in your code:

```typescript
import type {
  CrawlerConfig,
  CrawlerResult,
  CrawlOptions,
  CrawlResult,
  LogLevel,
} from "./crawler";

// Use in your functions
function myCrawler(config: CrawlerConfig): Promise<CrawlerResult> {
  // ...
}
```

## Error Handling

All functions use try-catch patterns:

```typescript
export async function initializeBrowser(): Promise<void> {
  try {
    logger.info("Initializing browser...");
    browserState.browser = await chromium.launch({ ... });
    logger.info("Browser initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize browser:", error);
    throw error;
  }
}
```

## Logging

Logging is functional via `createLogger`:

```typescript
const logger = createLogger("MyModule");

// All levels with consistent formatting
logger.debug("Debug info");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");

// Output format: [ISO timestamp] [LEVEL] [Module] message
// [2025-11-10T15:30:45.123Z] [INFO] [MyModule] Starting crawl
```

## Summary

The functional refactor maintains 100% feature parity while providing:

✅ Cleaner, more readable code
✅ Easier to test and maintain
✅ Better composition and reusability
✅ Type-safe with full TypeScript support
✅ Consistent error handling
✅ Clear initialization/cleanup patterns
✅ Functional programming best practices

All examples have been updated to use the functional API. Choose the pattern that works best for your use case!
