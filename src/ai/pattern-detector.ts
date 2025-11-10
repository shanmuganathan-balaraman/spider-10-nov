/**
 * Pattern Detector
 * Detects and matches page patterns for efficient sampling
 */

import { createLogger } from "../utils/logger";

const logger = createLogger("PatternDetector");

/**
 * Page structure fingerprint
 */
export interface PageFingerprint {
  url: string;
  layout: string;
  mainSections: number;
  formCount: number;
  buttonCount: number;
  linkCount: number;
  tablePresent: boolean;
  gridPresent: boolean;
  cardPresent: boolean;
  modalCount: number;
  uniqueClassSignature: string;
  semanticStructure: string;
}

/**
 * Detected pattern
 */
export interface DetectedPattern {
  id: string;
  name: string;
  pageType: string;
  examples: string[];
  fingerprint: PageFingerprint;
  confidence: number;
  frequency: number;
  lastSeen: Date;
}

/**
 * Pattern matching result
 */
export interface PatternMatchResult {
  matched: boolean;
  patternId: string;
  patternName: string;
  confidence: number;
  reasoning: string;
}

/**
 * Pattern detector class
 */
export class PatternDetector {
  private patterns: Map<string, DetectedPattern> = new Map();
  private pageHistory: PageFingerprint[] = [];
  private confidenceThreshold: number = 0.85;

  constructor(confidenceThreshold: number = 0.85) {
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Register a new pattern
   */
  registerPattern(
    pageType: string,
    fingerprint: PageFingerprint,
    examples: string[] = []
  ): DetectedPattern {
    const patternId = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pattern: DetectedPattern = {
      id: patternId,
      name: pageType,
      pageType,
      examples: [fingerprint.url, ...examples],
      fingerprint,
      confidence: 0.9,
      frequency: 1,
      lastSeen: new Date(),
    };

    this.patterns.set(patternId, pattern);

    logger.info(`Pattern registered: ${pageType} (${patternId})`);

    return pattern;
  }

  /**
   * Match page against known patterns
   */
  matchPage(fingerprint: PageFingerprint): PatternMatchResult | null {
    let bestMatch: PatternMatchResult | null = null;
    let bestScore = 0;

    for (const [patternId, pattern] of this.patterns.entries()) {
      const similarity = this.calculateSimilarity(
        fingerprint,
        pattern.fingerprint
      );

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          matched: similarity >= this.confidenceThreshold,
          patternId,
          patternName: pattern.name,
          confidence: similarity,
          reasoning: this.generateMatchingReasoning(fingerprint, pattern.fingerprint, similarity),
        };
      }
    }

    if (bestMatch && bestMatch.matched) {
      // Update pattern
      const pattern = this.patterns.get(bestMatch.patternId);
      if (pattern) {
        pattern.frequency++;
        pattern.lastSeen = new Date();

        if (!pattern.examples.includes(fingerprint.url)) {
          pattern.examples.push(fingerprint.url);
        }
      }

      logger.debug(
        `Pattern matched: ${fingerprint.url} -> ${bestMatch.patternName} (${(bestMatch.confidence * 100).toFixed(1)}%)`
      );

      return bestMatch;
    }

