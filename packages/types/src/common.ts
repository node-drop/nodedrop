/**
 * @nodedrop/types - Common Types
 *
 * Shared utility types, enums, and type aliases used across packages.
 * This module provides common definitions that don't fit into specific domain modules.
 *
 * Types are inferred from Zod schemas where applicable to ensure runtime validation
 * and compile-time type safety are always in sync.
 */

import { z } from "zod";

// Import schemas from the schemas module
import {
  // JSON type schemas
  JsonPrimitiveSchema,
  JsonValueSchema,
  JsonObjectSchema,
  JsonArraySchema,
  // Node output schemas
  NodeOutputItemSchema,
  // Expression context schemas
  ExpressionWorkflowContextSchema,
  ExpressionExecutionContextSchema,
  ExpressionContextSchema,
  // Variable category schemas
  VariableTypeSchema,
  VariableCategoryItemSchema,
  VariableCategorySchema,
  // ID and reference type schemas
  IDSchema,
  UserIdSchema,
  WorkflowIdSchema,
  NodeIdSchema,
  ExecutionIdSchema,
  CredentialIdSchema,
  TeamIdSchema,
  WorkspaceIdSchema,
  // Timestamp type schemas
  ISODateStringSchema,
  UnixTimestampSchema,
  TimestampSchema,
  // Result type schemas
  ErrorResultSchema,
  // Validation schemas
  ValidationErrorSchema,
} from "./schemas/common.schemas";

// =============================================================================
// Re-export Schemas for direct access
// =============================================================================

export {
  JsonPrimitiveSchema,
  JsonValueSchema,
  JsonObjectSchema,
  JsonArraySchema,
  NodeOutputItemSchema,
  ExpressionWorkflowContextSchema,
  ExpressionExecutionContextSchema,
  ExpressionContextSchema,
  VariableTypeSchema,
  VariableCategoryItemSchema,
  VariableCategorySchema,
  IDSchema,
  UserIdSchema,
  WorkflowIdSchema,
  NodeIdSchema,
  ExecutionIdSchema,
  CredentialIdSchema,
  TeamIdSchema,
  WorkspaceIdSchema,
  ISODateStringSchema,
  UnixTimestampSchema,
  TimestampSchema,
  ErrorResultSchema,
  ValidationErrorSchema,
};

// Also re-export schema factories
export { SuccessResultSchema, ResultSchema, ValidationResultSchema } from "./schemas/common.schemas";

// =============================================================================
// ID and Reference Types (inferred from schemas)
// =============================================================================

/**
 * Unique identifier type (typically CUID or UUID)
 */
export type ID = z.infer<typeof IDSchema>;

/**
 * User identifier
 */
export type UserId = z.infer<typeof UserIdSchema>;

/**
 * Workflow identifier
 */
export type WorkflowId = z.infer<typeof WorkflowIdSchema>;

/**
 * Node identifier within a workflow
 */
export type NodeId = z.infer<typeof NodeIdSchema>;

/**
 * Execution identifier
 */
export type ExecutionId = z.infer<typeof ExecutionIdSchema>;

/**
 * Credential identifier
 */
export type CredentialId = z.infer<typeof CredentialIdSchema>;

/**
 * Team identifier
 */
export type TeamId = z.infer<typeof TeamIdSchema>;

/**
 * Workspace identifier
 */
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;

// =============================================================================
// Timestamp Types (inferred from schemas)
// =============================================================================

/**
 * ISO 8601 date string
 */
export type ISODateString = z.infer<typeof ISODateStringSchema>;

/**
 * Unix timestamp in milliseconds
 */
export type UnixTimestamp = z.infer<typeof UnixTimestampSchema>;

/**
 * Flexible timestamp that accepts both Date objects and ISO strings
 */
export type Timestamp = z.infer<typeof TimestampSchema>;

// =============================================================================
// Environment Types (enums - not schema-based)
// =============================================================================

/**
 * Workflow environment types for deployment stages
 */
export enum EnvironmentType {
  DEVELOPMENT = "DEVELOPMENT",
  STAGING = "STAGING",
  PRODUCTION = "PRODUCTION",
}

