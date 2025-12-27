// Execution engine type definitions
// Re-exports shared types from @nodedrop/types and defines backend-specific types

import {
    Connection,
    Node,
    NodeExecution,
} from "./database";
import { NodeInputData, NodeOutputData } from "./node.types";

// =============================================================================
// Re-export shared types from @nodedrop/types
// =============================================================================
export {
    // Enums
    NodeExecutionStatus
} from "@nodedrop/types";

export type {
    ExecutionDetails, ExecutionEngineError,
    // Error types
    ExecutionError, ExecutionEvent,
    ExecutionEventData,
    // Execution events
    ExecutionEventType, ExecutionFlowStatus, ExecutionHistoryEntry, ExecutionLogEntry, ExecutionMetrics,
    ExecutionMetricsExtended,
    // Execution configuration
    ExecutionOptions,
    // Execution progress & status
    ExecutionProgress,
    // Execution requests & responses
    ExecutionRequest,
    ExecutionResponse,
    // Execution statistics
    ExecutionStats,
    // Status types
    ExecutionStatus, FlowExecutionState, FlowOverallStatus, NodeExecutionError, NodeExecutionEvent,
    // Node execution types
    NodeExecutionState,
    // Execution metrics & history
    NodeMetrics, NodeVisualState, RetryConfig, SingleNodeExecutionRequest,
    SingleNodeExecutionResult
} from "@nodedrop/types";

// Import types we need for backend-specific types

// =============================================================================
// Backend-specific types (not shared with frontend)
// =============================================================================

/**
 * Execution context for workflow execution
 * Contains runtime state during workflow execution
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  triggerData?: any;
  startedAt: Date;
  nodeExecutions: Map<string, NodeExecution>;
  nodeOutputs: Map<string, NodeOutputData[]>;
  nodeIdToName: Map<string, string>;
  cancelled: boolean;
}

/**
 * Job for execution queue
 */
export interface ExecutionJob {
  type: "execute-workflow" | "execute-node" | "cancel-execution";
  data: ExecutionJobData;
}

/**
 * Data for execution job
 */
export interface ExecutionJobData {
  executionId: string;
  workflowId?: string;
  nodeId?: string;
  userId: string;
  triggerData?: any;
  inputData?: NodeInputData;
  retryCount?: number;
}

/**
 * Job for node execution
 */
export interface NodeExecutionJob {
  nodeId: string;
  executionId: string;
  inputData: NodeInputData;
  retryCount: number;
}

/**
 * Graph representation of workflow for execution
 */
export interface ExecutionGraph {
  nodes: Map<string, Node>;
  connections: Connection[];
  adjacencyList: Map<string, string[]>;
  inDegree: Map<string, number>;
  executionOrder: string[];
}

/**
 * Queue configuration for execution engine
 */
export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  concurrency: number;
  removeOnComplete: number;
  removeOnFail: number;
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: "exponential";
      delay: number;
    };
  };
}

/**
 * Metrics data for execution (backend-specific format)
 */
export interface ExecutionMetricsData {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  averageNodeDuration: number;
  longestRunningNode: string;
  bottleneckNodes: string[];
  parallelismUtilization: number;
}
