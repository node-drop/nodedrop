import { PrismaClient } from "@prisma/client";
import { EventEmitter } from "events";
import ExecutionHistoryService from "./ExecutionHistoryService";
import { SocketService } from "./SocketService";

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  exponentialBackoff: boolean;
  retryableErrors: string[];
  stopOnErrors: string[];
}

export interface RecoveryPoint {
  executionId: string;
  nodeId: string;
  timestamp: number;
  state: Record<string, any>;
  checksum: string;
}

export interface ExecutionRecoveryStrategy {
  type: "retry" | "skip" | "restart" | "manual";
  nodeId?: string;
  fromCheckpoint?: string;
  retryConfig?: Partial<RetryConfig>;
  customData?: Record<string, any>;
}

export interface FailureAnalysis {
  errorType: string;
  category:
    | "transient"
    | "permanent"
    | "configuration"
    | "timeout"
    | "resource";
  isRetryable: boolean;
  confidence: number; // 0-1 confidence in the analysis
  suggestedStrategy: ExecutionRecoveryStrategy;
  context: {
    nodeId?: string;
    nodeName?: string;
    errorCode?: string;
    httpStatus?: number;
    networkError?: boolean;
    resourceExhaustion?: boolean;
  };
  recommendations: string[];
}

/**
 * Comprehensive error handling and execution recovery service
 */
export class ExecutionRecoveryService extends EventEmitter {
  private prisma: PrismaClient;
  private socketService: SocketService | null;
  private historyService: ExecutionHistoryService;
  private recoveryPoints: Map<string, RecoveryPoint[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    retryableErrors: [
      "network_error",
      "timeout",
      "rate_limit",
      "service_unavailable",
      "temporary_failure",
    ],
    stopOnErrors: [
      "authentication_error",
      "authorization_error",
      "invalid_configuration",
      "schema_validation_error",
    ],
  };

  constructor(
    prisma: PrismaClient,
    socketService: SocketService | null,
    historyService: ExecutionHistoryService
  ) {
    super();
    this.prisma = prisma;
    this.socketService = socketService;
    this.historyService = historyService;
  }

  /**
   * Analyze execution failure and suggest recovery strategy
   */
  async analyzeFailure(
    executionId: string,
    error: any
  ): Promise<FailureAnalysis> {
    try {
      // Get execution context
      const execution = await this.prisma.execution.findUnique({
        where: { id: executionId },
        include: {
          workflow: true,
          nodeExecutions: {
            where: { status: "ERROR" },
          },
        },
      });

      if (!execution) {
        throw new Error("Execution not found");
      }

      const failedNode = execution.nodeExecutions[0]; // Get first failed node
      const errorType = this.classifyError(error);
      const category = this.categorizeError(error, errorType);
      const isRetryable = this.isErrorRetryable(error, errorType);

      // Build context
      const context = {
        nodeId: failedNode?.nodeId,
        nodeName: this.getNodeName(execution.workflow, failedNode?.nodeId),
        errorCode: error.code,
        httpStatus: error.status || error.statusCode,
        networkError: this.isNetworkError(error),
        resourceExhaustion: this.isResourceExhaustion(error),
      };

      // Determine suggested strategy
      const suggestedStrategy = this.determineSuggestedStrategy(
        errorType,
        category,
        isRetryable,
        context,
        executionId
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        error,
        context,
        category
      );

      // Calculate confidence based on error analysis
      const confidence = this.calculateAnalysisConfidence(error, context);

      const analysis: FailureAnalysis = {
        errorType,
        category,
        isRetryable,
        confidence,
        suggestedStrategy,
        context,
        recommendations,
      };

      // Log the analysis
      this.historyService.addExecutionLog(
        executionId,
        "info",
        `Failure analysis completed: ${category} error (${errorType})`,
        context.nodeId,
        { analysis },
        "system"
      );

      this.emit("failureAnalyzed", { executionId, analysis });

      return analysis;
    } catch (error: any) {
      console.error("Error analyzing failure:", error);

      // Return a safe default analysis
      return {
        errorType: "unknown",
        category: "permanent",
        isRetryable: false,
        confidence: 0.1,
        suggestedStrategy: { type: "manual" },
        context: {},
        recommendations: ["Manual investigation required", "Check system logs"],
      };
    }
  }

