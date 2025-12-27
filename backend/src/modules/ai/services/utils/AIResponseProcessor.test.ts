
import { NodeService } from "@/services/nodes/NodeService";
import { Workflow } from "@/types/database";
import { describe, expect, it } from "bun:test";
import { AIResponseProcessor } from "./AIResponseProcessor";

// Mock NodeService
const mockNodeService = {
  getNodeTypes: () => Promise.resolve([
    { identifier: 'test-node', displayName: 'Test Node' }
  ])
} as unknown as NodeService;

describe("AIResponseProcessor", () => {
  const processor = new AIResponseProcessor(mockNodeService);

  it("should preserve positions of existing nodes when AI returns them without position", async () => {
    const currentWorkflow: Workflow = {
      id: "wf-1",
      name: "Test Workflow",
      nodes: [
        {
          id: "node-1",
          type: "test-node",
          name: "Node 1",
          parameters: {},
          position: { x: 100, y: 200 },
          data: {}
        }
      ],
      connections: [],
      created_at: new Date(),
      updated_at: new Date(),
      userId: "user-1",
      active: false,
      version: 1
    };

    const toolCalls = [
      {
        function: {
          name: "build_workflow",
          arguments: JSON.stringify({
            workflow: {
              nodes: [
                {
                  id: "node-1", // Same ID as existing
                  type: "test-node",
                  name: "Node 1 (Updated)",
                  parameters: { newParam: "value" }
                  // Intentionally missing position
                }
              ],
              connections: []
            },
            message: "Updated workflow"
          })
        }
      }
    ];

    const result = await processor.processToolCalls(toolCalls, currentWorkflow);

    const node1 = result.workflow.nodes.find(n => n.id === "node-1");
    expect(node1).toBeDefined();
    expect(node1?.position).toEqual({ x: 100, y: 200 }); // Should match original
    expect(node1?.parameters).toEqual({ newParam: "value" }); // Should have new params
  });

  it("should accept positions for new nodes", async () => {
    const currentWorkflow: Workflow = {
      id: "wf-1",
      name: "Test Workflow",
      nodes: [],
      connections: [],
      created_at: new Date(),
      updated_at: new Date(),
      userId: "user-1",
      active: false,
      version: 1
    };

    const toolCalls = [
      {
        function: {
          name: "build_workflow",
          arguments: JSON.stringify({
            workflow: {
              nodes: [
                {
                  id: "new-node",
                  type: "test-node",
                  name: "New Node",
                  parameters: {},
                  position: { x: 500, y: 500 }
                }
              ],
              connections: []
            },
            message: "New workflow"
          })
        }
      }
    ];

    const result = await processor.processToolCalls(toolCalls, currentWorkflow);

    const newNode = result.workflow.nodes.find(n => n.id === "new-node");
    expect(newNode).toBeDefined();
    expect(newNode?.position).toEqual({ x: 500, y: 500 });
  });

    it("should provide default position for new nodes if missing", async () => {
    const currentWorkflow: Workflow = {
      id: "wf-1",
      name: "Test Workflow",
      nodes: [],
      connections: [],
      created_at: new Date(),
      updated_at: new Date(),
      userId: "user-1",
      active: false,
      version: 1
    };

    const toolCalls = [
      {
        function: {
          name: "build_workflow",
          arguments: JSON.stringify({
            workflow: {
              nodes: [
                {
                  id: "new-node-no-pos",
                  type: "test-node",
                  name: "New Node No Pos",
                  parameters: {},
                  // No position
                }
              ],
              connections: []
            },
            message: "New workflow"
          })
        }
      }
    ];

    const result = await processor.processToolCalls(toolCalls, currentWorkflow);

    const newNode = result.workflow.nodes.find(n => n.id === "new-node-no-pos");
    expect(newNode).toBeDefined();
    expect(newNode?.position).toBeDefined(); // Should be assigned a default
  });
});
