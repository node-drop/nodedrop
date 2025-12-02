import { beforeEach, describe, expect, it, vi } from "vitest";
import { NodeExecutionStatus } from "../../types/execution";
import { ExecutionStateManager } from "../ExecutionStateManager";

// Mock the ExecutionWebSocket
vi.mock("../ExecutionWebSocket", () => ({
  ExecutionWebSocket: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    subscribeToExecution: vi.fn().mockResolvedValue(undefined),
    unsubscribeFromExecution: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn().mockReturnValue(() => {}),
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

describe("ExecutionStateManager", () => {
  let executionStateManager: ExecutionStateManager;
  let mockWebSocket: any;

  beforeEach(() => {
    executionStateManager = new ExecutionStateManager();
    // Get the mocked WebSocket instance
    mockWebSocket = (executionStateManager as any).webSocket;
  });

  it("should initialize successfully", async () => {
    await executionStateManager.initialize();
    expect(mockWebSocket.connect).toHaveBeenCalled();
  });

  it("should start tracking an execution", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1", "node2"];
    const dependencies = new Map([
      ["node1", []],
      ["node2", ["node1"]],
    ]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    expect(mockWebSocket.subscribeToExecution).toHaveBeenCalledWith(
      executionId
    );
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
      executionId,
      expect.any(Function)
    );

    const status = executionStateManager.getExecutionFlowStatus(executionId);
    expect(status).toBeDefined();
    expect(status?.executionId).toBe(executionId);
    expect(status?.nodeStates.size).toBe(2);
  });

  it("should stop tracking an execution", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    // Start tracking first
    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );
    expect(
      executionStateManager.getExecutionFlowStatus(executionId)
    ).toBeDefined();

    // Stop tracking
    await executionStateManager.stopExecution(executionId);

    expect(mockWebSocket.unsubscribeFromExecution).toHaveBeenCalledWith(
      executionId
    );
    expect(
      executionStateManager.getExecutionFlowStatus(executionId)
    ).toBeUndefined();
  });

  it("should update node status and notify listeners", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    const listener = vi.fn();
    const unsubscribe = executionStateManager.subscribe(listener);

    // Update node status
    executionStateManager.updateNodeStatus(
      executionId,
      "node1",
      NodeExecutionStatus.RUNNING,
      { startTime: Date.now() }
    );

    expect(listener).toHaveBeenCalled();
    const callArgs = listener.mock.calls[0][0];
    expect(callArgs.activeExecutions.has(executionId)).toBe(true);

    const visualState = executionStateManager.getNodeVisualState("node1");
    expect(visualState.status).toBe(NodeExecutionStatus.RUNNING);
    expect(visualState.animationState).toBe("pulsing");

    unsubscribe();
  });

  it("should handle WebSocket execution events", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    // Get the event handler that was registered
    const eventHandler = mockWebSocket.addEventListener.mock.calls[0][1];

    const listener = vi.fn();
    executionStateManager.subscribe(listener);

    // Simulate a node-status-update event
    eventHandler({
      type: "node-status-update",
      executionId,
      nodeId: "node1",
      status: NodeExecutionStatus.COMPLETED,
      timestamp: Date.now(),
      data: { outputData: { result: "success" } },
    });

    expect(listener).toHaveBeenCalled();
    const visualState = executionStateManager.getNodeVisualState("node1");
    expect(visualState.status).toBe(NodeExecutionStatus.COMPLETED);
    expect(visualState.animationState).toBe("success");
  });

  it("should handle node-started events", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    const eventHandler = mockWebSocket.addEventListener.mock.calls[0][1];
    const listener = vi.fn();
    executionStateManager.subscribe(listener);

    // Simulate node-started event
    eventHandler({
      type: "node-started",
      executionId,
      nodeId: "node1",
      timestamp: Date.now(),
    });

    expect(listener).toHaveBeenCalled();
    const visualState = executionStateManager.getNodeVisualState("node1");
    expect(visualState.status).toBe(NodeExecutionStatus.RUNNING);
  });

  it("should handle node-completed events", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    const eventHandler = mockWebSocket.addEventListener.mock.calls[0][1];
    const listener = vi.fn();
    executionStateManager.subscribe(listener);

    // Simulate node-completed event
    eventHandler({
      type: "node-completed",
      executionId,
      nodeId: "node1",
      timestamp: Date.now(),
      data: { result: "success" },
    });

    expect(listener).toHaveBeenCalled();
    const visualState = executionStateManager.getNodeVisualState("node1");
    expect(visualState.status).toBe(NodeExecutionStatus.COMPLETED);
  });

  it("should handle node-failed events", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    const eventHandler = mockWebSocket.addEventListener.mock.calls[0][1];
    const listener = vi.fn();
    executionStateManager.subscribe(listener);

    // Simulate node-failed event
    eventHandler({
      type: "node-failed",
      executionId,
      nodeId: "node1",
      timestamp: Date.now(),
      error: { message: "Test error" },
    });

    expect(listener).toHaveBeenCalled();
    const visualState = executionStateManager.getNodeVisualState("node1");
    expect(visualState.status).toBe(NodeExecutionStatus.FAILED);
    expect(visualState.animationState).toBe("error");
  });

  it("should handle execution completion events", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    const eventHandler = mockWebSocket.addEventListener.mock.calls[0][1];
    const listener = vi.fn();
    executionStateManager.subscribe(listener);

    // Simulate execution completed event
    eventHandler({
      type: "completed",
      executionId,
      timestamp: Date.now(),
    });

    expect(listener).toHaveBeenCalled();
    const status = executionStateManager.getExecutionFlowStatus(executionId);
    expect(status?.overallStatus).toBe("completed");
  });

  it("should get flow execution state correctly", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1", "node2"];
    const dependencies = new Map([
      ["node1", []],
      ["node2", ["node1"]],
    ]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    const flowState = executionStateManager.getFlowExecutionState();
    expect(flowState.activeExecutions.size).toBe(1);
    expect(flowState.nodeVisualStates.size).toBe(2);
    expect(flowState.realTimeUpdates).toBe(true);
    expect(flowState.selectedExecution).toBe(executionId);
  });

  it("should reset all state correctly", async () => {
    const executionId = "test-execution";
    const nodeIds = ["node1"];
    const dependencies = new Map([["node1", []]]);

    await executionStateManager.startExecution(
      executionId,
      nodeIds,
      dependencies
    );

    const listener = vi.fn();
    executionStateManager.subscribe(listener);

    executionStateManager.reset();

    expect(mockWebSocket.unsubscribeFromExecution).toHaveBeenCalledWith(
      executionId
    );

    const flowState = executionStateManager.getFlowExecutionState();
    expect(flowState.activeExecutions.size).toBe(0);
    expect(flowState.nodeVisualStates.size).toBe(0);
  });

  it("should disconnect properly", () => {
    executionStateManager.disconnect();
    expect(mockWebSocket.disconnect).toHaveBeenCalled();
  });

  it("should check connection status", () => {
    const isConnected = executionStateManager.isConnected();
    expect(isConnected).toBe(true);
    expect(mockWebSocket.isConnected).toHaveBeenCalled();
  });
});
