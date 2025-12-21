# Execution System Architecture

This folder contains all services related to workflow execution in NodeDrop. The execution system has evolved to support both direct (in-memory) execution and queue-based (Redis/BullMQ) execution for horizontal scaling.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │   API Request    │────▶│ ExecutionService │────▶│ RealtimeExecution│    │
│  │  (HTTP/WebSocket)│     │    (Drizzle)     │     │     Engine       │    │
│  └──────────────────┘     └──────────────────┘     └────────┬─────────┘    │
│                                                              │              │
│                           ┌──────────────────────────────────┼──────────┐   │
│                           │                                  ▼          │   │
│                           │  ┌─────────────────────────────────────┐   │   │
│                           │  │         Execution Mode Switch        │   │   │
│                           │  │   (useQueue: true/false)             │   │   │
│                           │  └──────────────┬──────────────────────┘   │   │
│                           │                 │                          │   │
│              ┌────────────┴─────────────────┴────────────────┐         │   │
│              │                                               │         │   │
│              ▼                                               ▼         │   │
│  ┌───────────────────────┐                    ┌───────────────────────┐│   │
│  │   Direct Execution    │                    │   Queue Execution     ││   │
│  │   (In-Memory)         │                    │   (Redis/BullMQ)      ││   │
│  │                       │                    │                       ││   │
│  │ • Single process      │                    │ • Multi-process       ││   │
│  │ • No persistence      │                    │ • State in Redis      ││   │
│  │ • Limited scaling     │                    │ • Horizontal scaling  ││   │
│  └───────────────────────┘                    └───────────┬───────────┘│   │
│                                                           │            │   │
│                                                           ▼            │   │
│                                               ┌───────────────────────┐│   │
│                                               │ ExecutionQueueService ││   │
│                                               │ (Job Creation)        ││   │
│                                               └───────────┬───────────┘│   │
│                                                           │            │   │
│                                                           ▼            │   │
│                                               ┌───────────────────────┐│   │
│                                               │   Redis Queue         ││   │
│                                               │   (BullMQ)            ││   │
│                                               └───────────┬───────────┘│   │
│                                                           │            │   │
│                                                           ▼            │   │
│                                               ┌───────────────────────┐│   │
│                                               │  ExecutionWorker(s)   ││   │
│                                               │  (Job Processing)     ││   │
│                                               └───────────┬───────────┘│   │
│                                                           │            │   │
│                                                           ▼            │   │
│                                               ┌───────────────────────┐│   │
│                                               │ ExecutionStateStore   ││   │
│                                               │ (Redis State)         ││   │
│                                               └───────────────────────┘│   │
│                                                                        │   │
└────────────────────────────────────────────────────────────────────────┘   │
                                                                              │
                              ┌───────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────────────┐
              │        Real-time Updates              │
              │                                       │
              │  ExecutionEventPublisher              │
              │         │                             │
              │         ▼                             │
              │  Redis Pub/Sub Channel                │
              │         │                             │
              │         ▼                             │
              │  ExecutionEventSubscriber             │
              │         │                             │
              │         ▼                             │
              │  SocketService (WebSocket)            │
              │         │                             │
              │         ▼                             │
              │  Frontend Client                      │
              └───────────────────────────────────────┘
