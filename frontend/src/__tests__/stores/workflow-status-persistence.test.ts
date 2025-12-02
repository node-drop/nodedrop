import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkflowStore } from "../../stores/workflow";
import { NodeExecutionStatus } from "../../types/execution";

// Mock the execution service
vi.mock("../../services/execution", () => ({
  executionService: {
    executeWorkflow: vi.fn(),
    executeSingleNode: vi.fn(),
    prepareTriggerData: vi.fn(),
  },
}));

// Mock the websocket service
vi.mock("../../services/ExecutionWebSocket", () => ({
  executionWebSocket: {
    connect: vi.fn(),
    isConnected: vi.fn(() => true),
    subscribeToExecution: vi.fn(),
    unsubscribeFromExecution: vi.fn(),
    removeExecutionListeners: vi.fn(),
    addEventListener: vi.fn(),
  },
}));

describe("Workflow Store - Status Icon Persistence Fixes", () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkflowStore.getState().setWorkflow(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Success State Persistence", () => {
    it("should not auto-hide success status after 3 seconds", async () => {
      const store = useWorkflowStore.getState();

      // Set up a workflow with a node
      const mockWorkflow = {
        id: "test-workflow",
        name: "Test Workflow",
        nodes: [
          {
            id: "test-node",
            name: "Test Node",
            type: "manual-trigger",
            position: { x: 0, y: 0 },
            parameters: {},
            disabled: false,
          },
        ],
        connections: [],
        settings: {},
        triggers: [],
        active: true,
        userId: "test-user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.setWorkflow(mockWorkflow);

      // Simulate successful node execution
      store.updateNodeExecutionState(
        "test-node",
        NodeExecutionStatus.COMPLETED,
        {
          progress: 100,
          outputData: { success: true },
          startTime: Date.now() - 1000,
          endTime: Date.now(),
        }
      );

      // Get the visual state immediately after execution
      const initialVisualState = store.getNodeVisualState("test-node");
      expect(initialVisualState.status).toBe(NodeExecutionStatus.COMPLETED);
      expect(initialVisualState.animationState).toBe("success");

      // Wait 4 seconds (more than the previous 3-second auto-hide timeout)
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });

      // Visual state should still show success (no auto-hide)
      const persistedVisualState = store.getNodeVisualState("test-node");
      expect(persistedVisualState.status).toBe(NodeExecutionStatus.COMPLETED);
      expect(persistedVisualState.animationState).toBe("success");
    });

    it("should not clear execution state after successful completion", async () => {
      const store = useWorkflowStore.getState();

      // Set up execution state
      store.setExecutionState({
        status: "success",
        progress: 100,
        startTime: Date.now() - 2000,
        endTime: Date.now(),
        executionId: "test-execution-123",
      });

      // Wait 4 seconds (more than the previous 3-second auto-clear timeout)
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });

      // Execution state should still be preserved
      const executionState = store.executionState;
      expect(executionState.status).toBe("success");
      expect(executionState.executionId).toBe("test-execution-123");
    });
  });

  describe("Multiple Execution Handling", () => {
    it("should handle multiple quick executions without status conflicts", async () => {
      const store = useWorkflowStore.getState();

      // Set up a workflow
      const mockWorkflow = {
        id: "test-workflow",
        name: "Test Workflow",
        nodes: [
          {
            id: "node-1",
            name: "Node 1",
            type: "manual-trigger",
            position: { x: 0, y: 0 },
            parameters: {},
            disabled: false,
          },
          {
            id: "node-2",
            name: "Node 2",
            type: "http-request",
            position: { x: 200, y: 0 },
            parameters: {},
            disabled: false,
          },
        ],
        connections: [],
        settings: {},
        triggers: [],
        active: true,
        userId: "test-user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.setWorkflow(mockWorkflow);

      // First execution - success
      store.setCurrentExecutionId("execution-1");
      store.updateNodeExecutionState("node-1", NodeExecutionStatus.COMPLETED, {
        progress: 100,
        outputData: { success: true },
      });
      store.updateNodeExecutionState("node-2", NodeExecutionStatus.COMPLETED, {
        progress: 100,
        outputData: { success: true },
      });

      // Verify first execution results
      expect(store.getNodeVisualState("node-1").status).toBe(
        NodeExecutionStatus.COMPLETED
      );
      expect(store.getNodeVisualState("node-2").status).toBe(
        NodeExecutionStatus.COMPLETED
      );

      // Second execution starts quickly - should clear visual states for new execution
      store.setCurrentExecutionId("execution-2");
      store.clearNodeVisualStates();

      // New execution running
      store.updateNodeExecutionState("node-1", NodeExecutionStatus.RUNNING, {
        progress: 50,
      });

      // Should show new execution state, not previous one
      expect(store.getNodeVisualState("node-1").status).toBe(
        NodeExecutionStatus.RUNNING
      );
      expect(store.getNodeVisualState("node-2").status).toBe(
        NodeExecutionStatus.IDLE
      ); // Reset for new execution
    });

    it("should only process events for current execution ID", () => {
      const store = useWorkflowStore.getState();

      // Set current execution
      store.setExecutionState({ executionId: "current-execution" });

      // Mock console.log to capture the skip message
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Process event for different execution ID
      store.handleExecutionEvent({
        type: "node-started",
        executionId: "different-execution",
        nodeId: "test-node",
        timestamp: Date.now(),
      });

      // Should log that event was skipped
      expect(consoleSpy).toHaveBeenCalledWith(
        "=== SKIPPING EVENT - NOT FOR CURRENT EXECUTION ===",
        expect.objectContaining({
          eventExecutionId: "different-execution",
          currentExecutionId: "current-execution",
          eventType: "node-started",
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Visual State Preservation", () => {
    it("should preserve node visual states when unsubscribing from execution", async () => {
      const store = useWorkflowStore.getState();

      // Set up execution with completed nodes
      store.updateNodeExecutionState("node-1", NodeExecutionStatus.COMPLETED, {
        progress: 100,
        outputData: { success: true },
      });
      store.updateNodeExecutionState("node-2", NodeExecutionStatus.FAILED, {
        error: { message: "Test error", timestamp: Date.now() },
      });

      // Get states before unsubscribing
      const beforeNode1State = store.getNodeVisualState("node-1");
      const beforeNode2State = store.getNodeVisualState("node-2");

      // Unsubscribe from execution
      await store.unsubscribeFromExecution("test-execution");

      // Visual states should be preserved
      const afterNode1State = store.getNodeVisualState("node-1");
      const afterNode2State = store.getNodeVisualState("node-2");

      expect(afterNode1State.status).toBe(beforeNode1State.status);
      expect(afterNode1State.animationState).toBe(
        beforeNode1State.animationState
      );
      expect(afterNode2State.status).toBe(beforeNode2State.status);
      expect(afterNode2State.animationState).toBe(
        beforeNode2State.animationState
      );
    });

    it("should only clear visual states when starting genuinely new execution", () => {
      const store = useWorkflowStore.getState();

      // Set up execution with some visual states
      store.setExecutionState({ executionId: "execution-1" });
      store.flowExecutionState.selectedExecution = "execution-1";
      store.updateNodeExecutionState("node-1", NodeExecutionStatus.COMPLETED, {
        progress: 100,
      });

      // Call clearNodeVisualStates for same execution - should not clear
      store.clearNodeVisualStates();

      // Visual state should still be there (same execution)
      expect(store.getNodeVisualState("node-1").status).toBe(
        NodeExecutionStatus.COMPLETED
      );

      // Now change to different execution and clear
      store.setExecutionState({ executionId: "execution-2" });
      store.clearNodeVisualStates();

      // Now visual state should be cleared (different execution)
      expect(store.getNodeVisualState("node-1").status).toBe(
        NodeExecutionStatus.IDLE
      );
    });
  });

  describe("Error State Persistence", () => {
    it("should persist error states without auto-hiding", async () => {
      const store = useWorkflowStore.getState();

      // Simulate failed node execution
      store.updateNodeExecutionState("test-node", NodeExecutionStatus.FAILED, {
        error: { message: "Test error", timestamp: Date.now() },
        startTime: Date.now() - 1000,
        endTime: Date.now(),
      });

      // Error state should be immediately visible
      const initialVisualState = store.getNodeVisualState("test-node");
      expect(initialVisualState.status).toBe(NodeExecutionStatus.FAILED);
      expect(initialVisualState.animationState).toBe("error");
      expect(initialVisualState.errorMessage).toBe("Test error");

      // Wait several seconds - error should still be visible
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const persistedVisualState = store.getNodeVisualState("test-node");
      expect(persistedVisualState.status).toBe(NodeExecutionStatus.FAILED);
      expect(persistedVisualState.animationState).toBe("error");
      expect(persistedVisualState.errorMessage).toBe("Test error");
    });
  });
});
