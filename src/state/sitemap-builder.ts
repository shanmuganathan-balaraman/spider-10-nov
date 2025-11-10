/**
 * Sitemap Builder
 * Constructs and manages the sitemap of discovered pages and features
 */

import { createLogger } from "../utils/logger";

const logger = createLogger("SitemapBuilder");

/**
 * Page analysis result
 */
export interface PageAnalysis {
  id: string;
  url: string;
  title: string;
  type: string;
  feature: string;
  depth: number;
  description?: string;
  primaryActions?: string[];
  actions: string[];
  interactions: string[];
  linksTo: string[];
  crossFeatureLinks: Map<string, string[]>; // feature -> [urls]
  modals?: string[];
  observations: Record<string, any>;
  discoveredAt: Date;
  updatedAt: Date;
}

/**
 * Feature information
 */
export interface FeatureInfo {
  id: string;
  name: string;
  entryUrl: string;
  priority: number;
  pageCount: number;
  actionCount: number;
  status: "explored" | "sampling" | "incomplete";
  duration?: number;
  workflowPatterns?: string[];
}

/**
 * Pattern information
 */
export interface PatternInfo {
  patternId: string;
  pageType: string;
  samplePages: string[];
  commonStructure: Record<string, any>;
  confidence: number;
  totalInstances: number;
  explored: number;
}

/**
 * Cross-feature connection
 */
export interface CrossFeatureConnection {
  from: string;
  to: string;
  connectionType: string;
  linkCount: number;
  bidirectional: boolean;
  pages: Array<{
    fromPage: string;
    toPage: string;
    context: string;
  }>;
}

/**
 * Sitemap metadata
 */
export interface SitemapMetadata {
  name: string;
  baseUrl: string;
  exploredAt: Date;
  duration: number;
  explorerVersion: string;
  sdkTracking?: {
    detectedSDKs: string[];
    totalEventsCaptured: number;
    pagesWithSDKs: number;
  };
}

/**
 * Navigation information
 */
export interface NavigationInfo {
  globalNav: Array<{ label: string; url: string }>;
  features: Map<string, FeatureInfo>;
}

/**
 * Statistics
 */
export interface SitemapStatistics {
  totalPages: number;
  pagesFullyExplored: number;
  pagesQuickCataloged?: number;
  pagesByType?: Record<string, number>;
  actionsByType?: Record<string, number>;
  featuresExplored?: Record<string, any>;
  efficiency?: {
    totalDiscoverablePagesEstimate?: number;
    pagesVisited: number;
    coveragePercentage: number;
    patternCoverage?: number;
    reason?: string;
  };
  depthStatistics?: Record<string, any>;
  coverage?: number;
}

/**
 * Complete sitemap structure
 */
export interface Sitemap {
  metadata: SitemapMetadata;
  navigation: NavigationInfo;
  pages: Map<string, PageAnalysis>;
  patterns: Map<string, PatternInfo>;
  workflows?: Map<string, any>;
  crossFeatureGraph: {
    summary: {
      totalConnections: number;
      bidirectionalConnections: number;
    };
    edges: CrossFeatureConnection[];
  };
  stats: SitemapStatistics;
}

/**
 * Sitemap builder class
 */
export class SitemapBuilder {
  private sitemap: Sitemap;
  private pagesByType: Map<string, number> = new Map();
  private actionsByType: Map<string, number> = new Map();

  constructor(baseUrl: string, appName: string = "Application") {
    this.sitemap = {
      metadata: {
        name: appName,
        baseUrl,
        exploredAt: new Date(),
        duration: 0,
        explorerVersion: "1.0.0",
      },
      navigation: {
        globalNav: [],
        features: new Map(),
      },
      pages: new Map(),
      patterns: new Map(),
      crossFeatureGraph: {
        summary: {
          totalConnections: 0,
          bidirectionalConnections: 0,
        },
        edges: [],
      },
      stats: {
        totalPages: 0,
        pagesFullyExplored: 0,
        coverage: 0,
      },
    };
  }

