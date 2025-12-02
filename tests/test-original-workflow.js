const fetch = require("node-fetch");

async function testOriginalWorkflow() {
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
    title: "New Workflow",
    name: "New Workflow",
    description: "",
    nodes: [
      {
        id: "node-1759266095953",
        name: "Manual Trigger",
        type: "manual-trigger",
        disabled: false,
        mockData: [
          {
            metadata: {
              source: "manual",
              timestamp: "2025-09-30T21:01:42.672Z",
            },
            description: "Manual workflow trigger",
            triggerType: "manual",
            triggeredAt: "2025-09-30T21:01:42.672Z",
          },
        ],
        position: {
          x: -157.6856117302179,
          y: -169.2315502649045,
        },
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
        id: "node-1759266098144",
        name: "IF",
        type: "if",
        disabled: false,
        mockData: null,
        position: {
          x: -15.08659635413541,
          y: -134.6120116927524,
        },
        parameters: {
          value1: "{{json.metadata.source}}",
          value2: "manual",
          operation: "equal",
        },
        credentials: [],
        mockDataPinned: false,
      },
    ],
    connections: [
      {
        id: "node-1759266095953-node-1759266098144-1759266100086",
        targetInput: "main",
        sourceNodeId: "node-1759266095953",
        sourceOutput: "main",
        targetNodeId: "node-1759266098144",
      },
    ],
    settings: {
      timezone: "UTC",
      callerPolicy: "workflowsFromSameOwner",
      saveExecutionProgress: true,
      saveDataErrorExecution: "all",
      saveDataSuccessExecution: "all",
    },
  };

  try {
    const createResponse = await fetch("http://localhost:4000/api/workflows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(workflow),
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

testOriginalWorkflow().then(() => {
  process.exit(0);
});
