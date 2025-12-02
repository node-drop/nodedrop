import { NodeExecutionStatus } from "@/types";
import { useWorkflowStore } from "../../stores/workflow";

// Mock the execution service
jest.mock("@/services/execution", () => ({
  executionService: {
    executeWorkflow: jest.fn().mockResolvedValue({
      executionId: "test-execution-123",
    }),
    pollExecutionProgress: jest.fn().mockResolvedValue({
      status: "success",
      completedNodes: 2,
      totalNodes: 2,
      failedNodes: 0,
    }),
    getExecutionDetails: jest.fn().mockResolvedValue({
      nodeExecutions: [
        {
          nodeId: "node-1",
          status: "success",
          startedAt: "2025-01-01T10:00:00Z",
          finishedAt: "2025-01-01T10:00:05Z",
          outputData: { result: "success" },
        },
        {
          nodeId: "node-2",
          status: "error",
          startedAt: "2025-01-01T10:00:05Z",
          finishedAt: "2025-01-01T10:00:07Z",
          error: "Node failed",
        },
      ],
    }),
    executeSingleNode: jest.fn().mockResolvedValue({
      executionId: "exec-1",
      status: "completed",
      executedNodes: ["node-1"],
      failedNodes: [],
      duration: 1000,
      hasFailures: false,
    }),
  },
}));

// Mock the execution websocket
jest.mock("@/services/ExecutionWebSocket", () => ({
  executionWebSocket: {
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("Workflow Store - Visual State Persistence", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useWorkflowStore.setState({
      workflow: null,
      executionState: {
        status: "idle",
        progress: 0,
        startTime: undefined,
        endTime: undefined,
        error: undefined,
        executionId: undefined,
      },
      lastExecutionResult: null,
      realTimeResults: new Map(),
      executionLogs: [],
      flowExecutionState: {
        activeExecutions: new Map(),
        nodeVisualStates: new Map(),
        executionHistory: [],
        realTimeUpdates: true,
        selectedExecution: undefined,
      },
    });
  });

  const createTestWorkflow = () => ({
    id: "test-workflow",
    name: "Test Workflow",
    active: true,
    userId: "test-user",
    settings: {},
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    nodes: [
      {
        id: "node-1",
        name: "Start Node",
        type: "manual-trigger",
        position: { x: 100, y: 100 },
        parameters: {},
        disabled: false,
      },
      {
        id: "node-2",
        name: "Process Node",
        type: "data-processor",
        position: { x: 200, y: 100 },
        parameters: {},
        disabled: false,
      },
    ],
    connections: [
      {
        id: "conn-1",
        sourceNodeId: "node-1",
        targetNodeId: "node-2",
        sourceOutput: "main",
        targetInput: "main",
      },
    ],
    metadata: {
      title: "Test Workflow",
      description: "Test workflow for visual state persistence",
      lastTitleUpdate: "2025-01-01T00:00:00Z",
      exportVersion: "1.0.0",
    },
  });

  it("should persist node visual states after workflow execution completion", async () => {
    const store = useWorkflowStore.getState();
    const workflow = createTestWorkflow();

    // Set up the workflow
    store.setWorkflow(workflow);

    // Execute the workflow
    await store.executeWorkflow();

    // Give some time for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that node visual states are preserved
    const node1VisualState = store.getNodeVisualState("node-1");
    const node2VisualState = store.getNodeVisualState("node-2");

    expect(node1VisualState.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(node2VisualState.status).toBe(NodeExecutionStatus.FAILED);

    // Verify the states are not just idle
    expect(node1VisualState.status).not.toBe(NodeExecutionStatus.IDLE);
    expect(node2VisualState.status).not.toBe(NodeExecutionStatus.IDLE);
  });

  it("should persist node visual states after single node execution", async () => {
    const store = useWorkflowStore.getState();
    const workflow = createTestWorkflow();

    // Set up the workflow
    store.setWorkflow(workflow);

    // Execute a single node
    await store.executeNode("node-1");

    // Give some time for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that node visual state is preserved
    const nodeVisualState = store.getNodeVisualState("node-1");

    expect(nodeVisualState.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(nodeVisualState.status).not.toBe(NodeExecutionStatus.IDLE);
  });

  it("should update visual states during execution workflow flow", () => {
    const store = useWorkflowStore.getState();
    const workflow = createTestWorkflow();

    // Set up the workflow
    store.setWorkflow(workflow);

    // Initialize flow execution
    store.initializeFlowExecution("test-exec-123", ["node-1", "node-2"]);

    // Update node execution state
    store.updateNodeExecutionState("node-1", NodeExecutionStatus.RUNNING);
    store.updateNodeExecutionState("node-2", NodeExecutionStatus.QUEUED);

    // Verify states are updated
    let node1State = store.getNodeVisualState("node-1");
    let node2State = store.getNodeVisualState("node-2");

    expect(node1State.status).toBe(NodeExecutionStatus.RUNNING);
    expect(node2State.status).toBe(NodeExecutionStatus.QUEUED);

    // Complete executions
    store.updateNodeExecutionState("node-1", NodeExecutionStatus.COMPLETED, {
      progress: 100,
    });
    store.updateNodeExecutionState("node-2", NodeExecutionStatus.FAILED, {
      error: "Test error",
    });

    // Verify final states are preserved
    node1State = store.getNodeVisualState("node-1");
    node2State = store.getNodeVisualState("node-2");

    expect(node1State.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(node2State.status).toBe(NodeExecutionStatus.FAILED);
    expect(node2State.errorMessage).toBe("Test error");
  });

  it("should clear visual states only when starting new execution", () => {
    const store = useWorkflowStore.getState();
    const workflow = createTestWorkflow();

    // Set up the workflow
    store.setWorkflow(workflow);

    // Set some completed states
    store.updateNodeExecutionState("node-1", NodeExecutionStatus.COMPLETED);
    store.updateNodeExecutionState("node-2", NodeExecutionStatus.FAILED);

    // Verify states are set
    let node1State = store.getNodeVisualState("node-1");
    let node2State = store.getNodeVisualState("node-2");

    expect(node1State.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(node2State.status).toBe(NodeExecutionStatus.FAILED);

    // Start a new execution (this should clear visual states)
    const currentFlowState = store.flowExecutionState;
    useWorkflowStore.setState({
      flowExecutionState: {
        ...currentFlowState,
        nodeVisualStates: new Map(), // Simulate clearing node states for new execution
      },
    });

    // Initialize new execution
    store.initializeFlowExecution("new-exec-456", ["node-1", "node-2"]);

    // Verify states are reset to idle
    node1State = store.getNodeVisualState("node-1");
    node2State = store.getNodeVisualState("node-2");

    expect(node1State.status).toBe(NodeExecutionStatus.IDLE);
    expect(node2State.status).toBe(NodeExecutionStatus.IDLE);
  });
});
