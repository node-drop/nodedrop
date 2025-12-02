import { PrismaClient } from "@prisma/client";
import express, { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";
import ExecutionHistoryService, {
  ExecutionHistoryQuery,
} from "../services/ExecutionHistoryService";

const router = express.Router();
const prisma = new PrismaClient();
const historyService = new ExecutionHistoryService(prisma);

/**
 * Query execution history with filtering
 * GET /api/execution-history
 */
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      workflowId,
      status,
      executionType,
      startDate,
      endDate,
      limit = "50",
      offset = "0",
      sortBy = "startedAt",
      sortOrder = "desc",
    } = req.query;

    try {
      const query: ExecutionHistoryQuery = {
        userId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      };

      if (workflowId) {
        query.workflowId = workflowId as string;
      }

      if (status) {
        query.status = (status as string).split(",");
      }

      if (executionType) {
        query.executionType = (executionType as string).split(",");
      }

      if (startDate && endDate) {
        query.dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        };
      }

      const result = await historyService.queryExecutionHistory(query);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Error querying execution history:", error);
      res.status(500).json({
        error: "Failed to query execution history",
        details: error.message,
      });
    }
  })
);

/**
 * Get execution analytics for a user or workflow
 * GET /api/execution-history/analytics
 */
router.get(
  "/analytics",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { workflowId, startDate, endDate } = req.query;

    try {
      const timeRange =
        startDate && endDate
          ? {
              startDate: new Date(startDate as string),
              endDate: new Date(endDate as string),
            }
          : undefined;

      const analytics = await historyService.getExecutionAnalytics(
        userId,
        workflowId as string,
        timeRange
      );

      res.json({
        success: true,
        analytics,
      });
    } catch (error: any) {
      console.error("Error getting execution analytics:", error);
      res.status(500).json({
        error: "Failed to get execution analytics",
        details: error.message,
      });
    }
  })
);

/**
 * Get detailed debug information for an execution
 * GET /api/execution-history/:executionId/debug
 */
router.get(
  "/:executionId/debug",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    try {
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

      const debugInfo = await historyService.getExecutionDebugInfo(executionId);

      if (!debugInfo) {
        return res.status(404).json({ error: "Debug information not found" });
      }

      res.json({
        success: true,
        debugInfo,
      });
    } catch (error: any) {
      console.error("Error getting debug information:", error);
      res.status(500).json({
        error: "Failed to get debug information",
        details: error.message,
      });
    }
  })
);

/**
 * Get execution logs
 * GET /api/execution-history/:executionId/logs
 */
router.get(
  "/:executionId/logs",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const { level, nodeId } = req.query;
    const userId = req.user!.id;

    try {
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

      const logs = historyService.getExecutionLogs(
        executionId,
        level as any,
        nodeId as string
      );

      res.json({
        success: true,
        logs,
        count: logs.length,
      });
    } catch (error: any) {
      console.error("Error getting execution logs:", error);
      res.status(500).json({
        error: "Failed to get execution logs",
        details: error.message,
      });
    }
  })
);

/**
 * Export execution data for debugging
 * GET /api/execution-history/:executionId/export
 */
router.get(
  "/:executionId/export",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    try {
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

      const exportData = await historyService.exportExecutionData(executionId);

      // Set headers for file download
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="execution-${executionId}-debug.json"`
      );

      res.json(exportData);
    } catch (error: any) {
      console.error("Error exporting execution data:", error);
      res.status(500).json({
        error: "Failed to export execution data",
        details: error.message,
      });
    }
  })
);

/**
 * Search executions by error pattern
 * GET /api/execution-history/search/errors
 */
router.get(
  "/search/errors",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { pattern, limit = "50" } = req.query;

    if (!pattern) {
      return res.status(400).json({ error: "Error pattern is required" });
    }

    try {
      const executions = await historyService.searchExecutionsByError(
        pattern as string,
        userId,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        executions,
        count: executions.length,
        pattern,
      });
    } catch (error: any) {
      console.error("Error searching executions by error:", error);
      res.status(500).json({
        error: "Failed to search executions by error",
        details: error.message,
      });
    }
  })
);

/**
 * Add execution log entry (for debugging/testing)
 * POST /api/execution-history/:executionId/logs
 */
router.post(
  "/:executionId/logs",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const { level, message, nodeId, metadata } = req.body;
    const userId = req.user!.id;

    if (!level || !message) {
      return res.status(400).json({ error: "level and message are required" });
    }

    try {
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

      historyService.addExecutionLog(
        executionId,
        level,
        message,
        nodeId,
        metadata,
        "user"
      );

      res.json({
        success: true,
        message: "Log entry added successfully",
      });
    } catch (error: any) {
      console.error("Error adding log entry:", error);
      res.status(500).json({
        error: "Failed to add log entry",
        details: error.message,
      });
    }
  })
);

/**
 * Clear execution logs
 * DELETE /api/execution-history/:executionId/logs
 */
router.delete(
  "/:executionId/logs",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { executionId } = req.params;
    const userId = req.user!.id;

    try {
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

      historyService.clearExecutionLogs(executionId);

      res.json({
        success: true,
        message: "Execution logs cleared successfully",
      });
    } catch (error: any) {
      console.error("Error clearing logs:", error);
      res.status(500).json({
        error: "Failed to clear logs",
        details: error.message,
      });
    }
  })
);

export default router;
