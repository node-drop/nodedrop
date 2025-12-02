# Error Handling

## Overview

The node-drop execution system implements comprehensive error handling mechanisms to ensure robust workflow execution, graceful degradation, and meaningful error reporting. This document covers error types, handling strategies, and specific solutions for common execution issues.

## Error Categories

### 1. Node Execution Errors

**Description**: Errors that occur during individual node execution.

**Examples**:

- HTTP request timeouts
- Invalid node parameters
- Missing credentials
- Runtime exceptions in node code

**Handling Strategy**:

```typescript
try {
  const result = await this.nodeService.executeNode(
    node.type,
    nodeParameters,
    nodeInputData,
    credentials,
    executionId
  );

  if (!result.success) {
    // Handle node failure gracefully
    const failedResult: NodeExecutionResult = {
      nodeId,
      status: FlowNodeStatus.FAILED,
      error: result.error,
      duration: endTime - startTime,
    };

    nodeResults.set(nodeId, failedResult);
    failedNodes.push(nodeId);

    // Continue with other nodes instead of stopping entire workflow
    continue;
  }
} catch (error) {
  logger.error(`Node execution failed: ${nodeId}`, error);
  // Mark node as failed and continue
}
```

### 2. Workflow Structure Errors

**Description**: Errors related to workflow configuration and structure.

**Examples**:

- Circular dependencies
- Missing node connections
- Invalid node references
- Malformed workflow data

**Handling Strategy**:

```typescript
// Enhanced validation with specific error types
try {
  this.dependencyResolver.validateExecutionSafety(
    nodeIds,
    workflow.connections,
    context.executionPath
  );
} catch (error) {
  if (error instanceof CircularDependencyError) {
    return {
      success: false,
      error: {
        type: "CIRCULAR_DEPENDENCY",
        message: `Circular dependency detected: ${error.nodes.join(" → ")}`,
        nodes: error.nodes,
        path: error.path,
      },
    };
  }

  if (error instanceof MissingDependencyError) {
    return {
      success: false,
      error: {
        type: "MISSING_DEPENDENCY",
        message: `Missing dependency for node ${
          error.nodeId
        }: ${error.missingDependencies.join(", ")}`,
        nodeId: error.nodeId,
        missingDependencies: error.missingDependencies,
      },
    };
  }
}
```

### 3. Multi-Trigger Execution Errors (Fixed)

**Description**: Critical errors that occurred when multiple triggers connected to shared nodes, causing infinite loops and system unresponsiveness.

**Root Cause**:

```typescript
// BEFORE (Problematic): All dependencies considered regardless of reachability
const dependencies = this.dependencyResolver.getDependencies(
  node.id,
  workflow.connections
);

// This caused nodes to wait for unreachable trigger dependencies
// Example: HTTP node waiting for both Manual Trigger AND Webhook Trigger
// when only Manual Trigger was executed
```

**Solution Implemented**:

```typescript
// AFTER (Fixed): Filter dependencies by reachability from trigger
const reachableNodes = this.getReachableNodes(
  startNodeId,
  workflow.connections
);
const allDependencies = this.dependencyResolver.getDependencies(
  node.id,
  workflow.connections
);

// ✅ Only include dependencies reachable from the current trigger
const reachableDependencies = allDependencies.filter(
  (depId) => reachableNodes.has(depId) || depId === startNodeId
);

const nodeState: NodeExecutionState = {
  nodeId: node.id,
  dependencies: reachableDependencies, // ✅ Prevents infinite loops
  // ... other properties
};
```

**Additional Safety Measures**:

```typescript
// Infinite loop prevention with retry limits
const nodeRetryCount = new Map<string, number>();
const maxRetries = 10;

if (!this.areNodeDependenciesSatisfied(nodeId, context)) {
  const retryCount = nodeRetryCount.get(nodeId) || 0;

  if (retryCount >= maxRetries) {
    // ✅ Fail fast instead of infinite retrying
    logger.error("Node exceeded maximum retry attempts", {
      nodeId,
      retryCount,
      dependencies: nodeState.dependencies,
    });

    const failedResult: NodeExecutionResult = {
      nodeId,
      status: FlowNodeStatus.FAILED,
      error: new Error(
        `Node dependencies could not be satisfied after ${maxRetries} attempts. This may indicate a configuration issue with multiple triggers.`
      ),
      duration: 0,
    };

    nodeResults.set(nodeId, failedResult);
    failedNodes.push(nodeId);
    continue; // Skip to next node instead of hanging
  }
}
```

