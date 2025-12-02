/**
 * Test IF Node Functionality
 *
 * This comprehensive test suite validates the IF node's conditional logic
 * and data processing capabilities. It tests various scenarios including:
 *
 * Test Cases:
 * 1. Basic equality conditions with debugging output
 * 2. Non-existent field handling and graceful fallbacks
 * 3. Nested object access (e.g., json.user.role)
 * 4. Multiple placeholders in a single value
 * 5. Complex item structures with metadata
 *
 * The test uses single-node execution mode to verify IF node logic
 * independently of workflow execution complexity.
 *
 * Key Features Tested:
 * - Placeholder resolution ({{json.fieldName}})
 * - Various comparison operations (equal, notEqual, etc.)
 * - Data structure handling and validation
 * - Error handling for missing fields
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testIfNode() {
  console.log("Testing IF node execution with debugging...");

  try {
    // Test 1: Basic equality condition with debugging
    console.log("\n=== Test 1: Basic Equality with Debugging ===");
    const response1 = await fetch(
      "http://localhost:4000/api/executions/single-node",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: "test-if-node-1",
          nodeType: "if",
          nodeData: {
            parameters: {
              value1: "{{json.status}}",
              operation: "equal",
              value2: "active",
            },
          },
          inputData: {
            main: [
              [
                { json: { status: "active", name: "John", age: 30 } },
                { json: { status: "inactive", name: "Jane", age: 25 } },
                { json: { status: "active", name: "Bob", age: 35 } },
              ],
            ],
          },
        }),
      }
    );

    const result1 = await response1.json();
    console.log("Response status:", response1.status);
    console.log("Result:", JSON.stringify(result1, null, 2));

    // Test 2: Testing field that doesn't exist
    console.log("\n=== Test 2: Non-existent Field ===");
    const response2 = await fetch(
      "http://localhost:4000/api/executions/single-node",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: "test-if-node-2",
          nodeType: "if",
          nodeData: {
            parameters: {
              value1: "{{json.nonExistentField}}",
              operation: "equal",
              value2: "test",
            },
          },
          inputData: {
            main: [
              [
                { json: { name: "John", age: 30 } },
                { json: { name: "Jane", age: 25 } },
              ],
            ],
          },
        }),
      }
    );

    const result2 = await response2.json();
    console.log("Response status:", response2.status);
    console.log("Result:", JSON.stringify(result2, null, 2));

    // Test 3: Nested object access
    console.log("\n=== Test 3: Nested Object Access ===");
    const response3 = await fetch(
      "http://localhost:4000/api/executions/single-node",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: "test-if-node-3",
          nodeType: "if",
          nodeData: {
            parameters: {
              value1: "{{json.user.role}}",
              operation: "equal",
              value2: "admin",
            },
          },
          inputData: {
            main: [
              [
                { json: { name: "John", user: { role: "admin", id: 1 } } },
                { json: { name: "Jane", user: { role: "user", id: 2 } } },
                { json: { name: "Bob" } }, // No user object
              ],
            ],
          },
        }),
      }
    );

    const result3 = await response3.json();
    console.log("Response status:", response3.status);
    console.log("Result:", JSON.stringify(result3, null, 2));

    // Test 4: Multiple placeholders in one value
    console.log("\n=== Test 4: Multiple Placeholders ===");
    const response4 = await fetch(
      "http://localhost:4000/api/executions/single-node",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: "test-if-node-4",
          nodeType: "if",
          nodeData: {
            parameters: {
              value1: "{{json.firstName}} {{json.lastName}}",
              operation: "equal",
              value2: "John Doe",
            },
          },
          inputData: {
            main: [
              [
                { json: { firstName: "John", lastName: "Doe", age: 30 } },
                { json: { firstName: "Jane", lastName: "Smith", age: 25 } },
              ],
            ],
          },
        }),
      }
    );

    const result4 = await response4.json();
    console.log("Response status:", response4.status);
    console.log("Result:", JSON.stringify(result4, null, 2));

    // Test 5: Debug item structure
    console.log("\n=== Test 5: Complex Item Structure ===");
    const response5 = await fetch(
      "http://localhost:4000/api/executions/single-node",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: "test-if-node-5",
          nodeType: "if",
          nodeData: {
            parameters: {
              value1: "{{json.metadata.priority}}",
              operation: "equal",
              value2: "high",
            },
          },
          inputData: {
            main: [
              [
                {
                  json: {
                    id: 1,
                    title: "Task 1",
                    metadata: {
                      priority: "high",
                      tags: ["urgent", "important"],
                    },
                  },
                },
                {
                  json: {
                    id: 2,
                    title: "Task 2",
                    metadata: {
                      priority: "low",
                      tags: ["later"],
                    },
                  },
                },
              ],
            ],
          },
        }),
      }
    );

    const result5 = await response5.json();
    console.log("Response status:", response5.status);
    console.log("Result:", JSON.stringify(result5, null, 2));
  } catch (error) {
    console.error("Error testing IF node:", error.message);
  }
}

testIfNode().then(() => {
  process.exit(0);
});
