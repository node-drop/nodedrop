import { PrismaClient } from "@prisma/client";
import express, { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";
import {
  ExecutionTimeoutManager,
  ManualInterventionResponse,
} from "../services/ExecutionTimeoutManager";
import { SocketService } from "../services/SocketService";

const router = express.Router();
const prisma = new PrismaClient();

// Initialize timeout manager (will be enhanced with proper dependency injection)
const socketService = new SocketService(null as any); // Placeholder
const timeoutManager = new ExecutionTimeoutManager(prisma, socketService);

/**
 * Get pending manual interventions for user
 * GET /api/execution-control/interventions
 */
router.get(
  "/interventions",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    try {
      const pendingInterventions = await timeoutManager.getPendingInterventions(
        userId
      );

      res.json({
        success: true,
        interventions: pendingInterventions,
        count: pendingInterventions.length,
      });
    } catch (error: any) {
      console.error("Error fetching pending interventions:", error);
      res.status(500).json({
        error: "Failed to fetch pending interventions",
        details: error.message,
      });
    }
  })
);

/**
 * Respond to manual intervention
 * POST /api/execution-control/interventions/:interventionId/respond
 */
router.post(
  "/interventions/:interventionId/respond",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { interventionId } = req.params;
    const { approved, input, choice } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (typeof approved !== "boolean") {
      return res
        .status(400)
        .json({ error: "approved field is required and must be boolean" });
    }

    try {
      const response: ManualInterventionResponse = {
        approved,
        input,
        choice,
        userId,
        respondedAt: Date.now(),
      };

      const result = await timeoutManager.respondToIntervention(
        interventionId,
        response
      );

      res.json({
        success: true,
        approved: result,
        message: result
          ? "Intervention approved and execution resumed"
          : "Intervention denied and execution cancelled",
      });
    } catch (error: any) {
      console.error("Error responding to intervention:", error);
      res.status(500).json({
        error: "Failed to respond to intervention",
        details: error.message,
      });
    }
  })
);

/**
 * Extend execution timeout
 * POST /api/execution-control/:executionId/extend-timeout
 */
router.post(
  "/:executionId/extend-timeout",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const { additionalMinutes = 30 } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (typeof additionalMinutes !== "number" || additionalMinutes <= 0) {
      return res
        .status(400)
        .json({ error: "additionalMinutes must be a positive number" });
    }

    // Check if execution belongs to user
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

    try {
      const additionalMs = additionalMinutes * 60 * 1000;
      const result = timeoutManager.extendExecutionTimeout(
        executionId,
        additionalMs
      );

      if (result) {
        res.json({
          success: true,
          message: `Execution timeout extended by ${additionalMinutes} minutes`,
          additionalTime: additionalMs,
        });
      } else {
        res.status(404).json({
          error: "No active timeout found for this execution",
        });
      }
    } catch (error: any) {
      console.error("Error extending timeout:", error);
      res.status(500).json({
        error: "Failed to extend timeout",
        details: error.message,
      });
    }
  })
);

/**
 * Get execution timeout status
 * GET /api/execution-control/:executionId/timeout-status
 */
router.get(
  "/:executionId/timeout-status",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    // Check if execution belongs to user
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

    try {
      const timeoutStatus =
        timeoutManager.getExecutionTimeoutStatus(executionId);

      if (timeoutStatus) {
        const now = Date.now();
        const elapsed = now - timeoutStatus.startTime;
        const remaining = Math.max(0, timeoutStatus.timeoutMs - elapsed);

        res.json({
          success: true,
          timeoutStatus: {
            ...timeoutStatus,
            elapsedTime: elapsed,
            remainingTime: remaining,
            percentComplete: (elapsed / timeoutStatus.timeoutMs) * 100,
          },
        });
      } else {
        res.json({
          success: true,
          timeoutStatus: null,
          message: "No active timeout for this execution",
        });
      }
    } catch (error: any) {
      console.error("Error getting timeout status:", error);
      res.status(500).json({
        error: "Failed to get timeout status",
        details: error.message,
      });
    }
  })
);

/**
 * Force cancel execution
 * POST /api/execution-control/:executionId/force-cancel
 */
router.post(
  "/:executionId/force-cancel",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const { reason = "Manual cancellation" } = req.body;
    const userId = req.user!.id;

    // Check if execution belongs to user
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

    try {
      // Update execution to cancelled status
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: "CANCELLED",
          finishedAt: new Date(),
          error: {
            type: "force_cancel",
            reason,
            timestamp: new Date().toISOString(),
            cancelledBy: userId,
          },
        },
      });

      // Clear any active timeouts
      timeoutManager.clearExecutionTimeout(executionId);

      res.json({
        success: true,
        message: "Execution force cancelled successfully",
      });
    } catch (error: any) {
      console.error("Error force cancelling execution:", error);
      res.status(500).json({
        error: "Failed to force cancel execution",
        details: error.message,
      });
    }
  })
);

/**
 * Request manual intervention for a specific execution
 * POST /api/execution-control/:executionId/request-intervention
 */
router.post(
  "/:executionId/request-intervention",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const { nodeId, type, message, options, timeout, requiredRole, metadata } =
      req.body;
    const userId = req.user!.id;

    // Validate input
    if (!nodeId || !type || !message) {
      return res
        .status(400)
        .json({ error: "nodeId, type, and message are required" });
    }

    if (!["approval", "input", "choice"].includes(type)) {
      return res
        .status(400)
        .json({ error: "type must be one of: approval, input, choice" });
    }

    // Check if execution belongs to user
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

    try {
      const interventionId = await timeoutManager.requestManualIntervention(
        executionId,
        nodeId,
        {
          type,
          message,
          options,
          timeout,
          requiredRole,
          metadata,
        }
      );

      res.json({
        success: true,
        interventionId,
        message: "Manual intervention requested successfully",
      });
    } catch (error: any) {
      console.error("Error requesting manual intervention:", error);
      res.status(500).json({
        error: "Failed to request manual intervention",
        details: error.message,
      });
    }
  })
);

export default router;
