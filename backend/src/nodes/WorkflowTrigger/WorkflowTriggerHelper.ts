import { PrismaClient } from "@prisma/client";
import { WorkflowService } from "../../services/WorkflowService";
import { NodePropertyOption } from "../../types/node.types";

export class WorkflowTriggerHelper {
  private static prisma = new PrismaClient();
  private static workflowService = new WorkflowService(this.prisma);

  /**
   * Execute a workflow by triggering it via API
   */
  static async executeWorkflow(
    workflowId: string,
    triggerId: string,
    userId: string,
    triggerData: any,
    waitForCompletion: boolean = true,
    timeout: number = 30000
  ): Promise<any> {
    try {
      // Validate the workflow and trigger combination
      const validation = await this.validateWorkflowTrigger(
        workflowId,
        triggerId,
        userId
      );
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const workflow = validation.workflow;
      const trigger = validation.trigger;

      // Call the execution API endpoint
      const executionResult = await this.callExecutionAPI(
        workflowId,
        triggerData,
        trigger.nodeId, // Use the actual node ID, not the trigger ID
        userId
      );

      if (!executionResult.success) {
        throw new Error(executionResult.error || "Failed to execute workflow");
      }

      // If not waiting for completion, return immediately
      if (!waitForCompletion) {
        return {
          success: true,
          executionId: executionResult.data.executionId,
          triggeredAt: new Date().toISOString(),
          workflowId,
          triggerId,
          status: "triggered",
          message: "Workflow execution initiated successfully",
          workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
          },
          trigger: {
            id: trigger.id,
            type: trigger.type,
            nodeId: trigger.nodeId,
          },
        };
      }

      // Wait for execution to complete by polling the execution status
      const completionResult = await this.waitForExecutionCompletion(
        executionResult.data.executionId,
        userId,
        timeout
      );

      return {
        success: true,
        executionId: executionResult.data.executionId,
        triggeredAt: new Date().toISOString(),
        workflowId,
        triggerId,
        status: completionResult.status,
        result: {
          message:
            completionResult.status === "completed"
              ? "Workflow executed successfully"
              : "Workflow execution finished",
          data: triggerData,
          workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
          },
          trigger: {
            id: trigger.id,
            type: trigger.type,
            nodeId: trigger.nodeId,
          },
          executionDetails: completionResult.executionDetails || null,
        },
        executionTime: completionResult.executionTime,
        error: completionResult.error,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Call the execution API to trigger workflow execution
   */
  private static async callExecutionAPI(
    workflowId: string,
    triggerData: any,
    triggerNodeId: string, // This is the actual node ID from the trigger.nodeId
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Since we're in the backend, we can directly call the execution service
      // instead of making an HTTP request
      const { ExecutionService } = require("../../services/ExecutionService");
      const { NodeService } = require("../../services/NodeService");
      const ExecutionHistoryService =
        require("../../services/ExecutionHistoryService").default;

      // Create service instances
      const nodeService = new NodeService(this.prisma);
      const executionHistoryService = new ExecutionHistoryService(this.prisma);
      const executionService = new ExecutionService(
        this.prisma,
        nodeService,
        executionHistoryService
      );

      // Execute the workflow
      const result = await executionService.executeWorkflow(
        workflowId,
        userId,
        triggerData,
        {}, // options
        triggerNodeId
      );

      // The ExecutionService already returns { success, data: { executionId, ... }, error }
      // So we can return it directly
      return {
        success: result.success,
        data: result.data,
        error: result.error?.message || undefined,
      };
    } catch (error) {
      console.error("Error calling execution API:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Wait for execution completion by polling the database
   */
  private static async waitForExecutionCompletion(
    executionId: string,
    userId: string,
    timeout: number
  ): Promise<{
    status: string;
    executionDetails?: any;
    executionTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every second

    while (Date.now() - startTime < timeout) {
      try {
        // Query execution directly from database
        const execution = await this.prisma.execution.findFirst({
          where: {
            id: executionId,
            workflow: { userId },
          },
          include: {
            workflow: {
              select: { id: true, name: true },
            },
            nodeExecutions: {
              orderBy: { startedAt: "asc" },
              select: {
                id: true,
                nodeId: true,
                status: true,
                inputData: true,
                outputData: true,
                error: true,
                startedAt: true,
                finishedAt: true,
              },
            },
          },
        });

        if (!execution) {
          throw new Error("Execution not found");
        }

        // Check if execution is completed
        if (execution.status === "SUCCESS") {
          const executionTime = execution.finishedAt
            ? new Date(execution.finishedAt).getTime() -
              new Date(execution.startedAt).getTime()
            : Date.now() - new Date(execution.startedAt).getTime();

          return {
            status: "completed",
            executionDetails: {
              status: execution.status,
              startedAt: execution.startedAt,
              finishedAt: execution.finishedAt,
              nodeExecutions: execution.nodeExecutions,
              triggerData: execution.triggerData,
            },
            executionTime,
          };
        }

        if (execution.status === "ERROR") {
          return {
            status: "error",
            error: execution.error
              ? JSON.stringify(execution.error)
              : "Execution failed",
            executionDetails: {
              status: execution.status,
              startedAt: execution.startedAt,
              finishedAt: execution.finishedAt,
              nodeExecutions: execution.nodeExecutions,
              error: execution.error,
            },
          };
        }

        if (execution.status === "CANCELLED") {
          return {
            status: "cancelled",
            error: "Execution was cancelled",
            executionDetails: {
              status: execution.status,
              startedAt: execution.startedAt,
              finishedAt: execution.finishedAt,
              nodeExecutions: execution.nodeExecutions,
            },
          };
        }

        // Still running, wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error("Error polling execution status:", error);
        // Continue polling on error
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    // Timeout reached
    return {
      status: "timeout",
      error: `Execution timed out after ${timeout}ms`,
    };
  }

  /**
   * Get available workflows for the current user
   */
  static async getWorkflowOptions(
    userId: string = "system"
  ): Promise<NodePropertyOption[]> {
    try {
      const result = await this.workflowService.listWorkflows(userId, {
        limit: 100,
        page: 1,
        sortOrder: "desc",
      });

      const options: NodePropertyOption[] = result.workflows.map(
        (workflow: any) => ({
          name: workflow.name,
          value: workflow.id,
          description: workflow.description || `Workflow: ${workflow.name}`,
        })
      );

      return options;
    } catch (error) {
      console.error("Error loading workflows:", error);
      return [];
    }
  }

  /**
   * Get available triggers for a specific workflow
   */
  static async getTriggerOptions(
    workflowId: string,
    userId: string = "system"
  ): Promise<NodePropertyOption[]> {
    try {
      if (!workflowId) {
        return [];
      }

      const workflow = await this.workflowService.getWorkflow(
        workflowId,
        userId
      );
      const triggers = (workflow.triggers as any[]) || [];

      const options: NodePropertyOption[] = triggers
        .filter((trigger: any) => trigger.active)
        .map((trigger: any) => ({
          name: `${
            trigger.type.charAt(0).toUpperCase() + trigger.type.slice(1)
          } - ${trigger.settings.description || "No description"}`,
          value: trigger.id,
          description: `Type: ${trigger.type}, Node: ${trigger.nodeId}`,
        }));

      return options;
    } catch (error) {
      console.error("Error loading triggers:", error);
      return [];
    }
  }

  /**
   * Get workflow details
   */
  static async getWorkflowDetails(workflowId: string, userId?: string) {
    try {
      // Don't pass userId to allow cross-user workflow triggers if policy allows
      return await this.workflowService.getWorkflow(workflowId);
    } catch (error) {
      console.error("Error getting workflow details:", error);
      return null;
    }
  }

  /**
   * Validate workflow and trigger combination
   */
  static async validateWorkflowTrigger(
    workflowId: string,
    triggerId: string,
    userId: string = "system"
  ): Promise<{
    valid: boolean;
    workflow?: any;
    trigger?: any;
    error?: string;
  }> {
    try {
      const workflow = await this.getWorkflowDetails(workflowId, userId);

      if (!workflow) {
        return { valid: false, error: "Workflow not found" };
      }

      if (!workflow.active) {
        return { valid: false, error: "Workflow is not active" };
      }

      const triggers = (workflow.triggers as any[]) || [];
      const trigger = triggers.find((t: any) => t.id === triggerId);

      if (!trigger) {
        return { valid: false, error: "Trigger not found in workflow" };
      }

      if (!trigger.active) {
        return { valid: false, error: "Trigger is not active" };
      }

      return { valid: true, workflow, trigger };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
