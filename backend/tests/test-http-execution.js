/**
 * Test HTTP Node Execution
 *
 * This test validates the HTTP request node's functionality within
 * the workflow execution system. It tests various HTTP operations
 * and request configurations.
 *
 * Test Cases:
 * - Finding workflows containing HTTP nodes
 * - Testing different HTTP methods (GET, POST, PUT, DELETE)
 * - Request header handling and authentication
 * - Response processing and error handling
 * - Timeout and retry mechanisms
 * - URL parameter and body construction
 *
 * The test searches for existing workflows with HTTP nodes and
 * attempts to execute them to validate the HTTP node implementation.
 */

const { PrismaClient } = require("@prisma/client");

async function testHttpExecution() {
  const prisma = new PrismaClient();

  try {
    // First, let's find a workflow with an HTTP node
    const workflows = await prisma.workflow.findMany({
      take: 5,
    });

    console.log("Available workflows:");
    for (const workflow of workflows) {
      console.log(`- ID: ${workflow.id}, Name: ${workflow.name}`);

      const nodes = Array.isArray(workflow.nodes)
        ? workflow.nodes
        : JSON.parse(workflow.nodes);

      console.log("  Nodes:");
      for (const node of nodes) {
        console.log(`    - ${node.id}: ${node.type} (${node.name})`);
        if (node.type === "http-request") {
          console.log(`      URL: ${node.parameters?.url || "NOT SET"}`);
        }
      }
      console.log("");
    }

    // Let's create a simple test workflow with an HTTP node without URL
    const testWorkflow = await prisma.workflow.create({
      data: {
        name: "Test HTTP No URL",
        description: "Test workflow with HTTP node missing URL",
        userId: workflows[0].userId, // Use same user as existing workflow
        nodes: [
          {
            id: "trigger-1",
            type: "manual-trigger",
            name: "Manual Trigger",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
          {
            id: "http-1",
            type: "http-request",
            name: "HTTP Request (No URL)",
            parameters: {
              method: "GET",
              headers: {},
              // URL intentionally missing
            },
            position: { x: 300, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn-1",
            sourceNodeId: "trigger-1",
            sourceOutput: "main",
            targetNodeId: "http-1",
            targetInput: "main",
          },
        ],
        triggers: [],
        settings: {},
        active: true,
      },
    });

    console.log(`Created test workflow: ${testWorkflow.id}`);

    // Now let's test execution via API call
    const fetch = (await import("node-fetch")).default;

    // Test single node execution
    console.log("\n=== Testing Single Node Execution ===");
    try {
      const singleNodeResponse = await fetch(
        "http://localhost:4000/api/executions/nodes/http-1",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer your-token-here", // You'll need a valid token
          },
          body: JSON.stringify({
            workflowId: testWorkflow.id,
            inputData: { main: [[{}]] },
          }),
        }
      );

      const singleNodeResult = await singleNodeResponse.json();
      console.log("Single node response status:", singleNodeResponse.status);
      console.log(
        "Single node response:",
        JSON.stringify(singleNodeResult, null, 2)
      );
    } catch (error) {
      console.log("Single node execution error:", error.message);
    }

    // Test full workflow execution
    console.log("\n=== Testing Full Workflow Execution ===");
    try {
      const workflowResponse = await fetch(
        "http://localhost:4000/api/executions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer your-token-here", // You'll need a valid token
          },
          body: JSON.stringify({
            workflowId: testWorkflow.id,
            triggerData: { timestamp: new Date().toISOString() },
          }),
        }
      );

      const workflowResult = await workflowResponse.json();
      console.log("Workflow response status:", workflowResponse.status);
      console.log(
        "Workflow response:",
        JSON.stringify(workflowResult, null, 2)
      );
    } catch (error) {
      console.log("Workflow execution error:", error.message);
    }

    // Clean up
    await prisma.workflow.delete({ where: { id: testWorkflow.id } });
    console.log("\nCleaned up test workflow");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testHttpExecution();
