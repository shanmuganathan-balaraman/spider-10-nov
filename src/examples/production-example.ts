/**
 * Production Example: Best Practices Implementation
 * Using functional approach with error handling and retries
 */

import { executeCrawl, type CrawlerResult } from "../crawler";
import { createLogger } from "../utils/logger";

const logger = createLogger("ProductionExample");

interface CrawlJob {
  id: string;
  url: string;
  objective: string;
  retries: number;
  maxRetries: number;
}

interface CrawlJobResult {
  jobId: string;
  success: boolean;
  result?: CrawlerResult;
  error?: string;
  timestamp: string;
  duration: number;
}

/**
 * Retry mechanism for failed crawls
 */
async function crawlWithRetry(job: CrawlJob): Promise<CrawlJobResult> {
  const startTime = Date.now();

  try {
    logger.info(`Starting crawl job: ${job.id}`);
    logger.info(`URL: ${job.url}`);
    logger.info(`Objective: ${job.objective}`);

    const result = await executeCrawl({
      url: job.url,
      objective: job.objective,
      maxIterations: 10,
    });

    if (result.success) {
      logger.info(`✓ Crawl job ${job.id} completed successfully`);

      return {
        jobId: job.id,
        success: true,
        result,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    } else {
      throw new Error(result.error || "Crawl failed with unknown error");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.warn(`Crawl job ${job.id} failed (attempt ${job.retries + 1}/${job.maxRetries})`);
    logger.warn(`Error: ${errorMsg}`);

    // Retry if we haven't exceeded max retries
    if (job.retries < job.maxRetries) {
      const delayMs = Math.pow(2, job.retries) * 1000; // Exponential backoff
      logger.info(`Retrying in ${delayMs}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      return crawlWithRetry({
        ...job,
        retries: job.retries + 1,
      });
    }

    logger.error(`✗ Crawl job ${job.id} failed after ${job.maxRetries} retries`);

    return {
      jobId: job.id,
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Process multiple crawl jobs with rate limiting
 */
async function processCrawlJobs(jobs: CrawlJob[]): Promise<CrawlJobResult[]> {
  logger.info(`Processing ${jobs.length} crawl jobs`);

  const results: CrawlJobResult[] = [];

  for (const job of jobs) {
    const result = await crawlWithRetry(job);
    results.push(result);

    // Add delay between jobs to respect server resources
    if (job !== jobs[jobs.length - 1]) {
      logger.info("Waiting before next job...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    }
  }

  return results;
}

/**
 * Generate a report from crawl results
 */
function generateReport(results: CrawlJobResult[]): string {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  let report = "\n=== PRODUCTION CRAWL REPORT ===\n\n";

  report += `Summary:\n`;
  report += `  Total Jobs: ${results.length}\n`;
  report += `  Successful: ${successful}\n`;
  report += `  Failed: ${failed}\n`;
  report += `  Success Rate: ${((successful / results.length) * 100).toFixed(2)}%\n`;
  report += `  Total Duration: ${(totalDuration / 1000).toFixed(2)}s\n\n`;

  report += `Detailed Results:\n`;
  report += `${"─".repeat(80)}\n`;

  for (const result of results) {
    report += `\nJob ID: ${result.jobId}\n`;
    report += `Status: ${result.success ? "✓ SUCCESS" : "✗ FAILED"}\n`;
    report += `Duration: ${(result.duration / 1000).toFixed(2)}s\n`;
    report += `Timestamp: ${result.timestamp}\n`;

    if (result.success && result.result) {
      report += `Findings Preview: ${result.result.findings.substring(0, 200)}...\n`;
    }

    if (result.error) {
      report += `Error: ${result.error}\n`;
    }

    report += `${"─".repeat(80)}\n`;
  }

  return report;
}

/**
 * Main production example
 */
async function productionExample() {
  try {
    logger.info("=== Production Example Started ===");

    // Define multiple crawl jobs
    const jobs: CrawlJob[] = [
      {
        id: "job-1",
        url: "https://example.com",
        objective: "Extract the main heading and describe the page purpose",
        retries: 0,
        maxRetries: 2,
      },
      {
        id: "job-2",
        url: "https://example.com/about",
        objective: "Find company information and mission statement",
        retries: 0,
        maxRetries: 2,
      },
      {
        id: "job-3",
        url: "https://httpbin.org/html",
        objective: "Analyze the HTML structure and extract all headings",
        retries: 0,
        maxRetries: 2,
      },
    ];

    // Process all jobs
    const results = await processCrawlJobs(jobs);

    // Generate and display report
    const report = generateReport(results);
    console.log(report);

    // Optional: Save report to file
    const fs = await import("fs").then((m) => m.promises);
    const reportPath = "./crawl-report.txt";

    try {
      await fs.writeFile(reportPath, report);
      logger.info(`Report saved to: ${reportPath}`);
    } catch (fsError) {
      logger.warn(`Could not save report to file: ${fsError}`);
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    if (successful === results.length) {
      logger.info("✓ All crawl jobs completed successfully");
    } else {
      logger.warn(`⚠ ${results.length - successful} job(s) failed`);
    }
  } catch (error) {
    logger.error("Production example failed:", error);
    process.exit(1);
  }
}

// Run the example
productionExample();