/**
 * Status of a workflow environment
 */
export enum EnvironmentStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

/**
 * Status of a deployment operation
 */
export enum DeploymentStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  ROLLBACK = "ROLLBACK",
}

// =============================================================================
// Role and Permission Types (string literals - not schema-based)
// =============================================================================

/**
 * User role within the system
 */
export type UserRole = "user" | "admin";

/**
 * Role within a team
 */
export type TeamRole = "OWNER" | "MEMBER" | "VIEWER";

/**
 * Role within a workspace
 */
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

/**
 * Permission level for shared resources
 */
export type SharePermission = "USE" | "VIEW" | "EDIT";

// =============================================================================
// Workspace Plan Types
// =============================================================================

/**
 * Available workspace subscription plans
 */
export type WorkspacePlan = "free" | "pro" | "enterprise";

// =============================================================================
// Sort and Filter Types
// =============================================================================

/**
 * Sort direction for list queries
 */
export type SortOrder = "asc" | "desc";

/**
 * Common sort options
 */
export type SortBy = "name" | "createdAt" | "updatedAt";

// =============================================================================
// Generic Utility Types (TypeScript-only, not schema-based)
// =============================================================================

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes specified keys K of T required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Makes specified keys K of T optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extracts the type of array elements
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Creates a type with all properties of T set to a specific type V
 */
export type RecordOf<T, V> = { [K in keyof T]: V };

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

/**
 * Optional type helper (can be undefined)
 */
export type Optional<T> = T | undefined;

/**
 * Maybe type helper (can be null or undefined)
 */
export type Maybe<T> = T | null | undefined;

// =============================================================================
// JSON Types (inferred from schemas)
// =============================================================================

/**
 * Valid JSON primitive types
 */
export type JsonPrimitive = z.infer<typeof JsonPrimitiveSchema>;

/**
 * Valid JSON array type
 */
export type JsonArray = z.infer<typeof JsonArraySchema>;

/**
 * Valid JSON object type
 */
export type JsonObject = z.infer<typeof JsonObjectSchema>;

/**
 * Any valid JSON value
 */
export type JsonValue = z.infer<typeof JsonValueSchema>;

// =============================================================================
// Result Types
// =============================================================================

/**
 * Success result type
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * Error result type (inferred from schema)
 */
export type ErrorResult = z.infer<typeof ErrorResultSchema>;

/**
 * Result type for operations that can succeed or fail
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

// =============================================================================
// Settings Level Types
// =============================================================================

/**
 * Levels at which settings can be applied
 */
export enum SettingsLevel {
  /** Applied to all nodes globally */
  GLOBAL = "global",
  /** Applied to all nodes in a workflow */
  WORKFLOW = "workflow",
  /** Applied to a specific node */
  NODE = "node",
}

// =============================================================================
// Node Data Types (inferred from schemas)
// =============================================================================

/**
 * Standard node output item structure
 * Nodes output data wrapped in a json property for consistency
 */
export type NodeOutputItem = z.infer<typeof NodeOutputItemSchema>;

/**
 * Workflow metadata available in expression context
 */
export type ExpressionWorkflowContext = z.infer<typeof ExpressionWorkflowContextSchema>;

/**
 * Execution metadata available in expression context
 */
export type ExpressionExecutionContext = z.infer<typeof ExpressionExecutionContextSchema>;

/**
 * Expression context for workflow expression evaluation
 * This is the data structure available to expressions like $json, $node, etc.
 * Includes index signature for compatibility with Record<string, unknown>
 */
export type ExpressionContext = z.infer<typeof ExpressionContextSchema>;

/**
 * Variable type for autocomplete suggestions
 */
export type VariableType = z.infer<typeof VariableTypeSchema>;

/**
 * Variable category item for autocomplete suggestions
 */
export type VariableCategoryItem = z.infer<typeof VariableCategoryItemSchema>;

/**
 * Variable category for grouping autocomplete suggestions
 */
export type VariableCategory = z.infer<typeof VariableCategorySchema>;

// =============================================================================
// Validation Types (inferred from schemas)
// =============================================================================

/**
 * Validation error structure
 */
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
