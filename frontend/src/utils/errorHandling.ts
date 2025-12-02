// @ts-nocheck
import type { NodeExecutionError } from "@/components/workflow/types";

/**
 * General error codes for the application
 */
export const ErrorCodes = {
  // Title validation errors
  TITLE_EMPTY: "TITLE_EMPTY",
  TITLE_TOO_LONG: "TITLE_TOO_LONG",
  TITLE_INVALID_CHARS: "TITLE_INVALID_CHARS",

  // File validation errors
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_INVALID_EXTENSION: "FILE_INVALID_EXTENSION",
  FILE_CORRUPTED: "FILE_CORRUPTED",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",

  // Execution errors
  EXECUTION_FAILED: "EXECUTION_FAILED",
  NODE_EXECUTION_FAILED: "NODE_EXECUTION_FAILED",

  // Import/Export errors
  IMPORT_FAILED: "IMPORT_FAILED",
  EXPORT_FAILED: "EXPORT_FAILED",

  // Generic errors
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Operation error interface
 */
export interface OperationError extends Error {
  code: ErrorCode;
  details?: string;
  context?: Record<string, any>;
  recoverable?: boolean;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ErrorCode;
}

/**
 * Create an operation error
 */
export function createOperationError(
  code: ErrorCode,
  message: string,
  details?: string,
  context?: Record<string, any>,
  recoverable?: boolean
): OperationError {
  const error = new Error(message) as OperationError;
  error.code = code;
  error.details = details;
  error.context = context;
  error.recoverable = recoverable;
  return error;
}

/**
 * Extract error details from any error type
 */
export function extractErrorDetails(error: unknown): {
  code: ErrorCode;
  message: string;
  details?: string;
  context?: Record<string, any>;
} {
  if (error && typeof error === "object" && "code" in error) {
    const opError = error as OperationError;
    return {
      code: opError.code,
      message: opError.message,
      details: opError.details,
      context: opError.context,
    };
  }

  if (error instanceof Error) {
    // Try to determine error type from message
    const message = error.message.toLowerCase();
    let code: ErrorCode = ErrorCodes.UNKNOWN_ERROR;

    if (message.includes("network")) {
      code = ErrorCodes.NETWORK_ERROR;
    } else if (message.includes("timeout")) {
      code = ErrorCodes.TIMEOUT_ERROR;
    }

    return {
      code,
      message: error.message,
      details: error.stack,
    };
  }

  if (typeof error === "string") {
    return {
      code: ErrorCodes.UNKNOWN_ERROR,
      message: error,
    };
  }

  return {
    code: ErrorCodes.UNKNOWN_ERROR,
    message: "An unknown error occurred",
  };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const details = extractErrorDetails(error);

  switch (details.code) {
    case ErrorCodes.TITLE_EMPTY:
      return "Workflow title cannot be empty";
    case ErrorCodes.TITLE_TOO_LONG:
      return "Workflow title is too long (maximum 100 characters)";
    case ErrorCodes.TITLE_INVALID_CHARS:
      return "Workflow title contains invalid characters";
    case ErrorCodes.FILE_TOO_LARGE:
      return "File is too large (maximum 50MB)";
    case ErrorCodes.FILE_INVALID_EXTENSION:
      return "Invalid file type. Please select a JSON file";
    case ErrorCodes.NETWORK_ERROR:
      return "Network error. Please check your connection and try again";
    case ErrorCodes.TIMEOUT_ERROR:
      return "Request timed out. Please try again";
    case ErrorCodes.EXECUTION_FAILED:
      return "Workflow execution failed";
    case ErrorCodes.IMPORT_FAILED:
      return "Failed to import workflow";
    case ErrorCodes.EXPORT_FAILED:
      return "Failed to export workflow";
    default:
      return details.message || "An unexpected error occurred";
  }
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const details = extractErrorDetails(error);

  const recoverableErrors = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.TIMEOUT_ERROR,
    ErrorCodes.EXECUTION_FAILED,
  ];

  return recoverableErrors.includes(details.code);
}

/**
 * Get recovery suggestions for an error
 */
export function getRecoverySuggestions(error: unknown): string[] {
  const details = extractErrorDetails(error);

  switch (details.code) {
    case ErrorCodes.TITLE_EMPTY:
      return ["Enter a title for your workflow"];
    case ErrorCodes.TITLE_TOO_LONG:
      return ["Shorten the workflow title to 100 characters or less"];
    case ErrorCodes.TITLE_INVALID_CHARS:
      return [
        "Remove special characters from the title",
        "Use only letters, numbers, spaces, and basic punctuation",
      ];
    case ErrorCodes.FILE_TOO_LARGE:
      return [
        "Select a smaller file (under 50MB)",
        "Compress the file before uploading",
      ];
    case ErrorCodes.FILE_INVALID_EXTENSION:
      return [
        "Select a JSON file (.json)",
        "Export your workflow as JSON first",
      ];
    case ErrorCodes.NETWORK_ERROR:
      return ["Check your internet connection", "Try again in a few moments"];
    case ErrorCodes.TIMEOUT_ERROR:
      return [
        "Try again with a shorter timeout",
        "Check your network connection",
      ];
    default:
      return ["Try again", "Contact support if the problem persists"];
  }
}

