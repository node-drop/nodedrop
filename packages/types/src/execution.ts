/**
 * Consolidated execution types - Single source of truth
 * All execution-related types should be defined here
 * 
 * This module consolidates execution types from both frontend and backend
 * to ensure consistent type definitions across the application.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Status of a node during workflow execution
 * Represents all possible states a node can be in during execution
 */
export enum NodeExecutionStatus {
  /** Node has not started execution */
  IDLE = "idle",
  /** Node is waiting to be executed */
  QUEUED = "queued",
  /** Node is currently executing */
  RUNNING = "running",
  /** Node execution completed successfully */
  COMPLETED = "completed",
  /** Node execution failed with an error */
  FAILED = "failed",
  /** Node execution was cancelled */
  CANCELLED = "cancelled",
  /** Node was skipped (e.g., due to condition not met) */
  SKIPPED = "skipped",
}

/**
 * Overall status of a workflow execution
 */
export type ExecutionStatus = 
  | "running" 
  | "success" 
  | "error" 
  | "cancelled" 
  | "paused" 
  | "partial";

/**
 * Overall status of a flow execution
 */
export type FlowOverallStatus = 
  | "running" 
  | "completed" 
  | "failed" 
  | "cancelled";

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Represents an error that occurred during execution
 * Used for both node-level and workflow-level errors
 */
export interface ExecutionError {
  /** Error message */
  message: string;
  /** Error code for categorization */
  code?: string;
  /** Additional error details */
  details?: any;
  /** Stack trace (if available) */
  stack?: string;
  /** ID of the node where error occurred (if applicable) */
  nodeId?: string;
  /** Timestamp when error occurred - supports both number (ms) and ISO string */
  timestamp: number | string;
}

/**
 * Extended error type used by the execution engine
 * Includes additional metadata for retry logic
 */
export interface ExecutionEngineError {
  /** Error message */
  message: string;
  /** Stack trace */
  stack?: string;
  /** ID of the node where error occurred */
  nodeId?: string;
  /** Timestamp when error occurred */
  timestamp: Date | number | string;
  /** Error code for categorization */
  code?: string;
  /** Whether this error can be retried */
  retryable?: boolean;
}

/**
 * Detailed error information for node execution failures
 */
export interface NodeExecutionError {
  /** Type of error */
  type: 'timeout' | 'network' | 'validation' | 'security' | 'server' | 'unknown';
  /** Technical error message */
  message: string;
  /** User-friendly error message for display */
  userFriendlyMessage: string;
  /** Whether the operation can be retried */
  isRetryable: boolean;
  /** Suggested delay before retry (in ms) */
  retryAfter?: number;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Additional error details */
  details?: any;
}

// ============================================================================
// NODE EXECUTION TYPES
// ============================================================================

/**
 * State of a single node during execution
 * Tracks execution progress, timing, and data flow
 */
export interface NodeExecutionState {
  /** Unique identifier of the node */
  nodeId: string;
  /** Current execution status */
  status: NodeExecutionStatus;
  /** Timestamp when execution started (ms since epoch) */
  startTime?: number;
  /** Timestamp when execution ended (ms since epoch) */
  endTime?: number;
  /** Duration of execution in milliseconds */
  duration?: number;
  /** Execution progress (0-100) */
  progress?: number;
  /** Error information if execution failed */
  error?: ExecutionError | any;
  /** Input data received by the node */
  inputData?: any;
  /** Output data produced by the node */
  outputData?: any;
  /** IDs of nodes this node depends on */
  dependencies?: string[];
  /** IDs of nodes that depend on this node */
  dependents?: string[];
  /** Order in which this node was executed */
  executionOrder?: number;
}

/**
 * Visual state of a node for UI rendering
 * Used to drive animations and visual feedback
 */
export interface NodeVisualState {
  /** Unique identifier of the node */
  nodeId: string;
  /** Current execution status */
  status: NodeExecutionStatus;
  /** Execution progress (0-100) */
  progress: number;
  /** Current animation state for UI */
  animationState: "idle" | "pulsing" | "spinning" | "success" | "error";
  /** Timestamp of last state update */
  lastUpdated: number;
  /** Execution time in milliseconds */
  executionTime?: number;
  /** Error message for display */
  errorMessage?: string;
}

// ============================================================================
// EXECUTION PROGRESS & STATUS
// ============================================================================

/**
 * Progress information for a workflow execution
 * Used for tracking and displaying execution progress
 */
export interface ExecutionProgress {
  /** Unique identifier of the execution */
  executionId: string;
  /** Total number of nodes in the workflow */
  totalNodes: number;
  /** Number of nodes that completed successfully */
  completedNodes: number;
  /** Number of nodes that failed */
  failedNodes: number;
  /** ID of the currently executing node */
  currentNode?: string;
  /** Overall execution status */
  status: ExecutionStatus;
  /** Timestamp when execution started */
  startedAt: string | Date;
  /** Timestamp when execution finished */
  finishedAt?: string | Date;
  /** Error information if execution failed */
  error?: ExecutionError | ExecutionEngineError;
}

