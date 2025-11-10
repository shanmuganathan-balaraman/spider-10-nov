# Agentic AI Web Crawler - Industry Standard Boilerplate

A production-ready, autonomous web crawling application built with LangChain, Node.js, Playwright, TypeScript, and TogetherAI. This boilerplate leverages AI agents (powered by LLaMA models via TogetherAI) to intelligently navigate and analyze web pages.

## Features

- **Autonomous Web Navigation**: AI-powered agents that can navigate websites intelligently
- **DOM Analysis**: Complete page DOM extraction and analysis
- **Content Understanding**: AI-driven page content analysis and summarization
- **Interactive Automation**: Form filling, element clicking, and dynamic content handling
- **Tool-Based Architecture**: Extensible tool system for custom functionality
- **Production-Ready**: Industry-standard patterns and best practices
- **Type-Safe**: Full TypeScript support with strict type checking
- **Configurable**: Environment-based configuration for different deployment scenarios

## Architecture

```
src/
├── agent/           # LangChain agent orchestration
├── browser/         # Playwright browser management
├── tools/           # LangChain tools for agent interactions
├── examples/        # Usage examples
├── utils/           # Utility functions and helpers
├── config.ts        # Configuration management
└── crawler.ts       # Main crawler orchestrator
```

## Prerequisites

- Node.js 18+
- npm or yarn
- TogetherAI API key (for LLaMA models)

## Installation

1. **Clone and setup the project:**

```bash
npm install
cp .env.example .env
```

2. **Configure environment variables:**

Edit `.env` with your credentials:

```env
TOGETHER_API_KEY=your_together_api_key
TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf
HEADLESS_MODE=true
```

**Getting a TogetherAI API Key:**
1. Go to https://www.together.ai/
2. Sign up for an account
3. Navigate to API Keys in your dashboard
4. Generate a new API key
5. Copy it to your `.env` file

3. **Install Playwright browsers:**

```bash
npx playwright install
```

## Quick Start

### Basic Crawl

```typescript
import { runCrawler } from "./src/crawler";

const result = await runCrawler({
  url: "https://example.com",
  objective: "Extract the main heading and summarize the page content",
  maxIterations: 5,
});

console.log(result.findings);
```

### Using the WebCrawlerAgent Directly

```typescript
import { browserManager } from "./src/browser/browser-manager";
import { WebCrawlerAgent } from "./src/agent/web-crawler-agent";

const agent = new WebCrawlerAgent();
await browserManager.initialize();
await agent.initialize();

const result = await agent.crawl({
  url: "https://example.com",
  objective: "Your crawl objective",
  maxIterations: 10,
});

console.log(result.findings);
await browserManager.cleanup();
```

## Available Tools

### Browser Tools

Tools for interacting with web pages:

- **navigate_to_page**: Navigate to a specific URL
- **get_page_dom**: Extract complete HTML DOM
- **get_page_text**: Get plain text content
- **click_element**: Click on page elements using CSS selectors
- **fill_input**: Fill form inputs
- **get_element_text**: Extract text from specific elements
- **wait_for_element**: Wait for dynamic content to load
- **take_screenshot**: Capture page screenshots

### Analysis Tools

Tools for analyzing page content:

- **analyze_page_content**: Analyze page structure, forms, and links
- **create_exploration_plan**: Generate exploration strategy
- **summarize_findings**: Create comprehensive reports

## Running Examples

### Basic Example

```bash
npx ts-node src/examples/basic-crawl.ts
```

### Form Interaction

```bash
npx ts-node src/examples/form-interaction.ts
```

### Custom Agent Configuration

```bash
npx ts-node src/examples/custom-agent.ts
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TOGETHER_API_KEY` | - | Required: TogetherAI API key |
| `TOGETHER_MODEL` | meta-llama/Llama-3-70b-chat-hf | LLM model to use |
| `HEADLESS_MODE` | true | Run browser in headless mode |
| `BROWSER_TIMEOUT` | 30000 | Browser timeout in milliseconds |
| `LOG_LEVEL` | info | Logging level: debug, info, warn, error |
| `NODE_ENV` | development | Environment: development, production |

### Available Models on TogetherAI

- `meta-llama/Llama-3-70b-chat-hf` (Default, recommended)
- `meta-llama/Llama-2-70b-chat-hf`
- `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO`
- And many more - check TogetherAI documentation

### Browser Configuration

Edit `src/config.ts` to customize:

- Browser viewport size
- User agent string
- Navigation timeout
- Concurrent page limits
- Retry settings

## API Reference

### Crawler

Main orchestration class:

```typescript
interface CrawlerConfig {
  url: string;
  objective: string;
  maxIterations?: number;
  headless?: boolean;
}

interface CrawlerResult {
  success: boolean;
  url: string;
  objective: string;
  findings: string;
  steps_taken: number;
  duration_ms: number;
  error?: string;
}
```

