import { db } from "../config/database";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { logger } from "../utils/logger";
import { WorkflowErrorData } from "../nodes/ErrorTrigger/ErrorTrigger.node";

/**
 * Service that fires error workflows when workflows fail.
 *
 * Each workflow can have an `errorWorkflowId` in its settings that specifies
 * which workflow to execute when it fails. This is the n8n-style approach.
 */
export class ErrorTriggerService {
  private executionService: any;

  constructor() {
  }

  /**
   * Set the execution service (called after initialization to avoid circular dependencies)
   */
  setExecutionService(executionService: any): void {
    this.executionService = executionService;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    logger.info(`✅ ErrorTriggerService initialized`);
  }

  /**
   * Called when a workflow execution fails
   * Checks if the failed workflow has an error workflow configured and fires it
   */
  async onWorkflowExecutionFailed(errorData: WorkflowErrorData): Promise<void> {
    logger.info(`🚨 Workflow execution failed`, {
      executionId: errorData.executionId,
      workflowId: errorData.workflowId,
      workflowName: errorData.workflowName,
      errorMessage: errorData.errorMessage,
    });

    await this.fireErrorWorkflow(errorData);
  }

  /**
   * Fire the error workflow if configured for the failed workflow
   */
  private async fireErrorWorkflow(errorData: WorkflowErrorData): Promise<void> {
    try {
      // Get the failed workflow's settings
      const workflow = await db.query.workflows.findFirst({
        where: eq(schema.workflows.id, errorData.workflowId),
        columns: { settings: true, userId: true, name: true },
      });

      if (!workflow) {
        logger.debug("Failed workflow not found in database");
        return;
      }

      const settings = workflow.settings as any;
      const errorWorkflowId = settings?.errorWorkflowId;

      if (!errorWorkflowId) {
        logger.debug(`No error workflow configured for workflow ${errorData.workflowId}`);
        return;
      }

      // Don't trigger if error workflow is the same as failed workflow (prevent infinite loop)
      if (errorWorkflowId === errorData.workflowId) {
        logger.warn("Error workflow is same as failed workflow - skipping to prevent infinite loop");
        return;
      }

      logger.info(`🔔 Firing error workflow: ${errorWorkflowId} for failed workflow: ${errorData.workflowId}`);

      await this.executeErrorWorkflow(errorWorkflowId, workflow.userId, errorData);
    } catch (error) {
      logger.error("Failed to fire error workflow:", error);
    }
  }

  /**
   * Execute an error workflow with the error data
   */
  private async executeErrorWorkflow(
    errorWorkflowId: string,
    userId: string,
    errorData: WorkflowErrorData
  ): Promise<void> {
    try {
      if (!this.executionService) {
        logger.error("ExecutionService not set - cannot fire error workflow");
        return;
      }

      // Get the error workflow
      const errorWorkflow = await db.query.workflows.findFirst({
        where: eq(schema.workflows.id, errorWorkflowId),
        columns: { id: true, active: true, nodes: true, userId: true, name: true },
      });

      if (!errorWorkflow) {
        logger.warn(`Error workflow ${errorWorkflowId} not found`);
        return;
      }

      if (!errorWorkflow.active) {
        logger.warn(`Error workflow ${errorWorkflowId} is not active`);
        return;
      }

      // Find the first trigger node in the error workflow
      const nodes = (errorWorkflow.nodes as any[]) || [];
      const triggerNode = nodes.find(
        (n) =>
          !n.disabled &&
          (n.type === "error-trigger" ||
            n.type === "manual-trigger" ||
            n.type?.includes("trigger"))
      );

      if (!triggerNode) {
        logger.warn(`No trigger node found in error workflow ${errorWorkflowId}`);
        return;
      }

      logger.info(`🚀 Executing error workflow "${errorWorkflow.name}"`, {
        errorWorkflowId,
        triggerNodeId: triggerNode.id,
        sourceWorkflowId: errorData.workflowId,
        sourceWorkflowName: errorData.workflowName,
      });

      // Execute the workflow with error data as trigger data
      const result = await this.executionService.executeWorkflow(
        errorWorkflowId,
        errorWorkflow.userId,
        errorData, // Pass error data as trigger data
        { saveToDatabase: true },
        triggerNode.id
      );

      if (result.success) {
        logger.info(`✅ Error workflow "${errorWorkflow.name}" executed successfully`);
      } else {
        logger.error(`❌ Error workflow "${errorWorkflow.name}" failed:`, result.error);
      }
    } catch (error) {
      logger.error(`Failed to execute error workflow ${errorWorkflowId}:`, error);
    }
  }

  // Keep these for API compatibility but they're no longer used
  async reload(): Promise<void> {
    // No-op - no longer tracking global triggers
  }

  getActiveCount(): number {
    return 0;
  }

  getActiveTriggers(): any[] {
    return [];
  }
}
