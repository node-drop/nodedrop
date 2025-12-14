/**
 * Error Handling Utilities
 *
 * This module re-exports shared error handling utilities from @nodedrop/utils
 * and provides frontend-specific error handling functions.
 */

import type { NodeExecutionError } from "@/components/workflow/types";

// =============================================================================
// Re-export shared utilities from @nodedrop/utils
// =============================================================================

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
  // Validation utilities
  validateTitle,
  validateImportFile,
  validateJsonContent,
  MAX_TITLE_LENGTH,
  INVALID_TITLE_CHARS,
  MAX_FILE_SIZE,
  type FileInfo,
} from "@nodedrop/utils";

// Import for internal use
import { ErrorCodes } from "@nodedrop/utils";
import type { ValidationError } from "@nodedrop/utils";

// =============================================================================
// Frontend-specific Error Handling
// =============================================================================

/**
 * Convert backend execution errors to user-friendly error objects
 * This is frontend-specific as it creates NodeExecutionError objects for UI display
 */
export function createNodeExecutionError(
  error: unknown,
  _nodeId: string,
  _nodeType: string
): NodeExecutionError {
  // Default error structure
  const baseError: NodeExecutionError = {
    type: "unknown",
    message: "An unexpected error occurred",
    userFriendlyMessage:
      "An unexpected error occurred while executing the node.",
    isRetryable: false,
    timestamp: Date.now(),
    details: error,
  };

  // Handle different error types
  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;
    
    if (errorObj.httpErrorType) {
      // HTTP execution errors from backend
      return handleHttpExecutionError(errorObj, baseError);
    } else if (errorObj.type) {
      // Structured errors with type field
      return handleStructuredError(errorObj, baseError);
    } else if (errorObj.message) {
      // Generic errors with message
      return handleGenericError(errorObj, baseError);
    }
  } else if (typeof error === "string") {
    // String errors
    baseError.message = error;
    baseError.userFriendlyMessage = getUserFriendlyMessageFromString(error);
    baseError.isRetryable = isRetryableErrorMessage(error);

    // Try to determine error type from message
    const message = error.toLowerCase();

    if (message.includes("timeout") || message.includes("timed out")) {
      baseError.type = "timeout";
    } else if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("dns")
    ) {
      baseError.type = "network";
    } else if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required")
    ) {
      baseError.type = "validation";
    } else if (
      message.includes("security") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      baseError.type = "security";
    } else if (message.includes("server") || message.includes("internal")) {
      baseError.type = "server";
    }

    return baseError;
  }

  return baseError;
}

/**
 * Handle HTTP execution errors from backend
 */
