import {
  CircuitBreaker,
  ErrorAggregator,
  ErrorClassifier,
  ErrorUtils,
  GracefulDegradation,
  RetryManager,
  WorkflowExecutionError,
} from "../../utils/errorHandling";

describe("Error Handling Utilities", () => {
  describe("WorkflowExecutionError", () => {
    it("should create error with proper classification", () => {
      const error = new WorkflowExecutionError(
        "Test error message",
        "network_error",
        "transient",
        {
          code: "TEST_001",
          context: { nodeId: "test-node" },
          isRetryable: true,
        }
      );

      expect(error.message).toBe("Test error message");
      expect(error.type).toBe("network_error");
      expect(error.category).toBe("transient");
      expect(error.code).toBe("TEST_001");
      expect(error.isRetryable).toBe(true);
      expect(error.context?.nodeId).toBe("test-node");
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it("should auto-determine retryability", () => {
      const retryableError = new WorkflowExecutionError(
        "Network timeout",
        "timeout",
        "timeout"
      );

      const nonRetryableError = new WorkflowExecutionError(
        "Invalid config",
        "configuration_error",
        "configuration"
      );

      expect(retryableError.isRetryable).toBe(true);
      expect(nonRetryableError.isRetryable).toBe(false);
    });

    it("should serialize to JSON properly", () => {
      const error = new WorkflowExecutionError(
        "Test error",
        "test_error",
        "permanent",
        { code: "TEST_001" }
      );

      const json = error.toJSON();

      expect(json.type).toBe("test_error");
      expect(json.category).toBe("permanent");
      expect(json.code).toBe("TEST_001");
      expect(json.message).toBe("Test error");
      expect(json.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("CircuitBreaker", () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(2, 1000, 100); // 2 failures, 1s timeout, 100ms reset
    });

    it("should execute operation when circuit is closed", async () => {
      const operation = jest.fn().mockResolvedValue("success");

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should open circuit after threshold failures", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("Test error"));

      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Test error"
      );

      // Second failure - should open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Test error"
      );

      // Third attempt - circuit should be open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Circuit breaker is open"
      );

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should reset after timeout period", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValueOnce("success");

      // Trigger failures to open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should attempt operation again
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe("success");
    });

    it("should provide circuit state information", () => {
      const state = circuitBreaker.getState();

      expect(state.state).toBe("closed");
      expect(state.failureCount).toBe(0);
      expect(state.lastFailureTime).toBeUndefined();
    });
  });

  describe("RetryManager", () => {
    it("should retry retryable operations", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce("success");

      const isRetryable = (error: any) => error.message === "Temporary failure";

      const result = await RetryManager.executeWithRetry(
        operation,
        isRetryable,
        { maxRetries: 2, baseDelay: 10, exponentialBackoff: false }
      );

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should not retry non-retryable operations", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Permanent failure"));
      const isRetryable = (error: any) => error.message !== "Permanent failure";

      await expect(
        RetryManager.executeWithRetry(operation, isRetryable, { maxRetries: 2 })
      ).rejects.toThrow("Permanent failure");

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should respect max retry limit", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("Always fails"));
      const isRetryable = () => true;

      await expect(
        RetryManager.executeWithRetry(operation, isRetryable, {
          maxRetries: 2,
          baseDelay: 1,
        })
      ).rejects.toThrow("Always fails");

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe("ErrorClassifier", () => {
    it("should classify network errors correctly", () => {
      const networkError = { code: "ENOTFOUND", message: "DNS lookup failed" };
      const classification = ErrorClassifier.classify(networkError);

      expect(classification.type).toBe("network_error");
      expect(classification.category).toBe("transient");
      expect(classification.isRetryable).toBe(true);
    });

    it("should classify timeout errors correctly", () => {
      const timeoutError = {
        code: "ETIMEDOUT",
        message: "Operation timed out",
      };
      const classification = ErrorClassifier.classify(timeoutError);

      expect(classification.type).toBe("timeout");
      expect(classification.category).toBe("timeout");
      expect(classification.isRetryable).toBe(true);
    });

    it("should classify authentication errors correctly", () => {
      const authError = { status: 401, message: "Unauthorized" };
      const classification = ErrorClassifier.classify(authError);

      expect(classification.type).toBe("authentication_error");
      expect(classification.category).toBe("configuration");
      expect(classification.isRetryable).toBe(false);
    });

    it("should classify rate limit errors correctly", () => {
      const rateLimitError = { status: 429, message: "Too many requests" };
      const classification = ErrorClassifier.classify(rateLimitError);

      expect(classification.type).toBe("rate_limit");
      expect(classification.category).toBe("transient");
      expect(classification.isRetryable).toBe(true);
    });

    it("should classify server errors correctly", () => {
      const serverError = { status: 500, message: "Internal server error" };
      const classification = ErrorClassifier.classify(serverError);

      expect(classification.type).toBe("service_unavailable");
      expect(classification.category).toBe("transient");
      expect(classification.isRetryable).toBe(true);
    });

    it("should classify unknown errors as permanent", () => {
      const unknownError = { message: "Something went wrong" };
      const classification = ErrorClassifier.classify(unknownError);

      expect(classification.type).toBe("unknown_error");
      expect(classification.category).toBe("permanent");
      expect(classification.isRetryable).toBe(false);
    });
  });

  describe("GracefulDegradation", () => {
    it("should use fallback on appropriate errors", async () => {
      const primaryOperation = jest
        .fn()
        .mockRejectedValue(new Error("Service unavailable"));
      const fallbackOperation = jest.fn().mockResolvedValue("fallback result");
      const shouldUseFallback = (error: any) =>
        error.message === "Service unavailable";

      const result = await GracefulDegradation.executeWithFallback(
        primaryOperation,
        fallbackOperation,
        shouldUseFallback
      );

      expect(result).toBe("fallback result");
      expect(primaryOperation).toHaveBeenCalledTimes(1);
      expect(fallbackOperation).toHaveBeenCalledTimes(1);
    });

    it("should not use fallback for inappropriate errors", async () => {
      const primaryOperation = jest
        .fn()
        .mockRejectedValue(new Error("Critical error"));
      const fallbackOperation = jest.fn().mockResolvedValue("fallback result");
      const shouldUseFallback = (error: any) =>
        error.message === "Service unavailable";

      await expect(
        GracefulDegradation.executeWithFallback(
          primaryOperation,
          fallbackOperation,
          shouldUseFallback
        )
      ).rejects.toThrow("Critical error");

      expect(fallbackOperation).not.toHaveBeenCalled();
    });

    it("should use default value when appropriate", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Non-critical error"));
      const shouldUseDefault = (error: any) =>
        error.message === "Non-critical error";

      const result = await GracefulDegradation.executeWithDefault(
        operation,
        "default value",
        shouldUseDefault
      );

      expect(result).toBe("default value");
    });
  });

  describe("ErrorAggregator", () => {
    let aggregator: ErrorAggregator;

    beforeEach(() => {
      aggregator = new ErrorAggregator();
    });

    it("should collect and aggregate errors", () => {
      aggregator.addError(0, new Error("Error 1"));
      aggregator.addError(1, new Error("Error 2"));
      aggregator.addError(2, new Error("Error 3"));

      expect(aggregator.hasErrors()).toBe(true);
      expect(aggregator.getErrorCount()).toBe(3);

      const errors = aggregator.getErrors();
      expect(errors).toHaveLength(3);
      expect(errors[0].index).toBe(0);
      expect(errors[0].error.message).toBe("Error 1");
    });

    it("should create aggregate error with proper classification", () => {
      aggregator.addError(0, { code: "ENOTFOUND", message: "Network error" });
      aggregator.addError(1, { status: 429, message: "Rate limit" });

      const aggregateError = aggregator.createAggregateError(
        "Multiple errors occurred"
      );

      expect(aggregateError.message).toBe("Multiple errors occurred");
      expect(aggregateError.type).toBe("batch_error");
      expect(aggregateError.context?.errorCount).toBe(2);
      expect(aggregateError.isRetryable).toBe(true); // At least one error is retryable
    });

    it("should clear errors", () => {
      aggregator.addError(0, new Error("Test error"));
      expect(aggregator.hasErrors()).toBe(true);

      aggregator.clear();
      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.getErrorCount()).toBe(0);
    });
  });

  describe("ErrorUtils", () => {
    describe("extractMessage", () => {
      it("should extract message from string error", () => {
        const message = ErrorUtils.extractMessage("Simple error message");
        expect(message).toBe("Simple error message");
      });

      it("should extract message from Error object", () => {
        const error = new Error("Error object message");
        const message = ErrorUtils.extractMessage(error);
        expect(message).toBe("Error object message");
      });

      it("should extract message from object with message property", () => {
        const error = { message: "Object error message" };
        const message = ErrorUtils.extractMessage(error);
        expect(message).toBe("Object error message");
      });

      it("should return default for unknown error type", () => {
        const message = ErrorUtils.extractMessage({ unknownProp: "value" });
        expect(message).toBe("Unknown error occurred");
      });
    });

    describe("createUserFriendlyMessage", () => {
      it("should create friendly message for network errors", () => {
        const error = { code: "ENOTFOUND" };
        const message = ErrorUtils.createUserFriendlyMessage(error);
        expect(message).toContain("Network connection failed");
      });

      it("should create friendly message for timeout errors", () => {
        const error = { message: "Operation timed out" };
        const message = ErrorUtils.createUserFriendlyMessage(error);
        expect(message).toContain("timed out");
      });

      it("should create friendly message for rate limit errors", () => {
        const error = { status: 429 };
        const message = ErrorUtils.createUserFriendlyMessage(error);
        expect(message).toContain("Rate limit exceeded");
      });
    });

    describe("sanitizeForLogging", () => {
      it("should remove sensitive data from error objects", () => {
        const error = {
          message: "Operation failed",
          context: {
            password: "secret123",
            token: "bearer-token",
            data: "safe-data",
          },
        };

        const sanitized = ErrorUtils.sanitizeForLogging(error);

        expect(sanitized.message).toBe("Operation failed");
        expect(sanitized.context.password).toBe("[REDACTED]");
        expect(sanitized.context.token).toBe("[REDACTED]");
        expect(sanitized.context.data).toBe("safe-data");
      });

      it("should handle nested objects", () => {
        const error = {
          request: {
            headers: {
              authorization: "Bearer secret-token",
              "content-type": "application/json",
            },
          },
        };

        const sanitized = ErrorUtils.sanitizeForLogging(error);

        expect(sanitized.request.headers.authorization).toBe("[REDACTED]");
        expect(sanitized.request.headers["content-type"]).toBe(
          "application/json"
        );
      });

      it("should handle arrays", () => {
        const error = {
          items: [
            { id: 1, apiKey: "secret-key" },
            { id: 2, name: "safe-name" },
          ],
        };

        const sanitized = ErrorUtils.sanitizeForLogging(error);

        expect(sanitized.items[0].id).toBe(1);
        expect(sanitized.items[0].apiKey).toBe("[REDACTED]");
        expect(sanitized.items[1].name).toBe("safe-name");
      });
    });
  });
});
