# Feature Implementation Plan: Autonomous Crawling, Sitemap & Knowledge Graph

## Overview

This document outlines the step-by-step implementation of advanced features from the crawl-agent project into the spider-10-nov crawler using a functional, agentic approach.

---

## Phase 1: Core Exploration Architecture

### 1.1 Exploration State Management
**File**: `src/state/exploration-state.ts`

Manages runtime exploration state:
- Current page/feature being explored
- Visited pages set
- Page queue (DFS)
- Navigation stack (for backtracking)
- AI cache for pattern detection
- Current feature context

```typescript
interface ExplorationState {
  currentPage: string | null
  visitedPages: Set<string>
  pageQueue: string[]
  navigationStack: string[]
  aiCache: Map<string, CacheEntry>
  currentFeature: string | null
  features: Map<string, FeatureState>
  crossFeatureRefs: Map<string, Set<string>>
}

interface FeatureState {
  id: string
  name: string
  entryUrl: string
  visitedPages: Set<string>
  pageQueue: string[]
  actions: Map<string, ActionInfo>
  started: Date
  completed?: Date
}
```

### 1.2 Autonomous Crawler Orchestrator
**File**: `src/core/crawler-orchestrator.ts`

Main orchestration function:

```typescript
async function orchestrateCrawl(
  baseUrl: string,
  config: CrawlConfig
): Promise<CrawlResult>
```

Flow:
1. Initialize state and storage
2. Navigate to landing page
3. Detect global navigation (AI)
4. Build feature queue
5. Execute parallel feature exploration
6. Finalize sitemap
7. Generate knowledge graph

### 1.3 Feature Explorer (DFS)
**File**: `src/core/feature-explorer.ts`

Explores single feature using depth-first search:

```typescript
async function exploreFeature(
  featureId: string,
  entryUrl: string,
  config: CrawlConfig
): Promise<FeatureExplorationResult>
```

---

## Phase 2: Page-Level Exploration

### 2.1 Page Explorer (Multi-State)
**File**: `src/core/page-explorer.ts`

Explores all dynamic states on a page:

```typescript
async function explorePage(
  url: string,
  featureId: string,
  config: CrawlConfig
): Promise<PageExplorationResult>
```

Process:
1. Navigate to page
2. Multi-state exploration (capture modals, dropdowns, etc.)
3. Extract all actions
4. Execute navigation actions
5. Add page to sitemap

### 2.2 Multi-State Explorer
**File**: `src/core/multi-state-explorer.ts`

Captures all page states:

```typescript
async function explorePageStates(
  pageUrl: string,
  config: CrawlConfig
): Promise<UnifiedPageAnalysis>
```

Process:
1. Capture initial state (raw HTML)
2. AI identifies state-revealing actions
3. Execute each action → capture state
4. Merge states into unified analysis

---

## Phase 3: AI Analysis Modules

### 3.1 Navigation Analyzer
**File**: `src/ai/navigation-analyzer.ts`

Detects global navigation structure:

```typescript
async function analyzeNavigationStructure(
  pageHtml: string,
  pageUrl: string
): Promise<NavigationMap>
```

Returns:
- All navigation elements with business priority
- Categorization (primary, secondary, utility)
- URL deduplication (smart grouping)

### 3.2 Page Analyzer
**File**: `src/ai/page-analyzer.ts`

Analyzes page content and interactions:

```typescript
async function analyzePage(
  rawPageData: RawPageData,
  config: AnalysisConfig
): Promise<PageAnalysis>
```

Returns:
- Interactive elements
- Action types (navigation, non-navigation, cross-feature)
- Business summary
- Page type/purpose

### 3.3 Stopping Condition Evaluator
**File**: `src/ai/stopping-condition.ts`

Determines when to stop feature exploration:

```typescript
async function shouldStopExploringFeature(
  featureState: FeatureState,
  stats: ExplorationStats,
  config: CrawlConfig
): Promise<{ shouldStop: boolean; reason: string }>
```

Evaluates:
- Coverage vs limits
- Pattern confidence
- Diminishing returns
- Resource constraints

---

## Phase 4: Output Generation

### 4.1 Sitemap Builder
**File**: `src/state/sitemap-builder.ts`

Builds and manages sitemap structure:

