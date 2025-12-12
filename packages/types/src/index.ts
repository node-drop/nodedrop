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
