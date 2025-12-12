/**
 * @nodedrop/utils - Error Handling Utilities
 *
 * Consolidated error handling utilities shared between frontend and backend.
 * Provides consistent error codes, error creation, classification, and user-friendly messaging.
 */

// =============================================================================
// Error Codes
// =============================================================================

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
  CONNECTION_REFUSED: "CONNECTION_REFUSED",
  DNS_ERROR: "DNS_ERROR",

  // Authentication/Authorization errors
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",

  // Rate limiting
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",

  // Execution errors
  EXECUTION_FAILED: "EXECUTION_FAILED",
  NODE_EXECUTION_FAILED: "NODE_EXECUTION_FAILED",

  // Import/Export errors
  IMPORT_FAILED: "IMPORT_FAILED",
  EXPORT_FAILED: "EXPORT_FAILED",

  // Resource errors
  RESOURCE_EXHAUSTED: "RESOURCE_EXHAUSTED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Generic errors
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// Error Categories
// =============================================================================

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | "transient"
  | "permanent"
  | "configuration"
  | "timeout"
  | "resource"
  | "validation";

// =============================================================================
// Error Interfaces
// =============================================================================

/**
 * Operation error interface - extends Error with additional context
 */
export interface OperationError extends Error {
  code: ErrorCode;
  details?: string;
  context?: Record<string, unknown>;
  recoverable?: boolean;
}

/**
 * Validation error interface for field-level validation
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ErrorCode;
}

/**
 * Error details extracted from any error type
 */
export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: string;
  context?: Record<string, unknown>;
}

/**
 * Error info with classification metadata
 */
export interface ErrorInfo {
  type: string;
  category: ErrorCategory;
  code?: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
  timestamp: Date;
}

// =============================================================================
// Error Creation
// =============================================================================

/**
 * Create an operation error with code and context
 */
export function createOperationError(
  code: ErrorCode,
  message: string,
  details?: string,
  context?: Record<string, unknown>,
  recoverable?: boolean
): OperationError {
  const error = new Error(message) as OperationError;
  error.code = code;
  error.details = details;
  error.context = context;
  error.recoverable = recoverable;
  return error;
}

// =============================================================================
// Error Extraction
// =============================================================================

/**
 * Extract error details from any error type
 */
export function extractErrorDetails(error: unknown): ErrorDetails {
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

    if (message.includes("network") || message.includes("connection")) {
      code = ErrorCodes.NETWORK_ERROR;
    } else if (message.includes("timeout") || message.includes("timed out")) {
      code = ErrorCodes.TIMEOUT_ERROR;
    } else if (message.includes("dns") || message.includes("enotfound")) {
      code = ErrorCodes.DNS_ERROR;
    } else if (
      message.includes("unauthorized") ||
      message.includes("authentication")
    ) {
      code = ErrorCodes.AUTHENTICATION_ERROR;
    } else if (
      message.includes("forbidden") ||
      message.includes("access denied")
    ) {
      code = ErrorCodes.AUTHORIZATION_ERROR;
    } else if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      code = ErrorCodes.RATE_LIMIT_ERROR;
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

// =============================================================================
// User-Friendly Messages
// =============================================================================

/**
 * Get user-friendly error message for display
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
    case ErrorCodes.FILE_CORRUPTED:
      return "File is corrupted or has invalid format";
    case ErrorCodes.NETWORK_ERROR:
      return "Network error. Please check your connection and try again";
    case ErrorCodes.TIMEOUT_ERROR:
      return "Request timed out. Please try again";
    case ErrorCodes.CONNECTION_REFUSED:
      return "Connection was refused. The service may be unavailable";
    case ErrorCodes.DNS_ERROR:
      return "Could not resolve the domain name. Please check the URL";
    case ErrorCodes.AUTHENTICATION_ERROR:
      return "Authentication failed. Please check your credentials";
    case ErrorCodes.AUTHORIZATION_ERROR:
      return "Access denied. You do not have permission for this action";
    case ErrorCodes.RATE_LIMIT_ERROR:
      return "Rate limit exceeded. Please wait before trying again";
    case ErrorCodes.EXECUTION_FAILED:
      return "Workflow execution failed";
    case ErrorCodes.NODE_EXECUTION_FAILED:
      return "Node execution failed";
    case ErrorCodes.IMPORT_FAILED:
      return "Failed to import workflow";
    case ErrorCodes.EXPORT_FAILED:
      return "Failed to export workflow";
    case ErrorCodes.RESOURCE_EXHAUSTED:
      return "Resource limit exceeded. Please try again later";
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return "Service is temporarily unavailable. Please try again later";
    case ErrorCodes.VALIDATION_ERROR:
      return "Validation failed. Please check your input";
    default:
      return details.message || "An unexpected error occurred";
  }
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Classify an error to determine its type and category
 */
export function classifyError(error: unknown): {
  type: string;
  category: ErrorCategory;
  isRetryable: boolean;
} {
  // Handle OperationError
  if (error && typeof error === "object" && "code" in error) {
    const opError = error as OperationError;
    return classifyByErrorCode(opError.code);
  }

  // Handle standard Error
  if (error instanceof Error) {
    return classifyByMessage(error);
  }

  // Handle error-like objects with status codes
  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;
    if ("status" in errorObj || "statusCode" in errorObj) {
      return classifyByStatusCode(errorObj);
    }
  }

  // Default classification
  return {
    type: "unknown_error",
    category: "permanent",
    isRetryable: false,
  };
}

