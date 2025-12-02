import { PrismaClient } from "@prisma/client";
import { EventEmitter } from "events";

export interface ExecutionHistoryQuery {
  workflowId?: string;
  userId?: string;
  status?: string[];
  executionType?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: "startedAt" | "finishedAt" | "duration";
  sortOrder?: "asc" | "desc";
}

export interface ExecutionAnalytics {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  totalDuration: number;
  executionsByStatus: Record<string, number>;
  executionsByType: Record<string, number>;
  executionTrends: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
  }>;
  topFailingWorkflows: Array<{
    workflowId: string;
    workflowName: string;
    failureCount: number;
    failureRate: number;
  }>;
  performanceMetrics: {
    fastest: number;
    slowest: number;
    median: number;
    p95: number;
    p99: number;
  };
}

export interface ExecutionDebugInfo {
  execution: any;
  nodeExecutions: any[];
  flowExecutionState?: Record<string, any>;
  executionPath: string[];
  timeline: Array<{
    timestamp: number;
    event: string;
    nodeId?: string;
    data?: any;
  }>;
  errorAnalysis?: {
    errorType: string;
    errorNode?: string;
    errorMessage: string;
    stackTrace?: string;
    possibleCauses: string[];
    suggestedFixes: string[];
  };
  performanceAnalysis: {
    totalDuration: number;
    nodePerformance: Array<{
      nodeId: string;
      duration: number;
      percentage: number;
      status: string;
    }>;
    bottlenecks: Array<{
      nodeId: string;
      duration: number;
      reason: string;
    }>;
  };
  resourceUsage?: {
    memoryPeak: number;
    cpuAverage: number;
    networkRequests: number;
    diskIO: number;
  };
}

export interface ExecutionLogEntry {
  id: string;
  executionId: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: Date;
  nodeId?: string;
  metadata?: Record<string, any>;
  source: "system" | "node" | "user";
}

/**
 * Comprehensive execution history and debugging service
 */
