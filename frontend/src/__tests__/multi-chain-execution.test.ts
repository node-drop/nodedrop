import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkflowStore } from "../stores/workflow";
import { NodeExecutionStatus } from "../types/execution";

// Mock dependencies
vi.mock("../services/execution", () => ({
  executionService: {
    executeWorkflow: vi.fn(),
    pollExecutionProgress: vi.fn(),
  },
}));

vi.mock("../services/ExecutionWebSocket", () => ({
  executionWebSocket: {
    connect: vi.fn(),
    subscribeToExecution: vi.fn(),
    isConnected: vi.fn(() => true),
  },
}));

describe("Multi-Chain Execution Status Persistence", () => {
  beforeEach(() => {
    // Reset the store before each test
    const store = useWorkflowStore.getState();
    store.clearExecutionLogs();
    store.clearNodeVisualStates();

    // Set up a test workflow similar to the user's example
    const testWorkflow = {
      id: "test-workflow",
      name: "Multi-Chain Test",
      userId: "test-user",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: "node-1758406498566",
          name: "Manual Trigger 1",
          type: "manual-trigger",
          position: { x: 100, y: 100 },
          parameters: {},
          credentials: [],
          disabled: false,
        },
        {
          id: "node-1758407541298",
          name: "HTTP Request 1",
          type: "http-request",
          position: { x: 300, y: 100 },
          parameters: { url: "https://jsonplaceholder.typicode.com" },
          credentials: [],
          disabled: false,
        },
        {
          id: "node-1758488375402",
          name: "Manual Trigger 2",
          type: "manual-trigger",
          position: { x: 100, y: 300 },
          parameters: {},
          credentials: [],
          disabled: false,
        },
        {
          id: "node-1758489476840",
          name: "HTTP Request 2",
          type: "http-request",
          position: { x: 300, y: 300 },
          parameters: { url: "https://jsonplaceholder.typicode.com/todos/1" },
          credentials: [],
          disabled: false,
        },
      ],
      connections: [
        {
          id: "conn1",
          sourceNodeId: "node-1758406498566",
          targetNodeId: "node-1758407541298",
          sourceOutput: "main",
          targetInput: "main",
        },
        {
          id: "conn2",
          sourceNodeId: "node-1758488375402",
          targetNodeId: "node-1758489476840",
          sourceOutput: "main",
          targetInput: "main",
        },
      ],
      settings: {},
      metadata: {
        version: 1,
        title: "Multi-Chain Test",
        lastTitleUpdate: new Date().toISOString(),
        exportVersion: "1.0.0",
      },
    };

    store.setWorkflow(testWorkflow);
  });

  it("should preserve status icons from first chain when second chain runs", () => {
    const store = useWorkflowStore.getState();

    // Simulate first execution chain completing successfully
    const firstExecutionId = "exec-1";

    // Initialize first execution
    store.initializeFlowExecution(firstExecutionId, [
      "node-1758406498566",
      "node-1758407541298",
    ]);

    // Simulate first chain execution events
    store.handleExecutionEvent({
      type: "node-started",
      executionId: firstExecutionId,
      nodeId: "node-1758406498566",
      timestamp: Date.now(),
    });

    store.handleExecutionEvent({
      type: "node-completed",
      executionId: firstExecutionId,
      nodeId: "node-1758406498566",
      status: NodeExecutionStatus.COMPLETED,
      timestamp: Date.now(),
    });

    store.handleExecutionEvent({
      type: "node-started",
      executionId: firstExecutionId,
      nodeId: "node-1758407541298",
      timestamp: Date.now(),
    });

    store.handleExecutionEvent({
      type: "node-completed",
      executionId: firstExecutionId,
      nodeId: "node-1758407541298",
      status: NodeExecutionStatus.COMPLETED,
      timestamp: Date.now(),
    });

    // Check that first chain nodes have completed status
    const firstTriggerState = store.getNodeVisualState("node-1758406498566");
    const firstHttpState = store.getNodeVisualState("node-1758407541298");

    expect(firstTriggerState.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(firstHttpState.status).toBe(NodeExecutionStatus.COMPLETED);

    // Simulate second execution chain starting
    const secondExecutionId = "exec-2";

    // Initialize second execution
    store.initializeFlowExecution(secondExecutionId, [
      "node-1758488375402",
      "node-1758489476840",
    ]);

    // CRITICAL TEST: Check that first chain status is still preserved
    const firstTriggerStateAfterSecond =
      store.getNodeVisualState("node-1758406498566");
    const firstHttpStateAfterSecond =
      store.getNodeVisualState("node-1758407541298");

    expect(firstTriggerStateAfterSecond.status).toBe(
      NodeExecutionStatus.COMPLETED
    );
    expect(firstHttpStateAfterSecond.status).toBe(
      NodeExecutionStatus.COMPLETED
    );

    // Simulate second chain execution
    store.handleExecutionEvent({
      type: "node-started",
      executionId: secondExecutionId,
      nodeId: "node-1758488375402",
      timestamp: Date.now(),
    });

    // Check that first chain status is STILL preserved while second chain runs
    const firstTriggerStateDuringSecond =
      store.getNodeVisualState("node-1758406498566");
    const firstHttpStateDuringSecond =
      store.getNodeVisualState("node-1758407541298");

    expect(firstTriggerStateDuringSecond.status).toBe(
      NodeExecutionStatus.COMPLETED
    );
    expect(firstHttpStateDuringSecond.status).toBe(
      NodeExecutionStatus.COMPLETED
    );

    // Complete second chain
    store.handleExecutionEvent({
      type: "node-completed",
      executionId: secondExecutionId,
      nodeId: "node-1758488375402",
      status: NodeExecutionStatus.COMPLETED,
      timestamp: Date.now(),
    });

    store.handleExecutionEvent({
      type: "node-started",
      executionId: secondExecutionId,
      nodeId: "node-1758489476840",
      timestamp: Date.now(),
    });

    store.handleExecutionEvent({
      type: "node-completed",
      executionId: secondExecutionId,
      nodeId: "node-1758489476840",
      status: NodeExecutionStatus.COMPLETED,
      timestamp: Date.now(),
    });

    // Final check: both chains should show completed status
    const finalFirstTrigger = store.getNodeVisualState("node-1758406498566");
    const finalFirstHttp = store.getNodeVisualState("node-1758407541298");
    const finalSecondTrigger = store.getNodeVisualState("node-1758488375402");
    const finalSecondHttp = store.getNodeVisualState("node-1758489476840");

    expect(finalFirstTrigger.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(finalFirstHttp.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(finalSecondTrigger.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(finalSecondHttp.status).toBe(NodeExecutionStatus.COMPLETED);
  });

  it("should process events for multiple concurrent executions", () => {
    const store = useWorkflowStore.getState();

    const exec1 = "execution-1";
    const exec2 = "execution-2";

    // Start both executions
    store.initializeFlowExecution(exec1, [
      "node-1758406498566",
      "node-1758407541298",
    ]);
    store.initializeFlowExecution(exec2, [
      "node-1758488375402",
      "node-1758489476840",
    ]);

    // Both executions start their first nodes simultaneously
    store.handleExecutionEvent({
      type: "node-started",
      executionId: exec1,
      nodeId: "node-1758406498566",
      timestamp: Date.now(),
    });

    store.handleExecutionEvent({
      type: "node-started",
      executionId: exec2,
      nodeId: "node-1758488375402",
      timestamp: Date.now(),
    });

    // Both should be in running state
    expect(store.getNodeVisualState("node-1758406498566").status).toBe(
      NodeExecutionStatus.RUNNING
    );
    expect(store.getNodeVisualState("node-1758488375402").status).toBe(
      NodeExecutionStatus.RUNNING
    );

    // First execution completes first node
    store.handleExecutionEvent({
      type: "node-completed",
      executionId: exec1,
      nodeId: "node-1758406498566",
      status: NodeExecutionStatus.COMPLETED,
      timestamp: Date.now(),
    });

    // First execution's node should be completed, second should still be running
    expect(store.getNodeVisualState("node-1758406498566").status).toBe(
      NodeExecutionStatus.COMPLETED
    );
    expect(store.getNodeVisualState("node-1758488375402").status).toBe(
      NodeExecutionStatus.RUNNING
    );

    // Second execution completes
    store.handleExecutionEvent({
      type: "node-completed",
      executionId: exec2,
      nodeId: "node-1758488375402",
      status: NodeExecutionStatus.COMPLETED,
      timestamp: Date.now(),
    });

    // Both should now be completed
    expect(store.getNodeVisualState("node-1758406498566").status).toBe(
      NodeExecutionStatus.COMPLETED
    );
    expect(store.getNodeVisualState("node-1758488375402").status).toBe(
      NodeExecutionStatus.COMPLETED
    );
  });
});
