// @ts-nocheck
import { Request, Response, Router } from "express";
import { body, param, validationResult } from "express-validator";
import { createServer } from "http";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { validateQuery } from "../middleware/validation";
import {
    WorkspaceRequest,
    requireWorkspace,
} from "../middleware/workspace";
import { db } from "../db/client";
import { getCredentialService } from "../services/CredentialService.factory";
import ExecutionHistoryService from "../services/execution/ExecutionHistoryService";
import { executionServiceDrizzle } from "../services/execution/ExecutionService.factory";
import { SocketService } from "../services/SocketService";
import { TriggerService } from "../services/TriggerService";
import { workflowService } from "../services/WorkflowService";
import { TriggerEventsQuerySchema } from "../types/api";

const router = Router();

// Use lazy initialization to get services when needed
const getNodeService = () => {
  if (!global.nodeService) {
    throw new Error(
      "NodeService not initialized. Make sure the server is properly started."
    );
  }
  return global.nodeService;
};

// Initialize non-dependent services immediately
const executionHistoryService = new ExecutionHistoryService();
const credentialService = getCredentialService();
const httpServer = createServer();
const socketService = new SocketService(httpServer);
let triggerService: TriggerService;

const getExecutionService = () => {
  return executionServiceDrizzle;
};

const getTriggerService = () => {
  if (!triggerService) {
    triggerService = new TriggerService(
      db,
      workflowService,
      getExecutionService(),
      socketService,
      getNodeService(),
      executionHistoryService,
      credentialService
    );
    // Initialize trigger service when first accessed
    triggerService.initialize().catch(console.error);
  }
  return triggerService;
};

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 400, "VALIDATION_ERROR");
  }
  next();
};

// Create trigger
router.post(
  "/workflows/:workflowId/triggers",
  requireAuth,
  requireWorkspace,
  [
    param("workflowId").isUUID().withMessage("Invalid workflow ID"),
    body("type")
      .isIn(["webhook", "schedule", "manual"])
      .withMessage("Invalid trigger type"),
    body("nodeId").isString().notEmpty().withMessage("Node ID is required"),
    body("settings").isObject().withMessage("Settings must be an object"),
    body("active")
      .optional()
      .isBoolean()
      .withMessage("Active must be a boolean"),
  ],
  validateRequest,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const userId = req.user!.id;
    const triggerData = req.body;
    const workspaceId = req.workspace?.workspaceId;

    const trigger = await getTriggerService().createTrigger(
      workflowId,
      userId,
      {
        ...triggerData,
        workflowId,
        active: triggerData.active ?? true,
      },
      { workspaceId }
    );

    res.status(201).json({
      success: true,
      data: trigger,
    });
  })
);

// Update trigger
router.put(
  "/workflows/:workflowId/triggers/:triggerId",
  requireAuth,
  requireWorkspace,
  [
    param("workflowId").isUUID().withMessage("Invalid workflow ID"),
    param("triggerId").isUUID().withMessage("Invalid trigger ID"),
    body("type")
      .optional()
      .isIn(["webhook", "schedule", "manual"])
      .withMessage("Invalid trigger type"),
    body("nodeId")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("Node ID must be a string"),
    body("settings")
      .optional()
      .isObject()
      .withMessage("Settings must be an object"),
    body("active")
      .optional()
      .isBoolean()
      .withMessage("Active must be a boolean"),
  ],
  validateRequest,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, triggerId } = req.params;
    const userId = req.user!.id;
    const updates = req.body;
    const workspaceId = req.workspace?.workspaceId;

    const trigger = await getTriggerService().updateTrigger(
      workflowId,
      triggerId,
      userId,
      updates,
      { workspaceId }
    );

    res.json({
      success: true,
      data: trigger,
    });
  })
);

// Delete trigger
router.delete(
  "/workflows/:workflowId/triggers/:triggerId",
  requireAuth,
  requireWorkspace,
  [
    param("workflowId").isUUID().withMessage("Invalid workflow ID"),
    param("triggerId").isUUID().withMessage("Invalid trigger ID"),
  ],
  validateRequest,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, triggerId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    await getTriggerService().deleteTrigger(workflowId, triggerId, userId, { workspaceId });

    res.json({
      success: true,
      message: "Trigger deleted successfully",
    });
  })
);

