/**
 * Stopping Condition Evaluator
 * AI-powered assessment of when to stop feature exploration
 */

import { ChatOpenAI } from "@langchain/openai";
import { createLogger } from "../utils/logger";
import { config } from "../config";
import { LLMFactory } from './llm-factory';

const logger = createLogger("StoppingCondition");

/**
 * Exploration statistics
 */
export interface ExplorationStats {
  pagesExplored: number;
  maxPagesLimit: number;
  depthReached: number;
  maxDepthLimit: number;
  newPagesDiscoveredLastBatch: number;
  totalNewPagesThisBatch: number;
  estimatedTotalPages: number;
  uniquePageTypesFound: number;
  lastPageTypes: string[];
  timeElapsed: number;
  timeLimit: number;
}

/**
 * Stopping condition result
 */
export interface StoppingConditionResult {
  shouldStop: boolean;
  confidence: number;
  reason: string;
  factors: {
    coveragePercentage: number;
    patternDetected: boolean;
    depthReached: boolean;
    timeLimit: boolean;
    diminishingReturns: boolean;
    resourceConstraint: boolean;
  };
  recommendations?: string[];
}

/**
 * Evaluate stopping condition
 */
export async function evaluateStoppingCondition(
  featureId: string,
  featureName: string,
  stats: ExplorationStats,
  exploredPageTypes: Set<string>
): Promise<StoppingConditionResult> {
  try {
    const model = LLMFactory.create({
      temperature: 0.1,
      maxTokens: 1000,
    });

    logger.debug(`Evaluating stopping condition for feature: ${featureName}`);

    const evaluationPrompt = createEvaluationPrompt(
      featureId,
      featureName,
      stats,
      exploredPageTypes
    );

    const response = await model.invoke([
      {
        role: "user",
        content: evaluationPrompt,
      },
    ]);

    const content = response.content as string;
    const result = parseEvaluationResponse(content, stats);

    logger.info(
      `Stopping condition: ${result.shouldStop ? "STOP" : "CONTINUE"} (${result.reason})`
    );

    return result;
  } catch (error) {
    logger.error(`Failed to evaluate stopping condition: ${error}`);

    // Default: stop if we've hit limits
    return {
      shouldStop:
        stats.pagesExplored >= stats.maxPagesLimit ||
        stats.depthReached >= stats.maxDepthLimit,
      confidence: 0.5,
      reason: "Error in evaluation, using default limits",
      factors: {
        coveragePercentage: (stats.pagesExplored / stats.maxPagesLimit) * 100,
        patternDetected: false,
        depthReached: stats.depthReached >= stats.maxDepthLimit,
        timeLimit: stats.timeElapsed >= stats.timeLimit,
        diminishingReturns: stats.newPagesDiscoveredLastBatch < 2,
        resourceConstraint: false,
      },
    };
  }
}

/**
 * Quick stopping condition check (without AI)
 */
export function quickStoppingConditionCheck(
  stats: ExplorationStats
): { shouldStop: boolean; reason: string } {
  // Hard limits
  if (stats.pagesExplored >= stats.maxPagesLimit) {
    return {
      shouldStop: true,
      reason: `Reached max pages limit (${stats.pagesExplored}/${stats.maxPagesLimit})`,
    };
  }

  if (stats.depthReached >= stats.maxDepthLimit) {
    return {
      shouldStop: true,
      reason: `Reached max depth limit (${stats.depthReached}/${stats.maxDepthLimit})`,
    };
  }

  if (stats.timeElapsed >= stats.timeLimit) {
    return {
      shouldStop: true,
      reason: `Reached time limit (${(stats.timeElapsed / 1000).toFixed(1)}s)`,
    };
  }

  // Diminishing returns
  if (
    stats.pagesExplored > 10 &&
    stats.newPagesDiscoveredLastBatch === 0 &&
    stats.totalNewPagesThisBatch < 2
  ) {
    return {
      shouldStop: true,
      reason: "Diminishing returns: few new pages discovered",
    };
  }

  // High coverage with pattern
  if (stats.pagesExplored > 5 && stats.estimatedTotalPages > 0) {
    const coverage = stats.pagesExplored / stats.estimatedTotalPages;
    if (coverage > 0.9) {
      return {
        shouldStop: true,
        reason: `High coverage achieved (${(coverage * 100).toFixed(1)}%)`,
      };
    }
  }

  return {
    shouldStop: false,
    reason: "Continue exploration - good progress",
  };
}

/**
 * Predict feature completion
 */
export function predictFeatureCompletion(
  stats: ExplorationStats
): {
  estimatedTotalPages: number;
  estimatedRemainingPages: number;
  estimatedCompletionPages: number;
  confidence: number;
} {
  let estimatedTotal = stats.estimatedTotalPages;

  // If no estimate, use heuristic
  if (estimatedTotal === 0) {
    // Assume discovered is 60% of total
    estimatedTotal = Math.ceil(stats.pagesExplored / 0.6);
  }

  const remaining = Math.max(0, estimatedTotal - stats.pagesExplored);

  // Calculate confidence in estimate
  let confidence = 0.5;
  if (stats.pagesExplored > 20) {
    confidence = 0.8;
  } else if (stats.pagesExplored > 10) {
    confidence = 0.7;
  }

  return {
    estimatedTotalPages: estimatedTotal,
    estimatedRemainingPages: remaining,
    estimatedCompletionPages: stats.maxPagesLimit,
    confidence,
  };
}

