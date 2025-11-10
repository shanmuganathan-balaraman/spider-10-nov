# Architecture Overview

Comprehensive technical architecture of the Spider Web Crawler.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  Your Code / API Consumers / Task Schedulers             │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│               Orchestration Layer                       │
│              (Crawler / Agent Lifecycle)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Crawler.ts                                        │ │
│  │  - initialize()  -> Setup browser & agent          │ │
│  │  - crawl()       -> Execute crawl task             │ │
│  │  - cleanup()     -> Close resources                │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼─────────┐       ┌──────────▼────────────┐
│  Agent Layer    │       │  Browser Layer       │
│                 │       │                      │
│ WebCrawlerAgent │       │  BrowserManager      │
│ - initialize()  │       │  - initialize()      │
│ - crawl()       │       │  - navigateToUrl()   │
│ - getTools()    │       │  - getPageDOM()      │
│ - close()       │       │  - clickElement()    │
└────────┬────────┘       │  - fillInput()       │
         │                │  - cleanup()         │
         │                └──────────┬───────────┘
         │                           │
         ├───────────────────────────┤
         │                           │
┌────────▼─────────────────────────▼────────────────────┐
│             Tools / Abstractions Layer                │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Browser Tools (LangChain Tools)                │  │
│  │  - NavigatePageTool                             │  │
│  │  - GetPageDOMTool                               │  │
│  │  - ClickElementTool                             │  │
│  │  - FillInputTool                                │  │
│  │  - WaitForElementTool                           │  │
│  │  - ScreenshotTool                               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Analysis Tools (LangChain Tools)               │  │
│  │  - AnalyzePageContentTool                       │  │
│  │  - CreateExplorationPlanTool                    │  │
│  │  - SummarizeFindingsTool                        │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────┘
                         │
    ┌────────────────────┴────────────────────┐
    │                                         │
┌───▼──────────────┐            ┌────────────▼──────┐
│  Claude 3.5      │            │  Playwright       │
│  (LLM)           │            │  (Browser)        │
│                  │            │                   │
│ - Agents         │            │ - Chromium        │
│ - Tool calling   │            │ - DOM              │
│ - Reasoning      │            │ - Automation       │
└──────────────────┘            └───────────────────┘
```

## Data Flow

### Initialization Flow

```
User Code
    ↓
Crawler.initialize()
    ├─→ BrowserManager.initialize()
    │   └─→ chromium.launch()
    │       ├─→ newContext()
    │       └─→ Ready for pages
    │
    └─→ WebCrawlerAgent.initialize()
        └─→ new ChatAnthropic()
            ├─→ Load all tools
            └─→ Ready for crawling
```

### Crawl Execution Flow

```
User: runCrawler(config)
    ↓
Crawler.crawl(config)
    ↓
WebCrawlerAgent.crawl(options)
    ├─→ Claude receives: "Crawl https://example.com to [objective]"
    │
    └─→ Tool Calling Loop (max 10 iterations):
        ├─→ Iteration 1:
        │   ├─→ Claude decides: "navigate_to_page"
        │   ├─→ BrowserManager.navigateToUrl()
        │   │   └─→ Playwright navigates
        │   └─→ Returns page content
        │
        ├─→ Iteration 2:
        │   ├─→ Claude decides: "get_page_dom"
        │   ├─→ BrowserManager.getPageDOM()
        │   │   └─→ Playwright extracts HTML
        │   └─→ Returns DOM content
        │
        ├─→ Iteration 3:
        │   ├─→ Claude decides: "analyze_page_content"
        │   ├─→ Analysis tool processes DOM
        │   └─→ Returns analysis results
        │
        ├─→ More iterations as needed...
        │
        └─→ Claude concludes objective reached
            └─→ Returns findings
    ↓
Return CrawlerResult
    ├─→ success: boolean
    ├─→ findings: string
    ├─→ duration_ms: number
    └─→ error?: string
```

## Component Interactions

### 1. Crawler ↔ BrowserManager

```
Crawler
├─ Calls: initialize()
├─ Calls: cleanup()
└─ Passes to Agent for tool usage

BrowserManager
├─ Provides: navigateToUrl()
├─ Provides: getPageDOM()
├─ Provides: clickElement()
└─ Provides: fillInput()
```

### 2. WebCrawlerAgent ↔ Tools

```
WebCrawlerAgent
├─ Loads: getBrowserTools()
├─ Loads: getAnalysisTools()
├─ Calls: agent.invoke()
└─ Receives: tool results

Tools
├─ Call: BrowserManager methods
├─ Call: Analysis functions
└─ Return: JSON results
```

### 3. Agent ↔ Claude LLM

```
Claude LLM
├─ Receives: Objectives + Tools
├─ Reasons: Which tool to use
├─ Calls: Tool
├─ Observes: Tool result
└─ Repeats until done

Tool Calling Protocol
├─ Tool name: string
├─ Input: JSON object
└─ Output: JSON string
```

## State Management

### BrowserManager State

```
BrowserManager Instance
├─ browser: Browser | null
│   └─ Managed by Playwright
├─ context: BrowserContext | null
│   └─ Isolated browser session
└─ pages: Map<string, Page>
    ├─ "default": Page
    └─ "page_id": Page
```

### WebCrawlerAgent State

```
WebCrawlerAgent Instance
├─ model: ChatAnthropic
│   └─ Claude LLM instance
├─ tools: Tool[]
│   ├─ Browser tools
│   └─ Analysis tools
└─ executor: AgentExecutor
    └─ Manages tool calling loop
