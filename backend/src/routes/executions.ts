// @ts-nocheck
import { Response, Router } from "express";
import { requireAuth } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { validateParams, validateQuery } from "../middleware/validation";
import {
    WorkspaceRequest,
    requireWorkspace,
} from "../middleware/workspace";
import { executionServiceDrizzle } from "../services/execution/ExecutionService.factory";
import ExecutionHistoryService from "../services/execution/ExecutionHistoryService";
import { workflowService } from "../services/WorkflowService";
import { ApiResponse, ExecutionQuerySchema, IdParamSchema, ScheduledExecutionsQuerySchema } from "../types/api";
import { logger } from "../utils/logger";

const router = Router();
// Use lazy initialization to get services when needed
let localNodeService: any = null;

const getNodeService = () => {
  if (!global.nodeService) {
    logger.warn("Global NodeService not available, creating local instance", {
      globalNodeService: typeof global.nodeService,
      globalKeys: Object.keys(global),
    });

    // Create a local instance as fallback
    if (!localNodeService) {
      const { NodeService } = require("../services/NodeService");
      localNodeService = new NodeService(null);
      logger.info("Created local NodeService instance as fallback");
    }
    return localNodeService;
  }
  return global.nodeService;
};

let executionHistoryService: ExecutionHistoryService;

const getExecutionService = () => {
  return executionServiceDrizzle;
};

// POST /api/executions - Execute a workflow or single node
router.post(
  "/",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const {
      workflowId,
      triggerData,
      options,
      triggerNodeId,
      workflowData,
      nodeId,
      inputData,
      parameters,
      mode = "workflow",
    } = req.body;
    const workspaceId = req.workspace?.workspaceId;

    if (!workflowId) {
      throw new AppError("Workflow ID is required", 400, "MISSING_WORKFLOW_ID");
    }

    let result;

    // Handle single node execution if nodeId is provided
    if (nodeId) {
      if (!["single", "workflow"].includes(mode)) {
        throw new AppError(
          "Mode must be 'single' or 'workflow'",
          400,
          "INVALID_MODE"
        );
      }

      result = await getExecutionService().executeSingleNode(
        workflowId,
        nodeId,
        req.user!.id,
        inputData,
        parameters,
        mode,
        workflowData // Pass the optional workflow data
      );
    } else {
      // Handle regular workflow execution
      result = await getExecutionService().executeWorkflow(
        workflowId,
        req.user!.id,
        triggerData,
        options,
        triggerNodeId, // Pass the specific trigger node ID
        workflowData // Pass the optional workflow data
      );
    }

    // Always return success for started executions, but include failure details
    const response: ApiResponse = {
      success: true,
      data: result.data,
      // Include error/warning details if some nodes failed
      ...(result.error && {
        warnings: [
          {
            type: "NODE_FAILURES",
            message: result.error.message,
            details: result.error,
          },
        ],
      }),
    };

    res.status(201).json(response);
  })
);

