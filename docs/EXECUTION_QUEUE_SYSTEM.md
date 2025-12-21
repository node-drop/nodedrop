# Execution Queue System

This document describes the Redis-backed BullMQ execution queue system that enables horizontal scaling, fault tolerance, and independent worker scaling for workflow execution.

## Overview

The execution queue system migrates workflow execution from an in-memory model to a distributed queue-based architecture. This solves several critical scalability issues:

1. **CPU-intensive workflows no longer block the API** - Executions run in separate worker processes
2. **Execution state survives server restarts** - State is persisted in Redis
3. **Workers scale independently** - Add more workers without touching the API server
4. **Higher concurrent execution limits** - No longer limited by single process memory

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. API Request                                                              │
│     POST /api/workflows/:id/execute                                          │
│              │                                                               │
│              ▼                                                               │
│  2. ExecutionService                                                         │
│     • Creates execution record in database                                   │
│     • Calls RealtimeExecutionEngine                                          │
│              │                                                               │
│              ▼                                                               │
│  3. RealtimeExecutionEngine                                                  │
│     • Checks if queue mode is enabled                                        │
│     • If useQueue=true, delegates to ExecutionQueueService                   │
│     • If useQueue=false, executes directly (legacy mode)                     │
│              │                                                               │
│              ▼                                                               │
│  4. ExecutionQueueService                                                    │
│     • Creates job in BullMQ queue                                            │
│     • Returns execution ID immediately (non-blocking)                        │
│              │                                                               │
│              ▼                                                               │
│  5. Redis Queue (BullMQ)                                                     │
│     • Stores job data                                                        │
│     • Manages job lifecycle (waiting → active → completed/failed)            │
│              │                                                               │
│              ▼                                                               │
│  6. ExecutionWorker                                                          │
│     • Picks up job from queue                                                │
│     • Loads state from ExecutionStateStore                                   │
│     • Executes nodes in topological order                                    │
│     • Publishes progress events                                              │
│              │                                                               │
│              ▼                                                               │
│  7. ExecutionEventPublisher                                                  │
│     • Publishes events to Redis Pub/Sub                                      │
│              │                                                               │
│              ▼                                                               │
│  8. ExecutionEventSubscriber (in API server)                                 │
│     • Receives events from Redis Pub/Sub                                     │
│     • Forwards to SocketService                                              │
│              │                                                               │
│              ▼                                                               │
│  9. WebSocket Broadcast                                                      │
│     • Frontend receives real-time updates                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### ExecutionQueueService
Creates and manages execution jobs in the BullMQ queue.

```typescript
// Create a new execution job
const executionId = await queueService.createExecutionJob({
  workflowId: 'wf_123',
  userId: 'user_456',
  triggerNodeId: 'node_789',
  triggerData: { ... },
  nodes: [...],
  connections: [...],
});

// Cancel an execution
await queueService.cancelExecution(executionId);

// Get queue statistics
const stats = await queueService.getQueueStats();
// { waiting: 5, active: 3, completed: 100, failed: 2 }
```

### ExecutionWorker
Processes jobs from the queue and executes workflow nodes.

```typescript
// Worker is initialized automatically on startup
// Configuration via environment variables:
// - EXECUTION_WORKER_CONCURRENCY: Number of concurrent jobs (default: 5)
```

### ExecutionStateStore
Redis-based storage for execution context and node outputs.

```typescript
// State is managed automatically by the worker
// TTL configuration:
// - EXECUTION_STATE_TTL: Active execution TTL (default: 24 hours)
// - EXECUTION_COMPLETION_TTL: Completed execution TTL (default: 1 hour)
```

### ExecutionEventPublisher / ExecutionEventSubscriber
Redis Pub/Sub for real-time progress events.

Events published:
- `node-started`: When a node begins execution
- `node-completed`: When a node finishes successfully
- `node-failed`: When a node encounters an error
- `execution-completed`: When workflow finishes
- `execution-failed`: When workflow fails

## Configuration

### Environment Variables