function classifyByErrorCode(code: ErrorCode): {
  type: string;
  category: ErrorCategory;
  isRetryable: boolean;
} {
  switch (code) {
    case ErrorCodes.NETWORK_ERROR:
    case ErrorCodes.CONNECTION_REFUSED:
      return { type: "network_error", category: "transient", isRetryable: true };

    case ErrorCodes.TIMEOUT_ERROR:
      return { type: "timeout", category: "timeout", isRetryable: true };

    case ErrorCodes.DNS_ERROR:
      return {
        type: "dns_error",
        category: "configuration",
        isRetryable: false,
      };

    case ErrorCodes.AUTHENTICATION_ERROR:
    case ErrorCodes.AUTHORIZATION_ERROR:
      return {
        type: "auth_error",
        category: "configuration",
        isRetryable: false,
      };

    case ErrorCodes.RATE_LIMIT_ERROR:
      return { type: "rate_limit", category: "transient", isRetryable: true };

    case ErrorCodes.SERVICE_UNAVAILABLE:
      return {
        type: "service_unavailable",
        category: "transient",
        isRetryable: true,
      };

    case ErrorCodes.RESOURCE_EXHAUSTED:
      return {
        type: "resource_exhaustion",
        category: "resource",
        isRetryable: false,
      };

    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.TITLE_EMPTY:
    case ErrorCodes.TITLE_TOO_LONG:
    case ErrorCodes.TITLE_INVALID_CHARS:
    case ErrorCodes.FILE_TOO_LARGE:
    case ErrorCodes.FILE_INVALID_EXTENSION:
    case ErrorCodes.FILE_CORRUPTED:
      return {
        type: "validation_error",
        category: "validation",
        isRetryable: false,
      };

    case ErrorCodes.EXECUTION_FAILED:
    case ErrorCodes.NODE_EXECUTION_FAILED:
      return {
        type: "execution_error",
        category: "permanent",
        isRetryable: false,
      };

    default:
      return { type: "unknown_error", category: "permanent", isRetryable: false };
  }
}

function classifyByMessage(error: Error): {
  type: string;
  category: ErrorCategory;
  isRetryable: boolean;
} {
  const message = error.message.toLowerCase();
  const errorCode = (error as { code?: string }).code;

  // Network errors
  const networkCodes = [
    "ENOTFOUND",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENETUNREACH",
  ];
  if (
    networkCodes.includes(errorCode || "") ||
    message.includes("network") ||
    message.includes("connection")
  ) {
    return { type: "network_error", category: "transient", isRetryable: true };
  }

  // Timeout errors
  if (
    errorCode === "ETIMEDOUT" ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return { type: "timeout", category: "timeout", isRetryable: true };
  }

  // Authentication errors
  if (
    message.includes("authentication") ||
    message.includes("unauthorized")
  ) {
    return {
      type: "authentication_error",
      category: "configuration",
      isRetryable: false,
    };
  }

  // Rate limiting
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return { type: "rate_limit", category: "transient", isRetryable: true };
  }

  // Resource errors
  if (
    message.includes("memory") ||
    message.includes("disk space") ||
    message.includes("quota") ||
    errorCode === "EMFILE" ||
    errorCode === "ENFILE"
  ) {
    return {
      type: "resource_exhaustion",
      category: "resource",
      isRetryable: false,
    };
  }

  return { type: "unknown_error", category: "permanent", isRetryable: false };
}

