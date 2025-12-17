import express, { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import {
    WorkspaceRequest,
    requireWorkspace,
} from "../middleware/workspace";
import { executionServiceDrizzle } from "../services/ExecutionService.factory";
import { workflowServiceDrizzle } from "../services/WorkflowService";

const router = express.Router();

/**
 * Start flow execution from a specific node
 * POST /api/flow-execution/start
 */
router.post(
  "/start",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, startNodeId, triggerData } = req.body;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    // Validate input
    if (!workflowId) {
      return res.status(400).json({ error: "Workflow ID is required" });
    }

    // Get workflow
    const workflow = await workflowServiceDrizzle.getWorkflow(workflowId, userId, { workspaceId });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // Create execution record with flow execution fields
    const execution = await executionServiceDrizzle.createExecution(
      workflowId,
      userId,
      "RUNNING",
      triggerData || {},
      undefined,
      workspaceId
    );

    res.json({
      success: true,
      executionId: execution.id,
      message: "Flow execution started successfully",
      startNodeId,
    });
  })
);

/**
 * Cancel flow execution
 * POST /api/flow-execution/:executionId/cancel
 */
router.post(
  "/:executionId/cancel",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    // Get execution
    const execution = await executionServiceDrizzle.getExecution(executionId, userId, { workspaceId });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    // Update execution status
    await executionServiceDrizzle.updateExecutionStatus(executionId, "CANCELLED", new Date());

    res.json({
      success: true,
      message: "Execution cancelled successfully",
    });
  })
);

/**
 * Pause flow execution
 * POST /api/flow-execution/:executionId/pause
 */
router.post(
  "/:executionId/pause",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    // Get execution
    const execution = await executionServiceDrizzle.getExecution(executionId, userId, { workspaceId });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    // Check if execution can be paused
    if (execution.status !== "RUNNING") {
      return res
        .status(400)
        .json({ error: "Only running executions can be paused" });
    }

    // Update execution status to paused
    await executionServiceDrizzle.updateExecutionStatus(executionId, "PAUSED");

    res.json({
      success: true,
      message: "Execution paused successfully",
    });
  })
);

/**
 * Resume flow execution
 * POST /api/flow-execution/:executionId/resume
 */
router.post(
  "/:executionId/resume",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    // Get execution
    const execution = await executionServiceDrizzle.getExecution(executionId, userId, { workspaceId });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    // Check if execution can be resumed
    if (execution.status === "PAUSED") {
      // Update execution status back to running
      await executionServiceDrizzle.updateExecutionStatus(executionId, "RUNNING");

      res.json({
        success: true,
        message: "Execution resumed successfully",
      });
    } else {
      res.status(400).json({ error: "Only paused executions can be resumed" });
    }
  })
);

/**
 * Get execution status and progress
 * GET /api/flow-execution/:executionId/status
 */
router.get(
  "/:executionId/status",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    const execution = await executionServiceDrizzle.getExecution(executionId, userId, { workspaceId });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    res.json({
      success: true,
      execution: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        triggerData: execution.triggerData,
        error: execution.error,
      },
    });
  })
);

/**
 * Get execution history for a workflow
 * GET /api/flow-execution/history/:workflowId
 */
router.get(
  "/history/:workflowId",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const { limit = "50", offset = "0" } = req.query;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    const workflow = await workflowServiceDrizzle.getWorkflow(workflowId, userId, { workspaceId });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const result = await executionServiceDrizzle.listExecutions(userId, {
      workflowId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    }, { workspaceId });

    const executions = result.executions || [];

    res.json({
      success: true,
      executions,
      total: executions.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

/**
 * Get active executions for a user
 * GET /api/flow-execution/active
 */
router.get(
  "/active",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    const result = await executionServiceDrizzle.listExecutions(userId, {
      status: "RUNNING",
    }, { workspaceId });

    const activeExecutions = result.executions || [];

    res.json({
      success: true,
      executions: activeExecutions.map((execution: any) => ({
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflowName || execution.workflow?.name,
        status: execution.status,
        startedAt: execution.startedAt,
      })),
    });
  })
);

export default router;
