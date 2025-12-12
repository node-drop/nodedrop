/**
 * API Types - Re-exported from @nodedrop/types
 * 
 * This file re-exports shared API types and schemas from the types package.
 * All API types are now defined in @nodedrop/types for consistency
 * between frontend and backend.
 */

// Response types
export type {
  ApiResponse,
  ApiError,
  ApiErrorDetails,
  ApiWarning,
  PaginatedResponse,
  PaginationMeta,
  PaginationParams,
  RequestConfig,
  ListQueryParams,
  IdParam,
} from "@nodedrop/types";

// Request validation schemas (can be used for form validation)
export {
  // ID schemas
  IdParamSchema,
  
  // Pagination schemas
  PaginationQuerySchema,
  type PaginationQuery,
  LimitQuerySchema,
  type LimitQuery,
  
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
