import { HttpExecutionError, HttpErrorType } from '../errors/HttpExecutionError';
import { logger } from '../logger';

export interface RetryStrategy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
  retryableStatusCodes: number[];
  retryableErrors: HttpErrorType[];
  jitterEnabled: boolean;
}

export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error: HttpExecutionError;
  willRetry: boolean;
}

export class RetryHandler {
  private static readonly DEFAULT_STRATEGY: RetryStrategy = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    backoffMultiplier: 2,
    maxRetryDelay: 30000, // 30 seconds
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryableErrors: [
      HttpErrorType.TIMEOUT,
      HttpErrorType.CONNECTION_REFUSED,
      HttpErrorType.NETWORK_UNREACHABLE,
      HttpErrorType.HTTP_ERROR
    ],
    jitterEnabled: true
  };

  /**
   * Execute operation with retry logic
   */
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    strategy: Partial<RetryStrategy> = {},
    context: { url: string; method: string } = { url: '', method: '' }
  ): Promise<T> {
    const effectiveStrategy = { ...this.DEFAULT_STRATEGY, ...strategy };
    let lastError: HttpExecutionError | null = null;

    for (let attempt = 0; attempt <= effectiveStrategy.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {

        }
        
        return result;
      } catch (error) {
        const httpError = error as HttpExecutionError;
        lastError = httpError;

        // Check if this is the last attempt
        const isLastAttempt = attempt === effectiveStrategy.maxRetries;
        
        // Check if error is retryable
        const shouldRetry = this.shouldRetry(httpError, effectiveStrategy) && !isLastAttempt;

        if (!shouldRetry) {
          logger.error('HTTP request failed - not retrying', {
            url: context.url,
            method: context.method,
            attempt: attempt + 1,
            errorType: httpError.httpErrorType,
            isRetryable: httpError.isRetryable,
            isLastAttempt,
            error: httpError.message
          });
          throw httpError;
        }

        // Calculate delay for next retry
        const delay = this.calculateRetryDelay(
          attempt,
          effectiveStrategy,
          httpError.retryAfter
        );

        logger.warn('HTTP request failed - will retry', {
          url: context.url,
          method: context.method,
          attempt: attempt + 1,
          nextRetryIn: delay,
          errorType: httpError.httpErrorType,
          error: httpError.message
        });

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Maximum retries exceeded');
  }

  /**
   * Check if error should be retried
   */
  private static shouldRetry(error: HttpExecutionError, strategy: RetryStrategy): boolean {
    // Check if error type is retryable
    if (!strategy.retryableErrors.includes(error.httpErrorType)) {
      return false;
    }

    // For HTTP errors, check if status code is retryable
    if (error.httpErrorType === HttpErrorType.HTTP_ERROR && error.statusCode) {
      return strategy.retryableStatusCodes.includes(error.statusCode);
    }

    // Use the error's own retryable flag
    return error.isRetryable;
  }

  /**
   * Calculate delay for next retry with exponential backoff
   */
  private static calculateRetryDelay(
    attemptNumber: number,
    strategy: RetryStrategy,
    retryAfter?: number
  ): number {
    // If server provided Retry-After header, use it
    if (retryAfter && retryAfter > 0) {
      return Math.min(retryAfter, strategy.maxRetryDelay);
    }

    // Calculate exponential backoff delay
    let delay = strategy.retryDelay * Math.pow(strategy.backoffMultiplier, attemptNumber);
    
    // Apply maximum delay limit
    delay = Math.min(delay, strategy.maxRetryDelay);

    // Add jitter to prevent thundering herd
    if (strategy.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random(); // Up to 10% jitter
      delay += jitter;
    }

    return Math.round(delay);
  }

  /**
   * Create a delay promise
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry strategy for specific error types
   */
  public static getStrategyForErrorType(errorType: HttpErrorType): Partial<RetryStrategy> {
    switch (errorType) {
      case HttpErrorType.TIMEOUT:
        return {
          maxRetries: 2,
          retryDelay: 2000,
          backoffMultiplier: 1.5
        };
      case HttpErrorType.CONNECTION_REFUSED:
        return {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2
        };
      case HttpErrorType.NETWORK_UNREACHABLE:
        return {
          maxRetries: 2,
          retryDelay: 3000,
          backoffMultiplier: 2
        };
      case HttpErrorType.HTTP_ERROR:
        return {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2
        };
      default:
        return {};
    }
  }

  /**
   * Create retry strategy based on context
   */
  public static createStrategy(
    options: {
      isImportant?: boolean;
      timeoutSensitive?: boolean;
      resourceIntensive?: boolean;
    } = {}
  ): Partial<RetryStrategy> {
    const strategy: Partial<RetryStrategy> = {};

    if (options.isImportant) {
      strategy.maxRetries = 5;
      strategy.maxRetryDelay = 60000; // 1 minute
    }

    if (options.timeoutSensitive) {
      strategy.retryDelay = 500;
      strategy.backoffMultiplier = 1.5;
    }

    if (options.resourceIntensive) {
      strategy.maxRetries = 1;
      strategy.retryDelay = 5000;
    }

    return strategy;
  }
}