// GET /api/executions/scheduled - Get upcoming scheduled executions
router.get(
  "/scheduled",
  requireAuth,
  requireWorkspace,
  validateQuery(ScheduledExecutionsQuerySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { limit, workflowId } = req.query as unknown as { limit: number; workflowId?: string };
    const workspaceId = req.workspace?.workspaceId;

    // Import WorkflowService
    const { workflowService } = await import("../services/WorkflowService");

    let workflows: any[] = [];

    if (workflowId) {
      // Get specific workflow
      const workflow = await workflowService.getWorkflow(
        workflowId,
        req.user!.id,
        { workspaceId }
      );
      workflows = [workflow];
    } else {
      // Get all workflows (not just active ones) with schedule triggers
      const result = await workflowService.listWorkflows(req.user!.id, {}, { workspaceId });
      const allWorkflows = result.workflows || [];

      logger.info(`Found ${allWorkflows.length} workflows for user ${req.user!.id}`);

      // Filter workflows that have active schedule triggers
      workflows = allWorkflows.filter((w) => {
        const triggers = (w.triggers as any[]) || [];
        const hasScheduleTrigger = triggers.some((t) => {
          // If active is undefined, treat as true (for backwards compatibility)
          const isActive = t.active !== undefined ? t.active : true;
          return t.type === "schedule" && isActive;
        });
        if (hasScheduleTrigger) {
          logger.info(`Workflow ${w.id} (${w.name}) has active schedule triggers`);
        }
        return hasScheduleTrigger;
      });

      logger.info(`Filtered to ${workflows.length} workflows with active schedule triggers`);
    }

    // Get upcoming executions for each workflow
    const scheduledExecutions = await Promise.all(
      workflows.map(async (workflow) => {
        try {
          return await workflowService.getUpcomingExecutions(workflow, limit);
        } catch (error) {
          logger.error(
            `Error getting upcoming executions for workflow ${workflow.id}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out null results and flatten
    const validExecutions = scheduledExecutions.filter((e) => e !== null);

    logger.info(`Returning ${validExecutions.length} workflows with scheduled executions`);

    const response: ApiResponse = {
      success: true,
      data: {
        totalWorkflows: validExecutions.length,
        scheduledExecutions: validExecutions,
      },
    };

    res.json(response);
  })
);

// GET /api/executions - List executions
router.get(
  "/",
  requireAuth,
  requireWorkspace,
  validateQuery(ExecutionQuerySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const {
      page = 1,
      limit = 10,
      workflowId,
      status,
      startedAfter,
      startedBefore,
    } = req.query as any;
    const offset = (page - 1) * limit;
    const workspaceId = req.workspace?.workspaceId;

    const filters = {
      workflowId,
      status,
      startDate: startedAfter ? new Date(startedAfter) : undefined,
      endDate: startedBefore ? new Date(startedBefore) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset.toString()),
    };

    const result = await getExecutionService().listExecutions(
      req.user!.id,
      filters,
      { workspaceId }
    );

    const response: ApiResponse = {
      success: true,
      data: result.executions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };

    res.json(response);
  })
);

// GET /api/executions/:id - Get execution by ID
router.get(
  "/:id",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const execution = await getExecutionService().getExecution(
      req.params.id,
      req.user!.id,
      { workspaceId }
    );

    if (!execution) {
      throw new AppError("Execution not found", 404, "EXECUTION_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: execution,
    };

    res.json(response);
  })
);

// GET /api/executions/:id/progress - Get execution progress
router.get(
  "/:id/progress",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const progress = await getExecutionService().getExecutionProgress(
      req.params.id,
      req.user!.id
    );

    if (!progress) {
      throw new AppError("Execution not found", 404, "EXECUTION_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: progress,
    };

    res.json(response);
  })
);

// DELETE /api/executions/:id - Delete execution
router.delete(
  "/:id",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const result = await getExecutionService().deleteExecution(
      req.params.id,
      req.user!.id
    );

    if (!result.success) {
      const errorMessage =
        result.error?.message || "Failed to delete execution";
      const statusCode = errorMessage.includes("not found") ? 404 : 400;
      throw new AppError(errorMessage, statusCode, "EXECUTION_DELETE_FAILED");
    }

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.json(response);
  })
);

// POST /api/executions/:id/cancel - Cancel execution
router.post(
  "/:id/cancel",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const result = await getExecutionService().cancelExecution(
      req.params.id,
      req.user!.id
    );

    if (!result.success) {
      const errorMessage =
        result.error?.message || "Failed to cancel execution";
      const statusCode = errorMessage.includes("not found") ? 404 : 400;
      throw new AppError(errorMessage, statusCode, "EXECUTION_CANCEL_FAILED");
    }

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.json(response);
  })
);

// POST /api/executions/:id/retry - Retry execution
router.post(
  "/:id/retry",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const result = await getExecutionService().retryExecution(
      req.params.id,
      req.user!.id
    );

    if (!result.success) {
      const errorMessage = result.error?.message || "Failed to retry execution";
      const statusCode = errorMessage.includes("not found") ? 404 : 400;
      throw new AppError(errorMessage, statusCode, "EXECUTION_RETRY_FAILED");
    }

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.status(201).json(response);
  })
);

// GET /api/executions/stats - Get execution statistics
router.get(
  "/stats",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const stats = await getExecutionService().getExecutionStats(req.user!.id, { workspaceId });

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  })
);

// GET /api/executions/realtime/info - Get real-time monitoring info
router.get(
  "/realtime/info",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const socketService = global.socketService;

    const response: ApiResponse = {
      success: true,
      data: {
        websocketUrl: `ws://localhost:${process.env.PORT || 4000}`,
        connectedUsers: socketService
          ? socketService.getConnectedUsersCount()
          : 0,
        supportedEvents: [
          "execution-event",
          "execution-progress",
          "execution-log",
          "node-execution-event",
          "execution-status",
        ],
        subscriptionEvents: [
          "subscribe-execution",
          "unsubscribe-execution",
          "subscribe-workflow",
          "unsubscribe-workflow",
        ],
      },
    };

    res.json(response);
  })
);

// GET /api/executions/:id/subscribers - Get execution subscribers count
router.get(
  "/:id/subscribers",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const socketService = global.socketService;
    const subscribersCount = socketService
      ? socketService.getExecutionSubscribersCount(req.params.id)
      : 0;

    const response: ApiResponse = {
      success: true,
      data: {
        executionId: req.params.id,
        subscribersCount,
      },
    };

    res.json(response);
  })
);

// GET /api/executions/queue/failed - Get failed jobs from the queue
router.get(
  "/queue/failed",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { start = 0, limit = 10 } = req.query as any;
    const startIndex = parseInt(start.toString(), 10);
    const endIndex = startIndex + parseInt(limit.toString(), 10);

    const result = await getExecutionService().getFailedJobs(startIndex, endIndex);

    if (!result) {
      const response: ApiResponse = {
        success: true,
        data: {
          jobs: [],
          total: 0,
          message: "Queue service not available",
        },
      };
      return res.json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      pagination: {
        start: startIndex,
        limit: parseInt(limit.toString(), 10),
        total: result.total,
      },
    };

    res.json(response);
  })
);

// POST /api/executions/queue/failed/:id/retry - Retry a failed job
router.post(
  "/queue/failed/:id/retry",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const result = await getExecutionService().retryFailedJob(
      req.params.id,
      req.user!.id
    );

    if (!result.success) {
      const errorMessage = result.error?.message || "Failed to retry job";
      const statusCode = errorMessage.includes("not found") ? 404 : 400;
      throw new AppError(errorMessage, statusCode, "RETRY_FAILED_JOB_ERROR");
    }

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };

    res.status(201).json(response);
  })
);

// GET /api/executions/queue/stats - Get queue statistics
router.get(
  "/queue/stats",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const stats = await getExecutionService().getQueueStats();

    const response: ApiResponse = {
      success: true,
      data: stats || {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        message: "Queue service not available",
      },
    };

    res.json(response);
  })
);

export { router as executionRoutes };


