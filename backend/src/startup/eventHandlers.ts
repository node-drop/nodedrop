/**
 * Event Handlers
 * 
 * Connects RealtimeExecutionEngine events to SocketService for WebSocket broadcasting
 */

import { ErrorTriggerService } from "../services/ErrorTriggerService";
import { RealtimeExecutionEngine } from "../services/execution/RealtimeExecutionEngine";
import { SocketService } from "../services/SocketService";
import { logger } from "../utils/logger";

/**
 * Register all execution event handlers
 */
export function registerExecutionEventHandlers(
  realtimeExecutionEngine: RealtimeExecutionEngine,
  socketService: SocketService,
  errorTriggerService: ErrorTriggerService
): void {
  realtimeExecutionEngine.on("execution-started", (data) => {
    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "started",
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("node-started", (data) => {
    logger.debug("🔵 [RealtimeEngine] node-started event received", {
      executionId: data.executionId,
      nodeId: data.nodeId,
      nodeName: data.nodeName,
      nodeType: data.nodeType,
    });

    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "node-started",
      nodeId: data.nodeId,
      data: { nodeName: data.nodeName, nodeType: data.nodeType },
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("node-completed", (data) => {
    logger.debug("🟢 [RealtimeEngine] node-completed event received", {
      executionId: data.executionId,
      nodeId: data.nodeId,
      nodeName: data.nodeName,
      nodeType: data.nodeType,
    });

    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "node-completed",
      nodeId: data.nodeId,
      data: {
        outputData: data.outputData,
        duration: data.duration,
        activeConnections: data.activeConnections,
      },
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("node-failed", (data) => {
    logger.debug("🔴 [RealtimeEngine] node-failed event received", {
      executionId: data.executionId,
      nodeId: data.nodeId,
      nodeName: data.nodeName,
      nodeType: data.nodeType,
      error: data.error,
    });

    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "node-failed",
      nodeId: data.nodeId,
      error: data.error,
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("node-paused", (data) => {
    logger.debug("⏸️ [RealtimeEngine] node-paused event received", {
      executionId: data.executionId,
      nodeId: data.nodeId,
      nodeName: data.nodeName,
      nodeType: data.nodeType,
      waitId: data.waitId,
      resumeUrl: data.resumeUrl,
    });

    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "node-paused",
      nodeId: data.nodeId,
      data: {
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        waitId: data.waitId,
        resumeUrl: data.resumeUrl,
        expiresAt: data.expiresAt?.toISOString(),
      },
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("execution-completed", (data) => {
    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "completed",
      data: { duration: data.duration },
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("execution-failed", async (data) => {
    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "failed",
      error: data.error,
      timestamp: data.timestamp,
    });

    // Fire error triggers for workflow failures
    try {
      await errorTriggerService.onWorkflowExecutionFailed({
        executionId: data.executionId,
        workflowId: data.workflowId || "",
        workflowName: data.workflowName || "Unknown Workflow",
        failedNodeId: data.failedNodeId,
        failedNodeName: data.failedNodeName,
        failedNodeType: data.failedNodeType,
        errorMessage: data.error?.message || "Unknown error",
        errorStack: data.error?.stack,
        errorTimestamp: data.timestamp?.toISOString() || new Date().toISOString(),
        executionStartedAt: data.executionStartedAt || new Date().toISOString(),
        executionMode: data.executionMode,
        userId: data.userId,
        errorContext: data.errorContext as Record<string, any> | undefined,
      });
    } catch (errorTriggerError: any) {
      logger.error("Failed to fire error triggers:", errorTriggerError);
    }
  });

  realtimeExecutionEngine.on("execution-cancelled", (data) => {
    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "cancelled",
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("execution-paused", (data) => {
    logger.info("⏸️ [RealtimeEngine] execution-paused event received", {
      executionId: data.executionId,
      workflowId: data.workflowId,
      pausedAtNodeId: data.pausedAtNodeId,
      waitId: data.waitId,
      resumeUrl: data.resumeUrl,
    });

    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "paused",
      data: {
        pausedAtNodeId: data.pausedAtNodeId,
        waitId: data.waitId,
        resumeUrl: data.resumeUrl,
      },
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("execution-resumed", (data) => {
    logger.info("▶️ [RealtimeEngine] execution-resumed event received", {
      executionId: data.executionId,
      workflowId: data.workflowId,
      nodeId: data.nodeId,
      waitId: data.waitId,
    });

    socketService.broadcastExecutionEvent(data.executionId, {
      executionId: data.executionId,
      type: "resumed",
      data: {
        nodeId: data.nodeId,
        waitId: data.waitId,
      },
      timestamp: data.timestamp,
    });
  });

  realtimeExecutionEngine.on("execution-log", (logEntry) => {
    logger.debug("📝 [RealtimeEngine] execution-log event received", {
      executionId: logEntry.executionId,
      nodeId: logEntry.nodeId,
      level: logEntry.level,
      message: logEntry.message,
    });

    socketService.broadcastExecutionLog(logEntry.executionId, logEntry);
  });
}
