/**
 * Exploration State Management
 * Manages runtime state during autonomous crawling
 */

import { createLogger } from "../utils/logger";

const logger = createLogger("ExplorationState");

/**
 * Cache entry for AI decisions
 */
export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Information about discovered action
 */
export interface ActionInfo {
  id: string;
  selector: string;
  type: "navigation" | "non_navigation" | "cross_feature" | "modal_trigger";
  description: string;
  targetUrl?: string;
  targetFeature?: string;
  executed: boolean;
}

/**
 * Feature exploration state
 */
export interface FeatureState {
  id: string;
  name: string;
  entryUrl: string;
  priority: number;
  visitedPages: Set<string>;
  pageQueue: string[];
  actions: Map<string, ActionInfo>;
  crossFeatureRefs: Map<string, string[]>; // feature -> [urls]
  status: "pending" | "exploring" | "completed" | "failed";
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  pageCount: number;
}

/**
 * Cross-feature reference tracking
 */
export interface CrossFeatureRef {
  sourceUrl: string;
  sourceFeature: string;
  targetFeature: string;
  targetUrl: string;
  trigger: string;
  count: number;
}

/**
 * Page visit record
 */
export interface PageVisit {
  url: string;
  feature: string;
  depth: number;
  timestamp: Date;
  stateVariant: number;
}

/**
 * Main exploration state interface
 */
export interface ExplorationState {
  // Current context
  currentPage: string | null;
  currentFeature: string | null;
  currentDepth: number;

  // Page tracking
  visitedPages: Set<string>;
  pageQueue: string[];
  navigationStack: string[];
  pageVisitHistory: PageVisit[];

  // Feature tracking
  features: Map<string, FeatureState>;
  featureQueue: string[];

  // Cross-feature tracking
  crossFeatureRefs: CrossFeatureRef[];

  // AI cache
  aiCache: Map<string, CacheEntry>;

  // Exploration metadata
  startedAt: Date;
  lastActivityAt: Date;
  totalPagesExplored: number;
  totalActionsDiscovered: number;
}

/**
 * Create initial exploration state
 */
export function createExplorationState(): ExplorationState {
  return {
    currentPage: null,
    currentFeature: null,
    currentDepth: 0,

    visitedPages: new Set(),
    pageQueue: [],
    navigationStack: [],
    pageVisitHistory: [],

    features: new Map(),
    featureQueue: [],

    crossFeatureRefs: [],

    aiCache: new Map(),

    startedAt: new Date(),
    lastActivityAt: new Date(),
    totalPagesExplored: 0,
    totalActionsDiscovered: 0,
  };
}

/**
 * Add page to visited set
 */
export function addVisitedPage(
  state: ExplorationState,
  url: string,
  feature: string
): void {
  state.visitedPages.add(url);
  state.totalPagesExplored++;
  state.lastActivityAt = new Date();

  const pageVisit: PageVisit = {
    url,
    feature,
    depth: state.currentDepth,
    timestamp: new Date(),
    stateVariant: 0,
  };

  state.pageVisitHistory.push(pageVisit);
}

/**
 * Check if page has been visited
 */
export function isPageVisited(state: ExplorationState, url: string): boolean {
  return state.visitedPages.has(url);
}

/**
 * Queue page for exploration
 */
export function queuePage(state: ExplorationState, url: string): void {
  if (!state.visitedPages.has(url) && !state.pageQueue.includes(url)) {
    state.pageQueue.push(url);
  }
}

/**
 * Get next page to explore
 */
export function getNextPage(state: ExplorationState): string | null {
  return state.pageQueue.length > 0 ? state.pageQueue.shift() || null : null;
}

/**
 * Add feature to exploration
 */
export function addFeature(
  state: ExplorationState,
  feature: FeatureState
): void {
  state.features.set(feature.id, feature);
  state.featureQueue.push(feature.id);
  logger.info(`Feature added: ${feature.id} (priority: ${feature.priority})`);
}

/**
 * Get next feature to explore
 */
export function getNextFeature(state: ExplorationState): string | null {
  if (state.featureQueue.length === 0) {
    return null;
  }

  // Sort by priority and get next
  const sortedFeatures = state.featureQueue.sort(
    (a, b) =>
      (state.features.get(a)?.priority || 999) -
      (state.features.get(b)?.priority || 999)
  );

  return sortedFeatures.shift() || null;
}

/**
 * Update feature status
 */