/**
 * Comprehensive status of a flow execution
 * Includes detailed state for all nodes and execution path
 */
export interface ExecutionFlowStatus {
  /** Unique identifier of the execution */
  executionId: string;
  /** Overall status of the flow */
  overallStatus: FlowOverallStatus;
  /** Overall progress percentage (0-100) */
  progress: number;
  /** Map of node IDs to their execution states */
  nodeStates: Map<string, NodeExecutionState>;
  /** IDs of nodes currently being executed */
  currentlyExecuting: string[];
  /** IDs of nodes that completed successfully */
  completedNodes: string[];
  /** IDs of nodes that failed */
  failedNodes: string[];
  /** IDs of nodes waiting to be executed */
  queuedNodes: string[];
  /** Ordered list of node IDs in execution path */
  executionPath: string[];
  /** Edges currently being traversed (for UI animation) */
  activeEdges?: Set<string>;
  /** Edges that have been traversed */
  completedEdges?: Set<string>;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
}

/**
 * State of the flow execution system
 * Used by the frontend to track multiple concurrent executions
 */
export interface FlowExecutionState {
  /** Map of execution IDs to their flow status */
  activeExecutions: Map<string, ExecutionFlowStatus>;
  /** Map of node IDs to their visual states */
  nodeVisualStates: Map<string, NodeVisualState>;
  /** History of past executions */
  executionHistory: ExecutionHistoryEntry[];
  /** Whether real-time updates are enabled */
  realTimeUpdates: boolean;
  /** Currently selected execution for viewing */
  selectedExecution?: string;
}

// ============================================================================
// EXECUTION EVENTS (Socket.io / WebSocket)
// ============================================================================

/**
 * Event types for execution lifecycle
 */
export type ExecutionEventType = 
  | 'started' 
  | 'node-started' 
  | 'node-completed' 
  | 'node-failed' 
  | 'completed' 
  | 'failed' 
  | 'cancelled'
  | 'node-status-update'
  | 'execution-progress';

/**
 * Event emitted during workflow execution
 * Used for real-time updates via WebSocket
 */
export interface ExecutionEvent {
  /** Unique identifier of the execution */
  executionId: string;
  /** Type of event */
  type: ExecutionEventType;
  /** ID of the affected node (if applicable) */
  nodeId?: string;
  /** Additional event data */
  data?: any;
  /** Error information (for failure events) */
  error?: ExecutionError;
  /** Timestamp when event occurred */
  timestamp: Date | string;
}

/**
 * Extended event data for execution events
 * Includes additional fields for status updates
 */
export interface ExecutionEventData {
  /** Unique identifier of the execution */
  executionId: string;
  /** Type of event */
  type: ExecutionEventType;
  /** ID of the affected node (if applicable) */
  nodeId?: string;
  /** Current status of the node */
  status?: NodeExecutionStatus;
  /** Execution progress (0-100) */
  progress?: number;
  /** Additional event data */
  data?: any;
  /** Error information */
  error?: ExecutionEngineError;
  /** Timestamp when event occurred */
  timestamp: Date | string;
}

/**
 * Event for node-specific execution updates
 */
export interface NodeExecutionEvent {
  /** Unique identifier of the execution */
  executionId: string;
  /** ID of the node */
  nodeId: string;
  /** Type of node event */
  type: 'started' | 'completed' | 'failed';
  /** Additional event data */
  data?: any;
  /** Timestamp when event occurred */
  timestamp: string;
}

/**
 * Log entry for execution debugging and monitoring
 */
export interface ExecutionLogEntry {
  /** Execution ID (optional - some logs are not tied to a specific execution) */
  executionId?: string;
  /** Log level */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** Log message */
  message: string;
  /** ID of the related node (if applicable) */
  nodeId?: string;
  /** Additional log data */
  data?: any;
  /** Timestamp when log was created */
  timestamp: Date | string;
}

// ============================================================================
// EXECUTION METRICS & HISTORY
// ============================================================================

/**
 * Metrics for a single node execution
 */
export interface NodeMetrics {
  /** ID of the node */
  nodeId: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Size of input data in bytes */
  inputSize: number;
  /** Size of output data in bytes */
  outputSize: number;
  /** Number of retry attempts */
  retryCount: number;
}

/**
 * Aggregated metrics for a workflow execution
 */
export interface ExecutionMetrics {
  /** Total number of nodes */
  totalNodes: number;
  /** Number of completed nodes */
  completedNodes: number;
  /** Number of failed nodes */
  failedNodes: number;
  /** Average duration per node in milliseconds */
  averageNodeDuration: number;
  /** ID of the longest running node */
  longestRunningNode: string;
  /** IDs of nodes that are bottlenecks */
  bottleneckNodes: string[];
  /** Parallelism utilization (0-1) */
  parallelismUtilization: number;
}

/**
 * Extended execution metrics with system resource usage
 */
