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
    const createResponse = await fetch("http://localhost:4000/api/workflows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(workflow.workflow),
    });

    const createResult = await createResponse.json();

    if (!createResult.success) {
      throw new Error("Failed to create workflow");
    }

    const workflowId = createResult.data.id;

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
  } catch (error) {
    // Test failed
  }
}

testWorkflowExecution().then(() => {
  process.exit(0);
});