```

## File Structure

```
backend/src/services/execution/
├── README.md                      # This file
├── index.ts                       # Barrel exports
│
├── # Core Execution Services
├── ExecutionService.drizzle.ts    # Main API service (database operations)
├── ExecutionService.factory.ts    # Service factory pattern
├── ExecutionEngine.ts             # Base execution engine interface
├── RealtimeExecutionEngine.ts     # WebSocket-first execution with mode switching
├── FlowExecutionEngine.ts         # Flow-based execution logic
│
├── # Queue System (Redis/BullMQ)
├── ExecutionQueueService.ts       # Job creation and queue management
├── ExecutionWorker.ts             # Job processing worker
├── ExecutionStateStore.ts         # Redis state persistence
│
├── # Event System (Real-time Updates)
├── ExecutionEventPublisher.ts     # Publishes events to Redis Pub/Sub
├── ExecutionEventSubscriber.ts    # Subscribes to events for WebSocket broadcast
├── ExecutionEventBridge.ts        # Bridges events between components
│
├── # Supporting Services
├── ExecutionHistoryService.ts     # Execution history and analytics
├── ExecutionRecoveryService.ts    # Recovery from failures
├── ExecutionResultCache.ts        # Caching execution results
├── ExecutionTimeoutManager.ts     # Timeout handling
├── FlowExecutionPersistenceService.ts  # Flow state persistence
├── SecureExecutionService.ts      # Security wrapper
└── TriggerExecutionContext.ts     # Trigger context management
```

## Service Descriptions

### Core Services

#### ExecutionService.drizzle.ts
The main API-facing service that handles:
- Creating execution records in the database
- Querying execution status and history
- Coordinating between API requests and execution engines
- Single node execution for testing

#### RealtimeExecutionEngine.ts
The primary execution engine that:
- Supports two modes: direct (in-memory) and queue-based
- Emits real-time WebSocket events during execution
- Manages execution context and node outputs
- Handles workflow graph traversal

#### FlowExecutionEngine.ts
Handles the actual node-by-node execution:
- Topological sorting of workflow nodes
- Input/output data flow between nodes
- Branch handling (if/else, switch nodes)
- Loop node execution

### Queue System

#### ExecutionQueueService.ts
Manages the BullMQ job queue:
- Creates execution jobs with workflow data
- Returns execution ID immediately (non-blocking)
- Provides queue statistics and health info
- Handles job cancellation and retry

#### ExecutionWorker.ts
Processes jobs from the queue:
- Configurable concurrency (default: 5)
- Loads state from ExecutionStateStore
- Executes nodes in topological order
- Publishes progress events
- Handles retries with resume from last completed node

#### ExecutionStateStore.ts
Redis-based state persistence:
- Stores execution context with 24-hour TTL
- Stores node outputs in Redis hashes
- Reduces TTL to 1 hour after completion
- Handles Map serialization/deserialization

### Event System

#### ExecutionEventPublisher.ts
Publishes execution events to Redis Pub/Sub:
- `node-started`: When a node begins execution
- `node-completed`: When a node finishes successfully
- `node-failed`: When a node encounters an error
- `execution-completed`: When workflow finishes
- `execution-failed`: When workflow fails

#### ExecutionEventSubscriber.ts
Subscribes to Redis Pub/Sub and forwards to WebSocket:
- Listens to `execution-events` channel
- Parses and validates incoming events
- Forwards to SocketService for broadcast

## Execution Flow

### 1. API Request
```
POST /api/workflows/:id/execute
{
  "triggerData": { ... },
  "useQueue": true  // Optional: use queue-based execution
}
```

### 2. ExecutionService
```typescript
// Creates execution record
const execution = await executionService.executeWorkflow(
  workflowId,
  userId,
  triggerData,
  { useQueue: true }
);
```

### 3. RealtimeExecutionEngine
```typescript
// Decides execution mode
if (useQueue && queueService.isAvailable()) {
  // Queue-based execution
  return queueService.createExecutionJob({ ... });
} else {
  // Direct execution
  return this.startDirectExecution({ ... });
}
```

### 4a. Direct Execution (Legacy)
```typescript
// In-memory execution
const context = new ExecutionContext();
await this.executeWorkflow(executionId, nodes, connections);
// Emits events directly to WebSocket
```

### 4b. Queue Execution (Scalable)
```typescript
// Job added to BullMQ queue
await queue.add('execute', { executionId, nodes, connections });

// Worker picks up job
worker.process(async (job) => {
  const state = await stateStore.getState(job.data.executionId);
  await this.executeNodes(state);
  await eventPublisher.publishCompleted(executionId);
});
```

### 5. Real-time Updates
```typescript
// Worker publishes to Redis Pub/Sub
eventPublisher.publishNodeCompleted(executionId, nodeId, output);

