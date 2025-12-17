/**
 * Database Type Exports
 * 
 * This file exports types and enums that were previously imported from @prisma/client.
 * These are now defined as string literals to match Drizzle's text-based enum approach.
 */

// Execution status enum values
export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  TIMEOUT = 'TIMEOUT',
}

// Node execution status enum values
export enum NodeExecutionStatus {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  QUEUED = 'QUEUED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  SKIPPED = 'SKIPPED',
  IDLE = 'IDLE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Workspace role enum values
export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// User role enum values
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// Type guards for runtime validation
export function isExecutionStatus(value: unknown): value is ExecutionStatus {
  return Object.values(ExecutionStatus).includes(value as ExecutionStatus);
}

export function isNodeExecutionStatus(value: unknown): value is NodeExecutionStatus {
  return Object.values(NodeExecutionStatus).includes(value as NodeExecutionStatus);
}

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return Object.values(WorkspaceRole).includes(value as WorkspaceRole);
}

export function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}
