# Project Structure Guide

This document describes the complete structure of the Spider Web Crawler boilerplate.

## Directory Layout

```
spider-web-crawler/
├── src/
│   ├── agent/                  # AI Agent orchestration
│   │   └── web-crawler-agent.ts
│   │
│   ├── browser/                # Browser automation
│   │   └── browser-manager.ts
│   │
│   ├── tools/                  # LangChain tools
│   │   ├── browser-tools.ts
│   │   └── analysis-tools.ts
│   │
│   ├── examples/               # Usage examples
│   │   ├── basic-crawl.ts
│   │   ├── form-interaction.ts
│   │   ├── custom-agent.ts
│   │   └── advanced-multi-page.ts
│   │
│   ├── utils/                  # Utility functions
│   │   └── logger.ts
│   │
│   ├── config.ts               # Configuration management
│   ├── crawler.ts              # Main orchestrator
│   └── index.ts                # Public API exports
│
├── dist/                       # Compiled JavaScript (generated)
│
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── tsconfig.json               # TypeScript configuration
├── package.json                # Project metadata & scripts
├── README.md                   # Full documentation
├── GETTING_STARTED.md          # Quick start guide
└── PROJECT_STRUCTURE.md        # This file
```

## Detailed Component Breakdown

### `/src/agent/` - Agent Layer

**Purpose**: LangChain agent orchestration and AI decision-making

```
web-crawler-agent.ts
├── Class: WebCrawlerAgent
├── Methods:
│   ├── initialize()            - Initialize LLM and tools
│   ├── crawl(options)          - Execute a crawl operation
│   └── close()                 - Cleanup resources
├── Features:
│   └── Uses Claude 3.5 Sonnet for intelligent navigation
└── Dependencies:
    ├── BrowserManager
    ├── Browser Tools
    └── Analysis Tools
```

**Key Exports**:
- `WebCrawlerAgent`: Main agent class
- `CrawlOptions`: Options interface
- `CrawlResult`: Result interface

### `/src/browser/` - Browser Layer

**Purpose**: Playwright-based browser automation

```
browser-manager.ts
├── Class: BrowserManager
├── Singleton: browserManager
├── Methods:
│   ├── initialize()            - Start browser
│   ├── createPage()            - Create new page
│   ├── navigateToUrl()         - Navigate to URL
│   ├── getPageDOM()            - Extract HTML
│   ├── getPageText()           - Extract text
│   ├── clickElement()          - Click element
│   ├── fillInput()             - Fill input field
│   ├── getElementText()        - Get element text
│   ├── waitForElement()        - Wait for element
│   ├── screenshot()            - Take screenshot
│   └── cleanup()               - Close browser
└── Features:
    ├── Multi-page support
    ├── Configurable viewport
    ├── Custom user agent
    └── Automatic timeout handling
```

**Key Exports**:
- `BrowserManager`: Main class
- `browserManager`: Singleton instance

### `/src/tools/` - Tools Layer

#### `browser-tools.ts`

Browser interaction tools for the agent:

```
Tools:
├── NavigatePageTool            - Navigate to URL
├── GetPageDOMTool              - Extract DOM
├── GetPageTextTool             - Extract text
├── ClickElementTool            - Click elements
├── FillInputTool               - Fill inputs
├── GetElementTextTool          - Extract element text
├── WaitForElementTool          - Wait for dynamic content
└── ScreenshotTool              - Take screenshots

Export:
└── getBrowserTools()           - Get all browser tools
```

#### `analysis-tools.ts`

Content analysis and planning tools:

```
Tools:
├── AnalyzePageContentTool      - Analyze structure/content
├── CreateExplorationPlanTool   - Plan exploration strategy
└── SummarizeFindingsTool       - Summarize findings

Export:
└── getAnalysisTools()          - Get all analysis tools
```

### `/src/examples/` - Examples

Production-ready examples:

```
basic-crawl.ts
├── Simple single-page crawl
└── Use case: Extract basic information

form-interaction.ts
├── Form analysis and interaction
└── Use case: Extract and fill forms

custom-agent.ts
├── Direct agent usage
├── Showcase available tools
└── Use case: Advanced customization

advanced-multi-page.ts
├── Multi-page crawling
├── Data aggregation
└── Use case: Cross-page analysis
```

### `/src/utils/` - Utilities

#### `logger.ts`

Structured logging system:

```
Class: Logger
├── Constructor(module: string)
├── Methods:
│   ├── debug()
│   ├── info()
│   ├── warn()
│   └── error()
├── Features:
│   ├── Log levels: DEBUG, INFO, WARN, ERROR
│   ├── Timestamps
│   ├── Module names
│   └── Environment-based filtering
└── Configuration:
    └── Via LOG_LEVEL env variable
```

### `/src/config.ts` - Configuration

Central configuration management:

```
Export: config object
├── Environment variables:
│   ├── nodeEnv, isDevelopment, isProduction
│   ├── langchainApiKey, langchainTracingV2
│   ├── anthropicApiKey
│   ├── headlessMode, browserTimeout
│   ├── port, logLevel
│   └── Crawler settings
├── Features:
│   ├── Type-safe configuration
│   ├── Default values
│   ├── Environment validation
│   └── Production checks
└── Used by: All modules
```

### `/src/crawler.ts` - Main Orchestrator

High-level API:

```
Class: Crawler
├── Methods:
│   ├── initialize()
│   ├── crawl(config)
│   └── cleanup()
└── Features:
    ├── Single interface for all operations
    ├── Automatic resource management
    └── Error handling

Function: runCrawler(config)
└── Convenience function for one-off crawls
```

### `/src/index.ts` - Public API

Main export file for the package:

