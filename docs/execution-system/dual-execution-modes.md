# Dual Execution Modes

The node-drop system implements two distinct execution modes to accommodate different use cases and user needs.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  EXECUTION MODES                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   SINGLE NODE       │    │    WORKFLOW EXECUTION       │ │
│  │   EXECUTION         │    │                             │ │
│  │                     │    │                             │ │
│  │  ┌───────────────┐  │    │  ┌───────────────────────┐  │ │
│  │  │ Right-click   │  │    │  │ Trigger node toolbar  │  │ │
│  │  │ context menu  │  │    │  │ execution button      │  │ │
│  │  └───────────────┘  │    │  └───────────────────────┘  │ │
│  │         │           │    │           │                 │ │
│  │         ▼           │    │           ▼                 │ │
│  │  ┌───────────────┐  │    │  ┌───────────────────────┐  │ │
│  │  │ Execute only  │  │    │  │ Execute workflow      │  │ │
│  │  │ selected node │  │    │  │ from trigger point    │  │ │
│  │  └───────────────┘  │    │  └───────────────────────┘  │ │
│  │                     │    │                             │ │
│  │  Use Cases:         │    │  Use Cases:                 │ │
│  │  - Testing          │    │  - Production runs          │ │
│  │  - Debugging        │    │  - End-to-end testing       │ │
│  │  - Development      │    │  - Automated workflows      │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Mode 1: Single Node Execution

### Purpose

Execute individual nodes in isolation for testing, debugging, and development purposes.

### Trigger Method

- **UI Action**: Right-click on any node → "Execute Node" context menu
- **API Endpoint**: `POST /api/executions` (with `nodeId` parameter and `mode: "single"`)
- **Frontend Method**: `executeNode(nodeId, inputData, "single")`

### Execution Scope

```
Before Execution:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Node A    │────►│   Node B    │────►│   Node C    │
└─────────────┘     └─────────────┘     └─────────────┘
                           ▲
                    (User right-clicks)

After Single Node Execution:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Node A    │     │   Node B    │     │   Node C    │
│  (unchanged)│     │ (EXECUTED)  │     │ (unchanged) │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Business Logic

#### 1. Input Data Handling

```typescript
// Single node execution input data sources:
const inputData = {
  // Option 1: Use previous node's output (if available)
  fromPreviousNode: getPreviousNodeOutput(nodeId),

  // Option 2: Use manually provided test data
  testData: userProvidedData,

  // Option 3: Use default/mock data for testing
  mockData: generateMockData(nodeType),
};
```

#### 2. Execution Process

```
1. Validate Node Configuration
   ├── Check required parameters
   ├── Validate credentials
   └── Verify dependencies

2. Prepare Execution Context
   ├── Load node implementation
   ├── Set up input data
   └── Initialize execution environment

3. Execute Node
   ├── Run node logic
   ├── Handle errors gracefully
   └── Capture output data

4. Update UI
   ├── Show execution status
   ├── Display results
   └── Log execution details
```

#### 3. Error Handling

- **Validation Errors**: Show configuration issues immediately
- **Runtime Errors**: Display error details without affecting other nodes
- **Network Errors**: Provide retry options and clear error messages

### Implementation Details

#### Frontend Flow

```typescript
// WorkflowEditor.tsx
const handleContextMenuExecuteNode = useCallback(
  (nodeId: string) => {
    // Execute in single mode - only this node
    executeNode(nodeId, undefined, "single");
  },
  [executeNode]
);

// workflow.ts store
executeNode: async (nodeId, inputData, mode = "single") => {
  if (mode === "single") {
    // Single node execution logic
    const result = await executionService.executeSingleNode({
      workflowId: workflow.id,
      nodeId,
      inputData,
      mode: "single",
    });

    // Update only this node's state
    updateNodeExecutionResult(nodeId, result);
  }
};
```

#### Backend Flow

```typescript
// ExecutionService.ts
async executeSingleNode(
  workflowId: string,
  nodeId: string,
  userId: string,
  inputData?: any,
  parameters?: any,
  mode: "single" | "workflow" = "single"
) {
  // Load node configuration
  const nodeConfig = await this.loadNodeConfig(workflowId, nodeId);

  // Prepare execution context
  const context = this.createExecutionContext(nodeConfig, inputData);

  // Execute node
  const result = await this.executeNodeImplementation(context);

  // Save results
  await this.saveNodeExecutionResult(result);

  return result;
}
```

## Mode 2: Workflow Execution

### Purpose

Execute complete workflows or workflow branches from trigger points for production use and end-to-end testing.

### Trigger Method

- **UI Action**: Click toolbar button on trigger nodes
- **API Endpoint**: `POST /api/executions`
- **Frontend Method**: `executeNode(triggerNodeId, triggerData, "workflow")`

### Execution Scope

```
Multi-Trigger Workflow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Trigger A   │────►│   Node 1    │────►│   Output    │
└─────────────┘     └─────────────┘     └─────────────┘
      (Click)              ▲
                          │
┌─────────────┐     ┌─────────────┐
│ Trigger B   │────►│   Node 2    │
└─────────────┘     └─────────────┘

Result: Executes A → Node 1 → Output (entire flow from Trigger A)
```

### Business Logic

#### 1. Trigger Identification

```typescript
// When user clicks trigger node toolbar
const triggerNodeId = clickedNodeId; // Specific trigger clicked
const triggerData = prepareTriggerData({
  triggeredBy: "user",
  workflowName: workflow.name,
  triggerNodeId: triggerNodeId,
  triggerNodeType: node.type,
  timestamp: new Date().toISOString(),
});
```

#### 2. Workflow Execution Process

```
1. Workflow Validation
   ├── Check workflow structure
   ├── Validate all node configurations
   └── Ensure execution path exists

