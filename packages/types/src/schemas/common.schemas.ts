/**
 * @nodedrop/types - Common Zod Schemas
 *
 * Zod schemas for common utility types used across packages.
 * These schemas are the single source of truth - TypeScript types are inferred from them.
 */

import { z } from "zod";

// =============================================================================
// JSON Type Schemas
// =============================================================================

/**
 * Valid JSON primitive types
 */
export const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type JsonPrimitive = z.infer<typeof JsonPrimitiveSchema>;

/**
 * Valid JSON value (recursive definition)
 * Note: Using z.lazy for recursive types
 */
export const JsonValueSchema: z.ZodType<
  string | number | boolean | null | { [key: string]: unknown } | unknown[]
> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ])
);
export type JsonValue = z.infer<typeof JsonValueSchema>;

/**
 * Valid JSON object type
 */
export const JsonObjectSchema = z.record(JsonValueSchema);
export type JsonObject = z.infer<typeof JsonObjectSchema>;

/**
 * Valid JSON array type
 */
export const JsonArraySchema = z.array(JsonValueSchema);
export type JsonArray = z.infer<typeof JsonArraySchema>;

// =============================================================================
// Node Output Schemas
// =============================================================================

/**
 * Standard node output item structure
 * Nodes output data wrapped in a json property for consistency
 */
export const NodeOutputItemSchema = z.object({
  json: JsonObjectSchema,
  binary: z.record(z.unknown()).optional(),
  pairedItem: z
    .object({
      item: z.number(),
      input: z.number().optional(),
    })
    .optional(),
});
export type NodeOutputItem = z.infer<typeof NodeOutputItemSchema>;

// =============================================================================
// Expression Context Schemas
// =============================================================================

/**
 * Workflow metadata available in expression context
 */
export const ExpressionWorkflowContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
});
export type ExpressionWorkflowContext = z.infer<typeof ExpressionWorkflowContextSchema>;

/**
 * Execution metadata available in expression context
 */
export const ExpressionExecutionContextSchema = z.object({
  id: z.string(),
  mode: z.string(),
});
export type ExpressionExecutionContext = z.infer<typeof ExpressionExecutionContextSchema>;

/**
 * Expression context for workflow expression evaluation
 * This is the data structure available to expressions like $json, $node, etc.
 * Includes index signature for compatibility with Record<string, unknown>
 */
export const ExpressionContextSchema = z
  .object({
    /** Direct access to immediate input data */
    $json: z.union([JsonObjectSchema, JsonArraySchema]),
    /** Access to specific node outputs by name or ID */
    $node: z.record(JsonObjectSchema),
    /** Workflow metadata */
    $workflow: ExpressionWorkflowContextSchema,
    /** Execution metadata */
    $execution: ExpressionExecutionContextSchema,
    /** Workflow variables */
    $vars: z.record(z.string()),
    /** Current item index (0-based) */
    $itemIndex: z.number(),
    /** Current timestamp (ISO string) */
    $now: z.string().optional(),
    /** Current date (YYYY-MM-DD) */
    $today: z.string().optional(),
  })
  .catchall(z.unknown());
export type ExpressionContext = z.infer<typeof ExpressionContextSchema>;

// =============================================================================
// Variable Category Schemas (for autocomplete suggestions)
// =============================================================================

/**
 * Variable type for autocomplete suggestions
 */
export const VariableTypeSchema = z.enum(["variable", "property"]);
export type VariableType = z.infer<typeof VariableTypeSchema>;

/**
 * Variable category item for autocomplete suggestions
 */
export const VariableCategoryItemSchema = z.object({
  label: z.string(),
  type: VariableTypeSchema,
  description: z.string(),
  insertText: z.string(),
});
export type VariableCategoryItem = z.infer<typeof VariableCategoryItemSchema>;

/**
 * Variable category for grouping autocomplete suggestions
 */
export const VariableCategorySchema = z.object({
  name: z.string(),
  icon: z.string(),
  items: z.array(VariableCategoryItemSchema),
});
export type VariableCategory = z.infer<typeof VariableCategorySchema>;

// =============================================================================
// ID and Reference Type Schemas
// =============================================================================

/**
 * Unique identifier type (typically CUID or UUID)
 */
export const IDSchema = z.string();
export type ID = z.infer<typeof IDSchema>;

/**
 * User identifier
 */
export const UserIdSchema = z.string();
export type UserId = z.infer<typeof UserIdSchema>;

/**
 * Workflow identifier
 */
export const WorkflowIdSchema = z.string();
export type WorkflowId = z.infer<typeof WorkflowIdSchema>;

/**
 * Node identifier within a workflow
 */
export const NodeIdSchema = z.string();
export type NodeId = z.infer<typeof NodeIdSchema>;

/**
 * Execution identifier
 */
export const ExecutionIdSchema = z.string();
export type ExecutionId = z.infer<typeof ExecutionIdSchema>;

/**
 * Credential identifier
 */
export const CredentialIdSchema = z.string();
export type CredentialId = z.infer<typeof CredentialIdSchema>;

/**
 * Team identifier
 */
export const TeamIdSchema = z.string();
export type TeamId = z.infer<typeof TeamIdSchema>;

/**
 * Workspace identifier
 */
export const WorkspaceIdSchema = z.string();
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;

// =============================================================================
// Timestamp Type Schemas
// =============================================================================

/**
 * ISO 8601 date string
 */
export const ISODateStringSchema = z.string();
export type ISODateString = z.infer<typeof ISODateStringSchema>;

/**
 * Unix timestamp in milliseconds
 */
export const UnixTimestampSchema = z.number();
export type UnixTimestamp = z.infer<typeof UnixTimestampSchema>;

/**
 * Flexible timestamp that accepts both Date objects and ISO strings
 */
export const TimestampSchema = z.union([z.date(), z.string()]);
export type Timestamp = z.infer<typeof TimestampSchema>;

// =============================================================================
// Result Type Schemas
// =============================================================================

/**
 * Success result type
 */
export const SuccessResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

/**
 * Error result type
 */
export const ErrorResultSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});
export type ErrorResult = z.infer<typeof ErrorResultSchema>;

/**
 * Generic result schema factory
 */
export const ResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([SuccessResultSchema(dataSchema), ErrorResultSchema]);

// =============================================================================
// Validation Result Schemas
// =============================================================================

/**
 * Validation error structure
 */
export const ValidationErrorSchema = z.object({
  path: z.array(z.string()),
  message: z.string(),
  code: z.string(),
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Validation result structure
 */
export const ValidationResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    errors: z.array(ValidationErrorSchema).optional(),
  });
