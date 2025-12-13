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
  // Enums
  NodeExecutionStatus,
  
  // Status types
  ExecutionStatus as ExecutionStatusType,
  FlowOverallStatus,
  
  // Error types (API response format)
  ExecutionError as ApiExecutionError,
  ExecutionEngineError,
  NodeExecutionError,
  
  // Node execution types
  NodeExecutionState,
  NodeVisualState,
  
  // Execution progress & status
  ExecutionProgress,
  ExecutionFlowStatus,
  FlowExecutionState,
  
  // Execution events
  ExecutionEventType,
  ExecutionEvent,
  ExecutionEventData,
  NodeExecutionEvent,
  ExecutionLogEntry,
  
  // Execution metrics & history
  NodeMetrics,
  ExecutionMetrics,
  ExecutionMetricsExtended,
  ExecutionHistoryEntry,
  
  // Execution requests & responses
  ExecutionRequest,
  ExecutionResponse,
  SingleNodeExecutionRequest,
  SingleNodeExecutionResult,
  ExecutionDetails,
  
  // Execution configuration
  ExecutionOptions,
  RetryConfig,
  
  // Execution statistics
  ExecutionStats,
} from "./execution.types";

// Node system types
export * from "./node.types";

// Workspace types (multi-tenancy)
export * from "./workspace.types";

// Variable types
export * from "./variable.types";
