/**
 * Comprehensive error handling utilities for workflow execution
 */

export interface ErrorInfo {
  type: string;
  category:
    | "transient"
    | "permanent"
    | "configuration"
    | "timeout"
    | "resource";
  code?: string;
  message: string;
  context?: Record<string, any>;
  stack?: string;
  timestamp: Date;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
}

/**
 * Enhanced error class for workflow execution errors
 */
export class WorkflowExecutionError extends Error {
  public readonly type: string;
  public readonly category: ErrorInfo["category"];
  public readonly code?: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    type: string,
    category: ErrorInfo["category"],
    options: {
      code?: string;
      context?: Record<string, any>;
      isRetryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = "WorkflowExecutionError";
    this.type = type;
    this.category = category;
    this.code = options.code;
    this.context = options.context;
    this.timestamp = new Date();
    this.isRetryable = options.isRetryable ?? this.determineRetryability();

    if (options.cause) {
      this.cause = options.cause;
      this.stack = options.cause.stack;
    }
  }

  private determineRetryability(): boolean {
    const retryableCategories = ["transient", "timeout"];
    const retryableTypes = [
      "network_error",
      "rate_limit",
      "service_unavailable",
    ];

    return (
      retryableCategories.includes(this.category) ||
      retryableTypes.includes(this.type)
    );
  }

  toJSON(): ErrorInfo {
    return {
      type: this.type,
      category: this.category,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Circuit breaker implementation for external service calls
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (this.shouldAttemptReset()) {
        this.state = "half-open";
      } else {
        throw new WorkflowExecutionError(
          "Circuit breaker is open",
          "circuit_breaker_open",
          "resource",
          { context: { state: this.state, failureCount: this.failureCount } }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime
      ? Date.now() - this.lastFailureTime.getTime() > this.resetTimeout
      : false;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "closed";
    this.lastFailureTime = undefined;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.threshold) {
      this.state = "open";
    }
  }

  getState(): { state: string; failureCount: number; lastFailureTime?: Date } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBackoff: true,
    jitter: true,
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    isRetryable: (error: any) => boolean,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt or error is not retryable
        if (attempt === opts.maxRetries || !isRetryable(error)) {
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, opts);


        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private static calculateDelay(
    attempt: number,
    options: RetryOptions
  ): number {
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

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Error classifier utility
 */
export class ErrorClassifier {
  static classify(error: any): {
    type: string;
    category: ErrorInfo["category"];
    isRetryable: boolean;
  } {
    // Network errors
    if (this.isNetworkError(error)) {
      return {
        type: "network_error",
        category: "transient",
        isRetryable: true,
      };
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return {
        type: "timeout",
        category: "timeout",
        isRetryable: true,
      };
    }

    // Authentication errors
    if (this.isAuthError(error)) {
      return {
        type: "authentication_error",
        category: "configuration",
        isRetryable: false,
      };
    }

    // Rate limiting
    if (this.isRateLimitError(error)) {
      return {
        type: "rate_limit",
        category: "transient",
        isRetryable: true,
      };
    }

    // Server errors
    if (this.isServerError(error)) {
      return {
        type: "service_unavailable",
        category: "transient",
        isRetryable: true,
      };
    }

    // Client errors
    if (this.isClientError(error)) {
      return {
        type: "client_error",
        category: "configuration",
        isRetryable: false,
      };
    }

    // Resource exhaustion
    if (this.isResourceError(error)) {
      return {
        type: "resource_exhaustion",
        category: "resource",
        isRetryable: false,
      };
    }

    // Default classification
    return {
      type: "unknown_error",
      category: "permanent",
      isRetryable: false,
    };
  }

  private static isNetworkError(error: any): boolean {
    const networkCodes = [
      "ENOTFOUND",
      "ECONNREFUSED",
      "ECONNRESET",
      "ENETUNREACH",
    ];
    return (
      networkCodes.includes(error.code) ||
      error.message?.includes("network") ||
      error.message?.includes("connection")
    );
  }

  private static isTimeoutError(error: any): boolean {
    return (
      error.code === "ETIMEDOUT" ||
      error.message?.includes("timeout") ||
      error.message?.includes("timed out")
    );
  }

  private static isAuthError(error: any): boolean {
    return (
      error.status === 401 ||
      error.statusCode === 401 ||
      error.message?.includes("authentication") ||
      error.message?.includes("unauthorized")
    );
  }

  private static isRateLimitError(error: any): boolean {
    return (
      error.status === 429 ||
      error.statusCode === 429 ||
      error.message?.includes("rate limit") ||
      error.message?.includes("too many requests")
    );
  }

  private static isServerError(error: any): boolean {
    const status = error.status || error.statusCode;
    return status >= 500 && status < 600;
  }

  private static isClientError(error: any): boolean {
    const status = error.status || error.statusCode;
    return status >= 400 && status < 500 && status !== 429;
  }

  private static isResourceError(error: any): boolean {
    return (
      error.message?.includes("memory") ||
      error.message?.includes("disk space") ||
      error.message?.includes("quota") ||
      error.code === "EMFILE" ||
      error.code === "ENFILE"
    );
  }
}

/**
 * Graceful degradation utility
 */
export class GracefulDegradation {
  static async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    shouldUseFallback: (error: any) => boolean
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      if (shouldUseFallback(error)) {
        console.warn(
          "Primary operation failed, using fallback:",
          error instanceof Error ? error.message : String(error)
        );
        return await fallbackOperation();
      }
      throw error;
    }
  }

  static async executeWithDefault<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    shouldUseDefault: (error: any) => boolean
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (shouldUseDefault(error)) {
        console.warn("Operation failed, using default value:", error instanceof Error ? error.message : String(error));
        return defaultValue;
      }
      throw error;
    }
  }
}