// Subscriber receives and forwards to WebSocket
eventSubscriber.onEvent((event) => {
  socketService.broadcastExecutionEvent(event);
});

// Frontend receives via WebSocket
socket.on('execution-event', (event) => {
  updateUI(event);
});
```

## Configuration

### Environment Variables

```bash
# Worker concurrency (number of parallel job processors)
EXECUTION_WORKER_CONCURRENCY=5

# State TTL in seconds (default: 24 hours)
EXECUTION_STATE_TTL=86400

# Completion TTL in seconds (default: 1 hour)
EXECUTION_COMPLETION_TTL=3600

# Redis connection
REDIS_URL=redis://localhost:6379
```

### Queue Settings

```typescript
// BullMQ job options
{
  attempts: 3,           // Max retry attempts
  backoff: {
    type: 'exponential',
    delay: 2000          // 2s, 4s, 8s
  },
  timeout: 300000        // 5 minute timeout
}
```

## Scaling

### Horizontal Scaling with Workers

The execution system supports horizontal scaling through dedicated worker containers.
Workers process jobs from the Redis queue independently of the main API server.

#### Quick Start with Workers

```bash
# Start with default configuration (1 worker)
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d

# Scale to 3 workers
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d --scale nodedrop-worker=3

# Scale to 5 workers for high throughput
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d --scale nodedrop-worker=5
```

#### Worker Configuration

Workers are configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `EXECUTION_WORKER_CONCURRENCY` | 5 | Jobs processed concurrently per worker |
| `EXECUTION_STATE_TTL` | 86400 | Active execution state TTL (seconds) |
| `EXECUTION_COMPLETION_TTL` | 3600 | Completed execution state TTL (seconds) |

#### Scaling Guidelines

- **Low traffic**: 1-2 workers with concurrency 5 (5-10 concurrent jobs)
- **Medium traffic**: 3-5 workers with concurrency 5 (15-25 concurrent jobs)
- **High traffic**: 5-10 workers with concurrency 10 (50-100 concurrent jobs)

Each worker consumes ~256MB-1GB RAM depending on workflow complexity.

#### Architecture with Workers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Server (nodedrop)                        │
│  • Handles HTTP requests                                         │
│  • WebSocket connections                                         │
│  • Creates execution jobs                                        │
│  • Broadcasts progress events                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Redis Queue (BullMQ)                         │
│  • Execution job queue                                           │
│  • State storage                                                 │
│  • Pub/Sub for events                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Worker 1      │ │   Worker 2      │ │   Worker N      │
│  • Process jobs │ │  • Process jobs │ │  • Process jobs │
│  • Execute nodes│ │  • Execute nodes│ │  • Execute nodes│
│  • Emit events  │ │  • Emit events  │ │  • Emit events  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Queue Monitoring

```typescript
// Get queue statistics
const stats = await queueService.getQueueStats();
// { waiting: 5, active: 3, completed: 100, failed: 2 }

// Health endpoint includes queue info
GET /api/health
{
  "status": "healthy",
  "queue": {
    "waiting": 5,
    "active": 3,
    "healthy": true
  }
}
```

## Error Handling

### Retry Logic
- Jobs retry up to 3 times with exponential backoff
- On retry, execution resumes from last completed node
- Failed jobs move to failed queue after max retries

### Recovery
- ExecutionRecoveryService handles orphaned executions
- State persists in Redis across server restarts
- Workers can pick up jobs from any server

## Migration from Direct to Queue Execution

The system supports gradual migration:

1. **Default**: Direct execution (backward compatible)
2. **Opt-in**: Pass `useQueue: true` to use queue
3. **Future**: Queue execution as default

```typescript
// Current: Direct execution (default)
await engine.startExecution(workflowId, userId, triggerNodeId, data);

// Opt-in: Queue execution
await engine.startExecution(workflowId, userId, triggerNodeId, data, {
  useQueue: true
});
```
