/**
 * Artifact Storage
 * Manages saving and loading of crawler artifacts
 */

import * as fs from "fs";
import * as path from "path";
import { createLogger } from "../utils/logger";

const logger = createLogger("ArtifactStorage");

/**
 * Storage configuration
 */
export interface StorageConfig {
  basePath: string;
  createTimestampedFolder: boolean;
  compression: boolean;
}

/**
 * Storage metadata
 */
export interface StorageMetadata {
  createdAt: Date;
  appName: string;
  appUrl: string;
  crawlId: string;
}

/**
 * Artifact storage class
 */
export class ArtifactStorage {
  private basePath: string;
  private crawlId: string;
  private metadata: StorageMetadata;

  constructor(
    appName: string,
    appUrl: string,
    basePath: string = "./runs",
    crawlId?: string
  ) {
    this.crawlId = crawlId || generateCrawlId();
    this.basePath = path.join(basePath, appName, this.crawlId);

    this.metadata = {
      createdAt: new Date(),
      appName,
      appUrl,
      crawlId: this.crawlId,
    };

    this.ensureDirectory();
    logger.info(`Artifact storage initialized: ${this.basePath}`);
  }

  /**
   * Save sitemap
   */
  saveSitemap(sitemap: any): void {
    const filename = "sitemap.json";
    const filepath = path.join(this.basePath, filename);

    fs.writeFileSync(filepath, JSON.stringify(sitemap, null, 2), "utf-8");
    logger.info(`Sitemap saved: ${filepath}`);
  }

  /**
   * Save knowledge graph
   */
  saveKnowledgeGraph(graph: any): void {
    const filename = "knowledge-graph.json";
    const filepath = path.join(this.basePath, filename);

    fs.writeFileSync(filepath, JSON.stringify(graph, null, 2), "utf-8");
    logger.info(`Knowledge graph saved: ${filepath}`);
  }

  /**
   * Save statistics
   */
  saveStatistics(stats: any): void {
    const filename = "statistics.json";
    const filepath = path.join(this.basePath, filename);

    fs.writeFileSync(filepath, JSON.stringify(stats, null, 2), "utf-8");
    logger.info(`Statistics saved: ${filepath}`);
  }

  /**
   * Save patterns
   */
  savePatterns(patterns: any): void {
    const filename = "patterns.json";
    const filepath = path.join(this.basePath, filename);

    fs.writeFileSync(filepath, JSON.stringify(patterns, null, 2), "utf-8");
    logger.info(`Patterns saved: ${filepath}`);
  }