### 4. System Resource Errors

**Description**: Errors related to system resources and limits.

**Examples**:

- Memory exhaustion
- Execution timeouts
- Database connection failures
- WebSocket connection issues

**Handling Strategy**:

```typescript
// Timeout handling
const executionTimeout = options.timeout || 300000; // 5 minutes default
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error(`Execution timeout after ${executionTimeout}ms`));
  }, executionTimeout);
});

try {
  const result = await Promise.race([
    this.executeFlow(context, workflow),
    timeoutPromise,
  ]);
  return result;
} catch (error) {
  if (error.message.includes("timeout")) {
    // Handle timeout gracefully
    await this.cancelExecution(context.executionId);
    return {
      success: false,
      error: {
        type: "EXECUTION_TIMEOUT",
        message: `Workflow execution exceeded timeout of ${executionTimeout}ms`,
        timeout: executionTimeout,
      },
    };
  }
  throw error;
}
```

## Error Recovery Strategies

### 1. Graceful Degradation

The system continues execution even when some nodes fail:

```typescript
// Workflow can complete successfully with some failed nodes
const overallStatus =
  failedNodes.length > 0 && executedNodes.length > 0
    ? "partial" // ✅ Partial success instead of complete failure
    : failedNodes.length > 0
    ? "failed"
    : "completed";

return {
  success: true, // ✅ Consider execution successful even with node failures
  data: {
    executionId: flowResult.executionId,
    status: overallStatus,
    executedNodes: flowResult.executedNodes,
    failedNodes: flowResult.failedNodes,
    hasFailures: flowResult.failedNodes.length > 0,
  },
  // Include detailed error information as warnings
  ...(executionError && {
    warnings: [
      {
        type: "NODE_FAILURES",
        message: executionError.message,
        details: executionError,
      },
    ],
  }),
};
```

### 2. Automatic Retry Mechanisms

```typescript
// Node-level retry with exponential backoff
async executeNodeWithRetry(nodeId: string, maxRetries: number = 3) {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.executeNode(nodeId, context, workflow);
      return result; // Success on any attempt
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`Node execution attempt ${attempt} failed, retrying in ${delay}ms`, {
          nodeId, error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  throw lastError;
}
```

### 3. Error Context Preservation

```typescript
// Detailed error context for debugging
const errorContext = {
  executionId: context.executionId,
  nodeId,
  nodeType: node.type,
  timestamp: new Date().toISOString(),
  inputData: nodeInputData,
  parameters: nodeParameters,
  dependencies: nodeState.dependencies,
  executionPath: context.executionPath,
  retryCount: nodeRetryCount.get(nodeId) || 0,
};

logger.error("Node execution failed with context", {
  ...errorContext,
  error: error.message,
  stack: error.stack,
});

// Store in execution history for debugging
await this.executionHistoryService.addExecutionLog(
  context.executionId,
  "error",
  `Node execution failed: ${error.message}`,
  nodeId,
  errorContext
);
```

## Error Communication

### 1. WebSocket Real-time Updates

```typescript
// Broadcast errors in real-time to frontend
if (global.socketService) {
  global.socketService.broadcastExecutionEvent(context.executionId, {
    type: "node-failed",
    nodeId,
    error: {
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date(),
    },
    context: errorContext,
  });
}
```

### 2. API Response Structure

```typescript
// Consistent error response format
interface ExecutionResult {
  success: boolean;
  data?: {
    executionId: string;
    status: "success" | "failed" | "partial" | "cancelled";
    executedNodes: string[];
    failedNodes: string[];
    hasFailures: boolean;
  };
  error?: {
    type: string;
    message: string;
    timestamp: Date;
    nodeId?: string;
    context?: any;
  };
  warnings?: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
}
```

### 3. User-Friendly Error Messages

