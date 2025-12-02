# Multi-Trigger Infinite Loop - Troubleshooting Guide

## Issue Overview

**Problem**: Backend becomes unresponsive when executing workflows with multiple triggers connected to shared downstream nodes.

**Symptoms**:

- API request to `/api/executions` hangs indefinitely
- High CPU usage on backend server
- No response from execution endpoint
- WebSocket connections may disconnect

## Root Cause Analysis

### The Problem Scenario

```json
// Example problematic workflow (node1.json)
{
  "nodes": [
    {
      "id": "node-1759003172175",
      "type": "webhook-trigger"
    },
    {
      "id": "node-1759076295668",
      "type": "manual-trigger"
    },
    {
      "id": "node-1759007294170",
      "type": "http-request"
    }
  ],
  "connections": [
    {
      "sourceNodeId": "node-1759003172175",
      "targetNodeId": "node-1759007294170"
    },
    {
      "sourceNodeId": "node-1759076295668",
      "targetNodeId": "node-1759007294170"
    }
  ]
}
```

### What Was Happening

1. **Manual Trigger Execution**: User executes manual trigger (`node-1759076295668`)
2. **Dependency Setup**: HTTP Request node (`node-1759007294170`) gets dependencies: `[webhook-trigger, manual-trigger]`
3. **Infinite Wait**: HTTP Request waits for BOTH triggers to complete
4. **Never Satisfied**: Webhook trigger never executes, so dependencies never satisfied
5. **Infinite Loop**: Node keeps getting re-queued indefinitely

### Code Location of the Bug

```typescript
// BEFORE (FlowExecutionEngine.ts - initializeNodeStates method)
for (const node of workflow.nodes) {
  const dependencies = this.dependencyResolver.getDependencies(
    node.id,
    workflow.connections // ❌ ALL connections considered
  );

  const nodeState: NodeExecutionState = {
    nodeId: node.id,
    status: FlowNodeStatus.IDLE,
    dependencies, // ❌ Includes unreachable dependencies
    dependents,
    progress: 0,
  };
}
```

## Solution Implemented

### 1. Trigger-Specific Dependency Filtering

```typescript
// AFTER (FlowExecutionEngine.ts - Fixed Implementation)
private async initializeNodeStates(context, workflow, startNodeId) {
  // ✅ Get all nodes reachable from the starting trigger
  const reachableNodes = this.getReachableNodes(startNodeId, workflow.connections);
  reachableNodes.add(startNodeId);

  for (const node of workflow.nodes) {
    const allDependencies = this.dependencyResolver.getDependencies(
      node.id,
      workflow.connections
    );

    // ✅ Filter dependencies to only include reachable ones
    const reachableDependencies = allDependencies.filter(depId =>
      reachableNodes.has(depId) || depId === startNodeId
    );

    const nodeState: NodeExecutionState = {
      nodeId: node.id,
      status: FlowNodeStatus.IDLE,
      dependencies: reachableDependencies, // ✅ Only reachable dependencies
      dependents,
      progress: 0,
    };
  }
}
```

### 2. Reachability Analysis

```typescript
// New method to determine reachable nodes from trigger
private getReachableNodes(startNodeId: string, connections: any[]): Set<string> {
  const reachable = new Set<string>();
  const visited = new Set<string>();

  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const downstreamConnections = connections.filter(
      conn => conn.sourceNodeId === nodeId
    );

    for (const connection of downstreamConnections) {
      const targetNodeId = connection.targetNodeId;
      if (!reachable.has(targetNodeId)) {
        reachable.add(targetNodeId);
        traverse(targetNodeId);
      }
    }
  };

  traverse(startNodeId);
  return reachable;
}
```

### 3. Infinite Loop Prevention

```typescript
// Added retry limits to prevent infinite re-queueing
private async executeFlow(context, workflow) {
  const nodeRetryCount = new Map<string, number>();
  const maxRetries = 10;

  while (!context.cancelled && !context.paused) {
    // ... queue processing ...

    if (!this.areNodeDependenciesSatisfied(nodeId, context)) {
      const retryCount = nodeRetryCount.get(nodeId) || 0;

      if (retryCount >= maxRetries) {
        // ✅ Fail fast instead of infinite retry
        logger.error("Node exceeded maximum retry attempts", {
          nodeId, dependencies: nodeState.dependencies
        });

        // Mark as failed and continue
        const failedResult = {
          nodeId,
          status: FlowNodeStatus.FAILED,
          error: new Error(`Dependencies could not be satisfied after ${maxRetries} attempts`),
          duration: 0,
        };

        nodeResults.set(nodeId, failedResult);
        continue;
      }

      nodeRetryCount.set(nodeId, retryCount + 1);
      // Re-queue with limit
    }
  }
}
```

