# Agentic Integration Guide

## Overview

All advanced crawling features have been **integrated as LangChain tools** into the autonomous agent flow. The agent now has complete control over autonomous exploration using AI-powered decision-making.

---

## Architecture Overview

### Tool Integration Model

```
Agent (LLaMA via LangChain)
    ├─ decides what to do next
    ├─ calls appropriate tools
    └─ reasons about results
         ↓
Tools (Integrated Crawling Analysis)
    ├─ discover_global_navigation        (AI: find features)
    ├─ analyze_current_page              (AI: understand page)
    ├─ detect_page_pattern               (Fast: check patterns)
    ├─ evaluate_stopping_condition       (AI: when to stop)
    ├─ record_feature_info               (Logging: document findings)
    ├─ get_exploration_status            (Status: monitor progress)
    ├─ navigate_to_page                  (Browser: move around)
    ├─ click_element                     (Browser: interact)
    └─ [+ 10+ more browser tools...]
         ↓
Advanced Modules (State Management & Output)
    ├─ Exploration State                 (Track progress)
    ├─ Sitemap Builder                   (Build structure)
    ├─ Knowledge Graph Builder           (Build relationships)
    ├─ Pattern Detector                  (Recognize patterns)
    └─ Artifact Storage                  (Save results)
```

---

## Integrated Crawler Analysis Tools

### Tool 1: Discover Global Navigation
**Function**: `createDiscoverNavigationTool()`

Analyzes the current page and detects global navigation structure.

**Input:**
```json
{
  "page_id": "default"  // Optional, defaults to 'default'
}
```

**Returns:**
```json
{
  "success": true,
  "navigation": {
    "structure": "hierarchical|flat|hybrid",
    "estimatedFeatures": 5,
    "analysis": { /* navigation analysis */ },
    "globalNav": [ /* top 10 nav items */ ]
  },
  "features": [
    {
      "id": "feature_123",
      "name": "Feature Name",
      "entryUrl": "https://...",
      "priority": 100,
      "description": "..."
    }
  ],
  "totalNavItems": 25,
  "primaryCount": 5,
  "secondaryCount": 10
}
```

**Use Case**: At the start of exploration to understand app structure

---

### Tool 2: Analyze Current Page
**Function**: `createAnalyzeCurrentPageTool()`

Performs comprehensive AI analysis of the current page.

**Input:**
```json
{
  "page_id": "default"  // Optional
}
```

**Returns:**
```json
{
  "success": true,
  "pageUrl": "https://example.com/page",
  "pageTitle": "Page Title",
  "pageType": "dashboard|list|detail|form|settings|...",
  "pageDescription": "What this page does",
  "businessValue": "primary|secondary|utility",
  "summary": {
    "interactiveElementCount": 15,
    "navigationLinksCount": 8,
    "crossFeatureLinksCount": 3,
    "formsCount": 2,
    "modalsDetected": 1
  },
  "elements": {
    "navigationElements": [ /* top 5 nav elements */ ],
    "formsCount": 2,
    "modalsDetected": [ /* modal types */ ],
    "crossFeatureLinks": { "feature_name": ["url1", "url2"] }
  },
  "recommendations": [ /* optimization suggestions */ ],
  "confidence": 0.95
}
```

**Use Case**: After navigating to a page, to understand what's on it

---

### Tool 3: Detect Page Pattern
**Function**: `createDetectPagePatternTool(patternDetector)`

Checks if current page matches any known patterns for fast cataloging.

**Input:**
```json
{
  "page_id": "default"  // Optional
}
```

**Returns (Pattern Match):**
```json
{
  "success": true,
  "patternMatched": true,
  "patternId": "pattern_abc123",
  "patternName": "Product List Page",
  "confidence": 0.92,
  "reasoning": "Same layout (grid), Similar element count, Similar semantic structure",
  "message": "Page matches Product List Page pattern. Can be quick cataloged."
}
```

