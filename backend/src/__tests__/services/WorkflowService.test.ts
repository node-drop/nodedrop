import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AppError } from "../../middleware/errorHandler";
import { WorkflowService } from "../../services/WorkflowService";

const prisma = new PrismaClient();

describe("WorkflowService", () => {
  let workflowService: WorkflowService;
  let testUserId: string;
  let testWorkflowId: string;

  beforeAll(async () => {
    workflowService = new WorkflowService(prisma);

    // Clean up test data
    await prisma.workflow.deleteMany({
      where: {
        name: {
          contains: "Test",
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "workflow-service-test",
        },
      },
    });

    // Create test user
    const hashedPassword = await bcrypt.hash("password123", 12);
    const user = await prisma.user.create({
      data: {
        email: "workflow-service-test@example.com",
        password: hashedPassword,
        name: "Workflow Service Test",
        role: "USER",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.workflow.deleteMany({
      where: {
        name: {
          contains: "Test",
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "workflow-service-test",
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("createWorkflow", () => {
    it("should create a workflow successfully", async () => {
      const workflowData = {
        name: "Test Workflow",
        description: "A test workflow",
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: { path: "/test" },
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: false,
      };

      const workflow = await workflowService.createWorkflow(
        testUserId,
        workflowData
      );

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe(workflowData.name);
      expect(workflow.description).toBe(workflowData.description);
      expect(workflow.userId).toBe(testUserId);
      expect(workflow.active).toBe(false);

      testWorkflowId = workflow.id;
    });

    it("should throw error for invalid workflow data", async () => {
      const invalidWorkflowData = {
        name: "",
        description: "Invalid workflow",
        nodes: [],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: false,
      };

      await expect(
        workflowService.createWorkflow(testUserId, invalidWorkflowData)
      ).rejects.toThrow();
    });
  });

  describe("getWorkflow", () => {
    it("should get workflow by ID", async () => {
      const workflow = await workflowService.getWorkflow(
        testWorkflowId,
        testUserId
      );

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe(testWorkflowId);
      expect(workflow.name).toBe("Test Workflow");
    });

    it("should throw error for non-existent workflow", async () => {
      const fakeId = "123e4567-e89b-12d3-a456-426614174000";

      await expect(
        workflowService.getWorkflow(fakeId, testUserId)
      ).rejects.toThrow(AppError);
    });

    it("should throw error when user tries to access workflow they do not own", async () => {
      const anotherUserId = "123e4567-e89b-12d3-a456-426614174001";

      await expect(
        workflowService.getWorkflow(testWorkflowId, anotherUserId)
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateWorkflow", () => {
    it("should update workflow successfully", async () => {
      const updateData = {
        name: "Updated Test Workflow",
        description: "Updated description",
        active: true,
      };

      const updatedWorkflow = await workflowService.updateWorkflow(
        testWorkflowId,
        testUserId,
        updateData
      );

      expect(updatedWorkflow.name).toBe(updateData.name);
      expect(updatedWorkflow.description).toBe(updateData.description);
      expect(updatedWorkflow.active).toBe(updateData.active);
    });

    it("should validate workflow when updating nodes", async () => {
      const updateData = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: { path: "/test" },
            position: { x: 100, y: 100 },
            disabled: false,
          },
          {
            id: "node2",
            type: "http",
            name: "HTTP Request",
            parameters: { url: "https://api.example.com" },
            position: { x: 300, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn1",
            sourceNodeId: "node1",
            sourceOutput: "main",
            targetNodeId: "node2",
            targetInput: "main",
          },
        ],
      };

      const updatedWorkflow = await workflowService.updateWorkflow(
        testWorkflowId,
        testUserId,
        updateData
      );

      expect(updatedWorkflow.nodes).toEqual(updateData.nodes);
      expect(updatedWorkflow.connections).toEqual(updateData.connections);
    });

    it("should throw error for invalid workflow update", async () => {
      const invalidUpdateData = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: { path: "/test" },
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn1",
            sourceNodeId: "nonexistent",
            sourceOutput: "main",
            targetNodeId: "node1",
            targetInput: "main",
          },
        ],
      };

      await expect(
        workflowService.updateWorkflow(
          testWorkflowId,
          testUserId,
          invalidUpdateData
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe("listWorkflows", () => {
    beforeAll(async () => {
      // Create additional test workflows
      await workflowService.createWorkflow(testUserId, {
        name: "Test Workflow 2",
        description: "Second test workflow",
        nodes: [
          {
            id: "node1",
            type: "schedule",
            name: "Schedule",
            parameters: { cron: "0 0 * * *" },
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: true,
      });

      await workflowService.createWorkflow(testUserId, {
        name: "Another Workflow",
        description: "Different workflow",
        nodes: [
          {
            id: "node1",
            type: "manual",
            name: "Manual Trigger",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: false,
      });
    });

    it("should list workflows with pagination", async () => {
      const result = await workflowService.listWorkflows(testUserId, {
        page: 1,
        limit: 2,
        sortOrder: "desc",
      });

      expect(result.workflows).toBeDefined();
      expect(result.workflows.length).toBeLessThanOrEqual(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBeGreaterThan(0);
    });

    it("should filter workflows by search term", async () => {
      const result = await workflowService.listWorkflows(testUserId, {
        search: "Test",
        page: 1,
        limit: 10,
        sortOrder: "desc",
      });

      expect(result.workflows).toBeDefined();
      expect(
        result.workflows.every(
          (w) =>
            w.name.includes("Test") ||
            (w.description && w.description.includes("Test"))
        )
      ).toBe(true);
    });

    it("should sort workflows correctly", async () => {
      const result = await workflowService.listWorkflows(testUserId, {
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      });

      expect(result.workflows).toBeDefined();
      if (result.workflows.length > 1) {
        for (let i = 1; i < result.workflows.length; i++) {
          expect(result.workflows[i].name >= result.workflows[i - 1].name).toBe(
            true
          );
        }
      }
    });
  });

  describe("searchWorkflows", () => {
    it("should search workflows with advanced filters", async () => {
      const result = await workflowService.searchWorkflows(testUserId, {
        search: "Test",
        page: 1,
        limit: 10,
      });

      expect(result.workflows).toBeDefined();
      expect(
        result.workflows.every(
          (w) =>
            (w.name.includes("Test") ||
              (w.description && w.description.includes("Test"))) &&
            w.active === false
        )
      ).toBe(true);
    });

    it("should include last execution information", async () => {
      const result = await workflowService.searchWorkflows(testUserId, {});

      expect(result.workflows).toBeDefined();
      result.workflows.forEach((workflow) => {
        expect(workflow.lastExecution).toBeDefined();
        expect(workflow._count).toBeDefined();
      });
    });
  });

  describe("duplicateWorkflow", () => {
    it("should duplicate workflow successfully", async () => {
      const duplicatedWorkflow = await workflowService.duplicateWorkflow(
        testWorkflowId,
        testUserId,
        "Duplicated Test Workflow"
      );

      expect(duplicatedWorkflow).toBeDefined();
      expect(duplicatedWorkflow.name).toBe("Duplicated Test Workflow");
      expect(duplicatedWorkflow.id).not.toBe(testWorkflowId);
      expect(duplicatedWorkflow.active).toBe(false);
      expect(duplicatedWorkflow.userId).toBe(testUserId);
    });

    it("should duplicate workflow with default name", async () => {
      const originalWorkflow = await workflowService.getWorkflow(
        testWorkflowId,
        testUserId
      );
      const duplicatedWorkflow = await workflowService.duplicateWorkflow(
        testWorkflowId,
        testUserId
      );

      expect(duplicatedWorkflow.name).toBe(`${originalWorkflow.name} (Copy)`);
    });
  });

  describe("validateWorkflow", () => {
    it("should validate correct workflow", async () => {
      const validWorkflow = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: { path: "/test" },
            position: { x: 100, y: 100 },
            disabled: false,
          },
          {
            id: "node2",
            type: "http",
            name: "HTTP Request",
            parameters: { url: "https://api.example.com" },
            position: { x: 300, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn1",
            sourceNodeId: "node1",
            sourceOutput: "main",
            targetNodeId: "node2",
            targetInput: "main",
          },
        ],
        triggers: [
          {
            id: "trigger1",
            type: "webhook",
            nodeId: "node1",
            settings: {},
          },
        ],
        settings: {
          timezone: "UTC",
          saveExecutionProgress: true,
        },
      };

      const validation = await workflowService.validateWorkflow(validWorkflow);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect empty workflow", async () => {
      const emptyWorkflow = {
        nodes: [],
        connections: [],
        triggers: [],
        settings: {},
      };

      const validation = await workflowService.validateWorkflow(emptyWorkflow);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Workflow must contain at least one node"
      );
    });

    it("should detect invalid connections", async () => {
      const invalidWorkflow = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: { path: "/test" },
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn1",
            sourceNodeId: "nonexistent",
            sourceOutput: "main",
            targetNodeId: "node1",
            targetInput: "main",
          },
        ],
      };

      const validation = await workflowService.validateWorkflow(
        invalidWorkflow
      );

      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((error) =>
          error.includes("source node nonexistent not found")
        )
      ).toBe(true);
    });

    it("should detect circular dependencies", async () => {
      const circularWorkflow = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
          {
            id: "node2",
            type: "http",
            name: "HTTP Request",
            parameters: {},
            position: { x: 300, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn1",
            sourceNodeId: "node1",
            sourceOutput: "main",
            targetNodeId: "node2",
            targetInput: "main",
          },
          {
            id: "conn2",
            sourceNodeId: "node2",
            sourceOutput: "main",
            targetNodeId: "node1",
            targetInput: "main",
          },
        ],
      };

      const validation = await workflowService.validateWorkflow(
        circularWorkflow
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Workflow contains circular dependencies"
      );
    });

    it("should detect self-connections", async () => {
      const selfConnectedWorkflow = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn1",
            sourceNodeId: "node1",
            sourceOutput: "main",
            targetNodeId: "node1",
            targetInput: "main",
          },
        ],
      };

      const validation = await workflowService.validateWorkflow(
        selfConnectedWorkflow
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Node node1 cannot connect to itself"
      );
    });

    it("should detect duplicate node IDs", async () => {
      const duplicateNodeWorkflow = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook 1",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
          {
            id: "node1",
            type: "http",
            name: "HTTP Request",
            parameters: {},
            position: { x: 300, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
      };

      const validation = await workflowService.validateWorkflow(
        duplicateNodeWorkflow
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Workflow contains duplicate node IDs"
      );
    });

    it("should warn about orphaned nodes", async () => {
      const orphanedNodeWorkflow = {
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
          {
            id: "node2",
            type: "http",
            name: "HTTP Request",
            parameters: {},
            position: { x: 300, y: 100 },
            disabled: false,
          },
          {
            id: "node3",
            type: "email",
            name: "Send Email",
            parameters: {},
            position: { x: 500, y: 100 },
            disabled: false,
          },
        ],
        connections: [
          {
            id: "conn1",
            sourceNodeId: "node1",
            sourceOutput: "main",
            targetNodeId: "node2",
            targetInput: "main",
          },
        ],
      };

      const validation = await workflowService.validateWorkflow(
        orphanedNodeWorkflow
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(
        validation.warnings!.some((warning) =>
          warning.includes("Orphaned nodes detected: node3")
        )
      ).toBe(true);
    });
  });

  describe("getWorkflowStats", () => {
    it("should return workflow statistics", async () => {
      const stats = await workflowService.getWorkflowStats(testUserId);

      expect(stats).toBeDefined();
      expect(stats.totalWorkflows).toBeGreaterThan(0);
      expect(stats.activeWorkflows).toBeGreaterThanOrEqual(0);
      expect(stats.inactiveWorkflows).toBeGreaterThanOrEqual(0);
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.recentExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.totalWorkflows).toBe(
        stats.activeWorkflows + stats.inactiveWorkflows
      );
    });
  });

  describe("bulkUpdateWorkflows", () => {
    let bulkTestWorkflowIds: string[];

    beforeAll(async () => {
      // Create workflows for bulk operations
      const workflow1 = await workflowService.createWorkflow(testUserId, {
        name: "Bulk Test Workflow 1",
        description: "For bulk testing",
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: false,
      });

      const workflow2 = await workflowService.createWorkflow(testUserId, {
        name: "Bulk Test Workflow 2",
        description: "For bulk testing",
        nodes: [
          {
            id: "node1",
            type: "schedule",
            name: "Schedule",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: false,
      });

      bulkTestWorkflowIds = [workflow1.id, workflow2.id];
    });

    it("should bulk update workflows successfully", async () => {
      const result = await workflowService.bulkUpdateWorkflows(
        testUserId,
        bulkTestWorkflowIds,
        { active: true, description: "Bulk updated" }
      );

      expect(result.updated).toBe(2);
      expect(result.workflowIds).toEqual(bulkTestWorkflowIds);

      // Verify updates
      for (const workflowId of bulkTestWorkflowIds) {
        const workflow = await workflowService.getWorkflow(
          workflowId,
          testUserId
        );
        expect(workflow.active).toBe(true);
        expect(workflow.description).toBe("Bulk updated");
      }
    });

    it("should throw error for non-existent workflows in bulk update", async () => {
      const fakeId = "123e4567-e89b-12d3-a456-426614174000";

      await expect(
        workflowService.bulkUpdateWorkflows(
          testUserId,
          [bulkTestWorkflowIds[0], fakeId],
          { active: false }
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe("bulkDeleteWorkflows", () => {
    let deleteTestWorkflowIds: string[];

    beforeAll(async () => {
      // Create workflows for bulk deletion
      const workflow1 = await workflowService.createWorkflow(testUserId, {
        name: "Delete Test Workflow 1",
        description: "For deletion testing",
        nodes: [
          {
            id: "node1",
            type: "webhook",
            name: "Webhook",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: false,
      });

      const workflow2 = await workflowService.createWorkflow(testUserId, {
        name: "Delete Test Workflow 2",
        description: "For deletion testing",
        nodes: [
          {
            id: "node1",
            type: "schedule",
            name: "Schedule",
            parameters: {},
            position: { x: 100, y: 100 },
            disabled: false,
          },
        ],
        connections: [],
        triggers: [],
        settings: {
          saveExecutionProgress: true,
          saveDataErrorExecution: true,
          saveDataSuccessExecution: true,
          callerPolicy: "workflowsFromSameOwner" as const,
        },
        active: false,
      });

      deleteTestWorkflowIds = [workflow1.id, workflow2.id];
    });

    it("should bulk delete workflows successfully", async () => {
      const result = await workflowService.bulkDeleteWorkflows(
        testUserId,
        deleteTestWorkflowIds
      );

      expect(result.deleted).toBe(2);
      expect(result.workflowIds).toEqual(deleteTestWorkflowIds);

      // Verify deletions
      for (const workflowId of deleteTestWorkflowIds) {
        await expect(
          workflowService.getWorkflow(workflowId, testUserId)
        ).rejects.toThrow(AppError);
      }
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete workflow successfully", async () => {
      const result = await workflowService.deleteWorkflow(
        testWorkflowId,
        testUserId
      );

      expect(result.success).toBe(true);

      // Verify deletion
      await expect(
        workflowService.getWorkflow(testWorkflowId, testUserId)
      ).rejects.toThrow(AppError);
    });
  });
});
