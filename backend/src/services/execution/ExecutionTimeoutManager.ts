import { db } from "../../config/database";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { EventEmitter } from "events";
import { SocketService } from "../SocketService";

export interface TimeoutConfig {
  executionTimeoutMs: number;
  nodeTimeoutMs: number;
  manualInterventionTimeoutMs: number;
  enableTimeouts: boolean;
}

export interface ExecutionTimeoutData {
  executionId: string;
  workflowId: string;
  startTime: number;
  lastActivity: number;
  timeoutMs: number;
  warningThreshold: number;
  status: "active" | "warning" | "timeout";
}

export interface ManualInterventionRequest {
  executionId: string;
  nodeId: string;
  type: "approval" | "input" | "choice";
  message: string;
  options?: string[];
  timeout?: number;
  requiredRole?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  expiresAt?: number;
}

export interface ManualInterventionResponse {
  approved: boolean;
  input?: string;
  choice?: string;
  userId: string;
  respondedAt: number;
}

/**
 * Comprehensive timeout management and manual intervention system for flow executions
 */
export class ExecutionTimeoutManager extends EventEmitter {
  private socketService: SocketService;
  private config: TimeoutConfig;
  private activeTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private executionTracking: Map<string, ExecutionTimeoutData> = new Map();
  private pendingInterventions: Map<string, ManualInterventionRequest> =
    new Map();
  private interventionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private warningTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    socketService: SocketService,
    config: TimeoutConfig = {
      executionTimeoutMs: 30 * 60 * 1000, // 30 minutes
      nodeTimeoutMs: 5 * 60 * 1000, // 5 minutes
      manualInterventionTimeoutMs: 60 * 60 * 1000, // 1 hour
      enableTimeouts: true,
    }
  ) {
    super();
    this.socketService = socketService;
    this.config = config;
  }

  /**
   * Start tracking timeout for an execution
   */
  startExecutionTimeout(
    executionId: string,
    workflowId: string,
    customTimeoutMs?: number
  ): void {
    if (!this.config.enableTimeouts) return;

    const timeoutMs = customTimeoutMs || this.config.executionTimeoutMs;
    const now = Date.now();
    const warningThreshold = timeoutMs * 0.8; // Warning at 80% of timeout

    const timeoutData: ExecutionTimeoutData = {
      executionId,
      workflowId,
      startTime: now,
      lastActivity: now,
      timeoutMs,
      warningThreshold,
      status: "active",
    };

    this.executionTracking.set(executionId, timeoutData);

    // Set warning timeout
    const warningTimeout = setTimeout(() => {
      this.handleTimeoutWarning(executionId);
    }, warningThreshold);
    this.warningTimeouts.set(executionId, warningTimeout);

    // Set main timeout
    const mainTimeout = setTimeout(() => {
      this.handleExecutionTimeout(executionId);
    }, timeoutMs);
    this.activeTimeouts.set(executionId, mainTimeout);

    this.emit("timeoutStarted", { executionId, timeoutMs, warningThreshold });
  }

  /**
   * Update last activity time for an execution
   */
  updateActivity(executionId: string): void {
    const timeoutData = this.executionTracking.get(executionId);
    if (timeoutData) {
      timeoutData.lastActivity = Date.now();
      timeoutData.status = "active";
      this.executionTracking.set(executionId, timeoutData);
    }
  }

  /**
   * Handle timeout warning (80% of timeout reached)
   */
  private async handleTimeoutWarning(executionId: string): Promise<void> {
    const timeoutData = this.executionTracking.get(executionId);
    if (!timeoutData) return;

    timeoutData.status = "warning";
    this.executionTracking.set(executionId, timeoutData);

    // Get execution details
    const execution = await db.query.executions.findFirst({
      where: eq(schema.executions.id, executionId),
      with: { workflow: { with: { user: true } } },
    });

    if (execution) {
      // Broadcast warning to user
      this.socketService.emitToUser(
        execution.workflow.userId,
        "executionTimeoutWarning",
        {
          executionId,
          workflowId: execution.workflowId,
          workflowName: execution.workflow.name,
          remainingTime:
            timeoutData.timeoutMs - (Date.now() - timeoutData.startTime),
          warningThreshold: timeoutData.warningThreshold,
        }
      );

      this.emit("timeoutWarning", { executionId, timeoutData, execution });
    }
  }

  /**
   * Handle execution timeout
   */
  private async handleExecutionTimeout(executionId: string): Promise<void> {
    const timeoutData = this.executionTracking.get(executionId);
    if (!timeoutData) return;

    timeoutData.status = "timeout";
    this.executionTracking.set(executionId, timeoutData);

    try {
      // Update execution status in database
      await db
        .update(schema.executions)
        .set({
          status: "TIMEOUT",
          finishedAt: new Date(),
          error: {
            type: "timeout",
            message: `Execution timed out after ${timeoutData.timeoutMs}ms`,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - timeoutData.startTime,
          },
        })
        .where(eq(schema.executions.id, executionId));

      // Get execution details for notification
      const execution = await db.query.executions.findFirst({
        where: eq(schema.executions.id, executionId),
        with: { workflow: { with: { user: true } } },
      });

      if (execution) {
        // Broadcast timeout to user
        this.socketService.emitToUser(
          execution.workflow.userId,
          "executionTimeout",
          {
            executionId,
            workflowId: execution.workflowId,
            workflowName: execution.workflow.name,
            timeoutMs: timeoutData.timeoutMs,
            executionTime: Date.now() - timeoutData.startTime,
          }
        );

        this.emit("executionTimeout", { executionId, timeoutData, execution });
      }
    } catch (error) {
      console.error("Error handling execution timeout:", error);
      this.emit("timeoutError", { executionId, error });
    } finally {
      this.clearExecutionTimeout(executionId);
    }
  }

  /**
   * Clear timeout for an execution
   */
  clearExecutionTimeout(executionId: string): void {
    // Clear main timeout
    const timeout = this.activeTimeouts.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(executionId);
    }

    // Clear warning timeout
    const warningTimeout = this.warningTimeouts.get(executionId);
    if (warningTimeout) {
      clearTimeout(warningTimeout);
      this.warningTimeouts.delete(executionId);
    }

    // Remove tracking data
    this.executionTracking.delete(executionId);

    this.emit("timeoutCleared", { executionId });
  }

  /**
   * Request manual intervention
   */
  async requestManualIntervention(
    executionId: string,
    nodeId: string,
    request: Omit<
      ManualInterventionRequest,
      "executionId" | "nodeId" | "createdAt"
    >
  ): Promise<string> {
    const interventionId = `${executionId}_${nodeId}_${Date.now()}`;
    const now = Date.now();
    const timeoutMs =
      request.timeout || this.config.manualInterventionTimeoutMs;

    const intervention: ManualInterventionRequest = {
      ...request,
      executionId,
      nodeId,
      createdAt: now,
      expiresAt: now + timeoutMs,
    };

    this.pendingInterventions.set(interventionId, intervention);

    // Pause execution
    await this.pauseExecution(executionId, "manual_intervention");

    // Get execution details
    const execution = await db.query.executions.findFirst({
      where: eq(schema.executions.id, executionId),
      with: { workflow: { with: { user: true } } },
    });

    if (execution) {
      // Broadcast intervention request
      this.socketService.emitToUser(
        execution.workflow.userId,
        "manualInterventionRequired",
        {
          interventionId,
          executionId,
          nodeId,
          workflowName: execution.workflow.name,
          type: intervention.type,
          message: intervention.message,
          options: intervention.options,
          timeout: intervention.timeout,
          requiredRole: intervention.requiredRole,
          metadata: intervention.metadata,
          createdAt: intervention.createdAt,
          expiresAt: intervention.expiresAt,
        }
      );

      // Set intervention timeout
      const interventionTimeout = setTimeout(() => {
        this.handleInterventionTimeout(interventionId);
      }, timeoutMs);
      this.interventionTimeouts.set(interventionId, interventionTimeout);

      this.emit("interventionRequested", {
        interventionId,
        intervention,
        execution,
      });
    }

    return interventionId;
  }

  /**
   * Respond to manual intervention
   */
  async respondToIntervention(
    interventionId: string,
    response: ManualInterventionResponse
  ): Promise<boolean> {
    const intervention = this.pendingInterventions.get(interventionId);
    if (!intervention) {
      throw new Error("Intervention not found or already expired");
    }

    // Clear intervention timeout
    const timeout = this.interventionTimeouts.get(interventionId);
    if (timeout) {
      clearTimeout(timeout);
      this.interventionTimeouts.delete(interventionId);
    }

    // Remove from pending
    this.pendingInterventions.delete(interventionId);

    // Store response in database (convert to JSON-compatible format)
    await db
      .update(schema.nodeExecutions)
      .set({
        outputData: {
          manualInterventionResponse: {
            approved: response.approved,
            input: response.input,
            choice: response.choice,
            userId: response.userId,
            respondedAt: response.respondedAt,
          },
          approved: response.approved,
          respondedAt: response.respondedAt,
        },
      })
      .where(
        eq(schema.nodeExecutions.executionId, intervention.executionId)
      );

    // Resume execution if approved
    if (response.approved) {
      await this.resumeExecution(intervention.executionId);
    } else {
      // Cancel execution if not approved
      await this.cancelExecution(
        intervention.executionId,
        "manual_intervention_denied"
      );
    }

    // Broadcast response
    const execution = await db.query.executions.findFirst({
      where: eq(schema.executions.id, intervention.executionId),
      with: { workflow: { with: { user: true } } },
    });

    if (execution) {
      this.socketService.emitToUser(
        execution.workflow.userId,
        "manualInterventionResponse",
        {
          interventionId,
          executionId: intervention.executionId,
          nodeId: intervention.nodeId,
          response,
          approved: response.approved,
        }
      );
    }

    this.emit("interventionResolved", {
      interventionId,
      intervention,
      response,
    });

    return response.approved;
  }

  /**
   * Handle intervention timeout
   */
  private async handleInterventionTimeout(
    _interventionId: string
  ): Promise<void> {
    const intervention = this.pendingInterventions.get(_interventionId);
    if (!intervention) return;

    this.pendingInterventions.delete(_interventionId);
    this.interventionTimeouts.delete(_interventionId);

    // Cancel execution due to intervention timeout
    await this.cancelExecution(
      intervention.executionId,
      "manual_intervention_timeout"
    );

    // Broadcast timeout
    const execution = await db.query.executions.findFirst({
      where: eq(schema.executions.id, intervention.executionId),
      with: { workflow: { with: { user: true } } },
    });

    if (execution) {
      this.socketService.emitToUser(
        execution.workflow.userId,
        "manualInterventionTimeout",
        {
          interventionId: _interventionId,
          executionId: intervention.executionId,
          nodeId: intervention.nodeId,
          intervention,
        }
      );
    }

    this.emit("interventionTimeout", { interventionId: _interventionId, intervention });
  }

  /**
   * Pause execution
   */
  private async pauseExecution(
    executionId: string,
    reason: string
  ): Promise<void> {
    // Simplified for now - will be enhanced when Drizzle schema is updated
    await db
      .update(schema.executions)
      .set({
        status: "CANCELLED",
        error: {
          type: "pause",
          reason,
          timestamp: new Date().toISOString(),
        },
      })
      .where(eq(schema.executions.id, executionId));

    // Update activity
    this.updateActivity(executionId);
  }

  /**
   * Resume execution
   */
  private async resumeExecution(executionId: string): Promise<void> {
    await db
      .update(schema.executions)
      .set({
        status: "RUNNING",
      })
      .where(eq(schema.executions.id, executionId));

    // Update activity
    this.updateActivity(executionId);
  }

  /**
   * Cancel execution
   */
  private async cancelExecution(
    executionId: string,
    reason: string
  ): Promise<void> {
    await db
      .update(schema.executions)
      .set({
        status: "CANCELLED",
        finishedAt: new Date(),
        error: {
          type: "cancellation",
          reason,
          timestamp: new Date().toISOString(),
        },
      })
      .where(eq(schema.executions.id, executionId));

    this.clearExecutionTimeout(executionId);
  }

  /**
   * Get pending interventions for a user
   */
  async getPendingInterventions(
    userId: string
  ): Promise<ManualInterventionRequest[]> {
    const userExecutions = await db.query.executions.findMany({
      where: eq(schema.workflows.userId, userId),
      columns: { id: true },
      with: { workflow: { columns: { userId: true } } },
    });

    const executionIds = userExecutions.map((e: any) => e.id);
    const pendingInterventions: ManualInterventionRequest[] = [];

    this.pendingInterventions.forEach((intervention) => {
      if (executionIds.includes(intervention.executionId)) {
        pendingInterventions.push(intervention);
      }
    });

    return pendingInterventions;
  }

  /**
   * Get execution timeout status
   */
  getExecutionTimeoutStatus(executionId: string): ExecutionTimeoutData | null {
    return this.executionTracking.get(executionId) || null;
  }

  /**
   * Extend execution timeout
   */
  extendExecutionTimeout(executionId: string, additionalMs: number): boolean {
    const timeoutData = this.executionTracking.get(executionId);
    if (!timeoutData) return false;

    // Clear existing timeout
    const timeout = this.activeTimeouts.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
    }

    // Update timeout data
    timeoutData.timeoutMs += additionalMs;
    this.executionTracking.set(executionId, timeoutData);

    // Set new timeout
    const remainingTime =
      timeoutData.timeoutMs - (Date.now() - timeoutData.startTime);
    const newTimeout = setTimeout(() => {
      this.handleExecutionTimeout(executionId);
    }, remainingTime);
    this.activeTimeouts.set(executionId, newTimeout);

    this.emit("timeoutExtended", {
      executionId,
      additionalMs,
      newTimeoutMs: timeoutData.timeoutMs,
    });

    return true;
  }

  /**
   * Cleanup all timeouts and intervals
   */
  cleanup(): void {
    // Clear all timeouts
    this.activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.activeTimeouts.clear();

    this.warningTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.warningTimeouts.clear();

    this.interventionTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.interventionTimeouts.clear();

    // Clear tracking data
    this.executionTracking.clear();
    this.pendingInterventions.clear();

    this.emit("cleanup");
  }
}

export default ExecutionTimeoutManager;
