# Multi-Trigger Handling

## Overview

The node-drop execution system supports workflows with multiple trigger nodes, allowing different entry points into the same workflow. This document describes how the system handles multiple triggers, prevents execution conflicts, and ensures proper isolation between trigger executions.

## Problem Statement

### The Challenge

When a workflow contains multiple trigger nodes that connect to shared downstream nodes, several issues can arise:

1. **Infinite Dependency Loops**: A node may wait for dependencies that will never be satisfied
2. **Execution Conflicts**: Multiple triggers executing simultaneously may interfere with each other
3. **Unclear Execution Scope**: It's ambiguous which nodes should execute when a specific trigger is activated

### Example Problematic Scenario

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Webhook        │────►│                 │────►│   HTTP Request  │
│  Trigger        │     │                 │     │   (Shared)      │
└─────────────────┘     │                 │     └─────────────────┘
                        │                 │              │
┌─────────────────┐     │                 │     ┌─────────────────┐
│  Manual         │────►│                 │────►│   Response      │
│  Trigger        │     │                 │     │   Handler       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Issue**: When the Manual Trigger executes, the HTTP Request node waits for BOTH the Manual Trigger AND the Webhook Trigger to complete, causing an infinite loop since the Webhook Trigger was never executed.

## Solution Architecture

### Trigger-Specific Dependency Filtering

The system implements **trigger-specific execution contexts** that filter node dependencies based on reachability from the initiating trigger.

#### Core Algorithm

1. **Reachability Analysis**: Determine which nodes are reachable from the starting trigger
2. **Dependency Filtering**: Filter each node's dependencies to only include reachable nodes
3. **Isolated Execution**: Execute only the subgraph connected to the trigger

```typescript
// FlowExecutionEngine.ts - Core fix implementation
private async initializeNodeStates(
  context: FlowExecutionContext,
  workflow: Workflow,
  startNodeId: string
): Promise<void> {
  // Get all nodes reachable from the starting trigger
  const reachableNodes = this.getReachableNodes(startNodeId, workflow.connections);
  reachableNodes.add(startNodeId);

  for (const node of workflow.nodes) {
    // Get all dependencies for this node
    const allDependencies = this.dependencyResolver.getDependencies(
      node.id,
      workflow.connections
    );

    // Filter dependencies to only include those reachable from the trigger
    const reachableDependencies = allDependencies.filter(depId =>
      reachableNodes.has(depId) || depId === startNodeId
    );

    // Use filtered dependencies to prevent infinite loops
    const nodeState: NodeExecutionState = {
      nodeId: node.id,
      status: FlowNodeStatus.IDLE,
      dependencies: reachableDependencies, // ✅ Filtered dependencies
      dependents: this.dependencyResolver.getDownstreamNodes(node.id, workflow.connections),
      progress: 0,
    };

    context.nodeStates.set(node.id, nodeState);
  }
}
```

### Reachability Analysis

The `getReachableNodes` method performs a forward traversal from the trigger to identify all connected downstream nodes:

```typescript
private getReachableNodes(startNodeId: string, connections: any[]): Set<string> {
  const reachable = new Set<string>();
  const visited = new Set<string>();

  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) {
      return; // Prevent infinite loops in case of cycles
    }
    visited.add(nodeId);

    // Find all nodes that this node connects to (downstream)
    const downstreamConnections = connections.filter(
      conn => conn.sourceNodeId === nodeId
    );

    for (const connection of downstreamConnections) {
      const targetNodeId = connection.targetNodeId;
      if (!reachable.has(targetNodeId)) {
        reachable.add(targetNodeId);
        traverse(targetNodeId); // Recursively traverse downstream
      }
    }
  };

  traverse(startNodeId);
  return reachable;
}
```

### Infinite Loop Prevention

Additional safety mechanisms prevent execution from hanging:

```typescript
// Enhanced execution loop with retry limits
private async executeFlow(context: FlowExecutionContext, workflow: Workflow) {
  const nodeRetryCount = new Map<string, number>();
  const maxRetries = 10; // Maximum retries per node

  while (!context.cancelled && !context.paused) {
    const nodeId = queue.shift()!;

    if (!this.areNodeDependenciesSatisfied(nodeId, context)) {
      const retryCount = nodeRetryCount.get(nodeId) || 0;

      if (retryCount >= maxRetries) {
        // Mark node as failed instead of infinite retrying
        logger.error("Node exceeded maximum retry attempts", {
          nodeId, retryCount, dependencies: nodeState.dependencies
        });

        const failedResult: NodeExecutionResult = {
          nodeId,
          status: FlowNodeStatus.FAILED,
          error: new Error(`Node dependencies could not be satisfied after ${maxRetries} attempts`),
          duration: 0,
        };

        nodeResults.set(nodeId, failedResult);
        failedNodes.push(nodeId);
        continue;
      }

      nodeRetryCount.set(nodeId, retryCount + 1);
      queue.push(nodeId); // Re-queue with incremented retry count
      continue;
    }

    // Execute node...
  }
}
```

## Execution Scenarios

### Scenario 1: Independent Trigger Paths

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Trigger A  │────►│   Node 1    │────►│   Output A  │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Trigger B  │────►│   Node 2    │────►│   Output B  │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Execution**: Each trigger executes independently with no shared nodes.

**Result**: ✅ Clean isolation, no conflicts

### Scenario 2: Shared Downstream Node

```
┌─────────────┐     ┌─────────────┐
│  Trigger A  │────►│             │
└─────────────┘     │   Shared    │────► Output
                    │   Node      │
┌─────────────┐     │             │
│  Trigger B  │────►│             │
└─────────────┘     └─────────────┘
```

