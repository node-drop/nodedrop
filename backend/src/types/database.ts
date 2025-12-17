// Core database types matching Drizzle schema
import { ExecutionStatus, NodeExecutionStatus } from "../db/types";
import { NodeProperty } from "./node.types";

// UserRole enum definition (since it might not be exported from @prisma/client)
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN"
}

export interface User {
  id: string;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  userId: string;
  workspaceId?: string | null;
  nodes: Node[];
  connections: Connection[];
  triggers: Trigger[];
  settings: WorkflowSettings;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Node {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  position: { x: number; y: number };
  credentials?: string[];
  disabled: boolean;
  // Group node properties
  parentId?: string;
  extent?: "parent" | [number, number, number, number];
  style?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    [key: string]: any;
  };
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

export interface Trigger {
  id: string;
  type: "webhook" | "schedule" | "manual";
  settings: Record<string, any>;
  active: boolean;
}

export interface WorkflowSettings {
  timezone?: string;
  saveExecutionProgress?: boolean;
  saveDataErrorExecution?: "all" | "none";
  saveDataSuccessExecution?: "all" | "none";
  callerPolicy?: "workflowsFromSameOwner" | "workflowsFromAList" | "any";
  executionTimeout?: number;
  /** ID of workflow to execute when this workflow fails (n8n-style error handling) */
  errorWorkflowId?: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  triggerData?: any;
  error?: ExecutionError;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeExecution {
  id: string;
  nodeId: string;
  executionId: string;
  status: NodeExecutionStatus;
  inputData?: any;
  outputData?: any;
  error?: NodeError;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database credential record
 * Note: For API response types, see Credential in @nodedrop/types
 * This type includes the encrypted data field which is not exposed in API responses
 */
export interface Credential {
  id: string;
  name: string;
  type: string;
  userId: string;
  data: string; // Encrypted - not exposed in API responses
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeType {
  id: string;
  type: string;
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description: string;
  defaults: Record<string, any>;
  inputs: string[];
  outputs: string[];
  properties: NodeProperty[];
  icon?: string;
  color?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export Prisma enums for consistency
export { ExecutionStatus, NodeExecutionStatus };

// =============================================================================
// Database Error Types (use Date objects as stored in database)
// For API response error types, see ExecutionError in @nodedrop/types
// =============================================================================

/**
 * Error stored in database execution records
 * Uses Date object for timestamp (as stored by Prisma)
 */
export interface ExecutionError {
  message: string;
  stack?: string;
  timestamp: Date;
  nodeId?: string;
}

/**
 * Error stored in database node execution records
 */
export interface NodeError {
  message: string;
  stack?: string;
  timestamp: Date;
  httpCode?: number;
}

// Node property types are defined in node.types.ts

// Filter types
export interface WorkflowFilters {
  search?: string;
  active?: boolean;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface ExecutionFilters {
  status?: ExecutionStatus;
  workflowId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Result types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: ExecutionError;
}

export interface NodeResult {
  success: boolean;
  data?: any;
  error?: NodeError;
}