```typescript
class SitemapBuilder {
  addPage(pageData: PageInfo): void
  addFeature(featureData: FeatureInfo): void
  addPattern(patternData: PatternInfo): void
  addCrossFeatureRef(source: string, target: string): void
  finalize(): Sitemap
}
```

Sitemap structure:
- Metadata (exploration time, stats)
- Navigation (features, global nav)
- Pages (with analysis, actions, links)
- Patterns (with sampling strategy)
- Cross-feature graph
- Statistics

### 4.2 Knowledge Graph Generator
**File**: `src/state/knowledge-graph-builder.ts`

Generates cross-feature relationship graph:

```typescript
async function buildKnowledgeGraph(
  explorationState: ExplorationState,
  sitemap: Sitemap
): Promise<KnowledgeGraph>
```

Output:
- Feature nodes
- Cross-feature edges with link counts
- Bidirectional relationships
- Connection metadata

---

## Phase 5: Integration with Existing Agent

### 5.1 Update Agent Tools
**File**: `src/tools/browser-tools.ts`

Add tools for:
- Deep page analysis (with raw HTML)
- Navigation detection
- State capture/comparison
- Pattern detection

### 5.2 Update Agent Prompts
**File**: `src/agent/web-crawler-agent.ts`

Enhance system prompt to:
- Guide exploration strategy (DFS)
- Explain stopping conditions
- Handle multi-state scenarios
- Understand global navigation

### 5.3 Create Crawler Tools
**File**: `src/tools/crawler-tools.ts`

New tools for exploration:
- Navigate to feature
- Explore page states
- Detect global navigation
- Analyze page patterns

---

## Phase 6: API & Storage

### 6.1 Storage Management
**File**: `src/storage/artifact-storage.ts`

Save artifacts:
- `sitemap.json` - Complete exploration result
- `knowledge-graph.json` - Feature relationships
- `stats.json` - Exploration statistics
- `patterns.json` - Discovered patterns
- `artifacts/` - Debug data

### 6.2 API Integration
**Update**: `src/index.ts`

Export functions for:
- Starting autonomous crawls
- Getting crawl progress
- Retrieving results
- Exporting artifacts

---

## Implementation Order

1. **Week 1: Foundation**
   - [ ] Exploration state management
   - [ ] Page explorer (basic multi-state)
   - [ ] Sitemap builder
   - [ ] Storage/artifacts

2. **Week 2: AI Analysis**
   - [ ] Navigation analyzer
   - [ ] Page analyzer
   - [ ] Stopping condition evaluator
   - [ ] Pattern detection

3. **Week 3: Orchestration**
   - [ ] Feature explorer (DFS)
   - [ ] Crawler orchestrator
   - [ ] Parallel execution
   - [ ] Knowledge graph generation

4. **Week 4: Integration & Testing**
   - [ ] Agent tool updates
   - [ ] CLI interface
   - [ ] End-to-end testing
   - [ ] Performance optimization

---

## Configuration

```json
{
  "exploration": {
    "maxDepth": 3,
    "maxPagesPerFeature": 50,
    "patternThreshold": 0.85,
    "maxParallelFeatures": 3,
    "maxStatesPerPage": 10,
    "aiCacheTTL": 3600000,
    "navigationTimeout": 30000,
    "allowFormSubmission": false,
    "allowDestructiveActions": false
  }
}
```

---

## Success Criteria

- [ ] Autonomous crawling discovers all features in test apps
- [ ] Multi-state exploration captures modals, dropdowns, tabs
- [ ] Sitemap accurately represents page structure
- [ ] Knowledge graph shows feature relationships
- [ ] Pattern detection achieves 85%+ confidence
- [ ] Parallel execution explores 3+ features concurrently
- [ ] Performance: <10 min for medium-sized app (50 pages)
- [ ] AI cache reduces LLM calls by 70%+

---

## Technology Stack

- **State Management**: Functional approach with closures
- **AI Analysis**: LangChain + LLaMA via Together API
- **Browser Automation**: Playwright
- **Data Structures**: TypeScript interfaces
- **Storage**: File system (JSON artifacts)
- **Logging**: Structured logging with timestamps

---

## Risk Mitigation

1. **Token Budget**: Cache AI results heavily
2. **Timeouts**: Configurable navigation timeouts
3. **Memory**: Stream large results instead of buffering
4. **Browser**: Context isolation for parallel features
5. **State Consistency**: Transactional updates to sitemap

