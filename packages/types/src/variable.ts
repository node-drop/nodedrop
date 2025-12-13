/**
 * @nodedrop/types - Variable Types
 *
 * Shared variable-related type definitions.
 * These types are used by both frontend and backend.
 */

import { z } from "zod";

// =============================================================================
// Variable Scope Schema
// =============================================================================

export const VariableScopeSchema = z.enum(["GLOBAL", "LOCAL"]);

// =============================================================================
// Variable Schemas
// =============================================================================

export const VariableSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable().optional(),
  scope: VariableScopeSchema.optional(),
  workflowId: z.string().nullable().optional(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// =============================================================================
// Variable Request Schemas
// =============================================================================

export const CreateVariableRequestSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional(),
  scope: VariableScopeSchema.optional(),
  workflowId: z.string().optional(),
});

export const UpdateVariableRequestSchema = z.object({
  key: z.string().optional(),
  value: z.string().optional(),
  description: z.string().nullable().optional(),
});

export const VariableQueryOptionsSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sortBy: z.enum(["key", "createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// =============================================================================
// Variable Response Schemas
// =============================================================================

export const VariablesPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
});

export const VariablesResponseSchema = z.object({
  variables: z.array(VariableSchema),
  pagination: VariablesPaginationSchema,
});

export const BulkUpsertVariablesRequestSchema = z.object({
  variables: z.array(CreateVariableRequestSchema),
});

export const BulkUpsertVariablesResponseSchema = z.object({
  created: z.number(),
  updated: z.number(),
  variables: z.array(VariableSchema),
});

export const VariableStatsResponseSchema = z.object({
  totalVariables: z.number(),
  recentlyCreated: z.number(),
  recentlyUpdated: z.number(),
});

export const VariableReplaceRequestSchema = z.object({
  text: z.string(),
});

export const VariableReplaceResponseSchema = z.object({
  originalText: z.string(),
  replacedText: z.string(),
  variablesFound: z.array(z.string()),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type VariableScope = z.infer<typeof VariableScopeSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type CreateVariableRequest = z.infer<typeof CreateVariableRequestSchema>;
export type UpdateVariableRequest = z.infer<typeof UpdateVariableRequestSchema>;
export type VariableQueryOptions = z.infer<typeof VariableQueryOptionsSchema>;
export type VariablesPagination = z.infer<typeof VariablesPaginationSchema>;
export type VariablesResponse = z.infer<typeof VariablesResponseSchema>;
export type BulkUpsertVariablesRequest = z.infer<typeof BulkUpsertVariablesRequestSchema>;
export type BulkUpsertVariablesResponse = z.infer<typeof BulkUpsertVariablesResponseSchema>;
export type VariableStatsResponse = z.infer<typeof VariableStatsResponseSchema>;
export type VariableReplaceRequest = z.infer<typeof VariableReplaceRequestSchema>;
export type VariableReplaceResponse = z.infer<typeof VariableReplaceResponseSchema>;
