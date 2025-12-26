# Execution Queue Workers

This document describes how to configure and scale execution workers for the workflow execution queue system.

## Overview

The execution queue system uses Redis-backed BullMQ to process workflow executions. This enables:

- **Horizontal scaling**: Add more workers to handle increased load
- **Fault tolerance**: Jobs are persisted in Redis and can be retried
- **Non-blocking API**: Workflow executions don't block the API server

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXECUTION_WORKER_CONCURRENCY` | 5 | Number of concurrent jobs per worker |
| `EXECUTION_STATE_TTL` | 86400 | TTL for active execution state in Redis (seconds) |
| `EXECUTION_COMPLETION_TTL` | 3600 | TTL for completed execution state in Redis (seconds) |

## Single Server Deployment

For single server deployments, the main `nodedrop` service handles both API requests and workflow executions. Configure the concurrency based on your server resources:

```bash
# In your .env file
EXECUTION_WORKER_CONCURRENCY=5
```

## Scaling with Dedicated Workers

For high-load environments, you can run dedicated worker instances that only process queue jobs.

### Starting Workers

```bash
# Start with the workers compose file
docker compose -f docker-compose.yml -f docker-compose.workers.yml up -d

# Scale to 3 worker instances
docker compose -f docker-compose.yml -f docker-compose.workers.yml up -d --scale nodedrop-worker=3
```

### Dynamic Scaling

```bash
# Scale workers up
docker compose -f docker-compose.yml -f docker-compose.workers.yml scale nodedrop-worker=5

# Scale workers down
docker compose -f docker-compose.yml -f docker-compose.workers.yml scale nodedrop-worker=2
```

## Capacity Planning

Total concurrent execution capacity = `number_of_workers × EXECUTION_WORKER_CONCURRENCY`

| Workers | Concurrency | Total Capacity |
|---------|-------------|----------------|
| 1 | 5 | 5 concurrent executions |
| 3 | 5 | 15 concurrent executions |
| 5 | 5 | 25 concurrent executions |
| 3 | 10 | 30 concurrent executions |

### Resource Considerations

- **Memory**: Each worker uses ~256MB-1GB depending on workflow complexity
- **Redis**: Monitor memory usage as execution state is stored in Redis
- **Database**: Consider connection pool limits when scaling workers
- **CPU**: Workers are CPU-bound during node execution

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
    "failed": 2
  }
}
```

### Queue Metrics

Monitor these metrics for scaling decisions:

- **Queue depth** (`waiting`): High values indicate need for more workers
- **Active jobs** (`active`): Should be close to total worker capacity
- **Failed jobs** (`failed`): Monitor for systematic failures

## Retry Behavior

Failed jobs are automatically retried with exponential backoff:

- Retry 1: After 2 seconds
- Retry 2: After 4 seconds
- Retry 3: After 8 seconds

After 3 failed attempts, jobs move to the failed queue for manual review.

## Troubleshooting

### Jobs Stuck in Queue

1. Check worker health: `docker compose logs nodedrop-worker`
2. Verify Redis connectivity
3. Check for resource constraints (memory, CPU)

### High Memory Usage

1. Reduce `EXECUTION_WORKER_CONCURRENCY`
2. Reduce `EXECUTION_STATE_TTL` and `EXECUTION_COMPLETION_TTL`
3. Scale horizontally instead of vertically

### Database Connection Errors

1. Increase database connection pool size
2. Reduce number of workers
3. Check database server resources