    return null;
  }

  /**
   * Analyze page and generate fingerprint
   */
  async analyzePage(
    url: string,
    pageData: {
      html: string;
      text: string;
    }
  ): Promise<PageFingerprint> {
    const fingerprint: PageFingerprint = {
      url,
      layout: detectLayout(pageData.html),
      mainSections: countElements(pageData.html, "main, section, article"),
      formCount: countElements(pageData.html, "form"),
      buttonCount: countElements(pageData.html, "button"),
      linkCount: countElements(pageData.html, "a"),
      tablePresent: pageData.html.includes("<table"),
      gridPresent: pageData.html.includes("grid") || pageData.html.includes("flex"),
      cardPresent: pageData.html.includes("card"),
      modalCount: countElements(pageData.html, "dialog, [role='dialog'], .modal"),
      uniqueClassSignature: extractClassSignature(pageData.html),
      semanticStructure: detectSemanticStructure(pageData.html),
    };

    this.pageHistory.push(fingerprint);

    return fingerprint;
  }

  /**
   * Get pattern statistics
   */
  getStatistics(): {
    totalPatterns: number;
    pagesAnalyzed: number;
    mostFrequentPatterns: Array<{
      name: string;
      frequency: number;
      confidence: number;
    }>;
    averageMatchConfidence: number;
  } {
    const patterns = Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const totalConfidence = Array.from(this.patterns.values()).reduce(
      (sum, p) => sum + p.confidence,
      0
    );

    return {
      totalPatterns: this.patterns.size,
      pagesAnalyzed: this.pageHistory.length,
      mostFrequentPatterns: patterns.map((p) => ({
        name: p.name,
        frequency: p.frequency,
        confidence: p.confidence,
      })),
      averageMatchConfidence:
        this.patterns.size > 0 ? totalConfidence / this.patterns.size : 0,
    };
  }

  /**
   * Reset patterns
   */
  resetPatterns(): void {
    this.patterns.clear();
    this.pageHistory = [];
    logger.info("Pattern detector reset");
  }

  /**
   * Private helper: Calculate fingerprint similarity
   */
  private calculateSimilarity(
    fingerprint1: PageFingerprint,
    fingerprint2: PageFingerprint
  ): number {
    let score = 0;
    let weights = 0;

    // Layout
    if (fingerprint1.layout === fingerprint2.layout) {
      score += 15;
    }
    weights += 15;

    // Section count (allow 1 difference)
    const sectionDiff = Math.abs(
      fingerprint1.mainSections - fingerprint2.mainSections
    );
    score += Math.max(0, 15 - sectionDiff * 5);
    weights += 15;

    // Form count
    const formDiff = Math.abs(fingerprint1.formCount - fingerprint2.formCount);
    score += Math.max(0, 10 - formDiff * 5);
    weights += 10;

    // Button count (allow 10% difference)
    const buttonDiff = Math.abs(
      fingerprint1.buttonCount - fingerprint2.buttonCount
    );
    const maxButtons = Math.max(fingerprint1.buttonCount, fingerprint2.buttonCount);
    if (maxButtons > 0) {
      const diff = buttonDiff / maxButtons;
      score += Math.max(0, 10 - diff * 100);
    } else {
      score += 10;
    }
    weights += 10;

    // Link count
    const linkDiff = Math.abs(fingerprint1.linkCount - fingerprint2.linkCount);
    const maxLinks = Math.max(fingerprint1.linkCount, fingerprint2.linkCount);
    if (maxLinks > 0) {
      const diff = linkDiff / maxLinks;
      score += Math.max(0, 15 - diff * 50);
    } else {
      score += 15;
    }
    weights += 15;

    // Features
    let featureScore = 0;
    if (fingerprint1.tablePresent === fingerprint2.tablePresent) featureScore += 2;
    if (fingerprint1.gridPresent === fingerprint2.gridPresent) featureScore += 2;
    if (fingerprint1.cardPresent === fingerprint2.cardPresent) featureScore += 2;
    if (
      Math.abs(fingerprint1.modalCount - fingerprint2.modalCount) <= 1
    )
      featureScore += 4;

    score += featureScore;
    weights += 10;

    // Class signature
    const classMatch = this.compareClassSignatures(
      fingerprint1.uniqueClassSignature,
      fingerprint2.uniqueClassSignature
    );
    score += classMatch * 20;
    weights += 20;

    // Semantic structure
    if (fingerprint1.semanticStructure === fingerprint2.semanticStructure) {
      score += 10;
    }
    weights += 10;

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Private helper: Generate matching reasoning
   */
  private generateMatchingReasoning(
    current: PageFingerprint,
    pattern: PageFingerprint,
    confidence: number
  ): string {
    const reasons: string[] = [];

    if (current.layout === pattern.layout) {
      reasons.push(`Same layout (${current.layout})`);
    }

    if (Math.abs(current.mainSections - pattern.mainSections) <= 1) {
      reasons.push("Similar structure");
    }

    if (current.semanticStructure === pattern.semanticStructure) {
      reasons.push("Same semantic structure");
    }

    return reasons.length > 0
      ? reasons.join(", ")
      : `Structural similarity: ${(confidence * 100).toFixed(1)}%`;
  }

  /**
   * Private helper: Compare class signatures
   */
  private compareClassSignatures(sig1: string, sig2: string): number {
    if (sig1 === sig2) return 1;

    const classes1 = new Set(sig1.split(","));
    const classes2 = new Set(sig2.split(","));

    const intersection = new Set([...classes1].filter((x) => classes2.has(x)));
    const union = new Set([...classes1, ...classes2]);

    return intersection.size / union.size;
  }
}

/**
 * Detect page layout type
 */
function detectLayout(html: string): string {
  if (html.includes("grid")) return "grid";
  if (html.includes("flex")) return "flex";
  if (html.includes("sidebar")) return "sidebar";
  if (html.includes("column")) return "column";
  return "other";
}

/**
 * Count HTML elements
 */
function countElements(html: string, selector: string): number {
  const selectors = selector.split(",").map((s) => s.trim());
  let count = 0;

  selectors.forEach((sel) => {
    const tag = sel.split(" ")[0].replace(/[[\]]/g, "");
    const regex = new RegExp(`<${tag}[\\s>]`, "gi");
    const matches = html.match(regex);
    count += matches ? matches.length : 0;
  });

  return count;
}

/**
 * Extract unique class signature
 */
function extractClassSignature(html: string): string {
  const classRegex = /class="([^"]*)"/g;
  const classes = new Set<string>();

  let match;
  while ((match = classRegex.exec(html)) !== null) {
    const classList = match[1].split(" ");
    classList.forEach((cls) => {
      if (cls && cls.length < 20) {
        // Filter out very long class names
        classes.add(cls);
      }
    });
  }

  return Array.from(classes).slice(0, 20).join(",");
}

/**
 * Detect semantic structure
 */
function detectSemanticStructure(html: string): string {
  const elements = {
    header: html.includes("<header"),
    nav: html.includes("<nav"),
    main: html.includes("<main"),
    aside: html.includes("<aside"),
    footer: html.includes("<footer"),
    article: html.includes("<article"),
    section: html.includes("<section"),
  };

  return Object.entries(elements)
    .filter(([, present]) => present)
    .map(([tag]) => tag)
    .join("+");
}

/**
 * Create pattern detector instance
 */
export function createPatternDetector(
  confidenceThreshold: number = 0.85
): PatternDetector {
  return new PatternDetector(confidenceThreshold);
}
