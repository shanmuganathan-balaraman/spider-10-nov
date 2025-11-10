/**
 * Advanced Example: Custom Agent Configuration
 * Using functional approach
 */

import * as browser from "../browser/browser-manager";
import * as agent from "../agent/web-crawler-agent";

async function customAgentExample() {
  try {
    console.log("=== Custom Agent Configuration Example ===\n");

    // Initialize browser and agent
    await browser.initializeBrowser();
    await agent.initializeAgent();

    // Get all available tools
    const tools = agent.getTools();
    console.log(`Available tools: ${tools.length}`);
    console.log("\nTools:");
    tools.forEach((tool: any, index: number) => {
      console.log(`  ${index + 1}. ${tool.name}`);
    });

    // Perform a crawl
    console.log("\nStarting custom crawl...\n");

    const result = await agent.crawl({
      url: "https://docs.langchain.com",
      objective: `Navigate to the documentation site and create a comprehensive exploration plan.
                  Identify the main sections of the documentation.
                  List the primary navigation structure.
                  Report on the types of tools and agents available.`,
      maxIterations: 10,
    });

    console.log("\n=== Crawl Results ===");
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${result.duration_ms}ms`);
    console.log(`Steps: ${result.steps_taken}`);
    console.log("\nFindings:");
    console.log(result.findings);

    if (result.error) {
      console.log(`\nError: ${result.error}`);
    }
  } catch (error) {
    console.error("Example failed:", error);
  } finally {
    // Cleanup
    await agent.closeAgent();
    await browser.cleanupBrowser();
  }
}

// Run the example
customAgentExample();
