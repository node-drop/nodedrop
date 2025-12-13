/**
 * @nodedrop/utils
 * Shared utility functions for NodeDrop workflow automation platform
 */

// Error handling utilities
export {
  // Error codes
  ErrorCodes,
  type ErrorCode,
  type ErrorCategory,
  // Error interfaces
  type OperationError,
  type ValidationError,
  type ErrorDetails,
  type ErrorInfo,
  // Error creation
  createOperationError,
  // Error extraction
  extractErrorDetails,
  // User-friendly messages
  getUserFriendlyErrorMessage,
  // Error classification
  classifyError,
  // Recoverability
  isRecoverableError,
  getRecoverySuggestions,
  // Logging utilities
  logError,
  sanitizeErrorForLogging,
  // Retry utilities
  type RetryOptions,
  retryOperation,
  // Async error handler
  createAsyncErrorHandler,
} from "./errors";

// Validation utilities
export {
  // Constants
  MAX_TITLE_LENGTH,
  INVALID_TITLE_CHARS,
  MAX_FILE_SIZE,
  // Interfaces
  type FileInfo,
  type WorkflowForValidation,
  // Title validation
  validateTitle,
  // File validation
  validateImportFile,
  validateJsonContent,
  // Workflow validation
  validateWorkflowStructure,
  validateWorkflowNodes,
  validateWorkflowConnections,
  hasCircularDependency,
  validateWorkflow,
  // Generic helpers
  isEmpty,
  isValidEmail,
  isValidUrl,
  combineValidationErrors,
} from "./validation";

// Trigger utilities
export {
  // Types
  type NodeTypeDefinition,
  type ExtractedTrigger,
  type TriggerExtractionConfig,
  // Trigger detection
  isTriggerNodeType,
  isTriggerNode,
  getTriggerType,
  getTriggerNodes,
  // Trigger extraction
  extractTriggersFromNodes,
  // Trigger normalization
  normalizeTriggers,
  // Trigger filtering
  filterTriggersByType,
  getActiveTriggers,
  // Trigger analysis
  hasTriggerOfType,
  countTriggersByType,
} from "./triggers";

// Cron and schedule utilities
export {
  // Types
  type ParsedCronExpression,
  type NextExecution,
  type CronValidationResult,
  type ScheduleMode,
  type SimpleInterval,
  type RepeatInterval,
  type ScheduleSettings,
  type ConvertedScheduleSettings,
  // Cron validation
  validateCronExpression,
  isValidCronExpression,
  // Cron matching
  matchesCronExpression,
  // Next execution calculation
  getNextExecutionTimes,
  // Cron description
  describeCronExpression,
  // Schedule conversion
  convertSimpleToCron,
  convertDateTimeToCron,
  convertScheduleSettings,
  // Utility functions
  parseCronExpression,
  createCronExpression,
} from "./cron";

// Expression utilities
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
  // Expression validation
  type ExpressionValidationError,
  type ExpressionValidationResult,
  validateExpression,
  getExpressionBlocks,
} from "./expressions";