function handleHttpExecutionError(
  error: Record<string, unknown>,
  baseError: NodeExecutionError
): NodeExecutionError {
  const httpError = { ...baseError };

  switch (error.httpErrorType) {
    case "TIMEOUT":
      httpError.type = "timeout";
      httpError.message = (error.message as string) || "Request timed out";
      httpError.userFriendlyMessage =
        "The request timed out. The server may be slow or unavailable.";
      httpError.isRetryable = true;
      break;

    case "DNS_RESOLUTION":
      httpError.type = "network";
      httpError.message = (error.message as string) || "DNS resolution failed";
      httpError.userFriendlyMessage =
        "Could not resolve the domain name. Please check the URL.";
      httpError.isRetryable = false;
      break;

    case "CONNECTION_REFUSED":
      httpError.type = "network";
      httpError.message = (error.message as string) || "Connection refused";
      httpError.userFriendlyMessage =
        "Connection was refused by the server. The service may be down.";
      httpError.isRetryable = true;
      break;

    case "SSL_ERROR":
      httpError.type = "security";
      httpError.message = (error.message as string) || "SSL/TLS error";
      httpError.userFriendlyMessage =
        "SSL/TLS certificate error. The connection is not secure.";
      httpError.isRetryable = false;
      break;

    case "NETWORK_UNREACHABLE":
      httpError.type = "network";
      httpError.message = (error.message as string) || "Network unreachable";
      httpError.userFriendlyMessage =
        "Network error occurred. Please check your internet connection.";
      httpError.isRetryable = true;
      break;

    case "HTTP_ERROR": {
      httpError.type = "server";
      const statusCode = error.statusCode as number | undefined;
      httpError.message = (error.message as string) || `HTTP ${statusCode}`;

      if (statusCode === 401) {
        httpError.userFriendlyMessage =
          "Authentication required. Please check your credentials.";
        httpError.isRetryable = false;
      } else if (statusCode === 403) {
        httpError.userFriendlyMessage =
          "Access forbidden. You do not have permission to access this resource.";
        httpError.isRetryable = false;
      } else if (statusCode === 404) {
        httpError.userFriendlyMessage =
          "Resource not found. Please check the URL.";
        httpError.isRetryable = false;
      } else if (statusCode === 429) {
        httpError.userFriendlyMessage =
          "Too many requests. Please wait before trying again.";
        httpError.isRetryable = true;
        httpError.retryAfter = (error.retryAfter as number) || 30000;
      } else if (statusCode && statusCode >= 500) {
        httpError.userFriendlyMessage =
          "Server error occurred. Please try again later.";
        httpError.isRetryable = true;
      } else {
        httpError.userFriendlyMessage = `HTTP error ${statusCode}: ${error.message}`;
        httpError.isRetryable = (error.isRetryable as boolean) || false;
      }
      break;
    }

    case "PARSE_ERROR":
      httpError.type = "validation";
      httpError.message = (error.message as string) || "Response parsing error";
      httpError.userFriendlyMessage =
        "Could not parse the server response. The response format may be invalid.";
      httpError.isRetryable = false;
      break;

    case "SECURITY_ERROR":
      httpError.type = "security";
      httpError.message = (error.message as string) || "Security validation failed";
      httpError.userFriendlyMessage =
        "Security validation failed. The request was blocked for security reasons.";
      httpError.isRetryable = false;
      break;

    case "RESOURCE_LIMIT_ERROR":
      httpError.type = "validation";
      httpError.message = (error.message as string) || "Resource limit exceeded";
      httpError.userFriendlyMessage =
        "Resource limit exceeded. The request is too large or uses too many resources.";
      httpError.isRetryable = false;
      break;

    default:
      httpError.type = "unknown";
      httpError.message = (error.message as string) || "Unknown HTTP error";
      httpError.userFriendlyMessage =
        "An unexpected error occurred while making the request.";
      httpError.isRetryable = (error.isRetryable as boolean) || false;
  }

  // Set retry delay if provided
  if (error.retryAfter) {
    httpError.retryAfter = error.retryAfter as number;
  }

  return httpError;
}

/**
 * Handle structured errors with type field
 */
function handleStructuredError(
  error: Record<string, unknown>,
  baseError: NodeExecutionError
): NodeExecutionError {
  const structuredError = { ...baseError };

  switch (error.type) {
    case "validation":
      structuredError.type = "validation";
      structuredError.message = (error.message as string) || "Validation failed";
      structuredError.userFriendlyMessage =
        "Invalid input parameters. Please check your node configuration.";
      structuredError.isRetryable = false;
      break;

    case "timeout":
      structuredError.type = "timeout";
      structuredError.message = (error.message as string) || "Operation timed out";
      structuredError.userFriendlyMessage =
        "The operation timed out. Please try again.";
      structuredError.isRetryable = true;
      break;

    case "network":
      structuredError.type = "network";
      structuredError.message = (error.message as string) || "Network error";
      structuredError.userFriendlyMessage =
        "Network error occurred. Please check your connection.";
      structuredError.isRetryable = true;
      break;

    case "security":
      structuredError.type = "security";
      structuredError.message = (error.message as string) || "Security error";
      structuredError.userFriendlyMessage =
        "Security validation failed. The request was blocked.";
      structuredError.isRetryable = false;
      break;

    case "server":
      structuredError.type = "server";
      structuredError.message = (error.message as string) || "Server error";
      structuredError.userFriendlyMessage =
        "Server error occurred. Please try again later.";
      structuredError.isRetryable = true;
      break;

    default:
      structuredError.type = "unknown";
      structuredError.message = (error.message as string) || "Unknown error";
      structuredError.userFriendlyMessage = "An unexpected error occurred.";
      structuredError.isRetryable = false;
  }

  return structuredError;
}

/**
 * Handle generic errors with message
 */
function handleGenericError(
  error: Record<string, unknown>,
  baseError: NodeExecutionError
): NodeExecutionError {
  const genericError = { ...baseError };
  const message = error.message as string;

  genericError.message = message;
  genericError.userFriendlyMessage = getUserFriendlyMessageFromString(message);
  genericError.isRetryable = isRetryableErrorMessage(message);

  // Try to determine error type from message
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    genericError.type = "timeout";
    genericError.isRetryable = true;
  } else if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("dns")
  ) {
    genericError.type = "network";
    genericError.isRetryable = true;
  } else if (
    lowerMessage.includes("validation") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("required")
  ) {
    genericError.type = "validation";
    genericError.isRetryable = false;
  } else if (
    lowerMessage.includes("security") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden")
  ) {
    genericError.type = "security";
    genericError.isRetryable = false;
  } else if (lowerMessage.includes("server") || lowerMessage.includes("internal")) {
    genericError.type = "server";
    genericError.isRetryable = true;
  }

  return genericError;
}