export interface ExecutionMetricsExtended extends ExecutionMetrics {
  /** Unique identifier of the execution */
  executionId: string;
  /** Total execution duration in milliseconds */
  totalDuration: number;
  /** Map of node IDs to their metrics */
  nodeMetrics: Map<string, NodeMetrics>;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
}

/**
 * Entry in the execution history
 */
export interface ExecutionHistoryEntry {
  /** Unique identifier of the execution */
  executionId: string;
  /** ID of the workflow that was executed */
  workflowId: string;
  /** Type of trigger that started the execution */
  triggerType: string;
  /** Timestamp when execution started (ms since epoch) */
  startTime: number;
  /** Timestamp when execution ended (ms since epoch) */
  endTime?: number;
  /** Final status of the execution */
  status: string;
  /** IDs of nodes that were executed */
  executedNodes: string[];
  /** Ordered list of node IDs in execution path */
  executionPath: string[];
  /** Execution metrics */
  metrics: ExecutionMetrics;
}

// ============================================================================
// EXECUTION REQUESTS & RESPONSES
// ============================================================================

/**
 * Request to execute a workflow
 */
export interface ExecutionRequest {
  /** ID of the workflow to execute */
  workflowId: string;
  /** Data from the trigger that started execution */
  triggerData?: any;
  /** ID of the trigger node */
  triggerNodeId?: string;
  /** Workflow data for execution (optional override) */
  workflowData?: {
    nodes?: any[];
    connections?: any[];
    settings?: any;
  };
  /** Execution options */
  options?: {
    /** Timeout in milliseconds */
    timeout?: number;
    /** Execution priority */
    priority?: "low" | "normal" | "high";
    /** Whether this is a manual execution */
    manual?: boolean;
  };
}

/**
 * Response from workflow execution
 */
export interface ExecutionResponse {
  /** Unique identifier of the execution */
  executionId: string;
  /** Final status of the execution */
  status?: "completed" | "failed" | "cancelled" | "partial";
  /** IDs of nodes that were executed */
  executedNodes?: string[];
  /** IDs of nodes that failed */
  failedNodes?: string[];
  /** Total execution duration in milliseconds */
  duration?: number;
  /** Whether any nodes failed */
  hasFailures?: boolean;
  /** Results from individual node executions */
  nodeExecutions?: Array<{
    nodeId: string;
    outputData?: any;
    error?: any;
  }>;
}

/**
 * Request to execute a single node
 */
export interface SingleNodeExecutionRequest {
  /** ID of the workflow containing the node */
  workflowId: string;
  /** ID of the node to execute */
  nodeId: string;
  /** Input data for the node */
  inputData?: any;
  /** Node parameters override */
  parameters?: Record<string, any>;
  /** Execution mode */
  mode?: "single" | "workflow";
  /** Workflow data for execution context */
  workflowData?: {
    nodes?: any[];
    connections?: any[];
    settings?: any;
  };
}

/**
 * Result from single node execution
 */
export type SingleNodeExecutionResult = ExecutionResponse;

/**
 * Detailed information about an execution
 */
export interface ExecutionDetails {
  /** Unique identifier of the execution */
  id: string;
  /** ID of the workflow that was executed */
  workflowId: string;
  /** Current status of the execution */
  status: ExecutionStatus;
  /** Timestamp when execution started */
  startedAt: string;
  /** Timestamp when execution finished */
  finishedAt?: string;
  /** Data from the trigger */
  triggerData: any;
  /** Error information if execution failed */
  error?: any;
  /** Snapshot of the workflow at execution time */
  workflowSnapshot?: {
    nodes: any[];
    connections: any[];
    settings?: any;
  };
  /** Results from individual node executions */
  nodeExecutions: Array<{
    id: string;
    nodeId: string;
    status: "running" | "success" | "error";
    startedAt: string;
    finishedAt?: string;
    inputData?: any;
    outputData?: any;
    error?: any;
  }>;
}

// ============================================================================
// EXECUTION CONFIGURATION
// ============================================================================

/**
 * Options for workflow execution
 */
export interface ExecutionOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to save execution progress */
  saveProgress?: boolean;
  /** Whether to save execution data */
  saveData?: boolean;
  /** Whether to save execution to database */
  saveToDatabase?: boolean;
  /** Whether this is a manual execution */
  manual?: boolean;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries in milliseconds */
  retryDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Maximum delay between retries in milliseconds */
  maxRetryDelay: number;
  /** Error types that should trigger a retry */
  retryableErrors: string[];
}

// ============================================================================
// EXECUTION STATISTICS
// ============================================================================

/**
 * Statistics about execution system
 */
export interface ExecutionStats {
  /** Total number of executions */
  totalExecutions: number;
  /** Number of currently running executions */
  runningExecutions: number;
  /** Number of completed executions */
  completedExecutions: number;
  /** Number of failed executions */
  failedExecutions: number;
  /** Number of cancelled executions */
  cancelledExecutions: number;
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  /** Current queue size */
  queueSize: number;
}
