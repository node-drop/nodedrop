import { NodeExecutionStatus, PrismaClient } from "@prisma/client";
import {
  ExecutionHistoryEntry,
  ExecutionMetricsData,
  NodeExecutionState,
} from "../types";

export interface FlowExecutionPersistenceService {
  // Flow execution state persistence
  saveFlowExecutionState(
    executionId: string,
    nodeStates: Map<string, NodeExecutionState>
  ): Promise<void>;
  loadFlowExecutionState(
    executionId: string
  ): Promise<Map<string, NodeExecutionState>>;
  updateNodeExecutionState(
    executionId: string,
    nodeId: string,
    state: NodeExecutionState
  ): Promise<void>;

  // Execution history
  saveExecutionHistory(entry: ExecutionHistoryEntry): Promise<void>;
  getExecutionHistory(
    workflowId: string,
    limit?: number
  ): Promise<ExecutionHistoryEntry[]>;
  getExecutionById(executionId: string): Promise<ExecutionHistoryEntry | null>;

  // Recovery operations
  getActiveExecutions(): Promise<string[]>;
  markExecutionAsRecovered(executionId: string): Promise<void>;
  cleanupStaleExecutions(maxAgeMs: number): Promise<void>;
}

export class FlowExecutionPersistenceServiceImpl
  implements FlowExecutionPersistenceService
{
  constructor(private prisma: PrismaClient) {}

  /**
   * Save the complete flow execution state to database
   */
  async saveFlowExecutionState(
    executionId: string,
    nodeStates: Map<string, NodeExecutionState>
  ): Promise<void> {
    const stateData = Array.from(nodeStates.entries()).map(
      ([nodeId, state]) => ({
        executionId,
        nodeId,
        status: this.mapStatusToString(state.status),
        progress: state.progress,
        startTime: state.startTime ? new Date(state.startTime) : null,
        endTime: state.endTime ? new Date(state.endTime) : null,
        duration: state.duration,
        inputData: state.inputData,
        outputData: state.outputData,
        error: state.error,
        dependencies: state.dependencies || [],
        executionOrder: state.executionOrder || null,
        animationState: "idle", // Default animation state
      })
    );

    // Use upsert to handle both create and update cases
    await Promise.all(
      stateData.map((data) =>
        this.prisma.flowExecutionState.upsert({
          where: {
            id: `${executionId}_${data.nodeId}`, // Composite ID
          },
          create: {
            id: `${executionId}_${data.nodeId}`,
            ...data,
          },
          update: {
            ...data,
            updatedAt: new Date(),
          },
        })
      )
    );

    // Update main execution record with progress data
    const completedNodes = Array.from(nodeStates.values()).filter(
      (state) => state.status === NodeExecutionStatus.COMPLETED
    ).length;
    const totalNodes = nodeStates.size;
    const progress =
      totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        progress,
        flowProgressData: {
          totalNodes,
          completedNodes,
          failedNodes: Array.from(nodeStates.values()).filter(
            (state) => state.status === NodeExecutionStatus.FAILED
          ).length,
          lastUpdated: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Load flow execution state from database
   */
  async loadFlowExecutionState(
    executionId: string
  ): Promise<Map<string, NodeExecutionState>> {
    const states = await this.prisma.flowExecutionState.findMany({
      where: { executionId },
    });

    const nodeStates = new Map<string, NodeExecutionState>();

    for (const state of states) {
      nodeStates.set(state.nodeId, {
        nodeId: state.nodeId,
        status: this.mapStringToStatus(state.status),
        progress: state.progress || 0,
        startTime: state.startTime?.getTime(),
        endTime: state.endTime?.getTime(),
        duration: state.duration || undefined,
        inputData: state.inputData,
        outputData: state.outputData,
        error: state.error as any,
        dependencies: state.dependencies,
        executionOrder: state.executionOrder || undefined,
      });
    }

    return nodeStates;
  }

  /**
   * Update individual node execution state
   */
  async updateNodeExecutionState(
    executionId: string,
    nodeId: string,
    state: NodeExecutionState
  ): Promise<void> {
    await this.prisma.flowExecutionState.upsert({
      where: {
        id: `${executionId}_${nodeId}`,
      },
      create: {
        id: `${executionId}_${nodeId}`,
        executionId,
        nodeId,
        status: this.mapStatusToString(state.status),
        progress: state.progress,
        startTime: state.startTime ? new Date(state.startTime) : null,
        endTime: state.endTime ? new Date(state.endTime) : null,
        duration: state.duration,
        inputData: state.inputData,
        outputData: state.outputData,
        error: state.error as any,
        dependencies: state.dependencies || [],
        executionOrder: state.executionOrder || null,
        animationState: "idle",
      },
      update: {
        status: this.mapStatusToString(state.status),
        progress: state.progress,
        startTime: state.startTime ? new Date(state.startTime) : null,
        endTime: state.endTime ? new Date(state.endTime) : null,
        duration: state.duration,
        inputData: state.inputData,
        outputData: state.outputData,
        error: state.error as any,
        dependencies: state.dependencies || [],
        executionOrder: state.executionOrder || null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Save execution history entry
   */
  async saveExecutionHistory(entry: ExecutionHistoryEntry): Promise<void> {
    // Use a combination of executionId and timestamp to make it unique
    const uniqueId = `${entry.executionId}_${entry.startTime}`;

    await this.prisma.executionHistory.upsert({
      where: { id: uniqueId },
      create: {
        id: uniqueId,
        executionId: entry.executionId,
        workflowId: entry.workflowId,
        triggerType: entry.triggerType,
        startTime: new Date(entry.startTime),
        endTime: entry.endTime ? new Date(entry.endTime) : null,
        status: entry.status,
        executedNodes: entry.executedNodes,
        executionPath: entry.executionPath,
        metrics: entry.metrics as any,
        duration: entry.endTime ? entry.endTime - entry.startTime : null,
        nodeCount: entry.metrics.totalNodes,
        completedNodes: entry.metrics.completedNodes,
        failedNodes: entry.metrics.failedNodes,
      },
      update: {
        endTime: entry.endTime ? new Date(entry.endTime) : null,
        status: entry.status,
        executedNodes: entry.executedNodes,
        executionPath: entry.executionPath,
        metrics: entry.metrics as any,
        duration: entry.endTime ? entry.endTime - entry.startTime : null,
        nodeCount: entry.metrics.totalNodes,
        completedNodes: entry.metrics.completedNodes,
        failedNodes: entry.metrics.failedNodes,
      },
    });
  }

  /**
   * Helper to safely convert metrics
   */
  private safeMetrics(metrics: any): ExecutionMetricsData {
    if (metrics && typeof metrics === 'object') {
      return metrics as ExecutionMetricsData;
    }
    return {
      totalNodes: 0,
      completedNodes: 0,
      failedNodes: 0,
      averageNodeDuration: 0,
      longestRunningNode: "",
      bottleneckNodes: [],
      parallelismUtilization: 0
    };
  }

  /**
   * Get execution history for a workflow
   */
  async getExecutionHistory(
    workflowId: string,
    limit: number = 50
  ): Promise<ExecutionHistoryEntry[]> {
    const histories = await this.prisma.executionHistory.findMany({
      where: { workflowId },
      orderBy: { startTime: "desc" },
      take: limit,
    });

    return histories.map((history) => ({
      executionId: history.executionId,
      workflowId: history.workflowId,
      triggerType: history.triggerType,
      startTime: history.startTime.getTime(),
      endTime: history.endTime?.getTime(),
      status: history.status,
      executedNodes: history.executedNodes,
      executionPath: history.executionPath,
      metrics: this.safeMetrics(history.metrics),
    }));
  }

  /**
   * Get specific execution by ID
   */
  async getExecutionById(
    executionId: string
  ): Promise<ExecutionHistoryEntry | null> {
    const history = await this.prisma.executionHistory.findFirst({
      where: { executionId },
    });

    if (!history) return null;

    return {
      executionId: history.executionId,
      workflowId: history.workflowId,
      triggerType: history.triggerType,
      startTime: history.startTime.getTime(),
      endTime: history.endTime?.getTime(),
      status: history.status,
      executedNodes: history.executedNodes,
      executionPath: history.executionPath,
      metrics: this.safeMetrics(history.metrics),
    };
  }

  /**
   * Get all active executions for recovery
   */
  async getActiveExecutions(): Promise<string[]> {
    const executions = await this.prisma.execution.findMany({
      where: {
        status: "RUNNING",
        finishedAt: null,
      },
      select: { id: true },
    });

    return executions.map((exec) => exec.id);
  }

  /**
   * Mark execution as recovered (update status)
   */
  async markExecutionAsRecovered(executionId: string): Promise<void> {
    await this.prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "ERROR", // Mark as error since it was interrupted
        finishedAt: new Date(),
        error: {
          message: "Execution was interrupted and recovered on system restart",
          type: "RECOVERY_ERROR",
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Clean up stale executions older than maxAgeMs
   */
  async cleanupStaleExecutions(maxAgeMs: number): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    // Update stale running executions to error state
    await this.prisma.execution.updateMany({
      where: {
        status: "RUNNING",
        startedAt: {
          lt: cutoffDate,
        },
        finishedAt: null,
      },
      data: {
        status: "ERROR",
        finishedAt: new Date(),
        error: {
          message: "Execution timed out and was automatically cancelled",
          type: "TIMEOUT_ERROR",
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Clean up old flow execution states (older than 7 days)
    const oldCutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.prisma.flowExecutionState.deleteMany({
      where: {
        createdAt: {
          lt: oldCutoffDate,
        },
      },
    });
  }

  /**
   * Map NodeExecutionStatus enum to string for database storage
   */
  private mapStatusToString(status: NodeExecutionStatus): string {
    return NodeExecutionStatus[status].toLowerCase();
  }

  /**
   * Map string from database back to NodeExecutionStatus enum
   */
  private mapStringToStatus(status: string): NodeExecutionStatus {
    const upperStatus =
      status.toUpperCase() as keyof typeof NodeExecutionStatus;
    return NodeExecutionStatus[upperStatus] || NodeExecutionStatus.IDLE;
  }
}

export default FlowExecutionPersistenceServiceImpl;