2. Execution Planning
   ├── Identify execution starting point (trigger)
   ├── Map node dependencies
   └── Create execution order

3. Flow Execution
   ├── Start from specified trigger
   ├── Execute nodes in dependency order
   ├── Handle parallel branches
   └── Propagate data between nodes

4. Progress Tracking
   ├── Real-time WebSocket updates
   ├── Node-level status updates
   ├── Overall progress calculation
   └── Error state management

5. Completion Handling
   ├── Final status determination
   ├── Result aggregation
   └── Cleanup and resource release
```

#### 3. Multi-Trigger Handling (Enhanced)

```typescript
// Backend: ExecutionService.executeWorkflow() - Fixed Implementation
async executeWorkflow(
  workflowId: string,
  userId: string,
  triggerData?: any,
  options: ExecutionOptions = {},
  triggerNodeId?: string // ✅ Critical for multi-trigger isolation
) {
  // Find starting trigger with validation
  const startingTrigger = triggerNodeId
    ? triggerNodes.find(n => n.id === triggerNodeId)
    : triggerNodes[0]; // Fallback to first trigger

  if (!startingTrigger) {
    throw new Error(`Trigger node ${triggerNodeId} not found`);
  }

  // Execute with trigger-specific isolation
  const flowResult = await this.flowExecutionEngine.executeFromTrigger(
    startingTrigger.id,
    workflowId,
    userId,
    triggerData,
    options,
    parsedWorkflow // ✅ Prevents infinite dependency loops
  );

  return flowResult;
}

// FlowExecutionEngine: Dependency filtering for isolation
private async initializeNodeStates(context, workflow, startNodeId) {
  // ✅ Get reachable nodes from trigger to prevent infinite loops
  const reachableNodes = this.getReachableNodes(startNodeId, workflow.connections);

  for (const node of workflow.nodes) {
    const allDependencies = this.dependencyResolver.getDependencies(node.id, workflow.connections);

    // ✅ Filter dependencies to only include reachable nodes
    const reachableDependencies = allDependencies.filter(depId =>
      reachableNodes.has(depId) || depId === startNodeId
    );

    // Use filtered dependencies to prevent infinite waiting
    const nodeState = {
      nodeId: node.id,
      dependencies: reachableDependencies, // ✅ Key fix
      // ... other properties
    };
  }
}
```

**Key Improvements**:

- ✅ **Dependency Filtering**: Only considers dependencies reachable from the trigger
- ✅ **Infinite Loop Prevention**: Retry limits and timeout handling
- ✅ **Execution Isolation**: Each trigger creates independent execution context
- ✅ **Enhanced Logging**: Detailed debugging information for troubleshooting

### Implementation Details

#### Frontend Flow

```typescript
// Custom Node Toolbar Button
<ExecuteToolbarButton
  node={node}
  onExecute={() => {
    if (node.type.includes("trigger")) {
      // Workflow mode for triggers
      executeNode(node.id, undefined, "workflow");
    } else {
      // Single mode for regular nodes
      executeNode(node.id, undefined, "single");
    }
  }}
/>;

// Store implementation for workflow mode
if (mode === "workflow") {
  // Start workflow execution from this trigger
  const executionResponse = await executionService.executeWorkflow({
    workflowId: workflow.id,
    triggerData,
    triggerNodeId: nodeId, // Specify which trigger to start from
    options: {
      timeout: 300000,
      manual: true,
    },
  });

  // Subscribe to real-time updates
  await subscribeToExecution(executionResponse.executionId);
}
```

#### Backend Flow

```typescript
// FlowExecutionEngine integration
const engine = new FlowExecutionEngine(workflow, {
  startingNodeId: triggerNodeId, // Start from specific trigger
  executionMode: "workflow",
  realTimeUpdates: true,
});

const executionResult = await engine.execute({
  triggerData,
  userId,
  executionId,
});
```

## Mode Comparison

| Aspect              | Single Node         | Workflow               |
| ------------------- | ------------------- | ---------------------- |
| **Scope**           | Individual node     | Complete workflow      |
| **Input Data**      | Mock/test data      | Real trigger data      |
| **Error Impact**    | Isolated            | Can affect downstream  |
| **Performance**     | Fast                | Variable               |
| **Use Case**        | Development/Testing | Production             |
| **UI Feedback**     | Single node update  | Full workflow tracking |
| **WebSocket**       | Optional            | Required               |
| **Database Impact** | Minimal             | Full execution record  |

## Decision Matrix

### When to Use Single Node Execution

- ✅ Testing node configuration
- ✅ Debugging specific node issues
- ✅ Developing new node types
- ✅ Validating node parameters
- ✅ Quick functionality checks

### When to Use Workflow Execution

- ✅ Production workflow runs
- ✅ End-to-end testing
- ✅ Integration testing
- ✅ Performance testing
- ✅ User acceptance testing

## Future Enhancements

### Planned Features

1. **Hybrid Mode**: Execute workflow segment from any node
2. **Batch Testing**: Execute multiple single nodes in sequence
3. **Mock Mode**: Workflow execution with simulated external calls
4. **Debugging Mode**: Step-through execution with breakpoints
5. **Performance Profiling**: Detailed execution timing and resource usage
