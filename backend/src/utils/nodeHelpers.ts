/**
 * Node Helpers Utility
 *
 * This module re-exports expression utilities from @nodedrop/utils for backward compatibility.
 * New code should import directly from @nodedrop/utils.
 * 
 * @deprecated Import from @nodedrop/utils instead
 */

// Re-export everything from @nodedrop/utils expressions
export {
  // Data utilities
  extractJsonData,
  wrapJsonData,
  normalizeInputItems,
  // DateTime helper
  DateTime,
  // Node helper functions
  createNodeHelperFunctions,
  // Context building
  type WorkflowNodeForContext,
  type ConnectionForContext,
  type BuildNodeOutputsOptions,
  buildNodeIdToNameMap,
  buildNodeOutputsMap,
  buildExpressionContext,
  // Expression resolution
  resolvePath,
  safeEvaluateExpression,
  resolveValue,
} from "@nodedrop/utils";

// Re-export ExpressionContext from types for backward compatibility
export type { ExpressionContext } from "@nodedrop/types";