**Returns (No Match):**
```json
{
  "success": true,
  "patternMatched": false,
  "message": "No pattern match detected. Page needs full analysis.",
  "fingerprint": {
    "layout": "grid",
    "sections": 3,
    "forms": 1,
    "buttons": 12,
    "links": 25
  }
}
```

**Use Case**: After analyzing a page, to see if we can skip detailed analysis for similar pages

---

### Tool 4: Evaluate Stopping Condition
**Function**: `createEvaluateStoppingConditionTool()`

Determines if exploration of current feature should stop.

**Input:**
```json
{
  "pages_explored": 25,
  "max_pages_limit": 50,
  "depth_reached": 2,
  "max_depth_limit": 3,
  "new_pages_last_batch": 1,
  "estimated_total_pages": 30,
  "page_types_found": ["list", "detail", "form", "settings"]
}
```

**Returns:**
```json
{
  "success": true,
  "shouldStop": true,
  "confidence": 0.87,
  "reason": "Coverage sufficient (83%) - found 4 unique page types with few new pages",
  "factors": {
    "coveragePercentage": 83,
    "patternDetected": true,
    "depthReached": false,
    "timeLimit": false,
    "diminishingReturns": true,
    "resourceConstraint": false
  },
  "recommendation": "Stop exploring this feature - good coverage achieved"
}
```

**Use Case**: Decide when to move to the next feature

---

### Tool 5: Record Feature Info
**Function**: `createRecordFeatureInfoTool()`

Records information about a discovered feature.

**Input:**
```json
{
  "feature_id": "feature_123",
  "feature_name": "Products",
  "entry_url": "https://example.com/products",
  "priority": 100,
  "pages_explored": 12,
  "page_types": ["list", "detail", "review"]
}
```

**Returns:**
```json
{
  "success": true,
  "featureId": "feature_123",
  "featureName": "Products",
  "entryUrl": "https://example.com/products",
  "priority": 100,
  "pagesExplored": 12,
  "pageTypes": ["list", "detail", "review"],
  "message": "Feature Products recorded with 12 pages and 3 unique page types"
}
```

**Use Case**: After finishing a feature, to document what was found

---

### Tool 6: Get Exploration Status
**Function**: `createGetExplorationStatusTool()`

Returns current exploration status.

**Input:**
```json
{}
```

**Returns:**
```json
{
  "success": true,
  "status": "ready",
  "message": "Use other tools to start and track exploration",
  "availableTools": [
    "discover_global_navigation",
    "analyze_current_page",
    "detect_page_pattern",
    "evaluate_stopping_condition",
    "record_feature_info",
    "get_exploration_status"
  ]
}
```

**Use Case**: Monitor overall progress or check available tools

---

## Autonomous Crawler Agent

### Agent Module
**File**: `src/agent/autonomous-crawler-agent.ts`

Provides the main autonomous crawler agent with integrated tools.

### Key Exports

```typescript
// Initialize agent with config
await initializeAutonomousCrawlerAgent({
  maxDepth: 3,
  maxPagesPerFeature: 50,
  patternThreshold: 0.85,
  aiCacheTTL: 3600000,
  navigationTimeout: 30000,
  allowFormSubmission: false,
  allowDestructiveActions: false,
  allowFormFilling: false,
  maxParallelFeatures: 3,
  maxStatesPerPage: 10
});

// Create crawler executor
const executor = await createAutonomousCrawler();

// Run autonomous crawl
const result = await startAutonomousCrawl(baseUrl, objective);

// Clean up
await closeAutonomousCrawlerAgent();
```

### System Prompt

The agent receives a comprehensive system prompt that explains:
- Crawling philosophy (start with navigation discovery)
- Available tools and their purposes
- Crawling strategy (DFS, pattern detection, stopping conditions)
- Configuration constraints
- Important rules (use tools, be thorough but efficient)

---

## Agent Decision-Making Flow

### Typical Autonomous Crawl Sequence