  /**
   * Create a recovery point for an execution
   */
  async createRecoveryPoint(
    executionId: string,
    nodeId: string,
    state: Record<string, any>
  ): Promise<string> {
    const timestamp = Date.now();
    const checksum = this.generateChecksum(state);

    const recoveryPoint: RecoveryPoint = {
      executionId,
      nodeId,
      timestamp,
      state,
      checksum,
    };

    // Store in memory (in production, this should be persisted)
    const points = this.recoveryPoints.get(executionId) || [];
    points.push(recoveryPoint);
    this.recoveryPoints.set(executionId, points);

    // Also store in database for persistence
    await this.prisma.flowExecutionState
      .create({
        data: {
          executionId,
          nodeId,
          status: state.status || "idle",
          progress: state.progress || 0,
          inputData: state.inputData || null,
          outputData: state.outputData || null,
          error: state.error || null,
          startTime: state.startTime ? new Date(state.startTime) : null,
          endTime: state.endTime ? new Date(state.endTime) : null,
          duration: state.duration || null,
          dependencies: state.dependencies || [],
          executionOrder: state.executionOrder || null,
          animationState: state.animationState || "idle",
        },
      })
      .catch((err) => {
        console.warn("Failed to persist recovery point:", err);
      });

    this.emit("recoveryPointCreated", { executionId, nodeId, timestamp });

    return `${executionId}_${nodeId}_${timestamp}`;
  }

  /**
   * Attempt to recover execution using specified strategy
   */
  async recoverExecution(
    executionId: string,
    strategy: ExecutionRecoveryStrategy
  ): Promise<boolean> {
    this.historyService.addExecutionLog(
      executionId,
      "info",
      `Attempting recovery with strategy: ${strategy.type}`,
      strategy.nodeId,
      { strategy },
      "system"
    );

    try {
      let success = false;

      switch (strategy.type) {
        case "retry":
          success = await this.retryExecution(executionId, strategy);
          break;
        case "skip":
          success = await this.skipFailedNode(executionId, strategy.nodeId!);
          break;
        case "restart":
          success = await this.restartExecution(
            executionId,
            strategy.fromCheckpoint
          );
          break;
        case "manual":
          success = await this.requestManualIntervention(executionId, strategy);
          break;
        default:
          throw new Error(`Unknown recovery strategy: ${strategy.type}`);
      }

      if (success) {
        this.historyService.addExecutionLog(
          executionId,
          "info",
          `Recovery successful using ${strategy.type} strategy`,
          strategy.nodeId,
          {},
          "system"
        );
        this.emit("recoverySuccessful", { executionId, strategy });
      } else {
        this.historyService.addExecutionLog(
          executionId,
          "warn",
          `Recovery failed using ${strategy.type} strategy`,
          strategy.nodeId,
          {},
          "system"
        );
        this.emit("recoveryFailed", { executionId, strategy });
      }

      return success;
    } catch (error: any) {
      this.historyService.addExecutionLog(
        executionId,
        "error",
        `Recovery error: ${error.message}`,
        strategy.nodeId,
        { error: error.message },
        "system"
      );
      this.emit("recoveryError", { executionId, strategy, error });
      return false;
    }
  }

  /**
   * Automatically attempt recovery based on failure analysis
   */
  async autoRecover(executionId: string, error: any): Promise<boolean> {
    const analysis = await this.analyzeFailure(executionId, error);

    // Only auto-recover if confidence is high enough and error is retryable
    if (analysis.confidence < 0.7 || !analysis.isRetryable) {
      this.historyService.addExecutionLog(
        executionId,
        "info",
        `Auto-recovery skipped: confidence=${analysis.confidence}, retryable=${analysis.isRetryable}`,
        analysis.context.nodeId,
        { analysis },
        "system"
      );
      return false;
    }

    return this.recoverExecution(executionId, analysis.suggestedStrategy);
  }

  /**
   * Get recovery points for an execution
   */
  getRecoveryPoints(executionId: string): RecoveryPoint[] {
    return this.recoveryPoints.get(executionId) || [];
  }

  /**
   * Clean up recovery data for completed executions
   */
  cleanupRecoveryData(executionId: string): void {
    this.recoveryPoints.delete(executionId);
    this.retryAttempts.delete(executionId);
    this.emit("recoveryDataCleanup", { executionId });
  }