// Execute manual trigger
router.post(
  "/workflows/:workflowId/triggers/:triggerId/execute",
  requireAuth,
  requireWorkspace,
  [
    param("workflowId").isUUID().withMessage("Invalid workflow ID"),
    param("triggerId").isUUID().withMessage("Invalid trigger ID"),
    body("data").optional().isObject().withMessage("Data must be an object"),
  ],
  validateRequest,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, triggerId } = req.params;
    const userId = req.user!.id;
    const { data } = req.body;
    const workspaceId = req.workspace?.workspaceId;

    const result = await getTriggerService().handleManualTrigger(
      workflowId,
      triggerId,
      userId,
      data,
      { workspaceId }
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          executionId: result.executionId,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  })
);

// Get trigger events
router.get(
  "/workflows/:workflowId/triggers/events",
  requireAuth,
  requireWorkspace,
  [param("workflowId").isUUID().withMessage("Invalid workflow ID")],
  validateRequest,
  validateQuery(TriggerEventsQuerySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;
    const { type, status, limit, offset } = req.query as unknown as {
      type?: string;
      status?: string;
      limit: number;
      offset: number;
    };
    const filters = { type, status, limit, offset };

    const events = await getTriggerService().getTriggerEvents(
      workflowId,
      userId,
      filters,
      { workspaceId }
    );

    res.json({
      success: true,
      data: events,
    });
  })
);

// Get trigger statistics
router.get(
  "/workflows/:workflowId/triggers/stats",
  requireAuth,
  requireWorkspace,
  [param("workflowId").isUUID().withMessage("Invalid workflow ID")],
  validateRequest,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    const stats = await getTriggerService().getTriggerStats(workflowId, userId, { workspaceId });

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get all active triggers (schedule + polling) for user
router.get(
  "/active-triggers",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    const triggers = await getTriggerService().getAllActiveTriggers(userId, { workspaceId });

    res.json({
      success: true,
      data: {
        triggers,
      },
    });
  })
);

// Delete an active trigger (schedule or polling)
router.delete(
  "/active-triggers/:triggerId",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { triggerId } = req.params;
    const userId = req.user!.id;
    const workspaceId = req.workspace?.workspaceId;

    // Get the trigger to verify ownership
    const triggers = await getTriggerService().getAllActiveTriggers(userId, { workspaceId });
    const trigger = triggers.find(t => t.triggerId === triggerId || t.id === triggerId);

    if (!trigger) {
      throw new AppError("Trigger not found", 404, "TRIGGER_NOT_FOUND");
    }

    // Delete based on type
    if (trigger.type === 'polling') {
      // Deactivate polling trigger
      await getTriggerService().deactivateTrigger(triggerId);
    }

    // Delete from database (works for both types)
    const jobId = `${trigger.workflowId}-${trigger.triggerId}`;
    await global.scheduleJobManager.removeScheduleJob(jobId);

    res.json({
      success: true,
      message: "Trigger deleted successfully",
    });
  })
);

// Webhook endpoint - handles incoming webhook requests
router.all(
  "/webhooks/:webhookId",
  asyncHandler(async (req: Request, res: Response) => {
    const { webhookId } = req.params;

    const webhookRequest = {
      method: req.method,
      path: req.path,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, any>,
      body: req.body,
      ip: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent"),
    };

    const result = await getTriggerService().handleWebhookTrigger(
      webhookId,
      webhookRequest
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Webhook processed successfully",
        executionId: result.executionId,
      });
    } else {
      const statusCode = result.error?.includes("not found")
        ? 404
        : result.error?.includes("authentication")
        ? 401
        : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
      });
    }
  })
);

// Test webhook endpoint - for testing webhook configuration
router.post(
  "/webhooks/:webhookId/test",
  asyncHandler(async (req: Request, res: Response) => {
    const { webhookId } = req.params;

    const testRequest = {
      method: "POST",
      path: req.path,
      headers: { "content-type": "application/json", ...(req.headers as any) },
      query: req.query as Record<string, any>,
      body: req.body || { test: true, timestamp: new Date().toISOString() },
      ip: req.ip || "test",
      userAgent: "Webhook Test",
    };

    const result = await getTriggerService().handleWebhookTrigger(
      webhookId,
      testRequest
    );

    res.json({
      success: result.success,
      message: result.success
        ? "Webhook test successful"
        : "Webhook test failed",
      error: result.error,
      executionId: result.executionId,
    });
  })
);

export default router;