```

### Configuration State

```
config (Singleton)
├─ Environment variables
├─ Defaults
└─ Validation rules
```

## Tool Architecture

### LangChain Tool Structure

```
Tool (Abstract Class)
├─ name: string
│   └─ Tool identifier
├─ description: string
│   └─ What the tool does
├─ schema: z.ZodSchema
│   └─ Input validation
└─ _call(input): Promise<string>
    └─ Implementation
```

### Tool Lifecycle

```
1. Tool Definition
   └─ Extends Tool class
   └─ Defines schema

2. Tool Collection
   └─ getBrowserTools()
   └─ getAnalysisTools()

3. Agent Registration
   └─ Agent loads tools
   └─ Passes to Claude

4. Runtime
   └─ Claude selects tool
   └─ Validates input
   └─ Executes tool
   └─ Returns result
```

## Error Handling Strategy

### Error Flow

```
Operation
    ↓
Try Block
├─→ Success → Return result
└─→ Error ↓
    Try Recovery
    ├─→ Recovered → Return result
    └─→ Still Failed ↓
        Log Error
        ↓
        Throw or Return Error
```

### Retry Mechanism

```
Crawl Attempt
    ├─→ Success → Done
    └─→ Failed → Check retries
        ├─→ Can retry → Wait → Retry
        └─→ Max retries → Return error
```

## Performance Architecture

### Resource Management

```
Browser Resources:
├─ 1 Browser instance
├─ 1 Browser context (unless configured)
├─ Multiple pages (up to maxConcurrentPages)
└─ ~100-150MB per browser

LLM Resources:
├─ Token counting
├─ Context size management
└─ API rate limiting

Memory Optimization:
├─ Page DOM truncation (>10KB)
├─ Text summarization (>5KB)
└─ Streaming responses
```

### Execution Timeline

```
Crawl Duration
├─ Browser startup: 2-3s
├─ Page navigation: 1-10s per page
├─ LLM response: 2-10s per action
└─ Total: Varies by complexity
```

## Scalability Considerations

### Single Process

```
Limited by:
├─ Single browser instance
├─ Sequential page navigation
└─ Sequential LLM calls
```

### Multi-Process (Future)

```
Potential improvements:
├─ Worker pools
├─ Queue management
├─ Load balancing
└─ Distributed caching
```

## Security Architecture

### API Key Management

```
API Keys
├─ Stored in .env (not committed)
├─ Loaded by config.ts
├─ Passed to SDK constructors
└─ Never logged or exposed
```

### Browser Security

```
Browser Context:
├─ Viewport fixed size
├─ User agent set to realistic value
├─ Cookies per context
└─ Timeout enforcement
```

### Data Handling

```
Extracted Data
├─ Not persisted by default
├─ Returned in results
├─ User responsibility for storage
└─ No automatic logging
```

## Testing Architecture

### Unit Testing

```
Tools
├─ Isolated testing
├─ Mock BrowserManager
└─ Validate schema & execution
```

### Integration Testing

```
Full Crawl
├─ Real browser
├─ Real API calls
└─ End-to-end validation
```

## Deployment Architecture

### Build Process

```
Development (TypeScript)
    ↓
TypeScript Compiler (tsc)
    ↓
Production (JavaScript)
    ↓
Node.js Runtime
```

### Runtime Requirements

```
Node.js Environment
├─ Node.js 18+
├─ npm/yarn
├─ Environment variables
└─ Playwright browsers
```

## Extension Architecture

### Adding Custom Tools

```
1. Create Tool Class
   └─ Extends Tool
   └─ Implements _call()

2. Export Tool
   └─ Add to tool collection

3. Integrate
   └─ Load in agent initialization

4. Use
   └─ Claude can call it
```

### Adding Custom Analyzers

```
1. Add analysis function
   └─ src/tools/analysis-tools.ts

2. Wrap in Tool
   └─ Extends Tool

3. Integrate
   └─ Add to getAnalysisTools()
```

## Monitoring & Observability

### Logging Strategy

```
Logger (config-driven)
├─ DEBUG: All operations
├─ INFO: Key events
├─ WARN: Recoverable issues
└─ ERROR: Failures
```

### LangChain Tracing

```
Optional Integration:
├─ LANGCHAIN_TRACING_V2=true
├─ Sends to LangChain API
└─ Visualizes execution
```

## Reliability Patterns

### Graceful Degradation

```
Feature → Try Primary → Fallback → Error
├─ Navigate → Goto → Reload → Error message
├─ Extract → DOM → Text → Error message
└─ Click → Click → Keyboard → Error message
```

### Resource Cleanup

```
try {
  Initialize
  Crawl
} finally {
  Cleanup (Always)
  └─ Close browser
  └─ Release memory
  └─ Close connections
}
```

## Future Enhancement Opportunities

```
1. Multi-LLM support
   └─ OpenAI, Google, etc.

2. Advanced caching
   └─ DOM caching
   └─ Result caching

3. Performance metrics
   └─ Execution time tracking
   └─ Resource monitoring

4. Web UI
   └─ Visual agent control
   └─ Result inspection

5. Distributed crawling
   └─ Worker pools
   └─ Job queues
```

---

For implementation details, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).
For quick reference, see [QUICK_REFERENCE.md](QUICK_REFERENCE.md).