  /**
   * Add page to sitemap
   */
  addPage(pageData: Partial<PageAnalysis>): void {
    const pageId = this.generatePageId(pageData.url || "");

    const page: PageAnalysis = {
      id: pageId,
      url: pageData.url || "",
      title: pageData.title || "Untitled",
      type: pageData.type || "page",
      feature: pageData.feature || "unknown",
      depth: pageData.depth || 0,
      description: pageData.description,
      primaryActions: pageData.primaryActions || [],
      actions: pageData.actions || [],
      interactions: pageData.interactions || [],
      linksTo: pageData.linksTo || [],
      crossFeatureLinks: pageData.crossFeatureLinks || new Map(),
      modals: pageData.modals,
      observations: pageData.observations || {},
      discoveredAt: new Date(),
      updatedAt: new Date(),
    };

    this.sitemap.pages.set(pageId, page);

    // Update statistics
    this.updatePageTypeStats(page.type);
    this.updateActionTypeStats(page.actions);

    logger.info(`Page added: ${page.url} (type: ${page.type})`);
  }

  /**
   * Add feature to sitemap
   */
  addFeature(featureData: FeatureInfo): void {
    this.sitemap.navigation.features.set(featureData.id, featureData);
    logger.info(
      `Feature added: ${featureData.name} (${featureData.pageCount} pages)`
    );
  }

  /**
   * Add pattern to sitemap
   */
  addPattern(patternData: PatternInfo): void {
    this.sitemap.patterns.set(patternData.patternId, patternData);
    logger.info(
      `Pattern added: ${patternData.pageType} (${patternData.totalInstances} instances)`
    );
  }

  /**
   * Add cross-feature reference
   */
  addCrossFeatureRef(
    fromFeature: string,
    toFeature: string,
    fromPage: string,
    toPage: string,
    context: string
  ): void {
    // Find existing edge
    const existingEdge = this.sitemap.crossFeatureGraph.edges.find(
      (e) => e.from === fromFeature && e.to === toFeature
    );

    if (existingEdge) {
      existingEdge.linkCount++;
      existingEdge.pages.push({ fromPage, toPage, context });
    } else {
      this.sitemap.crossFeatureGraph.edges.push({
        from: fromFeature,
        to: toFeature,
        connectionType: "navigation",
        linkCount: 1,
        bidirectional: false,
        pages: [{ fromPage, toPage, context }],
      });
    }

    // Check for bidirectional
    const reverseEdge = this.sitemap.crossFeatureGraph.edges.find(
      (e) => e.from === toFeature && e.to === fromFeature
    );

    if (reverseEdge) {
      existingEdge!.bidirectional = true;
      reverseEdge.bidirectional = true;
    }
  }

  /**
   * Add global navigation item
   */
  addGlobalNavItem(label: string, url: string): void {
    const existing = this.sitemap.navigation.globalNav.find(
      (item) => item.url === url
    );

    if (!existing) {
      this.sitemap.navigation.globalNav.push({ label, url });
      logger.debug(`Global nav item added: ${label}`);
    }
  }

  /**
   * Quick catalog page (for pattern matches)
   */
  quickCatalogPage(
    url: string,
    patternId: string,
    feature: string,
    depth: number
  ): void {
    const pageId = this.generatePageId(url);

    const page: PageAnalysis = {
      id: pageId,
      url,
      title: "Pattern Match",
      type: "pattern_match",
      feature,
      depth,
      actions: [],
      interactions: [],
      linksTo: [],
      crossFeatureLinks: new Map(),
      observations: { patternMatch: patternId },
      discoveredAt: new Date(),
      updatedAt: new Date(),
    };

    this.sitemap.pages.set(pageId, page);
    logger.debug(`Quick cataloged: ${url} (pattern: ${patternId})`);
  }

