import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { createLogger } from "../utils/logger";

const logger = createLogger("AnalysisTools");

/**
 * Analyze page structure
 */
const analyzeStructure = (html: string): Record<string, number> => {
  return {
    headings: (html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || []).length,
    paragraphs: (html.match(/<p[^>]*>(.*?)<\/p>/gi) || []).length,
    images: (html.match(/<img[^>]*>/gi) || []).length,
    buttons: (html.match(/<button[^>]*>(.*?)<\/button>/gi) || []).length,
    inputs: (html.match(/<input[^>]*>/gi) || []).length,
    lists: (html.match(/<[ul|ol][^>]*>(.*?)<\/[ul|ol]>/gi) || []).length,
    tables: (html.match(/<table[^>]*>(.*?)<\/table>/gi) || []).length,
  };
};

/**
 * Extract forms from HTML
 */
const extractForms = (html: string): Array<Record<string, any>> => {
  const forms: Array<Record<string, any>> = [];
  const formRegex = /<form[^>]*>(.*?)<\/form>/gis;
  let match;

  while ((match = formRegex.exec(html))) {
    const formContent = match[1];
    const inputs = (formContent.match(/<input[^>]*>/gi) || []).map((input) => {
      const nameMatch = input.match(/name="([^"]*)"/i);
      const typeMatch = input.match(/type="([^"]*)"/i);
      return {
        name: nameMatch ? nameMatch[1] : "unknown",
        type: typeMatch ? typeMatch[1] : "text",
      };
    });

    forms.push({
      method: (formContent.match(/method="([^"]*)"/i) || ["", "POST"])[1],
      action: (formContent.match(/action="([^"]*)"/i) || ["", "#"])[1],
      inputs: inputs,
    });
  }

  return forms;
};

/**
 * Extract links from HTML
 */
const extractLinks = (html: string): Array<Record<string, string>> => {
  const links: Array<Record<string, string>> = [];
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html))) {
    links.push({
      href: match[1],
      text: match[2].replace(/<[^>]*>/g, "").trim().substring(0, 100),
    });
  }

  return links;
};

/**
 * Create exploration plan
 */
const generateExplorationPlan = (
  pageSummary: string,
  objective: string
): Array<Record<string, any>> => {
  const plan: Array<Record<string, any>> = [];

  plan.push({
    step: 1,
    action: "analyze_structure",
    description: "Analyze the overall structure and layout of the page",
    tools: ["get_page_dom", "analyze_page_content"],
  });

  plan.push({
    step: 2,
    action: "read_content",
    description: "Read and understand the main content",
    tools: ["get_page_text"],
  });

  plan.push({
    step: 3,
    action: "identify_interactions",
    description: "Identify clickable elements, forms, and interactive components",
    tools: ["analyze_page_content"],
  });

  if (pageSummary.toLowerCase().includes("form") || objective.toLowerCase().includes("form")) {
    plan.push({
      step: 4,
      action: "analyze_forms",
      description: "Extract and analyze all forms on the page",
      tools: ["analyze_page_content"],
    });
  }

  plan.push({
    step: plan.length + 1,
    action: "analyze_navigation",
    description: "Identify navigation links and possible next pages to explore",
    tools: ["analyze_page_content"],
  });

  plan.push({
    step: plan.length + 1,
    action: "execute_exploration",
    description: `Execute exploration steps to achieve objective: ${objective}`,
    tools: ["click_element", "fill_input", "get_page_text"],
  });

  return plan;
};

/**
 * Analyze page content tool
 */
export const createAnalyzePageContentTool = (): Tool => {
  return {
    name: "analyze_page_content",
    description: "Analyze the content and structure of a page. Provide the DOM or text content for analysis.",
    schema: z.object({
      content: z.string().describe("The HTML or text content to analyze"),
      analysis_type: z
        .enum(["structure", "content", "forms", "links", "all"])
        .describe("Type of analysis to perform"),
    }),
    _call: async (input: {
      content: string;
      analysis_type: "structure" | "content" | "forms" | "links" | "all";
    }): Promise<string> => {
      try {
        const analysis: Record<string, any> = {};

        if (input.analysis_type === "structure" || input.analysis_type === "all") {
          analysis.structure = analyzeStructure(input.content);
        }

        if (input.analysis_type === "forms" || input.analysis_type === "all") {
          analysis.forms = extractForms(input.content);
        }

        if (input.analysis_type === "links" || input.analysis_type === "all") {
          analysis.links = extractLinks(input.content);
        }

        return JSON.stringify({
          status: "success",
          analysis: analysis,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`AnalyzePageContentTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Create exploration plan tool
 */
export const createCreateExplorationPlanTool = (): Tool => {
  return {
    name: "create_exploration_plan",
    description: "Create an exploration plan for analyzing a webpage. This plan outlines what to explore and in what order.",
    schema: z.object({
      page_summary: z.string().describe("A brief summary of the page content"),
      objective: z.string().describe("The exploration objective or goal"),
    }),
    _call: async (input: { page_summary: string; objective: string }): Promise<string> => {
      try {
        const plan = generateExplorationPlan(input.page_summary, input.objective);
        return JSON.stringify({
          status: "success",
          exploration_plan: plan,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`CreateExplorationPlanTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Summarize findings tool
 */
export const createSummarizeFindingsTool = (): Tool => {
  return {
    name: "summarize_findings",
    description: "Summarize the findings and create a comprehensive report of the page exploration.",
    schema: z.object({
      findings: z.string().describe("The findings to summarize"),
      include_recommendations: z.boolean().optional().describe("Whether to include recommendations"),
    }),
    _call: async (input: {
      findings: string;
      include_recommendations?: boolean;
    }): Promise<string> => {
      try {
        const summary = {
          timestamp: new Date().toISOString(),
          findings_summary: input.findings,
          include_recommendations: input.include_recommendations || false,
          recommendations: input.include_recommendations
            ? [
                "Review page structure for accessibility improvements",
                "Consider caching frequently accessed elements",
                "Monitor page load performance",
              ]
            : [],
        };

        return JSON.stringify({
          status: "success",
          summary: summary,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`SummarizeFindingsTool error: ${errorMsg}`);
        return JSON.stringify({ status: "error", message: errorMsg });
      }
    },
  } as any;
};

/**
 * Get all analysis tools
 */
export function getAnalysisTools(): Tool[] {
  return [
    createAnalyzePageContentTool(),
    createCreateExplorationPlanTool(),
    createSummarizeFindingsTool(),
  ];
}
