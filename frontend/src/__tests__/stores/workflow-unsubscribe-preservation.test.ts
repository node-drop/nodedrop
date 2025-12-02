import { useWorkflowStore } from "@/stores/workflow";
import { Workflow } from "@/types";
import { NodeExecutionStatus } from "@/types/execution";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the execution websocket
vi.mock("@/services/ExecutionWebSocket", () => ({
  executionWebSocket: {
    unsubscribeFromExecution: vi.fn().mockResolvedValue(undefined),
    removeExecutionListeners: vi.fn(),
  },
}));

// Type the store properly
type WorkflowStore = ReturnType<typeof useWorkflowStore.getState>;

describe("Workflow Store - Node State Preservation on Unsubscribe", () => {
  let store: WorkflowStore;

  beforeEach(() => {
    // Reset the store
    useWorkflowStore.setState({
      workflow: null,
      executionLogs: [],
      flowExecutionState: {
        activeExecutions: new Map(),
        nodeVisualStates: new Map(),
        executionHistory: [],
        realTimeUpdates: true,
        selectedExecution: undefined,
      },
    });
    store = useWorkflowStore.getState();
  });

  const mockWorkflow: Workflow = {
    id: "test-workflow-123",
    name: "Test Workflow",
    description: "Test workflow for node state preservation",
    userId: "test-user",
    nodes: [
      {
        id: "node-1",
        type: "manual-trigger",
        name: "Manual Trigger",
        parameters: {},
        position: { x: 100, y: 100 },
        credentials: [],
        disabled: false,
      },
      {
        id: "node-2",
        type: "http-request",
        name: "HTTP Request",
        parameters: { method: "GET", url: "https://api.example.com" },
        position: { x: 300, y: 100 },
        credentials: [],
        disabled: false,
      },
    ],
    connections: [
      {
        id: "conn-1",
        sourceNodeId: "node-1",
        sourceOutput: "main",
        targetNodeId: "node-2",
        targetInput: "main",
      },
    ],
    settings: {},
    active: false,
    tags: [],
    category: "test",
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("should preserve node visual states when unsubscribing from execution", async () => {
    // Setup: Set a workflow
    store.setWorkflow(mockWorkflow);

    // Setup: Create a mock execution with node states
    const executionId = "execution-123";
    const currentFlowState = store.flowExecutionState;

    // Simulate an execution with completed and failed nodes
    currentFlowState.activeExecutions.set(executionId, {
      executionId,
      overallStatus: "completed",
      progress: 100,
      nodeStates: new Map([
        [
          "node-1",
          {
            nodeId: "node-1",
            status: NodeExecutionStatus.COMPLETED,
            startTime: Date.now() - 5000,
            endTime: Date.now() - 3000,
            duration: 2000,
            progress: 100,
            dependencies: [],
            dependents: ["node-2"],
          },
        ],
        [
          "node-2",
          {
            nodeId: "node-2",
            status: NodeExecutionStatus.FAILED,
            startTime: Date.now() - 3000,
            endTime: Date.now() - 1000,
            duration: 2000,
            progress: 0,
            error: { message: "Network error", timestamp: Date.now() },
            dependencies: ["node-1"],
            dependents: [],
          },
        ],
      ]),
      currentlyExecuting: [],
      completedNodes: ["node-1"],
      failedNodes: ["node-2"],
      queuedNodes: [],
      executionPath: ["node-1", "node-2"],
    });

    // Set node visual states
    currentFlowState.nodeVisualStates.set("node-1", {
      nodeId: "node-1",
      status: NodeExecutionStatus.COMPLETED,
      progress: 100,
      animationState: "success",
      lastUpdated: Date.now(),
      executionTime: 2000,
    });
    currentFlowState.nodeVisualStates.set("node-2", {
      nodeId: "node-2",
      status: NodeExecutionStatus.FAILED,
      progress: 0,
      animationState: "error",
      lastUpdated: Date.now(),
      executionTime: 2000,
      errorMessage: "Network error",
    });

    // Update the store with this flow state
    useWorkflowStore.setState({ flowExecutionState: currentFlowState });

    // Add some execution logs
    store.addExecutionLog({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Execution started",
    });
    store.addExecutionLog({
      timestamp: new Date().toISOString(),
      level: "error",
      nodeId: "node-2",
      message: "HTTP Request failed",
    });

    // Verify initial state
    expect(currentFlowState.activeExecutions.has(executionId)).toBe(true);
    expect(currentFlowState.nodeVisualStates.get("node-1")?.status).toBe(
      NodeExecutionStatus.COMPLETED
    );
    expect(currentFlowState.nodeVisualStates.get("node-2")?.status).toBe(
      NodeExecutionStatus.FAILED
    );
    expect(store.executionLogs).toHaveLength(2);

    // Act: Unsubscribe from execution
    await store.unsubscribeFromExecution(executionId);

    // Get fresh store state
    const freshStore = useWorkflowStore.getState();

    // Assert: Logs should be preserved
    expect(freshStore.executionLogs).toHaveLength(3); // Original 2 + unsubscribe log
    expect(freshStore.executionLogs[2].message).toContain(
      "Unsubscribed from real-time updates"
    );
    expect(freshStore.executionLogs[2].message).toContain(
      "Logs and node states preserved until next execution"
    );

    // Assert: Node visual states should be preserved
    const updatedFlowState = freshStore.flowExecutionState;
    expect(updatedFlowState.nodeVisualStates.get("node-1")?.status).toBe(
      NodeExecutionStatus.COMPLETED
    );
    expect(updatedFlowState.nodeVisualStates.get("node-2")?.status).toBe(
      NodeExecutionStatus.FAILED
    );
    expect(updatedFlowState.nodeVisualStates.get("node-2")?.errorMessage).toBe(
      "Network error"
    );

    // Assert: Execution should be moved to history, not active
    expect(updatedFlowState.activeExecutions.has(executionId)).toBe(false);
    expect(updatedFlowState.executionHistory).toHaveLength(1);
    expect(updatedFlowState.executionHistory[0].executionId).toBe(executionId);
    expect(updatedFlowState.executionHistory[0].status).toBe("completed");

    // Assert: Selected execution should be cleared
    expect(updatedFlowState.selectedExecution).toBeUndefined();
  });

  it("should preserve logs when clearing execution state after completion", () => {
    // Setup: Add some logs
    store.addExecutionLog({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Execution completed",
    });
    store.addExecutionLog({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "All nodes finished",
    });

    // Verify initial state
    expect(store.executionLogs).toHaveLength(2);

    // Act: Clear execution state (this is called after successful executions)
    store.clearExecutionState();

    // Get fresh store state
    const freshStore = useWorkflowStore.getState();

    // Assert: Logs should still be preserved
    // Note: The updated clearExecutionState doesn't clear logs unless preserveLogs=false explicitly
    expect(freshStore.executionLogs).toHaveLength(2);
    expect(freshStore.executionState.status).toBe("idle");
    expect(freshStore.executionState.executionId).toBeUndefined();
  });

  it("should allow getting node visual states after unsubscribing", () => {
    // Setup: Set a workflow
    store.setWorkflow(mockWorkflow);

    // Setup: Create node visual states
    const currentFlowState = store.flowExecutionState;
    currentFlowState.nodeVisualStates.set("node-1", {
      nodeId: "node-1",
      status: NodeExecutionStatus.COMPLETED,
      progress: 100,
      animationState: "success",
      lastUpdated: Date.now(),
      executionTime: 2000,
    });

    useWorkflowStore.setState({ flowExecutionState: currentFlowState });

    // Act & Assert: Should be able to get node visual state
    const nodeState = store.getNodeVisualState("node-1");
    expect(nodeState).toBeDefined();
    expect(nodeState?.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(nodeState?.progress).toBe(100);

    // Act & Assert: Should return default state for non-existent node
    const nonExistentNodeState = store.getNodeVisualState("non-existent-node");
    expect(nonExistentNodeState).toBeDefined();
    expect(nonExistentNodeState?.status).toBe(NodeExecutionStatus.IDLE);
  });
});