```
1. Agent receives objective (e.g., "Explore website and discover features")
2. Agent calls: discover_global_navigation
   └─ Identifies 5 features with priorities
3. Agent queues features in priority order
4. For each feature:
   a. Agent calls: navigate_to_page (entry URL)
   b. Agent calls: analyze_current_page
      └─ Finds 12 interactive elements
   c. Agent calls: detect_page_pattern
      └─ No match - needs full analysis
   d. Agent identifies navigation links and queues pages
   e. Loop: for each discovered page:
      i.   navigate_to_page
      ii.  analyze_current_page
      iii. detect_page_pattern
      iv.  If pattern matches: record and skip
      v.   If no match: analyze fully
      vi.  Extract cross-feature links
   f. Agent calls: evaluate_stopping_condition
      └─ Decision: Continue or stop
   g. Agent calls: record_feature_info
      └─ Documents: pages, types, findings
5. Agent summarizes all findings
6. State captures: sitemap, knowledge graph, patterns
```

---

## Complete Usage Example

### Basic Autonomous Crawl

```typescript
import {
  initializeAutonomousCrawlerAgent,
  createAutonomousCrawler,
  startAutonomousCrawl,
  closeAutonomousCrawlerAgent,
} from "./agent/autonomous-crawler-agent";
import * as browser from "./browser/browser-manager";

// Initialize browser
await browser.initializeBrowser();
await browser.navigateToUrl("https://example.com");

// Initialize agent with configuration
await initializeAutonomousCrawlerAgent({
  maxDepth: 3,
  maxPagesPerFeature: 50,
  patternThreshold: 0.85,
  allowFormSubmission: false,
  allowDestructiveActions: false,
});

// Create crawler
const executor = await createAutonomousCrawler();

// Start crawl
const result = await startAutonomousCrawl(
  "https://example.com",
  `Explore the website and discover:
  1. All main features/sections
  2. Types of pages within each feature
  3. Cross-feature relationships
  Provide comprehensive understanding of site structure.`
);

console.log("Crawl Results:");
console.log("Success:", result.success);
console.log("Findings:", result.findings);

// Cleanup
await closeAutonomousCrawlerAgent();
await browser.cleanupBrowser();
```

---

## Data Flow: From Tools to State Management

```
discover_global_navigation (Tool)
    ↓ identifies 5 features
    ↓ (Agent interprets)
    ↓
Exploration State
    - Adds features to queue
    - Sets priorities
    ↓
analyze_current_page (Tool) - runs for each page
    ↓ returns page analysis
    ↓ (Agent records)
    ↓
Sitemap Builder
    - Adds pages with analysis
    - Records actions
    - Maps links
    ↓
detect_page_pattern (Tool)
    ↓ checks if pattern match
    ↓ (Agent decides to catalog quickly or analyze fully)
    ↓
Pattern Detector
    - Registers new patterns
    - Matches similar pages
    ↓
evaluate_stopping_condition (Tool)
    ↓ returns stop decision
    ↓ (Agent acts on decision)
    ↓
record_feature_info (Tool)
    ↓ documents feature
    ↓
Knowledge Graph Builder
    - Adds feature node
    - Creates cross-feature edges
    ↓
Artifact Storage
    - Saves sitemap.json
    - Saves knowledge-graph.json
    - Saves statistics.json
    - Saves patterns.json
```

---

## Tool Integration Points

### Browser Tools (Existing)
- `navigate_to_page` - Move to URL
- `get_page_dom` - Extract HTML
- `click_element` - Interact with page
- `fill_input` - Type in forms
- `take_screenshot` - Capture images
- [+ 8 more browser operations]

### Crawler Analysis Tools (NEW)
- `discover_global_navigation` - AI feature discovery
- `analyze_current_page` - AI page analysis
- `detect_page_pattern` - Pattern matching
- `evaluate_stopping_condition` - Stopping decision
- `record_feature_info` - Documentation
- `get_exploration_status` - Progress tracking

### Total: 17+ Tools Available to Agent

---

## Configuration

### Crawl Configuration