function classifyByStatusCode(error: Record<string, unknown>): {
  type: string;
  category: ErrorCategory;
  isRetryable: boolean;
} {
  const status = (error.status || error.statusCode) as number | undefined;

  if (!status) {
    return { type: "unknown_error", category: "permanent", isRetryable: false };
  }

  if (status === 401) {
    return {
      type: "authentication_error",
      category: "configuration",
      isRetryable: false,
    };
  }

  if (status === 403) {
    return {
      type: "authorization_error",
      category: "configuration",
      isRetryable: false,
    };
  }

  if (status === 429) {
    return { type: "rate_limit", category: "transient", isRetryable: true };
  }

  if (status >= 500 && status < 600) {
    return {
      type: "service_unavailable",
      category: "transient",
      isRetryable: true,
    };
  }

  if (status >= 400 && status < 500) {
    return { type: "client_error", category: "configuration", isRetryable: false };
  }

  return { type: "unknown_error", category: "permanent", isRetryable: false };
}

// =============================================================================
// Recoverability
// =============================================================================

/**
 * Check if an error is recoverable (can be retried)
 */
export function isRecoverableError(error: unknown): boolean {
  // Check explicit recoverable flag
  if (
    error &&
    typeof error === "object" &&
    "recoverable" in error &&
    typeof (error as OperationError).recoverable === "boolean"
  ) {
    return (error as OperationError).recoverable!;
  }

  // Use classification
  const classification = classifyError(error);
  return classification.isRetryable;
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
    case ErrorCodes.CONNECTION_REFUSED:
      return ["Check your internet connection", "Try again in a few moments"];
    case ErrorCodes.TIMEOUT_ERROR:
      return [
        "Try again with a shorter timeout",
        "Check your network connection",
      ];
    case ErrorCodes.DNS_ERROR:
      return ["Check the URL is correct", "Verify the domain exists"];
    case ErrorCodes.AUTHENTICATION_ERROR:
      return [
        "Check your credentials",
        "Ensure your API key or token is valid",
      ];
    case ErrorCodes.AUTHORIZATION_ERROR:
      return [
        "Check your permissions",
        "Contact an administrator for access",
      ];
    case ErrorCodes.RATE_LIMIT_ERROR:
      return [
        "Wait a few minutes before trying again",
        "Reduce the frequency of requests",
      ];
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return [
        "Wait a few minutes and try again",
        "Check the service status page",
      ];
    default:
      return ["Try again", "Contact support if the problem persists"];
  }
}

// =============================================================================
// Logging Utilities
// =============================================================================

/**
 * Log error for debugging
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const details = extractErrorDetails(error);
  console.error("Application error:", {
    ...details,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
export function sanitizeErrorForLogging(error: unknown): Record<string, unknown> {
  const sensitiveFields = [
    "password",
    "token",
    "key",
    "secret",
    "authorization",
    "apikey",
    "api_key",
  ];

  const removeSensitiveData = (obj: unknown): unknown => {
    if (typeof obj !== "object" || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => removeSensitiveData(item));
    }

    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        cleaned[key] = "[REDACTED]";
      } else if (typeof value === "object") {
        cleaned[key] = removeSensitiveData(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  };

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(removeSensitiveData(error) as Record<string, unknown>),
    };
  }

  return removeSensitiveData(error) as Record<string, unknown>;
}

// =============================================================================
// Retry Utilities
// =============================================================================

/**
 * Retry options for operations
 */
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBackoff: true,
  jitter: true,
};

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries || !isRecoverableError(error)) {
        throw error;
      }

      const delay = calculateRetryDelay(attempt, opts);
      await sleep(delay);
    }
  }

  throw lastError;
}

function calculateRetryDelay(attempt: number, options: RetryOptions): number {
  let delay = options.baseDelay;

  if (options.exponentialBackoff) {
    delay = Math.min(
      options.baseDelay * Math.pow(2, attempt),
      options.maxDelay
    );
  }

  if (options.jitter) {
    // Add random jitter (±25%)
    const jitterRange = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterRange;
  }

  return Math.floor(delay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Async Error Handler
// =============================================================================

/**
 * Create async error handler
 */
export function createAsyncErrorHandler(
  onError?: (error: unknown) => void
): (error: unknown) => void {
  return (error: unknown) => {
    logError(error);
    if (onError) {
      onError(error);
    }
  };
}
