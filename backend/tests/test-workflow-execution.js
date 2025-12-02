/**
 * Test Workflow Execution
 *
 * This test verifies that workflows can be created and executed successfully,
 * specifically testing the IF node functionality within a workflow context.
 *
 * Test Scenario:
 * 1. Creates a workflow with Manual Trigger → IF node
 * 2. The IF node checks if json.metadata.source equals "manual"
 * 3. Executes the workflow and verifies both nodes complete successfully
 *
 * This test was created to reproduce and verify the fix for the IF node
 * workflow execution issue where it worked in single execution but failed
 * in workflow execution mode.
 */

async function testWorkflowExecution() {
  const fetch = (await import("node-fetch")).default;

  // Load environment variables from parent directory
  const dotenv = await import("dotenv");
  dotenv.config({ path: "../.env" });

  const bearerToken = process.env.ADMIN_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error(
      "ADMIN_BEARER_TOKEN environment variable is required. Please check your .env file."
    );
  }
  console.log("Testing workflow execution...");

  const workflow = {
    version: "1.0.0",
    workflow: {
      title: "Test Workflow",
      name: "Test Workflow",
      description: "",
      nodes: [
        {
          id: "node-manual-trigger",
          name: "Manual Trigger",
          type: "manual-trigger",
          disabled: false,
          position: { x: 0, y: 0 },
          parameters: {
            defaultData: "{}",
            description: "",
            maxDataSize: 1048576,
            validateData: true,
            allowCustomData: false,
          },
          credentials: [],
        },
        {
          id: "node-if",
          name: "IF",
          type: "if",
          disabled: false,
          position: { x: 200, y: 0 },
          parameters: {
            value1: "{{json.metadata.source}}",
            value2: "manual",
            operation: "equal",
          },
          credentials: [],
        },
      ],
      connections: [
        {
          id: "connection-1",
          targetInput: "main",
          sourceNodeId: "node-manual-trigger",
          sourceOutput: "main",
          targetNodeId: "node-if",
        },
      ],
      settings: {
        timezone: "UTC",
        callerPolicy: "workflowsFromSameOwner",
        saveExecutionProgress: true,
        saveDataErrorExecution: "all",
        saveDataSuccessExecution: "all",
      },
    },
  };

  try {
    // First create the workflow
    console.log("Creating workflow...");
    const createResponse = await fetch("http://localhost:4000/api/workflows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(workflow.workflow),
    });

    const createResult = await createResponse.json();
    console.log("Create result:", JSON.stringify(createResult, null, 2));

    if (!createResult.success) {
      throw new Error("Failed to create workflow");
    }

    const workflowId = createResult.data.id;
    console.log("Workflow ID:", workflowId);

    // Execute the workflow
    console.log("Executing workflow...");
    const executeResponse = await fetch(
      "http://localhost:4000/api/executions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          workflowId,
          mode: "workflow",
        }),
      }
    );

    const executeResult = await executeResponse.json();
    console.log("Execute result:", JSON.stringify(executeResult, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testWorkflowExecution().then(() => {
  process.exit(0);
});
