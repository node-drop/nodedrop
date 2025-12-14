/**
 * @nodedrop/types - Validation Utilities
 *
 * Utility functions for validating data against Zod schemas.
 * Provides consistent error handling and formatting across the platform.
 */

import { z, ZodError, ZodIssue } from "zod";
import { ValidationError } from "./common.schemas";

// Re-export ValidationError for convenience
export type { ValidationError };

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Result of a validation operation
 */
export interface ValidationResult<T> {
  /** Whether validation succeeded */
  success: boolean;
  /** Validated and typed data (only present if success is true) */
  data?: T;
  /** Array of validation errors (only present if success is false) */
  errors?: ValidationError[];
}

// =============================================================================
// Error Formatting Utilities
// =============================================================================

/**
 * Converts a Zod issue path to a string array
 * Handles both string and number path segments
 */
function pathToStringArray(path: (string | number)[]): string[] {
  return path.map((segment) => String(segment));
}

/**
 * Formats a Zod issue path as a dot-notation string
 * Arrays are formatted with bracket notation: nodes[0].parameters.url
 *
 * @param path - Array of path segments
 * @returns Formatted path string
 */
export function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return "";

  return path.reduce<string>((acc, segment, index) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    if (index === 0) {
      return segment;
    }
    return `${acc}.${segment}`;
  }, "");
}

/**
 * Converts a single Zod issue to a ValidationError
 *
 * @param issue - Zod validation issue
 * @returns Formatted ValidationError
 */
function issueToValidationError(issue: ZodIssue): ValidationError {
  return {
    path: pathToStringArray(issue.path),
    message: issue.message,
    code: issue.code,
  };
}

/**
 * Formats a ZodError into an array of human-readable ValidationError objects
 *
 * @param error - ZodError from failed validation
 * @returns Array of formatted validation errors
 */
export function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map(issueToValidationError);
}

/**
 * Formats a ZodError into a single human-readable string
 * Useful for logging or simple error displays
 *
 * @param error - ZodError from failed validation
 * @returns Formatted error string
 */
export function formatZodErrorString(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = formatPath(issue.path);
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates data against a Zod schema and returns a ValidationResult
 *
 * This function never throws - it always returns a result object with
 * success/error information. Use this for consistent error handling.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with success status and either data or errors
 *
 * @example
 * ```typescript
 * const result = validate(WorkflowSchema, unknownData);
 * if (result.success) {
 *   // result.data is typed as Workflow
 *   console.log(result.data.name);
 * } else {
 *   // result.errors contains validation errors
 *   console.error(result.errors);
 * }
 * ```
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: formatZodError(result.error),
  };
}

/**
 * Wrapper around Zod's safeParse that never throws
 *
 * This is a thin wrapper that provides the same interface as Zod's safeParse
 * but is guaranteed to never throw an exception, even for edge cases.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Zod SafeParseReturnType with success/error information
 *
 * @example
 * ```typescript
 * const result = safeParse(NodePropertySchema, data);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.issues);
 * }
 * ```
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): z.SafeParseReturnType<unknown, T> {
  try {
    return schema.safeParse(data);
  } catch (error) {
    // This should never happen with safeParse, but we handle it just in case
    // to guarantee the non-throwing contract
    return {
      success: false,
      error: new ZodError([
        {
          code: "custom",
          path: [],
          message:
            error instanceof Error
              ? error.message
              : "Unknown validation error",
        },
      ]),
    };
  }
}

/**
 * Validates data and throws if validation fails
 *
 * Use this when you want to fail fast on invalid data.
 * For non-throwing validation, use validate() or safeParse().
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const workflow = parse(WorkflowSchema, unknownData);
 *   // workflow is typed as Workflow
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     console.error(formatZodError(error));
 *   }
 * }
 * ```
 */
export function parse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Creates a partial version of a schema for validating partial updates
 *
 * @param schema - Zod object schema to make partial
 * @returns Partial schema where all fields are optional
 *
 * @example
 * ```typescript
 * const PartialWorkflowSchema = createPartialSchema(WorkflowSchema);
 * const result = validate(PartialWorkflowSchema, { name: "Updated Name" });
 * ```
 */
export function createPartialSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> {
  return schema.partial();
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a ZodError
 *
 * @param error - Value to check
 * @returns True if the value is a ZodError
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Type guard to check if a validation result is successful
 *
 * @param result - ValidationResult to check
 * @returns True if validation succeeded
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationResult<T> & { success: true; data: T } {
  return result.success === true && result.data !== undefined;
}

/**
 * Type guard to check if a validation result is a failure
 *
 * @param result - ValidationResult to check
 * @returns True if validation failed
 */
export function isValidationFailure<T>(
  result: ValidationResult<T>
): result is ValidationResult<T> & { success: false; errors: ValidationError[] } {
  return result.success === false && result.errors !== undefined;
}