/**
 * Log error for debugging
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const details = extractErrorDetails(error);
  console.error("Application error:", {
    ...details,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRecoverableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create async error handler
 */
export function createAsyncErrorHandler(onError?: (error: unknown) => void) {
  return (error: unknown) => {
    logError(error);
    if (onError) {
      onError(error);
    }
  };
}

/**
 * Convert backend execution errors to user-friendly error objects
 */
export function createNodeExecutionError(
  error: any,
  nodeId: string,
  nodeType: string
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
  if (error?.httpErrorType) {
    // HTTP execution errors from backend
    return handleHttpExecutionError(error, baseError);
  } else if (error?.type) {
    // Structured errors with type field
    return handleStructuredError(error, baseError);
  } else if (error?.message) {
    // Generic errors with message
    return handleGenericError(error, baseError);
  } else if (typeof error === "string") {
    // String errors
    baseError.message = error;
    baseError.userFriendlyMessage = getUserFriendlyMessage(error);
    baseError.isRetryable = isRetryableError(error);

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
  error: any,
  baseError: NodeExecutionError
): NodeExecutionError {
  const httpError = { ...baseError };

  switch (error.httpErrorType) {
    case "TIMEOUT":
      httpError.type = "timeout";
      httpError.message = error.message || "Request timed out";
      httpError.userFriendlyMessage =
        "The request timed out. The server may be slow or unavailable.";
      httpError.isRetryable = true;
      break;

    case "DNS_RESOLUTION":
      httpError.type = "network";
      httpError.message = error.message || "DNS resolution failed";
      httpError.userFriendlyMessage =
        "Could not resolve the domain name. Please check the URL.";
      httpError.isRetryable = false;
      break;

    case "CONNECTION_REFUSED":
      httpError.type = "network";
      httpError.message = error.message || "Connection refused";
      httpError.userFriendlyMessage =
        "Connection was refused by the server. The service may be down.";
      httpError.isRetryable = true;
      break;

    case "SSL_ERROR":
      httpError.type = "security";
      httpError.message = error.message || "SSL/TLS error";
      httpError.userFriendlyMessage =
        "SSL/TLS certificate error. The connection is not secure.";
      httpError.isRetryable = false;
      break;

    case "NETWORK_UNREACHABLE":
      httpError.type = "network";
      httpError.message = error.message || "Network unreachable";
      httpError.userFriendlyMessage =
        "Network error occurred. Please check your internet connection.";
      httpError.isRetryable = true;
      break;

    case "HTTP_ERROR":
      httpError.type = "server";
      httpError.message = error.message || `HTTP ${error.statusCode}`;

      if (error.statusCode === 401) {
        httpError.userFriendlyMessage =
          "Authentication required. Please check your credentials.";
        httpError.isRetryable = false;
      } else if (error.statusCode === 403) {
        httpError.userFriendlyMessage =
          "Access forbidden. You do not have permission to access this resource.";
        httpError.isRetryable = false;
      } else if (error.statusCode === 404) {
        httpError.userFriendlyMessage =
          "Resource not found. Please check the URL.";
        httpError.isRetryable = false;
      } else if (error.statusCode === 429) {
        httpError.userFriendlyMessage =
          "Too many requests. Please wait before trying again.";
        httpError.isRetryable = true;
        httpError.retryAfter = error.retryAfter || 30000; // Default 30 seconds
      } else if (error.statusCode && error.statusCode >= 500) {
        httpError.userFriendlyMessage =
          "Server error occurred. Please try again later.";
        httpError.isRetryable = true;
      } else {
        httpError.userFriendlyMessage = `HTTP error ${error.statusCode}: ${error.message}`;
        httpError.isRetryable = error.isRetryable || false;
      }
      break;

    case "PARSE_ERROR":
      httpError.type = "validation";
      httpError.message = error.message || "Response parsing error";
      httpError.userFriendlyMessage =
        "Could not parse the server response. The response format may be invalid.";
      httpError.isRetryable = false;
      break;

    case "SECURITY_ERROR":
      httpError.type = "security";
      httpError.message = error.message || "Security validation failed";
      httpError.userFriendlyMessage =
        "Security validation failed. The request was blocked for security reasons.";
      httpError.isRetryable = false;
      break;

    case "RESOURCE_LIMIT_ERROR":
      httpError.type = "validation";
      httpError.message = error.message || "Resource limit exceeded";
      httpError.userFriendlyMessage =
        "Resource limit exceeded. The request is too large or uses too many resources.";
      httpError.isRetryable = false;
      break;

    default:
      httpError.type = "unknown";
      httpError.message = error.message || "Unknown HTTP error";
      httpError.userFriendlyMessage =
        "An unexpected error occurred while making the request.";
      httpError.isRetryable = error.isRetryable || false;
  }

  // Set retry delay if provided
  if (error.retryAfter) {
    httpError.retryAfter = error.retryAfter;
  }

  return httpError;
}

/**
 * Handle structured errors with type field
 */
function handleStructuredError(
  error: any,
  baseError: NodeExecutionError
): NodeExecutionError {
  const structuredError = { ...baseError };

  switch (error.type) {
    case "validation":
      structuredError.type = "validation";
      structuredError.message = error.message || "Validation failed";
      structuredError.userFriendlyMessage =
        "Invalid input parameters. Please check your node configuration.";
      structuredError.isRetryable = false;
      break;

    case "timeout":
      structuredError.type = "timeout";
      structuredError.message = error.message || "Operation timed out";
      structuredError.userFriendlyMessage =
        "The operation timed out. Please try again.";
      structuredError.isRetryable = true;
      break;

    case "network":
      structuredError.type = "network";
      structuredError.message = error.message || "Network error";
      structuredError.userFriendlyMessage =
        "Network error occurred. Please check your connection.";
      structuredError.isRetryable = true;
      break;

    case "security":
      structuredError.type = "security";
      structuredError.message = error.message || "Security error";
      structuredError.userFriendlyMessage =
        "Security validation failed. The request was blocked.";
      structuredError.isRetryable = false;
      break;

    case "server":
      structuredError.type = "server";
      structuredError.message = error.message || "Server error";
      structuredError.userFriendlyMessage =
        "Server error occurred. Please try again later.";
      structuredError.isRetryable = true;
      break;

    default:
      structuredError.type = "unknown";
      structuredError.message = error.message || "Unknown error";
      structuredError.userFriendlyMessage = "An unexpected error occurred.";
      structuredError.isRetryable = false;
  }

  return structuredError;
}

/**
 * Handle generic errors with message
 */
function handleGenericError(
  error: any,
  baseError: NodeExecutionError
): NodeExecutionError {
  const genericError = { ...baseError };

  genericError.message = error.message;
  genericError.userFriendlyMessage = getUserFriendlyMessage(error.message);
  genericError.isRetryable = isRetryableError(error.message);

  // Try to determine error type from message
  const message = error.message.toLowerCase();

  if (message.includes("timeout") || message.includes("timed out")) {
    genericError.type = "timeout";
    genericError.isRetryable = true;
  } else if (
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("dns")
  ) {
    genericError.type = "network";
    genericError.isRetryable = true;
  } else if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required")
  ) {
    genericError.type = "validation";
    genericError.isRetryable = false;
  } else if (
    message.includes("security") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  ) {
    genericError.type = "security";
    genericError.isRetryable = false;
  } else if (message.includes("server") || message.includes("internal")) {
    genericError.type = "server";
    genericError.isRetryable = true;
  }

  return genericError;
}