export class ExecutionHistoryService extends EventEmitter {
  private prisma: PrismaClient;
  private executionLogs: Map<string, ExecutionLogEntry[]> = new Map();

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  /**
   * Query execution history with filtering and pagination
   */
  async queryExecutionHistory(query: ExecutionHistoryQuery): Promise<{
    executions: any[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      workflowId,
      userId,
      status = [],
      executionType = [],
      dateRange,
      limit = 50,
      offset = 0,
      sortBy = "startedAt",
      sortOrder = "desc",
    } = query;

    // Build where clause
    const where: any = {};

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (userId) {
      where.workflow = { userId };
    }

    if (status.length > 0) {
      where.status = { in: status };
    }

    if (executionType.length > 0) {
      where.executionType = { in: executionType };
    }

    if (dateRange) {
      where.startedAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    // Get total count
    const total = await this.prisma.execution.count({ where });

    // Get executions
    const executions = await this.prisma.execution.findMany({
      where,
      include: {
        workflow: {
          select: { id: true, name: true, description: true },
        },
        nodeExecutions: {
          select: {
            nodeId: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            error: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    });

    // Enhance executions with computed fields
    const enhancedExecutions = executions.map((execution) => {
      const duration = execution.finishedAt
        ? execution.finishedAt.getTime() - execution.startedAt.getTime()
        : Date.now() - execution.startedAt.getTime();

      const failedNodes = execution.nodeExecutions.filter(
        (ne) => ne.status === "FAILED" || ne.status === "ERROR"
      ).length;
      const completedNodes = execution.nodeExecutions.filter(
        (ne) => ne.status === "SUCCESS" || ne.status === "COMPLETED"
      ).length;

      return {
        ...execution,
        duration,
        nodeStats: {
          total: execution.nodeExecutions.length,
          completed: completedNodes,
          failed: failedNodes,
          pending:
            execution.nodeExecutions.length - completedNodes - failedNodes,
        },
      };
    });

    return {
      executions: enhancedExecutions,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get detailed execution analytics
   */
  async getExecutionAnalytics(
    userId?: string,
    workflowId?: string,
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<ExecutionAnalytics> {
    const where: any = {};

    if (userId) {
      where.workflow = { userId };
    }

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (timeRange) {
      where.startedAt = {
        gte: timeRange.startDate,
        lte: timeRange.endDate,
      };
    }

    // Get all executions for analysis
    const executions = await this.prisma.execution.findMany({
      where,
      include: {
        workflow: { select: { id: true, name: true } },
      },
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.status === "SUCCESS"
    ).length;
    const successRate =
      totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    // Calculate durations
    const durations = executions
      .filter((e) => e.finishedAt)
      .map((e) => e.finishedAt!.getTime() - e.startedAt.getTime());

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration =
      durations.length > 0 ? totalDuration / durations.length : 0;

    // Group by status
    const executionsByStatus: Record<string, number> = {};
    executions.forEach((e) => {
      executionsByStatus[e.status] = (executionsByStatus[e.status] || 0) + 1;
    });

    // Group by type (when available)
    const executionsByType: Record<string, number> = {};
    executions.forEach((e) => {
      const type = (e as any).executionType || "workflow";
      executionsByType[type] = (executionsByType[type] || 0) + 1;
    });

    // Calculate performance metrics
    const sortedDurations = durations.sort((a, b) => a - b);
    const performanceMetrics = {
      fastest: sortedDurations[0] || 0,
      slowest: sortedDurations[sortedDurations.length - 1] || 0,
      median: sortedDurations[Math.floor(sortedDurations.length / 2)] || 0,
      p95: sortedDurations[Math.floor(sortedDurations.length * 0.95)] || 0,
      p99: sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0,
    };

    // Generate execution trends (last 30 days by default)
    const endDate = timeRange?.endDate || new Date();
    const startDate =
      timeRange?.startDate ||
      new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const executionTrends = this.generateExecutionTrends(
      executions,
      startDate,
      endDate
    );

    // Find top failing workflows
    const workflowFailures: Record<
      string,
      { total: number; failures: number; name: string }
    > = {};
    executions.forEach((e) => {
      const key = e.workflowId;
      if (!workflowFailures[key]) {
        workflowFailures[key] = {
          total: 0,
          failures: 0,
          name: e.workflow.name,
        };
      }
      workflowFailures[key].total++;
      if (e.status === "ERROR") {
        workflowFailures[key].failures++;
      }
    });

    const topFailingWorkflows = Object.entries(workflowFailures)
      .map(([workflowId, stats]) => ({
        workflowId,
        workflowName: stats.name,
        failureCount: stats.failures,
        failureRate: (stats.failures / stats.total) * 100,
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 10);

    return {
      totalExecutions,
      successRate,
      averageDuration,
      totalDuration,
      executionsByStatus,
      executionsByType,
      executionTrends,
      topFailingWorkflows,
      performanceMetrics,
    };
  }

  /**
   * Get comprehensive debug information for an execution
   */
  async getExecutionDebugInfo(
    executionId: string
  ): Promise<ExecutionDebugInfo | null> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
        nodeExecutions: {
          orderBy: { executionOrder: "asc" },
        },
        flowExecutionStates: true,
      },
    });

    if (!execution) {
      return null;
    }

    // Build execution timeline
    const timeline = this.buildExecutionTimeline(execution);

    // Analyze errors if any
    const errorAnalysis = execution.error
      ? this.analyzeExecutionError(execution, execution.nodeExecutions)
      : undefined;

    // Analyze performance
    const performanceAnalysis = this.analyzeExecutionPerformance(
      execution,
      execution.nodeExecutions
    );

    // Get flow execution state
    const flowExecutionState =
      execution.flowExecutionStates.length > 0
        ? execution.flowExecutionStates.reduce((state, fes) => {
            state[fes.nodeId] = {
              status: fes.status,
              progress: fes.progress,
              inputData: fes.inputData,
              outputData: fes.outputData,
              error: fes.error,
              startTime: fes.startTime,
              endTime: fes.endTime,
              duration: fes.duration
            };
            return state;
          }, {} as Record<string, any>)
        : undefined;

    // Build execution path
    const executionPath = (execution as any).flowExecutionPath || [];

    // Get execution logs
    const logs = this.executionLogs.get(executionId) || [];

    return {
      execution,
      nodeExecutions: execution.nodeExecutions,
      flowExecutionState,
      executionPath,
      timeline,
      errorAnalysis,
      performanceAnalysis,
    };
  }

  /**
   * Add execution log entry
   */
  addExecutionLog(
    executionId: string,
    level: ExecutionLogEntry["level"],
    message: string,
    nodeId?: string,
    metadata?: Record<string, any>,
    source: ExecutionLogEntry["source"] = "system"
  ): void {
    const entry: ExecutionLogEntry = {
      id: `${executionId}_${Date.now()}_${Math.random()}`,
      executionId,
      level,
      message,
      timestamp: new Date(),
      nodeId,
      metadata,
      source,
    };

    const logs = this.executionLogs.get(executionId) || [];
    logs.push(entry);
    this.executionLogs.set(executionId, logs);

    // Emit log event
    this.emit("logAdded", entry);

    // Limit log size per execution (keep last 1000 entries)
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
  }

  /**
   * Get execution logs
   */
  getExecutionLogs(
    executionId: string,
    level?: ExecutionLogEntry["level"],
    nodeId?: string
  ): ExecutionLogEntry[] {
    const logs = this.executionLogs.get(executionId) || [];

    return logs.filter((log) => {
      if (level && log.level !== level) return false;
      if (nodeId && log.nodeId !== nodeId) return false;
      return true;
    });
  }

  /**
   * Clear execution logs
   */
  clearExecutionLogs(executionId: string): void {
    this.executionLogs.delete(executionId);
  }

  /**
   * Export execution data for debugging
   */
  async exportExecutionData(executionId: string): Promise<any> {
    const debugInfo = await this.getExecutionDebugInfo(executionId);
    const logs = this.getExecutionLogs(executionId);

    return {
      ...debugInfo,
      logs,
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
    };
  }

  /**
   * Search executions by error patterns
   */
  async searchExecutionsByError(
    errorPattern: string,
    userId?: string,
    limit: number = 50
  ): Promise<any[]> {
    const where: any = {
      status: { in: ["ERROR", "FAILED"] },
      error: {
        path: ["message"],
        string_contains: errorPattern,
      },
    };

    if (userId) {
      where.workflow = { userId };
    }

    return this.prisma.execution.findMany({
      where,
      include: {
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Private helper methods
   */

  private generateExecutionTrends(
    executions: any[],
    startDate: Date,
    endDate: Date
  ): ExecutionAnalytics["executionTrends"] {
    const trends: Record<string, any> = {};
    const dayMs = 24 * 60 * 60 * 1000;

    // Initialize all days in range
    for (
      let date = new Date(startDate);
      date <= endDate;
      date = new Date(date.getTime() + dayMs)
    ) {
      const dateKey = date.toISOString().split("T")[0];
      trends[dateKey] = {
        date: dateKey,
        count: 0,
        successCount: 0,
        failureCount: 0,
        durations: [],
      };
    }

    // Populate with execution data
    executions.forEach((execution) => {
      const dateKey = execution.startedAt.toISOString().split("T")[0];
      if (trends[dateKey]) {
        trends[dateKey].count++;
        if (execution.status === "SUCCESS") {
          trends[dateKey].successCount++;
        } else if (["ERROR", "FAILED"].includes(execution.status)) {
          trends[dateKey].failureCount++;
        }

        if (execution.finishedAt) {
          const duration =
            execution.finishedAt.getTime() - execution.startedAt.getTime();
          trends[dateKey].durations.push(duration);
        }
      }
    });

    // Calculate averages and return sorted
    return Object.values(trends)
      .map((trend: any) => ({
        ...trend,
        averageDuration:
          trend.durations.length > 0
            ? trend.durations.reduce((sum: number, d: number) => sum + d, 0) /
              trend.durations.length
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private buildExecutionTimeline(
    execution: any
  ): ExecutionDebugInfo["timeline"] {
    const timeline: ExecutionDebugInfo["timeline"] = [];

    // Add execution start
    timeline.push({
      timestamp: execution.startedAt.getTime(),
      event: "execution_started",
      data: { workflowId: execution.workflowId },
    });

    // Add node execution events
    execution.nodeExecutions.forEach((nodeExecution: any) => {
      if (nodeExecution.startedAt) {
        timeline.push({
          timestamp: nodeExecution.startedAt.getTime(),
          event: "node_started",
          nodeId: nodeExecution.nodeId,
          data: { status: nodeExecution.status },
        });
      }

      if (nodeExecution.finishedAt) {
        timeline.push({
          timestamp: nodeExecution.finishedAt.getTime(),
          event: "node_finished",
          nodeId: nodeExecution.nodeId,
          data: {
            status: nodeExecution.status,
            duration:
              nodeExecution.finishedAt.getTime() -
              (nodeExecution.startedAt?.getTime() || 0),
          },
        });
      }

      if (nodeExecution.error) {
        timeline.push({
          timestamp: nodeExecution.finishedAt?.getTime() || Date.now(),
          event: "node_error",
          nodeId: nodeExecution.nodeId,
          data: { error: nodeExecution.error },
        });
      }
    });

    // Add execution end
    if (execution.finishedAt) {
      timeline.push({
        timestamp: execution.finishedAt.getTime(),
        event: "execution_finished",
        data: {
          status: execution.status,
          duration:
            execution.finishedAt.getTime() - execution.startedAt.getTime(),
        },
      });
    }

    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }

  private analyzeExecutionError(
    execution: any,
    nodeExecutions: any[]
  ): ExecutionDebugInfo["errorAnalysis"] {
    const error = execution.error;
    const failedNode = nodeExecutions.find(
      (ne) => ne.status === "FAILED" || ne.error
    );

    return {
      errorType: error.type || "unknown",
      errorNode: failedNode?.nodeId,
      errorMessage: error.message || "Unknown error",
      stackTrace: error.stack,
      possibleCauses: this.generatePossibleCauses(error, failedNode),
      suggestedFixes: this.generateSuggestedFixes(error, failedNode),
    };
  }

  private analyzeExecutionPerformance(
    execution: any,
    nodeExecutions: any[]
  ): ExecutionDebugInfo["performanceAnalysis"] {
    const totalDuration = execution.finishedAt
      ? execution.finishedAt.getTime() - execution.startedAt.getTime()
      : Date.now() - execution.startedAt.getTime();

    const nodePerformance = nodeExecutions
      .filter((ne) => ne.startedAt && ne.finishedAt)
      .map((ne) => {
        const duration = ne.finishedAt.getTime() - ne.startedAt.getTime();
        return {
          nodeId: ne.nodeId,
          duration,
          percentage: (duration / totalDuration) * 100,
          status: ne.status,
        };
      })
      .sort((a, b) => b.duration - a.duration);

    const bottlenecks = nodePerformance
      .filter((np) => np.percentage > 20) // Nodes taking more than 20% of total time
      .map((np) => ({
        nodeId: np.nodeId,
        duration: np.duration,
        reason:
          np.duration > 30000
            ? "Long running operation"
            : "Potential bottleneck",
      }));

    return {
      totalDuration,
      nodePerformance,
      bottlenecks,
    };
  }

  private generatePossibleCauses(error: any, failedNode: any): string[] {
    const causes: string[] = [];

    if (error.type === "timeout") {
      causes.push("Operation took longer than expected");
      causes.push("Network connectivity issues");
      causes.push("External service slow response");
    }

    if (error.type === "network") {
      causes.push("Network connectivity problems");
      causes.push("DNS resolution failure");
      causes.push("Firewall blocking connection");
    }

    if (error.message?.includes("authentication")) {
      causes.push("Invalid credentials");
      causes.push("Expired authentication token");
      causes.push("Insufficient permissions");
    }

    if (failedNode?.nodeId) {
      causes.push(`Node ${failedNode.nodeId} configuration issue`);
      causes.push(`Invalid input data for node ${failedNode.nodeId}`);
    }

    return causes.length > 0 ? causes : ["Unknown error cause"];
  }

  private generateSuggestedFixes(error: any, failedNode: any): string[] {
    const fixes: string[] = [];

    if (error.type === "timeout") {
      fixes.push("Increase timeout value");
      fixes.push("Check network connectivity");
      fixes.push("Optimize the operation");
    }

    if (error.type === "authentication") {
      fixes.push("Verify credentials");
      fixes.push("Refresh authentication token");
      fixes.push("Check user permissions");
    }

    if (failedNode?.nodeId) {
      fixes.push(`Review ${failedNode.nodeId} node configuration`);
      fixes.push(`Validate input data for ${failedNode.nodeId}`);
      fixes.push(`Check ${failedNode.nodeId} node dependencies`);
    }

    fixes.push("Retry the execution");
    fixes.push("Check system logs for more details");

    return fixes;
  }
}

export default ExecutionHistoryService;
