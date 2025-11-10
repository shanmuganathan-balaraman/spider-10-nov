# Quick Reference Guide

Fast lookup for common tasks and patterns.

## Installation & Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your TOGETHER_API_KEY

# Install browsers
npx playwright install chromium

# Build TypeScript
npm run build
```

## Most Common Usage

```typescript
import { runCrawler } from "./src/crawler";

const result = await runCrawler({
  url: "https://example.com",
  objective: "Extract main content",
});

console.log(result.findings);
```

## All Available Scripts

```bash
npm run build              # Compile TypeScript to JavaScript
npm run dev               # Watch mode (auto-compile on changes)
npm run start             # Run compiled project
npm run example:basic     # Run basic example
npm run example:form      # Run form interaction example
npm run example:custom    # Run custom agent example
npm run clean             # Remove dist/ directory
```

## Core Classes

### Crawler (Simplest)

```typescript
import { runCrawler } from "./src/crawler";

const result = await runCrawler({
  url: "https://example.com",
  objective: "Your objective",
  maxIterations: 5,
});
```

### WebCrawlerAgent (Direct)

```typescript
import { WebCrawlerAgent } from "./src/agent/web-crawler-agent";
import { browserManager } from "./src/browser/browser-manager";

const agent = new WebCrawlerAgent();
await browserManager.initialize();
await agent.initialize();

const result = await agent.crawl({
  url: "https://example.com",
  objective: "Your objective",
});

await browserManager.cleanup();
```

### BrowserManager (Low-level)

```typescript
import { browserManager } from "./src/browser/browser-manager";

await browserManager.initialize();
await browserManager.navigateToUrl("https://example.com");
const dom = await browserManager.getPageDOM();
const text = await browserManager.getPageText();
await browserManager.clickElement("button.submit");
await browserManager.fillInput("input[name=query]", "search term");
await browserManager.cleanup();
```

## Available Tools

### Browser Tools (For Agent)

- `navigate_to_page` - Go to URL
- `get_page_dom` - Get HTML
- `get_page_text` - Get text
- `click_element` - Click element
- `fill_input` - Fill input field
- `get_element_text` - Get element text
- `wait_for_element` - Wait for dynamic content
- `take_screenshot` - Save screenshot

### Analysis Tools (For Agent)

- `analyze_page_content` - Analyze page
- `create_exploration_plan` - Plan crawl strategy
- `summarize_findings` - Create summary

## Environment Variables

```bash
# Required
TOGETHER_API_KEY=your_api_key_here

# Optional
TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf  # LLM model
HEADLESS_MODE=true                             # Browser headless mode
BROWSER_TIMEOUT=30000                          # Browser timeout (ms)
LOG_LEVEL=info                                 # debug, info, warn, error
NODE_ENV=development                           # development or production
```

### Available Models
- `meta-llama/Llama-3-70b-chat-hf` (Default)
- `meta-llama/Llama-2-70b-chat-hf`
- See https://www.together.ai/models for more options

## Configuration

Edit `src/config.ts`:

```typescript
export const config = {
  // Browser settings
  headlessMode: true,               // Headless browser
  browserTimeout: 30000,            // 30 seconds

  // Crawler limits
  maxConcurrentPages: 5,            // Max parallel pages
  maxRetries: 3,                    // Retry failed requests
  requestTimeout: 30000,            // Request timeout
};
```

## Logging

```typescript
import { Logger } from "./src/utils/logger";

const logger = new Logger("MyModule");

logger.debug("Debug message");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
```

Set log level in `.env`:

```bash
LOG_LEVEL=debug    # Verbose
LOG_LEVEL=info     # Standard
LOG_LEVEL=warn     # Warnings only
LOG_LEVEL=error    # Errors only
```

## Error Handling

```typescript
try {
  const result = await runCrawler(config);
  if (!result.success) {
    console.error("Crawl failed:", result.error);
  }
} catch (error) {
  console.error("Exception:", error);
}
```

## Working with Results

```typescript
interface CrawlerResult {
  success: boolean;
  url: string;
  objective: string;
  findings: string;           // Main result
  steps_taken: number;        // How many steps
  duration_ms: number;        // Time taken
  error?: string;             // Error message
}
```

## Creating Custom Tools

```typescript
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

