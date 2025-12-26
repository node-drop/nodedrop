/**
 * Expression Utilities
 * 
 * Centralized expression handling for NodeDrop workflow automation.
 * Provides resolution, validation, and context building for workflow expressions.
 */

// Data utilities
export {
  extractJsonData,
  wrapJsonData,
  normalizeInputItems,
} from "./data";

// DateTime helper
export { DateTime } from "./datetime";

// Node helper functions
export { createNodeHelperFunctions } from "./helpers";

// Context building
export {
  type WorkflowNodeForContext,
  type ConnectionForContext,
  type BuildNodeOutputsOptions,
  buildNodeIdToNameMap,
  buildNodeOutputsMap,
  buildExpressionContext,
} from "./context";

// Expression validation (browser-safe)
export {
  type ExpressionValidationError,
  type ExpressionValidationResult,
  validateExpression,
  getExpressionBlocks,
} from "./validator";
