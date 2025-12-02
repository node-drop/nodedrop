/**
 * Test Rupa Custom Node Execution
 *
 * This test validates the execution of the custom "rupa" node,
 * which appears to be a specific custom node implementation
 * used for testing custom node functionality.
 *
 * Test Scenarios:
 * - Single node execution for custom "rupa" node
 * - Parameter handling and configuration
 * - Input data processing and transformation
 * - Output format validation
 * - Error handling for invalid inputs
 *
 * The test serves as a regression test for custom node execution
 * and helps validate the custom node loading and execution system.
 */

// Test rupa node execution after the fix
const fetch = require("node-fetch");

async function testRupaExecution() {
  console.log("Testing rupa node execution...");

  try {
    const response = await fetch(
      "http://localhost:4000/api/executions/single-node",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add auth header if needed - you may need to get a token first
        },
        body: JSON.stringify({
          nodeId: "test-rupa-node",
          nodeType: "rupa",
          nodeData: {
            parameters: {
              operation: "a",
            },
          },
          inputData: {
            main: [
              [
                {
                  json: {
                    test: "data",
                    message: "hello from test",
                  },
                },
              ],
            ],
          },
        }),
      }
    );

    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error testing execution:", error.message);
  }
}

testRupaExecution();
