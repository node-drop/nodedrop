/**
 * Variable Types - Re-exported from @nodedrop/types
 * 
 * This file re-exports shared variable types from the types package.
 * All variable types are now defined in @nodedrop/types for consistency
 * between frontend and backend.
 */

// Re-export all variable types from shared package
export type {
  VariableScope,
  Variable,
  CreateVariableRequest,
  UpdateVariableRequest,
  VariableQueryOptions,
  VariablesPagination,
  VariablesResponse,
  BulkUpsertVariablesRequest,
  BulkUpsertVariablesResponse,
  VariableStatsResponse,
  VariableReplaceRequest,
  VariableReplaceResponse,
} from "@nodedrop/types";

// Re-export schemas for validation
export {
  VariableScopeSchema,
  VariableSchema,
  CreateVariableRequestSchema,
  UpdateVariableRequestSchema,
  VariableQueryOptionsSchema,
  VariablesResponseSchema,
  BulkUpsertVariablesRequestSchema,
  BulkUpsertVariablesResponseSchema,
  VariableStatsResponseSchema,
  VariableReplaceRequestSchema,
  VariableReplaceResponseSchema,
} from "@nodedrop/types";
