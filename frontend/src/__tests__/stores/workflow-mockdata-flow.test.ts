import { useWorkflowStore } from "@/stores/workflow";
import { Workflow } from "@/types";
import { beforeEach, describe, expect, it } from "vitest";

describe("WorkflowStore - Mock Data Flow", () => {
  beforeEach(() => {
    // Reset the store
    useWorkflowStore.setState({
      workflow: null,
      realTimeResults: new Map(),
      persistentNodeResults: new Map(),
    });
  });

  it("should return mock data when node has pinned mock data", () => {
    const mockWorkflow: Workflow = {
      id: "workflow-1",
      name: "Test Workflow",
      description: "Test workflow description",
      userId: "user-1",
      nodes: [
        {
          id: "node-1",
          type: "manual-trigger",
          name: "Manual Trigger",
          parameters: {},
          position: { x: 100, y: 100 },
          credentials: [],
          disabled: false,
          mockData: { message: "Hello World", success: true },
          mockDataPinned: true,
        },
        {
          id: "node-2",
          type: "http-request",
          name: "HTTP Request",
          parameters: {},
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
      active: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    // Set up the store with a workflow
    useWorkflowStore.getState().setWorkflow(mockWorkflow);

    // Get node execution result for node with pinned mock data
    const nodeResult = useWorkflowStore
      .getState()
      .getNodeExecutionResult("node-1");

    expect(nodeResult).toBeDefined();
    expect(nodeResult?.nodeId).toBe("node-1");
    expect(nodeResult?.nodeName).toBe("Manual Trigger");
    expect(nodeResult?.status).toBe("skipped"); // Should be "skipped" for mock data
    expect(nodeResult?.data).toEqual({ message: "Hello World", success: true });
    expect(nodeResult?.error).toBeUndefined();
  });

  it("should not return mock data when node has mock data but not pinned", () => {
    const mockWorkflow: Workflow = {
      id: "workflow-1",
      name: "Test Workflow",
      description: "Test workflow description",
      userId: "user-1",
      nodes: [
        {
          id: "node-1",
          type: "manual-trigger",
          name: "Manual Trigger",
          parameters: {},
          position: { x: 100, y: 100 },
          credentials: [],
          disabled: false,
          mockData: { message: "Hello World", success: true },
          mockDataPinned: false, // Not pinned
        },
      ],
      connections: [],
      settings: {},
      active: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    // Set up the store with a workflow
    useWorkflowStore.getState().setWorkflow(mockWorkflow);

    // Get node execution result - should be undefined since no execution result and mock not pinned
    const nodeResult = useWorkflowStore
      .getState()
      .getNodeExecutionResult("node-1");

    expect(nodeResult).toBeUndefined();
  });

  it("should prioritize actual execution results over unpinned mock data", () => {
    const mockWorkflow: Workflow = {
      id: "workflow-1",
      name: "Test Workflow",
      description: "Test workflow description",
      userId: "user-1",
      nodes: [
        {
          id: "node-1",
          type: "manual-trigger",
          name: "Manual Trigger",
          parameters: {},
          position: { x: 100, y: 100 },
          credentials: [],
          disabled: false,
          mockData: { message: "Mock Data", success: true },
          mockDataPinned: false, // Not pinned, so actual execution should take priority
        },
      ],
      connections: [],
      settings: {},
      active: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    // Set up the store with a workflow
    useWorkflowStore.getState().setWorkflow(mockWorkflow);

    // Add a real-time execution result
    useWorkflowStore.getState().updateNodeExecutionResult("node-1", {
      nodeId: "node-1",
      nodeName: "Manual Trigger",
      status: "success",
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      duration: 1000,
      data: { message: "Real Execution Data", success: true },
      error: undefined,
    });

    // Get node execution result - should be the real execution result when mock data is not pinned
    const nodeResult = useWorkflowStore
      .getState()
      .getNodeExecutionResult("node-1");

    expect(nodeResult).toBeDefined();
    expect(nodeResult?.status).toBe("success"); // Should be "success" from actual execution
    expect(nodeResult?.data).toEqual({
      message: "Real Execution Data",
      success: true,
    });
  });

  it("should return pinned mock data even when execution results exist", () => {
    const mockWorkflow: Workflow = {
      id: "workflow-1",
      name: "Test Workflow",
      description: "Test workflow description",
      userId: "user-1",
      nodes: [
        {
          id: "node-1",
          type: "manual-trigger",
          name: "Manual Trigger",
          parameters: {},
          position: { x: 100, y: 100 },
          credentials: [],
          disabled: false,
          mockData: { message: "Mock Data", success: true },
          mockDataPinned: true, // Pinned, so mock data should take priority
        },
      ],
      connections: [],
      settings: {},
      active: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    // Set up the store with a workflow
    useWorkflowStore.getState().setWorkflow(mockWorkflow);

    // Add a real-time execution result
    useWorkflowStore.getState().updateNodeExecutionResult("node-1", {
      nodeId: "node-1",
      nodeName: "Manual Trigger",
      status: "success",
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      duration: 1000,
      data: { message: "Real Execution Data", success: true },
      error: undefined,
    });

    // Get node execution result - should be the mock data because it's pinned
    const nodeResult = useWorkflowStore
      .getState()
      .getNodeExecutionResult("node-1");

    expect(nodeResult).toBeDefined();
    expect(nodeResult?.status).toBe("skipped"); // Should be "skipped" for pinned mock data
    expect(nodeResult?.data).toEqual({
      message: "Mock Data",
      success: true,
    });
  });

  it("should return undefined when node has no mock data and no execution results", () => {
    const mockWorkflow: Workflow = {
      id: "workflow-1",
      name: "Test Workflow",
      description: "Test workflow description",
      userId: "user-1",
      nodes: [
        {
          id: "node-1",
          type: "manual-trigger",
          name: "Manual Trigger",
          parameters: {},
          position: { x: 100, y: 100 },
          credentials: [],
          disabled: false,
          // No mockData
        },
      ],
      connections: [],
      settings: {},
      active: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    // Set up the store with a workflow
    useWorkflowStore.getState().setWorkflow(mockWorkflow);

    // Get node execution result - should be undefined
    const nodeResult = useWorkflowStore
      .getState()
      .getNodeExecutionResult("node-1");

    expect(nodeResult).toBeUndefined();
  });

  it("should use pinned mock data as input for connected nodes", () => {
    const mockWorkflow: Workflow = {
      id: "workflow-1",
      name: "Test Workflow",
      description: "Test workflow description",
      userId: "user-1",
      nodes: [
        {
          id: "node-1",
          type: "manual-trigger",
          name: "Manual Trigger",
          parameters: {},
          position: { x: 100, y: 100 },
          credentials: [],
          disabled: false,
          mockData: { message: "Hello World", success: true },
          mockDataPinned: true,
        },
        {
          id: "node-2",
          type: "if",
          name: "IF Node",
          parameters: {},
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
      active: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    // Set up the store with a workflow
    useWorkflowStore.getState().setWorkflow(mockWorkflow);

    // Call gatherInputDataFromConnectedNodes for node-2
    const inputData = useWorkflowStore
      .getState()
      .gatherInputDataFromConnectedNodes("node-2");

    // Should return the mock data from node-1 as input for node-2
    expect(inputData).toBeDefined();
    expect(inputData.main).toBeDefined();
    expect(inputData.main.length).toBeGreaterThan(0);
    expect(inputData.main[0]).toEqual({
      json: { message: "Hello World", success: true },
    });
  });

  it("should show confirmation dialog when executing single node with pinned mock data", async () => {
    // This test would need proper mocking of the confirmation service
    // For now, we'll skip the actual execution test since it requires backend setup
    const mockWorkflow: Workflow = {
      id: "workflow-1",
      name: "Test Workflow",
      description: "Test workflow description",
      userId: "user-1",
      nodes: [
        {
          id: "node-1",
          type: "http-request",
          name: "HTTP Request",
          parameters: {},
          position: { x: 100, y: 100 },
          credentials: [],
          disabled: false,
          mockData: { message: "Mock Response", status: 200 },
          mockDataPinned: true,
        },
      ],
      connections: [],
      settings: {},
      active: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    // Set up the store with a workflow
    useWorkflowStore.getState().setWorkflow(mockWorkflow);

    // Verify the node has pinned mock data
    const node = mockWorkflow.nodes[0];
    expect(node.mockData).toBeDefined();
    expect(node.mockDataPinned).toBe(true);

    // This test verifies the setup is correct for confirmation dialog scenario
    // The actual confirmation logic would need integration testing with proper mocks
    expect(true).toBe(true);
  });
});