  /**
   * Save page snapshot
   */
  savePageSnapshot(pageUrl: string, snapshot: any): void {
    const snapshotsDir = path.join(this.basePath, "snapshots");
    this.ensureDirectory(snapshotsDir);

    const filename = `${sanitizeUrl(pageUrl)}_snapshot.json`;
    const filepath = path.join(snapshotsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2), "utf-8");
    logger.debug(`Page snapshot saved: ${filename}`);
  }

  /**
   * Save screenshot
   */
  saveScreenshot(pageUrl: string, screenshotBuffer: Buffer): void {
    const screenshotsDir = path.join(this.basePath, "screenshots");
    this.ensureDirectory(screenshotsDir);

    const filename = `${sanitizeUrl(pageUrl)}_screenshot.png`;
    const filepath = path.join(screenshotsDir, filename);

    fs.writeFileSync(filepath, screenshotBuffer);
    logger.debug(`Screenshot saved: ${filename}`);
  }

  /**
   * Save raw HTML
   */
  saveRawHTML(pageUrl: string, html: string): void {
    const htmlDir = path.join(this.basePath, "html");
    this.ensureDirectory(htmlDir);

    const filename = `${sanitizeUrl(pageUrl)}_raw.html`;
    const filepath = path.join(htmlDir, filename);

    fs.writeFileSync(filepath, html, "utf-8");
    logger.debug(`Raw HTML saved: ${filename}`);
  }

  /**
   * Save metadata
   */
  saveMetadata(metadata: any): void {
    const filename = "metadata.json";
    const filepath = path.join(this.basePath, filename);

    const combined = { ...this.metadata, ...metadata };
    fs.writeFileSync(filepath, JSON.stringify(combined, null, 2), "utf-8");
    logger.info(`Metadata saved: ${filepath}`);
  }

  /**
   * Save exploration log
   */
  appendExplorationLog(entry: any): void {
    const filename = "exploration.log";
    const filepath = path.join(this.basePath, filename);

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const line = JSON.stringify(logEntry);
    fs.appendFileSync(filepath, line + "\n", "utf-8");
  }

  /**
   * Get artifact directory
   */
  getArtifactDir(): string {
    return this.basePath;
  }

  /**
   * Get crawl ID
   */
  getCrawlId(): string {
    return this.crawlId;
  }

  /**
   * Get metadata
   */
  getMetadata(): StorageMetadata {
    return this.metadata;
  }

  /**
   * Create summary report
   */
  createSummaryReport(summary: any): string {
    const report = `
# Web Crawler Report

**Application:** ${this.metadata.appName}
**URL:** ${this.metadata.appUrl}
**Crawl ID:** ${this.crawlId}
**Created:** ${this.metadata.createdAt.toISOString()}

## Summary

${JSON.stringify(summary, null, 2)}

## Artifacts

- sitemap.json - Complete page structure
- knowledge-graph.json - Feature relationships
- statistics.json - Exploration statistics
- patterns.json - Page patterns detected
- snapshots/ - Page data snapshots
- screenshots/ - Page screenshots
- html/ - Raw HTML files
- metadata.json - Crawl metadata
- exploration.log - Event log

---

Generated by Spider Web Crawler v1.0
    `.trim();

    const filename = "REPORT.md";
    const filepath = path.join(this.basePath, filename);

    fs.writeFileSync(filepath, report, "utf-8");
    logger.info(`Summary report created: ${filepath}`);

    return report;
  }

  /**
   * List saved artifacts
   */
  listArtifacts(): {
    files: string[];
    directories: string[];
    totalSize: number;
  } {
    const files: string[] = [];
    const directories: string[] = [];
    let totalSize = 0;

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      items.forEach((item) => {
        const filepath = path.join(dir, item);
        const stat = fs.statSync(filepath);

        const relativePath = path.relative(this.basePath, filepath);

        if (stat.isDirectory()) {
          directories.push(relativePath);
        } else {
          files.push(relativePath);
          totalSize += stat.size;
        }
      });
    };

    walk(this.basePath);

    return { files, directories, totalSize };
  }

  /**
   * Private helper: Ensure directory exists
   */
  private ensureDirectory(dir?: string): void {
    const targetDir = dir || this.basePath;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }
}

/**
 * Generate unique crawl ID
 */
function generateCrawlId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const random = Math.random().toString(36).substr(2, 9);
  return `crawl_${timestamp}_${random}`;
}

/**
 * Sanitize URL for filename
 */
function sanitizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase()
    .substring(0, 100);
}

/**
 * Create artifact storage
 */
export function createArtifactStorage(
  appName: string,
  appUrl: string,
  basePath?: string,
  crawlId?: string
): ArtifactStorage {
  return new ArtifactStorage(appName, appUrl, basePath, crawlId);
}

/**
 * Load existing artifacts
 */
export function loadArtifacts(crawlPath: string): {
  sitemap?: any;
  knowledgeGraph?: any;
  statistics?: any;
  patterns?: any;
  metadata?: any;
} {
  const artifacts: any = {};

  const files = [
    { key: "sitemap", name: "sitemap.json" },
    { key: "knowledgeGraph", name: "knowledge-graph.json" },
    { key: "statistics", name: "statistics.json" },
    { key: "patterns", name: "patterns.json" },
    { key: "metadata", name: "metadata.json" },
  ];

  files.forEach(({ key, name }) => {
    const filepath = path.join(crawlPath, name);

    if (fs.existsSync(filepath)) {
      try {
        artifacts[key] = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      } catch (error) {
        logger.warn(`Failed to load ${name}: ${error}`);
      }
    }
  });

  return artifacts;
}
