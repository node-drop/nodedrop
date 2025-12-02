# Execution System Overview

## Architecture Overview

The node-drop execution system is designed with a dual-mode architecture that supports both individual node execution and complete workflow execution. The system is built with the following core principles:

- **Separation of Concerns**: Clear distinction between single node and workflow execution
- **Real-time Feedback**: Live progress updates via WebSocket connections
- **Error Resilience**: Comprehensive error handling and recovery mechanisms
- **Trigger Specificity**: Multi-trigger workflows can be executed from specific trigger nodes
- **Visual Integration**: Execution state directly reflected in the UI

## System Components

### Backend Components

```
┌─────────────────────────────────────────────────────────────┐
│                    EXECUTION SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │   API Routes     │    │     ExecutionService        │   │
│  │  executions.ts   │◄──►│  - executeWorkflow()         │   │
│  │                  │    │  - executeSingleNode()       │   │
│  │  - POST /api/    │    │  - getExecutionProgress()    │   │
│  │    executions    │    │  - cancelExecution()         │   │
│  │  - GET /api/     │    │                              │   │
│  │    executions/:id│    └──────────────────────────────┘   │
│  └──────────────────┘                                       │
│                                                             │
│  ┌──────────────────────────────┐    ┌────────────────────┐ │
│  │    FlowExecutionEngine       │    │   WebSocket        │ │
│  │  - Workflow orchestration    │    │   Service          │ │
│  │  - Node dependency tracking  │    │  - Real-time       │ │
│  │  - Parallel execution        │    │    updates         │ │
│  │  - Error propagation         │    │  - Progress        │ │
│  └──────────────────────────────┘    │    tracking        │ │
│                                      └────────────────────┘ │
│  ┌──────────────────────────────┐                           │
│  │      Database Layer          │                           │
│  │  - Execution records         │                           │
│  │  - Node execution results    │                           │
│  │  - Progress tracking         │                           │
│  │  - Error logging             │                           │
│  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Components

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  WorkflowEditor  │    │     Workflow Store          │   │
│  │  - Node context  │◄──►│  - executeNode()             │   │
│  │    menus         │    │  - subscribeToExecution()    │   │
│  │  - Execution     │    │  - updateNodeState()         │   │
│  │    triggers      │    │                              │   │
│  └──────────────────┘    └──────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────┐    ┌────────────────────┐ │
│  │       CustomNode             │    │   Execution        │ │
│  │  - Individual node UI        │    │   Service          │ │
│  │  - Execution toolbar         │    │  - API calls       │ │
│  │  - Status indicators         │    │  - Progress        │ │
│  │  - Error display            │    │    polling         │ │
│  └──────────────────────────────┘    └────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────┐                           │
│  │     Visual Feedback          │                           │
│  │  - Node state colors         │                           │
│  │  - Progress indicators       │                           │
│  │  - Execution logs            │                           │
│  │  - Error messages            │                           │
│  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Execution Modes

The system supports two distinct execution modes:

### 1. Single Node Execution

- **Purpose**: Test individual nodes in isolation
- **Trigger**: Right-click context menu → "Execute Node"
- **Scope**: Only the selected node
- **Use Case**: Development, testing, debugging specific nodes

### 2. Workflow Execution

- **Purpose**: Execute complete workflow from a trigger point
- **Trigger**: Toolbar button on trigger nodes
- **Scope**: Entire workflow or workflow branch from trigger
- **Use Case**: Production execution, end-to-end testing

## Key Features

### Trigger-Specific Execution

```
Multi-Trigger Workflow Example:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Trigger A  │────►│   Node 1    │────►│   Output    │
└─────────────┘     └─────────────┘     └─────────────┘
                           ▲
┌─────────────┐     ┌─────────────┐
│  Trigger B  │────►│   Node 2    │
└─────────────┘     └─────────────┘

- Clicking Trigger A toolbar: Executes A → Node 1 → Output
- Clicking Trigger B toolbar: Executes B → Node 2 → Node 1 → Output
```

#### Multi-Trigger Isolation (Fixed Issue)

**Problem Solved**: Previously, when multiple triggers connected to shared downstream nodes, the system would create infinite dependency loops causing executions to hang.

**Solution**: The system now implements **trigger-specific dependency filtering**:

- Each execution context only considers dependencies reachable from the initiating trigger
- Unreachable dependencies are filtered out to prevent infinite loops
- Retry limits prevent hanging executions
- Detailed logging helps debug dependency issues

For complete details, see [Multi-Trigger Handling](./multi-trigger-handling.md).

### Real-time Progress Tracking

- WebSocket connections for live updates
- Node-level progress indicators
- Execution logs with timestamps
- Error reporting with stack traces

### Error Handling Strategy

- **Graceful Degradation**: Failed nodes don't crash entire workflow
- **Partial Success**: Workflows can complete with some failed nodes
- **Retry Mechanisms**: Automatic retry for transient failures
- **User Feedback**: Clear error messages and recovery suggestions

## Data Flow

### Execution Request Flow

```
User Action → Frontend Store → API Request → ExecutionService → Database
     ↓             ↓              ↓              ↓              ↓
  UI Update ← WebSocket ← Progress ← Engine ← Node Execution
```

### State Management

```
Frontend State:
├── executionState (global workflow state)
├── nodeExecutionStates (individual node states)
├── realTimeResults (live execution data)
└── executionLogs (detailed logging)

Backend State:
├── execution records (persistent storage)
├── node_executions (individual results)
├── execution_progress (real-time tracking)
└── websocket_subscriptions (active connections)
```

## Performance Considerations

### Scalability Features

- **Parallel Node Execution**: Independent nodes run concurrently
- **Connection Pooling**: Efficient database connections
- **WebSocket Management**: Optimized real-time connections
- **Progress Batching**: Reduced update frequency for performance

### Resource Management

- **Memory Efficiency**: Streaming large data sets
- **Timeout Handling**: Configurable execution timeouts
- **Connection Limits**: WebSocket connection management
- **Cleanup Procedures**: Automatic resource cleanup

## Integration Points

### External Systems

- **Database**: Prisma ORM for data persistence
- **WebSocket**: Real-time communication layer
- **File System**: Node module loading and execution
- **HTTP APIs**: External service integrations

### Internal Dependencies

- **Node System**: Custom node types and execution
- **Workflow Engine**: Flow orchestration and management
- **Authentication**: User-based execution tracking
- **Logging**: Comprehensive audit trails

## Next Steps

For detailed implementation documentation, see:

- [Dual Execution Modes](./dual-execution-modes.md)
- [Workflow Execution Flow](./workflow-execution-flow.md)
- [Flow Diagrams](./flow-diagrams/)