/**
 * Get user-friendly message from error message string
 */
function getUserFriendlyMessageFromString(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return "The operation timed out. Please try again.";
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
    return "Network error occurred. Please check your connection.";
  }

  if (lowerMessage.includes("dns") || lowerMessage.includes("resolve")) {
    return "Could not resolve the domain name. Please check the URL.";
  }

  if (lowerMessage.includes("validation") || lowerMessage.includes("invalid")) {
    return "Invalid input parameters. Please check your configuration.";
  }

  if (
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("authentication")
  ) {
    return "Authentication required. Please check your credentials.";
  }

  if (
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("access denied")
  ) {
    return "Access forbidden. You do not have permission.";
  }

  // Handle workflow-specific "not found" errors
  if (lowerMessage.includes("node not found in workflow")) {
    return "The selected node could not be found in the workflow. Please refresh the workflow or check if the node was deleted.";
  }

  if (lowerMessage.includes("workflow not found")) {
    return "The workflow could not be found. It may have been deleted or you may not have access to it.";
  }

  if (lowerMessage.includes("unknown node type")) {
    return "The node type is not recognized or supported. Please check if the required node package is installed.";
  }

  // Handle generic "not found" errors (likely HTTP/API related)
  if (lowerMessage.includes("not found")) {
    return "Resource not found. Please check the URL or configuration.";
  }

  if (lowerMessage.includes("server") || lowerMessage.includes("internal")) {
    return "Server error occurred. Please try again later.";
  }

  if (lowerMessage.includes("security")) {
    return "Security validation failed. The request was blocked.";
  }

  // Return original message if no pattern matches, but make it more user-friendly
  return message.charAt(0).toUpperCase() + message.slice(1) + ".";
}

/**
 * Determine if an error is retryable based on message
 */
function isRetryableErrorMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Retryable errors
  const retryablePatterns = [
    "timeout",
    "timed out",
    "network",
    "connection",
    "server",
    "internal",
    "unavailable",
    "busy",
    "overloaded",
  ];

  // Non-retryable errors
  const nonRetryablePatterns = [
    "validation",
    "invalid",
    "unauthorized",
    "forbidden",
    "not found",
    "security",
    "dns",
    "resolve",
  ];

  // Check non-retryable first (more specific)
  if (nonRetryablePatterns.some((pattern) => lowerMessage.includes(pattern))) {
    return false;
  }

  // Check retryable patterns
  if (retryablePatterns.some((pattern) => lowerMessage.includes(pattern))) {
    return true;
  }

  // Default to non-retryable for unknown errors
  return false;
}

/**
 * Log execution error for debugging
 * This is frontend-specific as it logs to browser console and optional logging service
 */
export function logExecutionError(
  nodeId: string,
  nodeType: string,
  error: NodeExecutionError,
  originalError?: unknown
): void {
  const logData = {
    nodeId,
    nodeType,
    errorType: error.type,
    message: error.message,
    userFriendlyMessage: error.userFriendlyMessage,
    isRetryable: error.isRetryable,
    retryAfter: error.retryAfter,
    timestamp: error.timestamp,
    originalError: originalError,
  };

  console.error(`Node execution error [${nodeId}]:`, logData);

  // Send to logging service if available
  if (typeof window !== "undefined") {
    const win = window as unknown as { logService?: { error: (type: string, data: unknown) => void } };
    if (win.logService) {
      win.logService.error("node_execution_error", logData);
    }
  }
}

/**
 * Async validate import file content
 * This is frontend-specific as it uses FileReader API
 */
export function validateImportFileContent(
  file: File
): Promise<ValidationError[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        JSON.parse(content);
        resolve([]);
      } catch {
        resolve([
          {
            field: "file",
            message: "Invalid JSON format",
            code: ErrorCodes.FILE_CORRUPTED,
          },
        ]);
      }
    };
    reader.onerror = () => {
      resolve([
        {
          field: "file",
          message: "Failed to read file",
          code: ErrorCodes.FILE_CORRUPTED,
        },
      ]);
    };
    reader.readAsText(file);
  });
}