/**
 * Create evaluation prompt
 */
function createEvaluationPrompt(
  featureId: string,
  featureName: string,
  stats: ExplorationStats,
  exploredPageTypes: Set<string>
): string {
  const pageTypesStr = Array.from(exploredPageTypes).join(", ");
  const recentTypes = stats.lastPageTypes.slice(-5).join(", ");

  return `Determine if exploration of a feature should be stopped based on these metrics.

Feature: ${featureName}
Pages Explored: ${stats.pagesExplored}/${stats.maxPagesLimit}
Depth Reached: ${stats.depthReached}/${stats.maxDepthLimit}
Time Elapsed: ${(stats.timeElapsed / 1000).toFixed(1)}s / ${(stats.timeLimit / 1000).toFixed(1)}s
New Pages in Last Batch: ${stats.newPagesDiscoveredLastBatch}
Total New Pages This Batch: ${stats.totalNewPagesThisBatch}
Estimated Total Pages: ${stats.estimatedTotalPages}
Unique Page Types Found: ${stats.uniquePageTypesFound}
Page Types: ${pageTypesStr}
Recent Page Types: ${recentTypes}

Evaluation criteria:
1. COVERAGE: Is exploration coverage sufficient? (target: 80%+ of discoverable pages)
2. PATTERNS: Are we seeing repetitive page types (indicating comprehensive coverage)?
3. LIMITS: Have we approached any hard limits?
4. DIMINISHING RETURNS: Are we still discovering new content?
5. EFFICIENCY: Cost vs benefit of continuing exploration?

Return JSON with this structure:
{
  "shouldStop": true|false,
  "confidence": 0.95,
  "reason": "Brief explanation (1-2 sentences)",
  "factors": {
    "coveragePercentage": 85,
    "patternDetected": true,
    "depthReached": false,
    "timeLimit": false,
    "diminishingReturns": false,
    "resourceConstraint": false
  },
  "recommendations": [
    "If continue: what to explore next",
    "If stop: what was achieved"
  ]
}

DECISION RULES:
- If coverage > 85% AND pattern detected → Consider stopping
- If pages explored > 30 AND new pages last batch < 2 → Likely stop
- If depth limit reached → Stop
- If time limit exceeded → Stop
- If diminishing returns for 2+ batches → Stop
- Otherwise: Continue if resources available

Be conservative: prefer to stop when coverage is good rather than explore forever.`;
}

/**
 * Parse evaluation response
 */
function parseEvaluationResponse(
  content: string,
  stats: ExplorationStats
): StoppingConditionResult {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      logger.warn(`No JSON found in stopping condition response`);
      return createDefaultStoppingCondition(stats);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      shouldStop: parsed.shouldStop ?? false,
      confidence: parsed.confidence ?? 0.7,
      reason: parsed.reason || "Unable to determine",
      factors: parsed.factors || {
        coveragePercentage: 0,
        patternDetected: false,
        depthReached: false,
        timeLimit: false,
        diminishingReturns: false,
        resourceConstraint: false,
      },
      recommendations: parsed.recommendations,
    };
  } catch (error) {
    logger.error(`Failed to parse stopping condition response: ${error}`);
    return createDefaultStoppingCondition(stats);
  }
}

/**
 * Create default stopping condition
 */
function createDefaultStoppingCondition(
  stats: ExplorationStats
): StoppingConditionResult {
  const coveragePercentage = (stats.pagesExplored / stats.estimatedTotalPages) * 100;
  const shouldStop =
    coveragePercentage > 80 ||
    stats.newPagesDiscoveredLastBatch === 0 ||
    stats.pagesExplored >= stats.maxPagesLimit;

  return {
    shouldStop,
    confidence: 0.6,
    reason: shouldStop ? "Coverage sufficient or limits reached" : "Continue exploration",
    factors: {
      coveragePercentage,
      patternDetected: stats.uniquePageTypesFound < 5 && stats.pagesExplored > 5,
      depthReached: stats.depthReached >= stats.maxDepthLimit,
      timeLimit: stats.timeElapsed >= stats.timeLimit,
      diminishingReturns: stats.newPagesDiscoveredLastBatch === 0,
      resourceConstraint: stats.pagesExplored >= stats.maxPagesLimit * 0.9,
    },
  };
}

/**
 * Analyze feature completion percentage
 */
export function calculateFeatureCompletion(stats: ExplorationStats): number {
  if (stats.estimatedTotalPages === 0) {
    return (stats.pagesExplored / stats.maxPagesLimit) * 100;
  }

  return Math.min(100, (stats.pagesExplored / stats.estimatedTotalPages) * 100);
}