  /**
   * Private helper methods
   */

  private async retryExecution(
    executionId: string,
    strategy: ExecutionRecoveryStrategy
  ): Promise<boolean> {
    const retryKey = `${executionId}_${strategy.nodeId || "execution"}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    const config = { ...this.defaultRetryConfig, ...strategy.retryConfig };

    if (currentAttempts >= config.maxRetries) {
      this.historyService.addExecutionLog(
        executionId,
        "warn",
        `Max retry attempts (${config.maxRetries}) reached`,
        strategy.nodeId,
        {},
        "system"
      );
      return false;
    }

    // Calculate delay with exponential backoff
    const delay = config.exponentialBackoff
      ? config.retryDelay * Math.pow(2, currentAttempts)
      : config.retryDelay;

    this.retryAttempts.set(retryKey, currentAttempts + 1);

    this.historyService.addExecutionLog(
      executionId,
      "info",
      `Retrying in ${delay}ms (attempt ${currentAttempts + 1}/${
        config.maxRetries
      })`,
      strategy.nodeId,
      { delay, attempt: currentAttempts + 1 },
      "system"
    );

    // Wait for delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Update execution status to retry
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "RUNNING",
        error: {
          type: "retry",
          attempt: currentAttempts + 1,
          maxAttempts: config.maxRetries,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return true; // Execution will be resumed by execution engine
  }

  private async skipFailedNode(
    executionId: string,
    nodeId: string
  ): Promise<boolean> {
    // Update node execution to skipped
    await this.prisma.nodeExecution.updateMany({
      where: {
        executionId,
        nodeId,
        status: "ERROR",
      },
      data: {
        status: "SKIPPED" as any,
        finishedAt: new Date(),
        outputData: {
          skipped: true,
          reason: "Recovery strategy: skip failed node",
          timestamp: new Date().toISOString(),
        },
      },
    });

    return true;
  }

  private async restartExecution(
    executionId: string,
    fromCheckpoint?: string
  ): Promise<boolean> {
    // Reset execution status
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "RUNNING",
        error: undefined,
        finishedAt: null,
      },
    });

    // Reset failed node executions
    await this.prisma.nodeExecution.updateMany({
      where: {
        executionId,
        status: "ERROR",
      },
      data: {
        status: "WAITING" as any,
        startedAt: null,
        finishedAt: null,
        error: undefined,
        outputData: undefined,
      },
    });

    if (fromCheckpoint) {
      // Restore state from checkpoint
      // This would integrate with the flow execution engine
      this.historyService.addExecutionLog(
        executionId,
        "info",
        `Restarting from checkpoint: ${fromCheckpoint}`,
        undefined,
        { checkpoint: fromCheckpoint },
        "system"
      );
    }

    return true;
  }

  private async requestManualIntervention(
    executionId: string,
    strategy: ExecutionRecoveryStrategy
  ): Promise<boolean> {
    // This would integrate with the manual intervention system
    this.historyService.addExecutionLog(
      executionId,
      "info",
      "Manual intervention requested",
      strategy.nodeId,
      strategy.customData,
      "system"
    );

    // Pause execution
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "CANCELLED", // Using CANCELLED for paused state temporarily
        error: {
          type: "manual_intervention_required",
          reason: "Automatic recovery failed, manual intervention required",
          timestamp: new Date().toISOString(),
        },
      },
    });

    return true;
  }

  private classifyError(error: any): string {
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED")
      return "network_error";
    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout"))
      return "timeout";
    if (error.status === 401 || error.message?.includes("authentication"))
      return "authentication_error";
    if (error.status === 403 || error.message?.includes("authorization"))
      return "authorization_error";
    if (error.status === 429) return "rate_limit";
    if (error.status >= 500) return "service_unavailable";
    if (error.status >= 400 && error.status < 500) return "client_error";
    if (error.message?.includes("validation")) return "validation_error";
    if (error.message?.includes("configuration")) return "configuration_error";

    return "unknown_error";
  }

  private categorizeError(
    error: any,
    errorType: string
  ): FailureAnalysis["category"] {
    const transientErrors = [
      "network_error",
      "timeout",
      "rate_limit",
      "service_unavailable",
    ];
    const configErrors = [
      "authentication_error",
      "authorization_error",
      "configuration_error",
    ];
    const timeoutErrors = ["timeout"];

    if (transientErrors.includes(errorType)) return "transient";
    if (configErrors.includes(errorType)) return "configuration";
    if (timeoutErrors.includes(errorType)) return "timeout";
    if (this.isResourceExhaustion(error)) return "resource";

    return "permanent";
  }

  private isErrorRetryable(error: any, errorType: string): boolean {
    return (
      this.defaultRetryConfig.retryableErrors.includes(errorType) &&
      !this.defaultRetryConfig.stopOnErrors.includes(errorType)
    );
  }

  private isNetworkError(error: any): boolean {
    return ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"].includes(
      error.code
    );
  }

  private isResourceExhaustion(error: any): boolean {
    return (
      error.message?.includes("memory") ||
      error.message?.includes("disk space") ||
      error.message?.includes("quota exceeded")
    );
  }

  private getNodeName(workflow: any, nodeId?: string): string | undefined {
    if (!nodeId || !workflow.nodes) return undefined;
    const nodes = Array.isArray(workflow.nodes)
      ? workflow.nodes
      : JSON.parse(workflow.nodes as string);
    const node = nodes.find((n: any) => n.id === nodeId);
    return node?.name || node?.type;
  }

  private determineSuggestedStrategy(
    errorType: string,
    category: FailureAnalysis["category"],
    isRetryable: boolean,
    context: any,
    executionId: string
  ): ExecutionRecoveryStrategy {
    if (category === "transient" && isRetryable) {
      return {
        type: "retry",
        nodeId: context.nodeId,
        retryConfig: {
          maxRetries: errorType === "rate_limit" ? 5 : 3,
          retryDelay: errorType === "rate_limit" ? 5000 : 1000,
          exponentialBackoff: true,
        },
      };
    }

    if (category === "configuration") {
      return {
        type: "manual",
        nodeId: context.nodeId,
        customData: {
          reason: "Configuration error requires manual fix",
          errorType,
        },
      };
    }

    if (category === "timeout") {
      const recoveryPoints = this.getRecoveryPoints(executionId);
      if (recoveryPoints.length > 0) {
        return {
          type: "restart",
          fromCheckpoint: recoveryPoints[recoveryPoints.length - 1].nodeId,
        };
      }
      return {
        type: "retry",
        retryConfig: { maxRetries: 1, retryDelay: 2000 },
      };
    }

    // Default to manual intervention for unknown/permanent errors
    return {
      type: "manual",
      nodeId: context.nodeId,
    };
  }

  private generateRecommendations(
    error: any,
    context: any,
    category: string
  ): string[] {
    const recommendations: string[] = [];

    if (category === "transient") {
      recommendations.push(
        "Error is likely temporary - retry should resolve it"
      );
      recommendations.push("Monitor for recurring issues");
    }

    if (category === "configuration") {
      recommendations.push("Check node configuration and credentials");
      recommendations.push("Verify API endpoints and parameters");
    }

    if (category === "timeout") {
      recommendations.push("Consider increasing timeout values");
      recommendations.push(
        "Check network connectivity and service availability"
      );
    }

    if (context.networkError) {
      recommendations.push("Verify network connectivity");
      recommendations.push("Check DNS resolution");
      recommendations.push("Verify firewall settings");
    }

    if (context.httpStatus >= 500) {
      recommendations.push("External service is experiencing issues");
      recommendations.push("Check service status page");
      recommendations.push("Consider implementing circuit breaker pattern");
    }

    return recommendations.length > 0
      ? recommendations
      : ["Review error details and logs"];
  }

  private calculateAnalysisConfidence(error: any, context: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for well-known error patterns
    if (
      error.code &&
      ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"].includes(error.code)
    ) {
      confidence += 0.3;
    }

    if (error.status && [401, 403, 429, 500, 502, 503].includes(error.status)) {
      confidence += 0.2;
    }

    if (context.nodeId) {
      confidence += 0.1; // More confident when we know which node failed
    }

    return Math.min(confidence, 1.0);
  }

  private generateChecksum(data: any): string {
    // Simple checksum generation (in production, use proper hashing)
    return Buffer.from(JSON.stringify(data)).toString("base64").slice(0, 16);
  }
}

export default ExecutionRecoveryService;
