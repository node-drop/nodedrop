/**
 * API Types - Re-exported from @nodedrop/types
 * 
 * This file re-exports shared API schemas and types from the types package.
 * All API schemas are now defined in @nodedrop/types for consistency
 * between frontend and backend.
 */

// =============================================================================
// Re-export all API schemas from shared package
// =============================================================================

export {
  // ID schemas
  IdParamSchema,
  type IdParam,
  
  // Pagination schemas
  PaginationQuerySchema,
  type PaginationQuery,
  LimitQuerySchema,
  type LimitQuery,
  ScheduledExecutionsQuerySchema,
  type ScheduledExecutionsQuery,
  TriggerEventsQuerySchema,
  type TriggerEventsQuery,
  DeploymentHistoryQuerySchema,
  type DeploymentHistoryQuery,
  
  // Auth schemas
  LoginSchema,
  type LoginRequest,
  RegisterSchema,
  type RegisterRequest,
  ForgotPasswordSchema,
  type ForgotPasswordRequest,
  
  // Workflow schemas
  CreateWorkflowSchema,
  type CreateWorkflowRequest,
  UpdateWorkflowSchema,
  type UpdateWorkflowRequest,
  WorkflowQuerySchema,
  type WorkflowQuery,
  
  // Execution schemas
  ExecuteWorkflowSchema,
  type ExecuteWorkflowRequest,
  ExecutionQuerySchema,
  type ExecutionQuery,
  
  // Node schemas
  NodeQuerySchema,
  type NodeQuery,
} from "@nodedrop/types";

// =============================================================================
// Backward compatibility type aliases
// =============================================================================

import type {
  PaginationQuery,
  LimitQuery,
  ScheduledExecutionsQuery,
  TriggerEventsQuery,
  DeploymentHistoryQuery,
  WorkflowQuery,
  ExecutionQuery,
  NodeQuery,
  ExecuteWorkflowRequest,
} from "@nodedrop/types";

/** @deprecated Use WorkflowQuery instead */
export type WorkflowQueryRequest = WorkflowQuery;
/** @deprecated Use ExecuteWorkflowRequest instead */
export type ExecuteWorkflowRequestAlias = ExecuteWorkflowRequest;
/** @deprecated Use ExecutionQuery instead */
export type ExecutionQueryRequest = ExecutionQuery;
/** @deprecated Use NodeQuery instead */
export type NodeQueryRequest = NodeQuery;
/** @deprecated Use LimitQuery instead */
export type LimitQueryRequest = LimitQuery;
/** @deprecated Use ScheduledExecutionsQuery instead */
export type ScheduledExecutionsQueryRequest = ScheduledExecutionsQuery;
/** @deprecated Use TriggerEventsQuery instead */
export type TriggerEventsQueryRequest = TriggerEventsQuery;
/** @deprecated Use DeploymentHistoryQuery instead */
export type DeploymentHistoryQueryRequest = DeploymentHistoryQuery;

// =============================================================================
// Response types (kept here as they're backend-specific format)
// =============================================================================

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
