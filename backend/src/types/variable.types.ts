/**
 * Variable Types
 * 
 * Re-exports shared types from @nodedrop/types.
 */

// =============================================================================
// Re-export shared types from @nodedrop/types
// =============================================================================
export {
  // Types
  type VariableScope,
  type Variable,
  type CreateVariableRequest,
  type UpdateVariableRequest,
  type VariableQueryOptions,
  type VariablesPagination,
  type VariablesResponse,
  type BulkUpsertVariablesRequest,
  type BulkUpsertVariablesResponse,
  type VariableStatsResponse,
  type VariableReplaceRequest,
  type VariableReplaceResponse,
  // Schemas
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