export function updateFeatureStatus(
  state: ExplorationState,
  featureId: string,
  status: FeatureState["status"],
  error?: string
): void {
  const feature = state.features.get(featureId);
  if (feature) {
    feature.status = status;
    feature.error = error;

    if (status === "exploring" && !feature.startedAt) {
      feature.startedAt = new Date();
    }
    if (status === "completed" || status === "failed") {
      feature.completedAt = new Date();
    }

    logger.info(
      `Feature status: ${featureId} -> ${status}${error ? ` (${error})` : ""}`
    );
  }
}

/**
 * Add action to feature
 */
export function addActionToFeature(
  state: ExplorationState,
  featureId: string,
  action: ActionInfo
): void {
  const feature = state.features.get(featureId);
  if (feature) {
    feature.actions.set(action.id, action);
    state.totalActionsDiscovered++;
  }
}

/**
 * Record cross-feature reference
 */
export function recordCrossFeatureRef(
  state: ExplorationState,
  sourceUrl: string,
  sourceFeature: string,
  targetFeature: string,
  targetUrl: string,
  trigger: string
): void {
  // Check if already exists
  const existing = state.crossFeatureRefs.find(
    (ref) =>
      ref.sourceUrl === sourceUrl &&
      ref.sourceFeature === sourceFeature &&
      ref.targetFeature === targetFeature &&
      ref.targetUrl === targetUrl
  );

  if (existing) {
    existing.count++;
  } else {
    state.crossFeatureRefs.push({
      sourceUrl,
      sourceFeature,
      targetFeature,
      targetUrl,
      trigger,
      count: 1,
    });
  }

  logger.debug(
    `Cross-feature ref: ${sourceFeature} -> ${targetFeature} (${targetUrl})`
  );
}

/**
 * Get AI cache entry
 */
export function getCacheEntry<T = any>(
  state: ExplorationState,
  key: string
): T | null {
  const entry = state.aiCache.get(key);

  if (!entry) {
    return null;
  }

  // Check if expired
  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    state.aiCache.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Set AI cache entry
 */
export function setCacheEntry<T = any>(
  state: ExplorationState,
  key: string,
  value: T,
  ttl: number = 3600000 // 1 hour default
): void {
  state.aiCache.set(key, {
    value,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(state: ExplorationState): void {
  const now = Date.now();
  const expired: string[] = [];

  state.aiCache.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      expired.push(key);
    }
  });

  expired.forEach((key) => state.aiCache.delete(key));

  if (expired.length > 0) {
    logger.debug(`Cleared ${expired.length} expired cache entries`);
  }
}

/**
 * Get exploration statistics
 */
export function getExplorationStats(
  state: ExplorationState
): Record<string, any> {
  const completedFeatures = Array.from(state.features.values()).filter(
    (f) => f.status === "completed"
  );

  const totalPages = Array.from(state.features.values()).reduce(
    (sum, f) => sum + f.pageCount,
    0
  );

  const duration = Date.now() - state.startedAt.getTime();

  return {
    startedAt: state.startedAt,
    lastActivityAt: state.lastActivityAt,
    duration: duration,
    durationMinutes: (duration / 60000).toFixed(2),

    // Feature stats
    totalFeatures: state.features.size,
    featuresExplored: completedFeatures.length,
    featureQueue: state.featureQueue.length,

    // Page stats
    totalPagesExplored: state.totalPagesExplored,
    totalPages: totalPages,
    pageQueueSize: state.pageQueue.length,

    // Action stats
    totalActionsDiscovered: state.totalActionsDiscovered,
    totalCrossFeatureRefs: state.crossFeatureRefs.length,

    // Cache stats
    cacheSize: state.aiCache.size,

    // Feature details
    features: Array.from(state.features.values()).map((f) => ({
      id: f.id,
      name: f.name,
      status: f.status,
      pageCount: f.pageCount,
      actionCount: f.actions.size,
      duration: f.completedAt && f.startedAt
        ? f.completedAt.getTime() - f.startedAt.getTime()
        : null,
    })),
  };
}

/**
 * Reset exploration state
 */
export function resetExplorationState(state: ExplorationState): void {
  state.currentPage = null;
  state.currentFeature = null;
  state.currentDepth = 0;

  state.visitedPages.clear();
  state.pageQueue = [];
  state.navigationStack = [];
  state.pageVisitHistory = [];

  state.features.clear();
  state.featureQueue = [];

  state.crossFeatureRefs = [];

  state.aiCache.clear();

  state.startedAt = new Date();
  state.lastActivityAt = new Date();
  state.totalPagesExplored = 0;
  state.totalActionsDiscovered = 0;

  logger.info("Exploration state reset");
}
