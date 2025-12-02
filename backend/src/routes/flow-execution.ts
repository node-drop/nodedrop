import { PrismaClient } from "@prisma/client";
import express, { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Start flow execution from a specific node
 * POST /api/flow-execution/start
 */
router.post(
  "/start",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { workflowId, startNodeId, triggerData } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!workflowId) {
      return res.status(400).json({ error: "Workflow ID is required" });
    }

    // Get workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { user: true },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // Check permissions
    if (workflow.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create execution record with flow execution fields
    const execution = await prisma.execution.create({
      data: {
        workflowId,
        triggerData: triggerData || {},
      },
    });

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
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    // Get execution
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    if (execution.workflow.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update execution status
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "CANCELLED",
        finishedAt: new Date(),
      },
    });

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
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    // Get execution
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    if (execution.workflow.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if execution can be paused
    if (execution.status !== "RUNNING") {
      return res
        .status(400)
        .json({ error: "Only running executions can be paused" });
    }

    // Update execution status to paused
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "PAUSED" as any,
      },
    });

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
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    // Get execution
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    if (execution.workflow.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if execution can be resumed
    if (execution.status === ("PAUSED" as any)) {
      // Update execution status back to running
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: "RUNNING",
        },
      });

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
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    if (execution.workflow.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
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
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { workflowId } = req.params;
    const { limit = "50", offset = "0" } = req.query;
    const userId = req.user!.id;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    if (workflow.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const executions = await prisma.execution.findMany({
      where: { workflowId },
      orderBy: { startedAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        triggerData: true,
      },
    });

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
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const activeExecutions = await prisma.execution.findMany({
      where: {
        workflow: { userId },
        status: "RUNNING",
        finishedAt: null,
      },
      include: {
        workflow: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    res.json({
      success: true,
      executions: activeExecutions.map((execution) => ({
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow.name,
        status: execution.status,
        startedAt: execution.startedAt,
      })),
    });
  })
);

export default router;