### BrowserManager

Low-level browser operations:

```typescript
await browserManager.initialize();
await browserManager.navigateToUrl(url, pageId);
const dom = await browserManager.getPageDOM(pageId);
const text = await browserManager.getPageText(pageId);
await browserManager.clickElement(selector, pageId);
await browserManager.fillInput(selector, value, pageId);
```

### WebCrawlerAgent

AI-powered agent for crawling:

```typescript
const agent = new WebCrawlerAgent();
await agent.initialize();
const result = await agent.crawl(options);
```

## Project Structure

### `/src/browser/`

**browser-manager.ts**: Core browser management with Playwright
- Page lifecycle management
- DOM/content extraction
- Element interaction
- Screenshot capture

### `/src/tools/`

**browser-tools.ts**: LangChain tools wrapping browser operations
- Navigate, scroll, click
- Extract content
- Wait for elements

**analysis-tools.ts**: Content analysis and planning tools
- Structure analysis
- Form detection
- Exploration planning

### `/src/agent/`

**web-crawler-agent.ts**: Main agent orchestration
- LangChain integration
- Tool management
- Agent execution

### `/src/config.ts`

Configuration management with environment variable support.

### `/src/utils/logger.ts`

Structured logging with multiple log levels.

## Development

### Build

```bash
npx tsc
```

### Run Tests

```bash
npm test
```

### Watch Mode

```bash
npx tsc --watch
```

## Best Practices

1. **Always initialize before use**: Call `initialize()` on BrowserManager before crawling
2. **Use page IDs**: For multi-page crawling, use unique page IDs
3. **Set appropriate objectives**: Clear objectives help the agent make better decisions
4. **Handle errors**: Wrap crawl operations in try-catch blocks
5. **Cleanup resources**: Always call `cleanup()` to close browsers
6. **Use maxIterations wisely**: Balance thoroughness with efficiency
7. **Monitor API usage**: Track Anthropic API calls in production

## Extending the Boilerplate

### Adding Custom Tools

```typescript
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

export class CustomTool extends Tool {
  name = "custom_tool";
  description = "Description of your tool";
  schema = z.object({
    param: z.string().describe("Parameter description"),
  });

  async _call(input: { param: string }): Promise<string> {
    // Implementation
    return JSON.stringify({ result: "..." });
  }
}
```

### Custom Agent Configuration

```typescript
const agent = new WebCrawlerAgent();
await agent.initialize();

// Customize system prompt and behavior
const result = await agent.crawl({
  url: "https://example.com",
  objective: "Custom objective",
  maxIterations: 15,
  pageId: "custom_page",
});
```

## Performance Considerations

- **Headless Mode**: Enabled by default for performance
- **Viewport Size**: Set to 1920x1080 for standard web content
- **Timeouts**: Default 30 seconds, adjustable per operation
- **Concurrent Pages**: Limited to 5 concurrent pages by default
- **DOM Size**: Large DOMs are summarized to reduce token usage

## Troubleshooting

### Browser Won't Start

```bash
npx playwright install chromium
```

### API Key Not Found

Ensure `TOGETHER_API_KEY` is set in `.env`:

```bash
cp .env.example .env
# Edit .env with your TogetherAI API key
```

Get your API key from https://www.together.ai/

### Timeout Errors

Increase `BROWSER_TIMEOUT` in `.env`:

```env
BROWSER_TIMEOUT=60000  # 60 seconds
```

### Memory Issues

Reduce `maxConcurrentPages` in `src/config.ts`.

## Security Considerations

- **API Keys**: Store securely in environment variables
- **User Agent**: Set realistic user agent strings
- **Rate Limiting**: Implement delays between requests
- **Robots.txt**: Respect website policies
- **Data Privacy**: Handle extracted data according to privacy policies

## Contributing

1. Follow TypeScript strict mode
2. Use consistent naming conventions
3. Add documentation for new tools
4. Test with multiple websites
5. Update README for new features

## License

MIT

## Support

For issues and questions:
- Check the examples in `/src/examples/`
- Review the API reference above
- Consult LangChain documentation: https://docs.langchain.com
- Playwright docs: https://playwright.dev

## Resources

- [LangChain Documentation](https://docs.langchain.com)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Playwright Documentation](https://playwright.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Roadmap

- [ ] Support for multiple LLM providers (OpenAI, Google, etc.)
- [ ] Built-in caching for repeated crawls
- [ ] Advanced error recovery strategies
- [ ] Performance metrics and monitoring
- [ ] Browser pool management
- [ ] Persistent session management
- [ ] Export findings to multiple formats (JSON, PDF, HTML)
- [ ] Web UI for agent management