  /**
   * Find matching pattern for page
   */
  findMatchingPattern(pageStructure: Record<string, any>): PatternInfo | null {
    for (const pattern of this.sitemap.patterns.values()) {
      // Simple structure comparison (can be enhanced)
      const match = this.compareStructures(pageStructure, pattern.commonStructure);

      if (match >= pattern.confidence) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Finalize sitemap
   */
  finalize(duration: number, sdkTracking?: any): Sitemap {
    // Calculate statistics
    const totalPages = this.sitemap.pages.size;
    const pagesFullyExplored = Array.from(this.sitemap.pages.values()).filter(
      (p) => p.type !== "pattern_match"
    ).length;

    this.sitemap.stats = {
      totalPages,
      pagesFullyExplored,
      pagesQuickCataloged: totalPages - pagesFullyExplored,
      pagesByType: Object.fromEntries(this.pagesByType),
      actionsByType: Object.fromEntries(this.actionsByType),
      coverage:
        totalPages > 0 ? (pagesFullyExplored / totalPages) * 100 : 0,
    };

    // Cross-feature graph summary
    let bidirectionalCount = 0;
    this.sitemap.crossFeatureGraph.edges.forEach((edge) => {
      if (edge.bidirectional) {
        bidirectionalCount++;
      }
    });

    this.sitemap.crossFeatureGraph.summary = {
      totalConnections: this.sitemap.crossFeatureGraph.edges.length,
      bidirectionalConnections: bidirectionalCount,
    };

    // Metadata
    this.sitemap.metadata.duration = duration;
    this.sitemap.metadata.exploredAt = new Date();

    if (sdkTracking) {
      this.sitemap.metadata.sdkTracking = sdkTracking;
    }

    logger.info("Sitemap finalized");
    logger.info(
      `Total pages: ${totalPages}, Fully explored: ${pagesFullyExplored}, Coverage: ${this.sitemap.stats.coverage?.toFixed(2)}%`
    );

    return this.sitemap;
  }

  /**
   * Get sitemap as object
   */
  getSitemap(): Sitemap {
    return this.sitemap;
  }

  /**
   * Export sitemap as JSON
   */
  toJSON(): any {
    return {
      metadata: this.sitemap.metadata,
      navigation: {
        globalNav: this.sitemap.navigation.globalNav,
        features: Object.fromEntries(this.sitemap.navigation.features),
      },
      pages: Object.fromEntries(
        Array.from(this.sitemap.pages.entries()).map(([id, page]) => [
          id,
          {
            ...page,
            crossFeatureLinks: Object.fromEntries(page.crossFeatureLinks),
            discoveredAt: page.discoveredAt.toISOString(),
            updatedAt: page.updatedAt.toISOString(),
          },
        ])
      ),
      patterns: Object.fromEntries(this.sitemap.patterns),
      crossFeatureGraph: {
        summary: this.sitemap.crossFeatureGraph.summary,
        edges: this.sitemap.crossFeatureGraph.edges,
      },
      stats: this.sitemap.stats,
    };
  }

  /**
   * Private helper: Generate page ID from URL
   */
  private generatePageId(url: string): string {
    return url.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  }

  /**
   * Private helper: Update page type statistics
   */
  private updatePageTypeStats(type: string): void {
    const current = this.pagesByType.get(type) || 0;
    this.pagesByType.set(type, current + 1);
  }

  /**
   * Private helper: Update action type statistics
   */
  private updateActionTypeStats(actions: string[]): void {
    actions.forEach((action) => {
      const current = this.actionsByType.get(action) || 0;
      this.actionsByType.set(action, current + 1);
    });
  }

  /**
   * Private helper: Compare structures
   */
  private compareStructures(
    actual: Record<string, any>,
    expected: Record<string, any>
  ): number {
    let matches = 0;
    let total = Object.keys(expected).length;

    if (total === 0) return 0;

    Object.entries(expected).forEach(([key, value]) => {
      if (actual[key] === value) {
        matches++;
      }
    });

    return matches / total;
  }
}

/**
 * Create sitemap builder instance
 */
export function createSitemapBuilder(
  baseUrl: string,
  appName?: string
): SitemapBuilder {
  return new SitemapBuilder(baseUrl, appName);
}