/**
 * Error aggregation for batch operations
 */
export class ErrorAggregator {
  private errors: Array<{ index: number; error: any }> = [];

  addError(index: number, error: any): void {
    this.errors.push({ index, error });
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): Array<{ index: number; error: any }> {
    return [...this.errors];
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  createAggregateError(message: string): WorkflowExecutionError {
    const errorTypes = new Set(
      this.errors.map((e) => ErrorClassifier.classify(e.error).type)
    );
    const categories = new Set(
      this.errors.map((e) => ErrorClassifier.classify(e.error).category)
    );

    const isRetryable = this.errors.some(
      (e) => ErrorClassifier.classify(e.error).isRetryable
    );

    return new WorkflowExecutionError(
      message,
      "batch_error",
      categories.size === 1 ? Array.from(categories)[0] : "permanent",
      {
        context: {
          errorCount: this.errors.length,
          errorTypes: Array.from(errorTypes),
          categories: Array.from(categories),
          errors: this.errors.map((e) => ({
            index: e.index,
            type: ErrorClassifier.classify(e.error).type,
            message: e.error.message,
          })),
        },
        isRetryable,
      }
    );
  }

  clear(): void {
    this.errors = [];
  }
}

/**
 * Utility functions
 */
export const ErrorUtils = {
  /**
   * Safely extract error message from any error type
   */
  extractMessage(error: any): string {
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    if (error?.message) return error.message;
    return "Unknown error occurred";
  },

  /**
   * Create a user-friendly error message
   */
  createUserFriendlyMessage(error: any): string {
    const classification = ErrorClassifier.classify(error);

    switch (classification.type) {
      case "network_error":
        return "Network connection failed. Please check your internet connection and try again.";
      case "timeout":
        return "The operation timed out. Please try again or increase timeout settings.";
      case "authentication_error":
        return "Authentication failed. Please check your credentials and try again.";
      case "rate_limit":
        return "Rate limit exceeded. Please wait a moment before trying again.";
      case "service_unavailable":
        return "The external service is temporarily unavailable. Please try again later.";
      default:
        return `An error occurred: ${this.extractMessage(error)}`;
    }
  },

  /**
   * Sanitize error for logging (remove sensitive data)
   */
  sanitizeForLogging(error: any): any {
    const sanitized = { ...error };

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "token",
      "key",
      "secret",
      "authorization",
    ];

    const removeSensitiveData = (obj: any): any => {
      if (typeof obj !== "object" || obj === null) return obj;

      const cleaned = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          (cleaned as any)[key] = "[REDACTED]";
        } else if (typeof value === "object") {
          (cleaned as any)[key] = removeSensitiveData(value);
        } else {
          (cleaned as any)[key] = value;
        }
      }

      return cleaned;
    };

    return removeSensitiveData(sanitized);
  },
};