## Testing the Fix

### 1. Verify the Fix Works

```bash
# Test with the problematic payload
curl -X POST http://localhost:4000/api/executions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @node1.json
```

**Expected Result**: Should return within seconds instead of hanging

### 2. Check Logs for Dependency Filtering

```bash
# Look for these log messages in backend logs
grep "Reachable nodes from trigger" backend/logs/combined.log
grep "reachableDependencies" backend/logs/combined.log
```

### 3. Verify Execution Completes

```json
// Expected successful response
{
  "success": true,
  "data": {
    "executionId": "uuid-here",
    "status": "success",
    "executedNodes": ["node-1759076295668", "node-1759007294170"],
    "failedNodes": [],
    "hasFailures": false
  }
}
```

## Prevention Strategies

### 1. Workflow Design Best Practices

```markdown
✅ DO:

- Design clear trigger isolation paths
- Test each trigger independently
- Use explicit trigger specification in API calls
- Document multi-trigger workflows clearly

❌ DON'T:

- Create complex shared dependency chains
- Assume all triggers should execute all nodes
- Mix webhook and manual triggers without clear separation
- Ignore execution scope when designing workflows
```

### 2. API Usage Best Practices

```typescript
// ✅ Always specify triggerNodeId for multi-trigger workflows
const executionRequest = {
  workflowId: "workflow-123",
  triggerNodeId: "node-1759076295668", // Explicit trigger
  triggerData: {
    source: "manual",
    triggeredBy: "user",
  },
};

// ❌ Don't rely on automatic trigger selection
const executionRequest = {
  workflowId: "workflow-123",
  // Missing triggerNodeId - may cause issues
  triggerData: {
    /* ... */
  },
};
```

### 3. Monitoring and Alerting

```typescript
// Set up monitoring for infinite loops
const executionTimeout = 30000; // 30 seconds max
const executionPromise = executeWorkflow(request);
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Execution timeout")), executionTimeout);
});

try {
  const result = await Promise.race([executionPromise, timeoutPromise]);
  return result;
} catch (error) {
  if (error.message.includes("timeout")) {
    // Alert: Possible infinite loop detected
    logger.error("Possible infinite loop in workflow execution", {
      workflowId: request.workflowId,
      triggerNodeId: request.triggerNodeId,
    });
  }
  throw error;
}
```

## Debugging Steps

### If the Issue Reoccurs

1. **Check Execution Logs**:

   ```bash
   tail -f backend/logs/combined.log | grep -E "(dependencies|reachable|retry)"
   ```

2. **Verify Dependency Filtering**:

   ```typescript
   // Look for these log entries
   "Reachable nodes from trigger": [...] // Should show filtered list
   "reachableDependencies": [...] // Should be subset of allDependencies
   ```

3. **Check Retry Counts**:

   ```bash
   grep "exceeded maximum retry attempts" backend/logs/error.log
   ```

4. **Monitor Resource Usage**:
   ```bash
   # Check if CPU usage spikes during execution
   top -p $(pgrep -f "node.*backend")
   ```

### Recovery Steps

1. **Stop Hanging Execution**:

   ```bash
   # Restart backend service
   pm2 restart backend
   # or
   pkill -f "node.*backend" && npm run start
   ```

2. **Clear Stuck Executions**:

   ```sql
   -- Mark hanging executions as failed
   UPDATE executions
   SET status = 'ERROR', finished_at = NOW()
   WHERE status = 'RUNNING' AND started_at < NOW() - INTERVAL '5 minutes';
   ```

3. **Verify Fix Deployment**:
   ```bash
   # Check if the fixed code is deployed
   grep -n "getReachableNodes" backend/src/services/FlowExecutionEngine.ts
   grep -n "reachableDependencies" backend/src/services/FlowExecutionEngine.ts
   ```

## Related Files Changed

- `backend/src/services/FlowExecutionEngine.ts`: Main fix implementation
- `docs/execution-system/multi-trigger-handling.md`: Comprehensive documentation
- `docs/execution-system/error-handling.md`: Error handling strategies
- `docs/execution-system/execution-overview.md`: Updated overview

## Summary

This fix resolves the critical issue where backends became unresponsive due to infinite dependency loops in multi-trigger workflows. The solution implements trigger-specific dependency filtering, retry limits, and enhanced logging to prevent and debug such issues in the future.

**Key Benefits**:

- ✅ Prevents infinite loops in multi-trigger scenarios
- ✅ Maintains execution isolation between triggers
- ✅ Provides fast failure detection with retry limits
- ✅ Enables comprehensive debugging with enhanced logging
- ✅ Preserves backward compatibility for single-trigger workflows