```bash
# Worker concurrency (jobs processed in parallel per worker)
EXECUTION_WORKER_CONCURRENCY=5

# State TTL for active executions (seconds)
EXECUTION_STATE_TTL=86400  # 24 hours

# State TTL for completed executions (seconds)
EXECUTION_COMPLETION_TTL=3600  # 1 hour

# Redis connection (required)
REDIS_URL=redis://localhost:6379
```

### BullMQ Job Options

Jobs are configured with:
- **Max retries**: 3 attempts
- **Backoff**: Exponential (2s, 4s, 8s)
- **Timeout**: 5 minutes per job

## Scaling with Docker Compose

### Basic Setup (Single Container)

The main `nodedrop` container handles both API requests and execution:

```bash
docker-compose up -d
```

### Scaled Setup (Dedicated Workers)

For high-throughput scenarios, run dedicated worker containers:

```bash
# Start with workers
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d

# Scale workers
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d --scale nodedrop-worker=5
```

### Worker Service Configuration

The `docker-compose.workers.yml` file defines the worker service:

```yaml
services:
  nodedrop-worker:
    build:
      context: .
      dockerfile: Dockerfile
    command: ["node", "dist/worker.js"]
    environment:
      - EXECUTION_WORKER_CONCURRENCY=5
      - WORKER_MODE=true
    deploy:
      replicas: 1
```

### Scaling Guidelines

| Scenario | Workers | Concurrency | Total Capacity |
|----------|---------|-------------|----------------|
| Development | 0 (API only) | 5 | 5 concurrent |
| Low traffic | 1-2 | 5 | 10-15 concurrent |
| Medium traffic | 3-5 | 5 | 20-30 concurrent |
| High traffic | 5-10 | 10 | 75-150 concurrent |

## Monitoring

### Health Endpoint

The `/api/health` endpoint includes queue statistics:

```json
{
  "status": "healthy",
  "queue": {
    "waiting": 5,
    "active": 3,
    "completed": 1000,
    "failed": 2,
    "healthy": true
  }
}
```

### Queue Status

- **waiting**: Jobs waiting to be processed
- **active**: Jobs currently being processed
- **completed**: Successfully completed jobs
- **failed**: Jobs that failed after all retries

## Error Handling

### Automatic Retries

Failed jobs are automatically retried up to 3 times with exponential backoff:
- 1st retry: 2 seconds
- 2nd retry: 4 seconds
- 3rd retry: 8 seconds

### Resume from Failure

When a job is retried, execution resumes from the last successfully completed node:

```typescript
// Job data includes lastCompletedNodeId for resume
{
  executionId: 'exec_123',
  lastCompletedNodeId: 'node_456',  // Resume from here
  ...
}
```

### Failed Job Queue

Jobs that fail all retry attempts are moved to a failed queue for manual inspection:

```typescript
// Retry a failed job manually
await queueService.retryExecution(executionId);
```

## Migration Guide

### Enabling Queue Mode

Queue mode is opt-in. To enable:

```typescript
// In API call
await executionService.executeWorkflow(workflowId, userId, triggerData, {
  useQueue: true  // Enable queue-based execution
});
```

### Backward Compatibility

- Default behavior remains direct execution (no queue)
- Existing API response format unchanged
- WebSocket events maintain same format
- No frontend changes required

## Troubleshooting

### Jobs Stuck in Queue

1. Check worker status: `docker-compose logs nodedrop-worker`
2. Verify Redis connection: `redis-cli ping`
3. Check queue stats: `GET /api/health`

### Workers Not Processing

1. Ensure `REDIS_URL` is correct
2. Check worker logs for errors
3. Verify database connection

### High Memory Usage

1. Reduce `EXECUTION_WORKER_CONCURRENCY`
2. Add more workers with lower concurrency
3. Check for memory leaks in custom nodes

## File Locations

All execution-related services are in `backend/src/services/execution/`:

```
execution/
├── README.md                      # Architecture documentation
├── index.ts                       # Barrel exports
├── ExecutionService.drizzle.ts    # Main API service
├── ExecutionQueueService.ts       # Queue management
├── ExecutionWorker.ts             # Job processing
├── ExecutionStateStore.ts         # Redis state
├── ExecutionEventPublisher.ts     # Event publishing
├── ExecutionEventSubscriber.ts    # Event subscription
└── ...                            # Other supporting services
```
