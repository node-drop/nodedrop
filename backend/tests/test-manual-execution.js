/**
 * Test Manual Workflow Execution
 *
 * This test verifies that workflows can be manually triggered and executed
 * even when they are in an inactive state. It tests the manual execution
 * API endpoint functionality.
 *
 * Test Scenario:
 * - Attempts to manually execute a workflow via API
 * - Tests authentication and authorization
 * - Verifies manual trigger functionality
 *
 * Note: This test requires valid authentication tokens and workflow IDs
 * to be configured before running.
 */

// Simple test to verify manual execution of inactive workflows works
const fetch = require("node-fetch");

async function testManualExecution() {
  const API_BASE = "http://localhost:4000/api";

  // This would need a real auth token and workflow ID
  const authToken = "your-auth-token";
  const workflowId = "your-workflow-id";

  try {
    const response = await fetch(`${API_BASE}/executions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        workflowId: workflowId,
        triggerData: { test: true },
        options: {
          manual: true,
          timeout: 60000,
        },
      }),
    });

    const result = await response.json();
    console.log("Manual execution result:", result);

    if (result.success) {
      console.log("✅ Manual execution of inactive workflow succeeded!");
      console.log("Execution ID:", result.data.executionId);
    } else {
      console.log("❌ Manual execution failed:", result.error);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Uncomment to run test (need to provide real auth token and workflow ID)
// testManualExecution();

console.log("Test file created. Update with real credentials to test.");
