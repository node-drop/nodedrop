/**
 * Backend Type Definitions
 * 
 * This module exports all backend types, combining:
 * - Database types (Prisma-compatible with Date objects)
 * - API validation schemas
 * - Execution engine types
 * - Node system types
 * - Workspace types
 * 
 * For shared types between frontend and backend, see @nodedrop/types
 */

// API validation schemas
export * from "./api";

// Database types (Prisma-compatible)
export * from "./database";

// Execution types - re-export from @nodedrop/types via execution.types
// Note: ExecutionError from execution.types is for API responses (string timestamps)
// while ExecutionError from database.ts is for database records (Date objects)
export {
    // Enums (runtime values)
    NodeExecutionStatus
} from "./execution.types";

export type {

    // Error types (API response format)
    ExecutionError as ApiExecutionError, ExecutionDetails, ExecutionEngineError, ExecutionEvent,
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
    ExecutionStatus as ExecutionStatusType, FlowExecutionState, FlowOverallStatus, NodeExecutionError, NodeExecutionEvent,
    // Node execution types
    NodeExecutionState,
    // Execution metrics & history
    NodeMetrics, NodeVisualState, RetryConfig, SingleNodeExecutionRequest,
    SingleNodeExecutionResult
} from "./execution.types";

// Node system types
export * from "./node.types";

// Workspace types (multi-tenancy)
export * from "./workspace.types";

// Variable types
export * from "./variable.types";