export class MyTool extends Tool {
  name = "my_tool";
  description = "What this tool does";
  schema = z.object({
    param: z.string().describe("Parameter description"),
  });

  async _call(input: { param: string }): Promise<string> {
    // Your implementation
    return JSON.stringify({ result: "..." });
  }
}
```

## Multiple Pages

```typescript
// Same browser, different pages
await browserManager.navigateToUrl("https://page1.com", "page1");
await browserManager.navigateToUrl("https://page2.com", "page2");

const dom1 = await browserManager.getPageDOM("page1");
const dom2 = await browserManager.getPageDOM("page2");
```

## CSS Selectors

```typescript
// Common selectors
await browserManager.clickElement("button");              // Tag
await browserManager.clickElement("#submit");            // ID
await browserManager.clickElement(".submit-btn");        // Class
await browserManager.clickElement("input[type=text]");   // Attribute
await browserManager.clickElement("nav > a:first-child"); // Hierarchy
```

## Form Handling

```typescript
// Fill multiple fields
await browserManager.fillInput("input[name=email]", "user@example.com");
await browserManager.fillInput("input[name=password]", "secret");

// Submit form
await browserManager.clickElement("button[type=submit]");

// Wait for result
await browserManager.waitForElement(".success-message", "page1", 5000);
```

## Screenshots

```typescript
// Take screenshot
await browserManager.screenshot("./screenshot.png");
await browserManager.screenshot("./page1-screenshot.png", "page1");
```

## Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run example:basic

# Run with verbose output
LOG_LEVEL=debug ts-node src/examples/basic-crawl.ts
```

## Performance Tips

1. **Use headless mode**: `HEADLESS_MODE=true` (default)
2. **Set appropriate timeout**: Balance speed vs stability
3. **Limit iterations**: Use `maxIterations: 5-10` for most cases
4. **Add delays**: Between crawls to respect servers
5. **Use CSS selectors**: More efficient than complex queries

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| API key not found | Add `ANTHROPIC_API_KEY` to `.env` |
| Browser won't start | Run `npx playwright install chromium` |
| Timeout errors | Increase `BROWSER_TIMEOUT` in `.env` |
| Large DOM errors | Use more specific objectives |
| Rate limiting | Add delays between crawls |

## File Structure Quick Lookup

```
src/
├── agent/           → AI agent orchestration
├── browser/         → Browser automation
├── tools/           → LangChain tools
├── examples/        → Usage examples
├── utils/           → Utilities (logging)
├── config.ts        → Configuration
├── crawler.ts       → Main API
└── index.ts         → Public exports
```

## TypeScript Usage

```typescript
// Type your crawl configs
import { type CrawlerConfig, type CrawlerResult } from "./src/crawler";

const config: CrawlerConfig = {
  url: "https://example.com",
  objective: "Extract data",
};

const result: CrawlerResult = await runCrawler(config);
```

## Next Steps

1. **Start**: `npm run example:basic`
2. **Customize**: Edit examples for your use case
3. **Deploy**: Build and deploy with `npm run build`
4. **Monitor**: Check logs with `LOG_LEVEL=debug`
5. **Extend**: Add custom tools as needed

## Resources

- [Full README](./README.md)
- [Getting Started](./GETTING_STARTED.md)
- [Project Structure](./PROJECT_STRUCTURE.md)
- [LangChain Docs](https://docs.langchain.com)
- [Playwright Docs](https://playwright.dev)
- [Anthropic Docs](https://docs.anthropic.com)

## Support

Check these in order:
1. Examples in `src/examples/`
2. [README.md](./README.md)
3. [GETTING_STARTED.md](./GETTING_STARTED.md)
4. Documentation links above
