/**
 * @nodedrop/types
 * 
 * Shared TypeScript type definitions for NodeDrop workflow automation platform.
 * This package provides a single source of truth for all shared types between
 * frontend and backend.
 * 
 * Types are inferred from Zod schemas to ensure runtime validation and compile-time
 * type safety are always in sync.
 * 
 * Schemas are exported alongside types from each module (node.ts, workflow.ts, common.ts).
 * Validation utilities are exported from the schemas/validation module.
 */

// Workflow types and schemas
export * from "./workflow";

// Node types and schemas
export * from "./node";

// Execution types
export * from "./execution";

// API types
export * from "./api";

// Common utility types and schemas
export * from "./common";

// Workspace types and schemas
export * from "./workspace";

// Team types and schemas
export * from "./team";

// Variable types and schemas
export * from "./variable";

// Credential types and schemas
export * from "./credential";

// Environment types and schemas
export * from "./environment";

// Edition configuration
export * from "./edition";

// =============================================================================
// API Request Schemas Export
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
  
  // Workflow API schemas
  CreateWorkflowSchema,
  type CreateWorkflowRequest,
  UpdateWorkflowSchema,
  type UpdateWorkflowRequest,
  WorkflowQuerySchema,
  type WorkflowQuery,
  
  // Execution API schemas
  ExecuteWorkflowSchema,
  type ExecuteWorkflowRequest,
  ExecutionQuerySchema,
  type ExecutionQuery,
  
  // Node API schemas
  NodeQuerySchema,
  type NodeQuery,
} from "./schemas/api.schemas";

// =============================================================================
// Validation Utilities Export
// =============================================================================

// Export validation utilities directly (these don't conflict with type exports)
export {
  validate,
  safeParse,
  parse,
  createPartialSchema,
  formatZodError,
  formatZodErrorString,
  formatPath,
  isZodError,
  isValidationSuccess,
  isValidationFailure,
  type ValidationResult,
} from "./schemas/validation";
