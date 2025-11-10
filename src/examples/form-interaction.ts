/**
 * Example: Form Interaction and Data Extraction
 * This example demonstrates how to interact with forms on a webpage,
 * submit data, and extract results.
 */

import { executeCrawl } from "../crawler";

async function formInteractionExample() {
  try {
    console.log("=== Form Interaction Example ===\n");

    const result = await executeCrawl({
      url: "https://httpbin.org/forms/post",
      objective: `Find and analyze the form on this page. Extract all form fields and their types.
                  If possible, fill in a sample form to demonstrate interaction capabilities.`,
      maxIterations: 8,
    });

    console.log("\n=== Form Interaction Results ===");
    console.log(`Success: ${result.success}`);
    console.log(`URL: ${result.url}`);
    console.log(`Duration: ${result.duration_ms}ms`);
    console.log("\nFindings:");
    console.log(result.findings);

    if (result.error) {
      console.log(`\nError: ${result.error}`);
    }
  } catch (error) {
    console.error("Example failed:", error);
  }
}

// Run the example
formInteractionExample();
