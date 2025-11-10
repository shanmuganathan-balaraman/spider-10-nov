# Getting Started Guide

Welcome to the Spider Web Crawler - An Industry-Standard Agentic AI Boilerplate!

## Table of Contents

1. [Setup](#setup)
2. [Your First Crawl](#your-first-crawl)
3. [Understanding the Architecture](#understanding-the-architecture)
4. [Common Tasks](#common-tasks)
5. [Next Steps](#next-steps)

## Setup

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- **LangChain**: AI framework for building agents
- **Playwright**: Browser automation library
- **TypeScript**: Type-safe JavaScript
- **TogetherAI SDK**: Access to open-source LLaMA models

### Step 2: Configure Your API Keys

```bash
cp .env.example .env
```

Edit `.env` and add your TogetherAI API key:

```env
TOGETHER_API_KEY=your_together_api_key_here
TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf
HEADLESS_MODE=true
LOG_LEVEL=info
```

**Getting a TogetherAI API Key:**
1. Go to https://www.together.ai/
2. Create an account or sign in
3. Navigate to API Keys in your dashboard
4. Generate a new API key
5. Copy it to your `.env` file

**Available Models:**
- `meta-llama/Llama-3-70b-chat-hf` (Recommended - LLaMA 3 70B)
- `meta-llama/Llama-2-70b-chat-hf` (LLaMA 2 70B)
- Other open-source models available on TogetherAI

### Step 3: Install Playwright Browsers

```bash
npx playwright install chromium
```

This downloads the Chromium browser that Playwright uses.

## Your First Crawl

### Option 1: Using the Simple API

Create a file `my-crawl.ts`:

```typescript
import { runCrawler } from "./src/crawler";

async function main() {
  const result = await runCrawler({
    url: "https://example.com",
    objective: "Find and extract the main heading and describe the page purpose",
  });

  console.log("Success:", result.success);
  console.log("Findings:", result.findings);
  console.log("Duration:", result.duration_ms, "ms");
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node my-crawl.ts
```

### Option 2: Using the Web Crawler Agent Directly

```typescript
import { browserManager } from "./src/browser/browser-manager";
import { WebCrawlerAgent } from "./src/agent/web-crawler-agent";

async function main() {
  const agent = new WebCrawlerAgent();

  try {
    await browserManager.initialize();
    await agent.initialize();

    const result = await agent.crawl({
      url: "https://example.com",
      objective: "Analyze the page and create a summary",
    });

    console.log("Findings:", result.findings);
  } finally {
    await browserManager.cleanup();
  }
}

main().catch(console.error);
```

### Option 3: Run Pre-built Examples

```bash
# Basic crawl example
npm run example:basic

# Form interaction example
npm run example:form

# Custom agent example
npm run example:custom
```

## Understanding the Architecture

### High-Level Flow

```
┌──────────────┐
│  Your Code   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Crawler Class   │  Main orchestrator
└──────┬───────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  Browser Manager │              │  Web Crawler     │
│  (Playwright)    │              │  Agent           │
└────────┬─────────┘              └────────┬─────────┘
         │                                 │
         │ Uses                            │ Uses
         │                                 │
         ▼                                 ▼
    ┌─────────────────────────────────────────┐
    │         LangChain Tools                 │
    │  ┌──────────────────────────────────┐   │
    │  │  Browser Tools                   │   │
    │  │ - navigate, click, fill input    │   │
    │  │ - get DOM, get text, screenshot  │   │
    │  └──────────────────────────────────┘   │
    │  ┌──────────────────────────────────┐   │
    │  │  Analysis Tools                  │   │
    │  │ - analyze content                │   │
    │  │ - create exploration plan        │   │
    │  └──────────────────────────────────┘   │
    └─────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────┐
    │  Claude 3.5      │
    │  (LLM)           │
    └──────────────────┘
```

### Key Components

#### 1. **BrowserManager** (`src/browser/browser-manager.ts`)
- Manages Playwright browser instances
- Handles page lifecycle
- Provides methods for DOM extraction, clicking, filling inputs, etc.

```typescript
// Usage example
const { browserManager } = require("./src/browser/browser-manager");
await browserManager.initialize();
await browserManager.navigateToUrl("https://example.com");
const dom = await browserManager.getPageDOM();
```

#### 2. **Browser Tools** (`src/tools/browser-tools.ts`)
- LangChain tools wrapping browser operations
- Allow the AI agent to interact with web pages
- Tools: navigate, click, fill, wait, screenshot, etc.

#### 3. **Analysis Tools** (`src/tools/analysis-tools.ts`)
- AI-powered analysis of page content
- Exploration planning
- Finding summarization

#### 4. **WebCrawlerAgent** (`src/agent/web-crawler-agent.ts`)
- Main agent that orchestrates crawling
- Uses Claude AI to make intelligent decisions
- Manages tool usage and execution

#### 5. **Crawler** (`src/crawler.ts`)
- High-level orchestrator
- Manages initialization and cleanup
- Simplest API for most users

## Common Tasks

### Task 1: Extract Data from a Webpage

```typescript
import { runCrawler } from "./src/crawler";

const result = await runCrawler({
  url: "https://target-website.com/products",
  objective: `Extract all product names and prices from this page.
              List them in a structured format.`,
});

console.log(result.findings);
```

### Task 2: Fill Out and Submit a Form

```typescript
import { runCrawler } from "./src/crawler";

const result = await runCrawler({
  url: "https://example.com/contact",
  objective: `Find the contact form on this page.
              Extract all form fields (name, type).
              Demonstrate filling and understanding the form fields.`,
});

console.log(result.findings);
```

### Task 3: Navigate Through Multiple Pages

```typescript
import { browserManager } from "./src/browser/browser-manager";
import { WebCrawlerAgent } from "./src/agent/web-crawler-agent";

const agent = new WebCrawlerAgent();

try {
  await browserManager.initialize();
  await agent.initialize();

  // Navigate to first page
  let result = await agent.crawl({
    url: "https://example.com/page1",
    objective: "Find a link to 'next page' and describe what you found",
  });

  console.log("Page 1:", result.findings);

  // Navigate to second page
  result = await agent.crawl({
    url: "https://example.com/page2",
    objective: "Extract the main content and compare with page 1",
  });

  console.log("Page 2:", result.findings);
} finally {
  await browserManager.cleanup();
}
```

### Task 4: Create Custom Tools

Extend the crawler with your own tools:

```typescript
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

export class EmailValidatorTool extends Tool {
  name = "validate_email";
  description = "Validate if an email address is valid";
  schema = z.object({
    email: z.string().email().describe("Email address to validate"),
  });

  async _call(input: { email: string }): Promise<string> {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email);
    return JSON.stringify({ email: input.email, valid: isValid });
  }
}

// Use with agent:
const customTools = [...getBrowserTools(), new EmailValidatorTool()];
```

### Task 5: Handle Dynamic Content

```typescript
import { runCrawler } from "./src/crawler";

const result = await runCrawler({
  url: "https://example.com/dynamic-page",
  objective: `This page loads content dynamically.
              Wait for the content to load.
              Extract the dynamically loaded data.`,
  maxIterations: 8,
});

console.log(result.findings);
```

## Next Steps

### 1. Read the Documentation

- [README.md](./README.md) - Full project documentation
- [LangChain Docs](https://docs.langchain.com)
- [Playwright Docs](https://playwright.dev)

### 2. Explore Examples

```bash
# Browse examples directory
ls src/examples/

# Run each example
npm run example:basic
npm run example:form
npm run example:custom
```

### 3. Customize the Boilerplate

#### Add New Tools

Create tools in `src/tools/` to extend functionality.

#### Modify Configuration

Edit `src/config.ts` to change defaults for your use case.

#### Create Custom Agents

Extend `WebCrawlerAgent` for specialized crawling behaviors.

### 4. Build Your Application

```bash
# Development
npm run dev

# Production build
npm run build

# Run built code
npm start
```

### 5. Deploy

The boilerplate is ready for deployment:

1. Build the project: `npm run build`
2. Deploy the `dist/` folder
3. Set environment variables on your deployment platform
4. Install Playwright browsers: `npx playwright install chromium`

## Troubleshooting

### Problem: "API key not found"

**Solution:** Make sure your `.env` file has `TOGETHER_API_KEY`:

```bash
cat .env | grep TOGETHER_API_KEY
```

### Problem: "Browser failed to initialize"

**Solution:** Install Playwright browsers:

```bash
npx playwright install chromium
```

### Problem: "Timeout waiting for element"

**Solution:** Increase the timeout in your crawl:

```typescript
const result = await runCrawler({
  url: "https://example.com",
  objective: "Your objective",
  // Add this to allow more time for dynamic content
  maxIterations: 15,  // More iterations = more time
});
```

Or increase browser timeout in `.env`:

```env
BROWSER_TIMEOUT=60000
```

### Problem: "Large DOM causing issues"

**Solution:** The crawler automatically truncates large DOMs to avoid token limits. You can:

1. Be more specific with your objective
2. Request specific page sections instead of the whole page
3. Use CSS selectors to extract specific elements

## Learning Resources

### LangChain Concepts

- **Agents**: Autonomous systems that make decisions and use tools
- **Tools**: Functions the agent can call to interact with the world
- **LLMs**: Large Language Models like Claude that power the agent
- **Chains**: Sequences of operations

### Playwright Concepts

- **Browser**: The Chromium instance
- **Context**: Isolated browser session
- **Page**: Individual web page in a context
- **Selectors**: CSS/XPath expressions to find elements

### TypeScript Best Practices

- Use strict type checking (enabled in tsconfig.json)
- Define interfaces for all data structures
- Use enums for constants
- Leverage generics for reusable code

## Tips for Success

1. **Be specific with objectives**: Clear objectives lead to better results
2. **Start simple**: Test with small objectives before complex ones
3. **Monitor logs**: Set `LOG_LEVEL=debug` to see what's happening
4. **Test locally first**: Use `npm run example:*` to understand behavior
5. **Handle errors gracefully**: Always use try-catch and cleanup
6. **Respect rate limits**: Add delays between crawls if needed

## Getting Help

- Check [README.md](./README.md) for detailed documentation
- Review [examples](./src/examples/) for code samples
- Check [LangChain documentation](https://docs.langchain.com)
- See [Anthropic documentation](https://docs.anthropic.com)

Happy crawling! 🕷️