```
Exports:
├── Classes:
│   ├── Crawler
│   ├── WebCrawlerAgent
│   ├── BrowserManager
│   └── Logger
├── Instances:
│   └── browserManager
├── Tool Classes:
│   ├── Browser tools
│   └── Analysis tools
├── Functions:
│   ├── runCrawler
│   ├── getBrowserTools
│   └── getAnalysisTools
├── Configuration:
│   └── config
└── Type Exports:
    ├── CrawlerConfig
    ├── CrawlerResult
    ├── CrawlOptions
    └── CrawlResult
```

## Data Flow

### Typical Crawl Flow

```
1. User Code
   └─> Crawler.initialize()
       ├─> BrowserManager.initialize()
       └─> WebCrawlerAgent.initialize()

2. User Code
   └─> Crawler.crawl(config)
       └─> WebCrawlerAgent.crawl(options)
           ├─> Claude LLM receives objective
           ├─> LLM decides which tool to use
           │   ├─> navigate_to_page (BrowserManager)
           │   ├─> get_page_dom (BrowserManager)
           │   ├─> analyze_page_content (Analysis)
           │   ├─> click_element (BrowserManager)
           │   └─> ... (other tools)
           └─> Repeat until objective complete

3. User Code
   └─> Crawler.cleanup()
       ├─> WebCrawlerAgent.close()
       └─> BrowserManager.cleanup()
```

## Configuration Hierarchy

```
Environment Variables (.env)
         ↓
    config.ts
         ↓
    All Modules
```

## Tool Architecture

```
LangChain Agent
      ↓
Tool Calling
      ├─→ Browser Tools ──→ BrowserManager ──→ Playwright
      └─→ Analysis Tools ──→ JavaScript Analysis
```

## Module Dependencies

```
index.ts
  ├─> crawler.ts
  │    ├─> browser-manager.ts (Playwright)
  │    └─> web-crawler-agent.ts
  │         ├─> browser-tools.ts
  │         ├─> analysis-tools.ts
  │         └─> @langchain/anthropic (Claude)
  │
  ├─> config.ts
  │    └─> dotenv
  │
  └─> logger.ts
```

## File Sizes Reference

Typical file sizes (before minification):

- `browser-manager.ts`: ~8 KB (300+ lines)
- `web-crawler-agent.ts`: ~4 KB (150+ lines)
- `browser-tools.ts`: ~10 KB (400+ lines)
- `analysis-tools.ts`: ~6 KB (250+ lines)
- `crawler.ts`: ~3 KB (100+ lines)
- Examples: 1-3 KB each

## Building & Distribution

### Build Process

```
TypeScript Source (.ts)
        ↓
TypeScript Compiler (tsc)
        ↓
JavaScript (dist/)
        ↓
Node.js Runtime
```

### Output Structure

```
dist/
├── agent/
│   └── web-crawler-agent.js
├── browser/
│   └── browser-manager.js
├── tools/
│   ├── browser-tools.js
│   └── analysis-tools.js
├── utils/
│   └── logger.js
├── config.js
├── crawler.js
└── index.js
```

## Extension Points

### Adding Custom Tools

Create new tool file in `/src/tools/`:

```
my-custom-tools.ts
├── Class: MyCustomTool extends Tool
├── Export: getMyCustomTools()
└── Import in agent initialization
```

### Adding Custom Analyzers

Extend `/src/tools/analysis-tools.ts`:

```
New Tool Class:
├── Extends Tool
├── Implements analysis logic
└── Integrate with agent
```

### Custom Browser Operations

Extend `/src/browser/browser-manager.ts`:

```
New Method:
├── Implements browser operation
├── Wraps Playwright functionality
└── Create tool for it
```

## Best Practices

### 1. Module Organization

- Keep concerns separated
- One responsibility per file
- Clear naming conventions

### 2. Type Safety

- Use TypeScript interfaces
- Avoid `any` types
- Define tool schemas with Zod

### 3. Error Handling

- Try-catch in all async operations
- Meaningful error messages
- Cleanup in finally blocks

### 4. Logging

- Use Logger class consistently
- Set appropriate log levels
- Include context in messages

### 5. Configuration

- Use config.ts for all settings
- Never hardcode values
- Support environment overrides

## Adding New Features

### Step 1: Create Module

```typescript
// src/myfeature/my-module.ts
export class MyModule {
  // Implementation
}
```

### Step 2: Create Tools (if needed)

```typescript
// src/tools/my-tools.ts
export class MyTool extends Tool {
  // Implementation
}

export function getMyTools(): Tool[] {
  return [new MyTool()];
}
```

### Step 3: Integrate with Agent

Update `/src/agent/web-crawler-agent.ts` to include new tools.

### Step 4: Export from Index

Add to `/src/index.ts` for public use.

### Step 5: Create Example

Add usage example to `/src/examples/`.

## Performance Considerations

### Memory Usage

- Browser instances: ~100-150 MB each
- Page DOM caching: Limited to current page
- LLM context: Token-aware truncation

### Execution Time

- Browser startup: ~2-3 seconds
- Page navigation: 1-10 seconds
- LLM response: 2-10 seconds per action
- Overall crawl: Depends on complexity

### Optimization Opportunities

- Parallel page processing (multiple contexts)
- Caching DOM analysis results
- Token usage optimization
- Connection pooling

## Security Considerations

### API Keys

- Store in `.env` (not in code)
- Never commit `.env` to version control
- Rotate keys regularly

### Data Handling

- Sanitize extracted data
- Be aware of data privacy regulations
- Respect robots.txt and Terms of Service

### Resource Management

- Set appropriate timeouts
- Limit concurrent operations
- Monitor resource usage

---

For more information, see [README.md](README.md) and [GETTING_STARTED.md](GETTING_STARTED.md).