**Execution**:

- Trigger A → Shared Node (dependencies: [Trigger A]) ✅
- Trigger B → Shared Node (dependencies: [Trigger B]) ✅

**Result**: ✅ Each trigger creates its own execution path to the shared node

### Scenario 3: Complex Multi-Path Convergence

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Trigger A  │────►│   Node 1    │────►│             │
└─────────────┘     └─────────────┘     │   Shared    │────► Output
                                        │   Node      │
┌─────────────┐     ┌─────────────┐     │             │
│  Trigger B  │────►│   Node 2    │────►│             │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Execution**:

- Trigger A → Node 1 → Shared Node (dependencies: [Node 1]) ✅
- Trigger B → Node 2 → Shared Node (dependencies: [Node 2]) ✅

**Result**: ✅ Each trigger follows its own execution path

## API Integration

### Trigger-Specific Execution Request

```typescript
// POST /api/executions with trigger specification
{
  "workflowId": "workflow-123",
  "triggerNodeId": "node-1759076295668", // ✅ Specify which trigger
  "triggerData": {
    "timestamp": "2025-09-28T16:18:28.778Z",
    "source": "manual",
    "triggeredBy": "user"
  },
  "options": {
    "timeout": 300000,
    "manual": true
  }
}
```

### ExecutionService Integration

```typescript
// ExecutionService.executeWorkflow() with trigger-specific logic
async executeWorkflow(
  workflowId: string,
  userId: string,
  triggerData?: any,
  options: ExecutionOptions = {},
  triggerNodeId?: string, // ✅ Critical parameter
  workflowData?: Workflow
): Promise<ExecutionResult> {

  if (triggerNodeId) {
    // Use specific trigger node if provided
    targetTriggerNode = triggerNodes.find(
      (node: any) => node.id === triggerNodeId
    );
  } else {
    // Use first trigger node as fallback
    targetTriggerNode = triggerNodes[0];
  }

  // Execute with trigger-specific context
  flowResult = await this.flowExecutionEngine.executeFromTrigger(
    targetTriggerNode.id,
    workflowId,
    userId,
    triggerData,
    options,
    parsedWorkflow
  );
}
```

## Debugging and Monitoring

### Enhanced Logging

```typescript
logger.info("Node states initialized for trigger execution", {
  executionId: context.executionId,
  startNodeId,
  totalNodes: context.nodeStates.size,
  reachableFromTrigger: Array.from(reachableNodes),
  nodeStates: Array.from(context.nodeStates.entries()).map(
    ([nodeId, state]) => ({
      nodeId,
      status: state.status,
      dependencies: state.dependencies, // ✅ Shows filtered dependencies
      dependents: state.dependents,
    })
  ),
});
```

### Error Detection

The system detects and prevents common multi-trigger issues:

1. **Infinite Dependency Loops**: Retry limit prevents infinite re-queuing
2. **Unreachable Dependencies**: Dependency filtering removes unreachable nodes
3. **Execution Timeouts**: Global timeout prevents hanging executions

## Best Practices

### Workflow Design

1. **Clear Trigger Separation**: Design workflows with clear trigger boundaries
2. **Shared Node Considerations**: Be mindful of shared downstream nodes
3. **Testing Multiple Paths**: Test each trigger independently

### Configuration

1. **Explicit Trigger Selection**: Always specify `triggerNodeId` in API requests
2. **Timeout Configuration**: Set appropriate execution timeouts
3. **Error Handling**: Implement proper error recovery for failed nodes

### Monitoring

1. **Execution Logs**: Monitor for dependency resolution issues
2. **Performance Metrics**: Track execution times for different trigger paths
3. **Error Rates**: Monitor failure rates for shared nodes

## Future Enhancements

### Planned Improvements

1. **Parallel Trigger Execution**: Allow multiple triggers to execute simultaneously
2. **Advanced Conflict Resolution**: Smart handling of concurrent shared node access
3. **Trigger Prioritization**: Priority-based execution scheduling
4. **Resource Isolation**: Per-trigger resource allocation and limits

### Compatibility

This multi-trigger handling system is:

- ✅ **Backward Compatible**: Existing single-trigger workflows continue to work
- ✅ **API Compatible**: No breaking changes to existing API endpoints
- ✅ **Performance Optimized**: Minimal overhead for single-trigger workflows
- ✅ **Error Resilient**: Graceful handling of configuration issues

## Troubleshooting

### Common Issues

| Issue                | Symptoms                        | Solution                           |
| -------------------- | ------------------------------- | ---------------------------------- |
| Infinite Loop        | Execution hangs, high CPU usage | Check for unreachable dependencies |
| Incomplete Execution | Some nodes don't execute        | Verify trigger connectivity        |
| Timeout Errors       | Execution exceeds time limit    | Check for dependency cycles        |

### Debug Steps

1. **Check Execution Logs**: Look for dependency resolution messages
2. **Verify Trigger Connections**: Ensure proper workflow connectivity
3. **Test Individual Triggers**: Execute each trigger separately
4. **Monitor Resource Usage**: Check for memory/CPU issues

## Conclusion

The multi-trigger handling system provides robust support for complex workflows while maintaining execution isolation and preventing common pitfalls. The trigger-specific dependency filtering ensures that each trigger execution follows a clean, predictable path through the workflow graph.

Key benefits:

- ✅ **Prevents Infinite Loops**: Dependency filtering eliminates unreachable dependencies
- ✅ **Ensures Isolation**: Each trigger executes independently
- ✅ **Maintains Performance**: Minimal overhead for execution overhead
- ✅ **Provides Debugging**: Comprehensive logging and error reporting