/**
 * Get user-friendly message from error message
 */
function getUserFriendlyMessage(message: string): string {
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
function isRetryableError(message: string): boolean {
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
 */
export function logExecutionError(
  nodeId: string,
  nodeType: string,
  error: NodeExecutionError,
  originalError?: any
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
  if (typeof window !== "undefined" && (window as any).logService) {
    (window as any).logService.error("node_execution_error", logData);
  }
}

/**
 * Validate title utility
 */
export function validateTitle(title: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!title || title.trim().length === 0) {
    errors.push({
      field: "title",
      message: "Title is required",
      code: ErrorCodes.TITLE_EMPTY,
    });
  } else {
    if (title.length > 100) {
      errors.push({
        field: "title",
        message: "Title must be 100 characters or less",
        code: ErrorCodes.TITLE_TOO_LONG,
      });
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(title)) {
      errors.push({
        field: "title",
        message: "Title contains invalid characters",
        code: ErrorCodes.TITLE_INVALID_CHARS,
      });
    }
  }

  return errors;
}

/**
 * Validate import file utility
 */
export function validateImportFile(file: File): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check file size (max 50MB to match error message)
  if (file.size > 50 * 1024 * 1024) {
    errors.push({
      field: "file",
      message: "File size must be less than 50MB",
      code: ErrorCodes.FILE_TOO_LARGE,
    });
  }

  // Check file type
  if (file.type !== "application/json" && !file.name.endsWith(".json")) {
    errors.push({
      field: "file",
      message: "File must be a JSON file",
      code: ErrorCodes.FILE_INVALID_EXTENSION,
    });
  }

  return errors;
}

/**
 * Async validate import file content
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
      } catch (error) {
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