```typescript
{
  // Feature exploration limits
  maxDepth: 3,                        // Max feature depth
  maxPagesPerFeature: 50,             // Max pages per feature

  // Pattern detection
  patternThreshold: 0.85,             // Pattern confidence (0-1)

  // Performance
  aiCacheTTL: 3600000,                // AI result cache TTL (1 hour)
  navigationTimeout: 30000,           // Navigation timeout (30s)

  // Safety constraints
  allowFormSubmission: false,         // Don't submit forms
  allowDestructiveActions: false,     // Don't delete/logout
  allowFormFilling: false,            // Don't fill forms

  // Parallelization
  maxParallelFeatures: 3,             // Concurrent features
  maxStatesPerPage: 10                // Dynamic states per page
}
```

### Environment Variables

```bash
TOGETHER_API_KEY=your_key
TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf
OPENAI_BASE_URL=https://api.together.xyz/v1
```

---

## Agent Prompting Strategy

The agent receives three levels of guidance:

1. **System Prompt** - Overall philosophy and strategy
2. **Tool Descriptions** - What each tool does and when to use it
3. **Configuration** - Constraints and limits to respect

This allows the agent to:
- Make intelligent decisions about what to explore
- Use tools in the right order
- Know when to stop
- Document findings systematically

---

## State Persistence

All discoveries are stored via Artifact Storage:

```
runs/
└── app_name/
    └── crawl_id/
        ├── sitemap.json              # Complete page structure
        ├── knowledge-graph.json      # Feature relationships
        ├── statistics.json           # Metrics
        ├── patterns.json             # Detected patterns
        ├── metadata.json             # Crawl info
        ├── exploration.log           # Event log
        ├── REPORT.md                 # Summary report
        ├── snapshots/                # Page data
        ├── screenshots/              # Page images
        └── html/                     # Raw HTML
```

---

## Testing the Integration

### Test Case 1: Simple Navigation Discovery

```typescript
await initializeAutonomousCrawlerAgent();
const result = await startAutonomousCrawl(
  "https://example.com",
  "Discover all main features"
);
// Check: result.findings mentions discovered features
```

### Test Case 2: Pattern Detection

```typescript
// Crawl a site with repetitive page types (e.g., product list/detail)
const result = await startAutonomousCrawl(
  "https://shop.example.com",
  "Explore all products"
);
// Check: Pattern detection should reduce full analyses
```

### Test Case 3: Artifact Generation

```typescript
const storage = createArtifactStorage("Example", baseUrl);
// After crawl completes, check storage directory
const artifacts = storage.listArtifacts();
// Check: All artifact files exist and contain valid JSON
```

---

## Architecture Benefits

1. **Autonomous Decision-Making**
   - Agent decides what to explore
   - Uses AI to assess pages
   - Determines stopping points

2. **Tool Integration**
   - All crawling features as LangChain tools
   - Agent can compose tools intelligently
   - Clear interfaces between tools

3. **State Management**
   - Exploration state tracks progress
   - Sitemap accumulates findings
   - Knowledge graph builds relationships
   - Patterns avoid redundant work

4. **Comprehensive Output**
   - Structured artifacts (JSON)
   - Summary reports (Markdown)
   - Full traceability (logs)

---

## Next Steps

### Future Enhancements

1. **Multi-Agent Parallelization**
   - Separate agents for different features
   - Shared state coordination
   - Faster exploration

2. **Advanced Pattern Detection**
   - ML-based pattern classification
   - Automatic grouping of similar pages
   - Sampling recommendations

3. **Interactive Mode**
   - Allow user to guide agent
   - Ask agent questions about findings
   - Refine exploration strategy mid-crawl

4. **Export Formats**
   - GraphQL schema generation
   - OpenAPI specification generation
   - Business intelligence dashboards

---

## Summary

✅ **All crawling features integrated as LangChain tools**
✅ **Agent has autonomous decision-making capability**
✅ **State management persists all findings**
✅ **Configuration-driven exploration**
✅ **Comprehensive artifact output**

The spider crawler is now a fully autonomous, AI-powered web exploration system! 🚀