```typescript
// Transform technical errors into user-friendly messages
function getUserFriendlyErrorMessage(error: Error, nodeType: string): string {
  if (error.message.includes("timeout")) {
    return `The ${nodeType} node took too long to respond. Please check your connection or try again.`;
  }

  if (error.message.includes("dependencies could not be satisfied")) {
    return `This node is waiting for other nodes to complete. This may indicate a workflow configuration issue with multiple triggers.`;
  }

  if (error.message.includes("circular dependency")) {
    return `There's a circular reference in your workflow. Please check your node connections.`;
  }

  return `The ${nodeType} node encountered an error: ${error.message}`;
}
```

## Debugging and Monitoring

### 1. Enhanced Logging

```typescript
// Structured logging for different error scenarios
logger.error("Multi-trigger dependency issue detected", {
  executionId: context.executionId,
  triggerNodeId: startNodeId,
  problematicNodeId: nodeId,
  allDependencies,
  reachableDependencies,
  unreachableDependencies: allDependencies.filter(
    (dep) => !reachableNodes.has(dep)
  ),
  reachableNodes: Array.from(reachableNodes),
  suggestion: "Check if multiple triggers are properly isolated",
});
```

### 2. Error Analytics

```typescript
// Track error patterns for system improvement
interface ErrorMetrics {
  errorType: string;
  nodeType: string;
  frequency: number;
  lastOccurrence: Date;
  executionContext: {
    workflowId: string;
    userId: string;
    triggerType?: string;
  };
}

// Collect metrics for common error patterns
const errorMetrics = await this.collectErrorMetrics({
  timeRange: "24h",
  errorTypes: ["INFINITE_LOOP", "DEPENDENCY_TIMEOUT", "NODE_FAILURE"],
  groupBy: ["nodeType", "workflowId"],
});
```

### 3. Health Checks

```typescript
// System health monitoring
async performHealthCheck(): Promise<HealthStatus> {
  const checks = await Promise.all([
    this.checkDatabaseConnection(),
    this.checkExecutionEngineStatus(),
    this.checkWebSocketConnections(),
    this.checkActiveExecutions(),
  ]);

  return {
    status: checks.every(check => check.healthy) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date(),
    version: process.env.APP_VERSION,
  };
}
```

## Best Practices

### 1. Error Prevention

- **Validate Workflow Structure**: Check for circular dependencies before execution
- **Set Appropriate Timeouts**: Configure reasonable execution timeouts
- **Use Retry Limits**: Prevent infinite retry loops
- **Implement Health Checks**: Monitor system resources

### 2. Error Handling

- **Fail Fast**: Don't let errors cascade or cause infinite loops
- **Preserve Context**: Capture detailed error context for debugging
- **Graceful Degradation**: Continue execution when possible
- **User Communication**: Provide clear, actionable error messages

### 3. Monitoring and Recovery

- **Real-time Monitoring**: Use WebSocket for immediate error notification
- **Error Analytics**: Track patterns to identify systemic issues
- **Automated Recovery**: Implement retry and fallback mechanisms
- **Performance Monitoring**: Track execution times and resource usage

## Troubleshooting Guide

### Common Issues and Solutions

| Issue                     | Symptoms                     | Root Cause                                      | Solution                                              |
| ------------------------- | ---------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| **Infinite Loop**         | Execution hangs, high CPU    | Multiple triggers with unreachable dependencies | ✅ Fixed with dependency filtering                    |
| **Timeout Errors**        | Execution exceeds time limit | Long-running nodes or dependency cycles         | Check workflow structure and set appropriate timeouts |
| **Memory Exhaustion**     | System becomes unresponsive  | Large data sets or memory leaks                 | Implement streaming and memory limits                 |
| **WebSocket Disconnects** | Loss of real-time updates    | Network issues or server overload               | Implement reconnection logic                          |

### Debug Steps

1. **Check Execution Logs**: Look for dependency resolution errors
2. **Verify Workflow Structure**: Ensure proper node connections
3. **Monitor Resource Usage**: Check memory and CPU utilization
4. **Test Individual Components**: Execute nodes in isolation
5. **Review Error Context**: Examine detailed error information

## Future Improvements

### Planned Enhancements

1. **Smart Error Recovery**: AI-powered error resolution suggestions
2. **Predictive Error Detection**: Identify potential issues before execution
3. **Advanced Analytics**: Machine learning for error pattern recognition
4. **Self-Healing Systems**: Automatic recovery from common issues

### Compatibility

The error handling system maintains:

- ✅ **Backward Compatibility**: Existing error handling continues to work
- ✅ **API Stability**: No breaking changes to error response formats
- ✅ **Performance**: Minimal overhead for error handling mechanisms
- ✅ **Extensibility**: Easy to add new error types and handling strategies
