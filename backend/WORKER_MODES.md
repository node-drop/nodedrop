# Worker Modes

The application supports three worker modes via the `WORKER_MODE` environment variable:

## Modes

### `hybrid` (default)
API server + embedded worker in the same process.

**Use for:**
- Single-server deployments
- Development environments
- Small-scale production (< 100 workflows/day)

**Pros:**
- Simple setup, no separate containers
- Lower infrastructure costs
- Easy to debug

**Cons:**
- API affected by worker CPU usage
- Cannot scale API and workers independently
- Single point of failure

**Example:**
```bash
# Default mode
docker-compose up -d

# Or explicitly set
WORKER_MODE=hybrid docker-compose up -d
```

---

### `api-only`
API server only, no worker process.

**Use for:**
- Horizontal API scaling with separate workers
- High-traffic scenarios (> 1000 requests/minute)
- When API responsiveness is critical

**Pros:**
- API unaffected by worker load
- Can scale API instances independently
- Better resource allocation

**Cons:**
- Requires separate worker containers
- More complex deployment

**Example:**
```bash
# Run API without worker
WORKER_MODE=api-only docker-compose up -d

# Scale API instances
docker-compose up -d --scale nodedrop=5
```

---

### `worker-only`
Worker process only, no API server (via `worker.ts` entry point).

**Use for:**
- Dedicated worker containers
- Background job processing
- Optimal resource usage

**Pros:**
- Optimal resource usage (no HTTP server overhead)
- Can scale workers independently
- Better fault isolation

**Cons:**
- Requires separate API containers
- Uses dedicated `worker.ts` entry point

**Example:**
```bash
# Start with separate workers
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d

# Scale workers
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d --scale nodedrop-worker=10
```

---

## Deployment Scenarios

### Scenario 1: Development (Simple)
```yaml
# docker-compose.yml
WORKER_MODE=hybrid  # Default
```
**Result:** 1 container with API + Worker

---

### Scenario 2: Production (Small-Medium)
```yaml
# API containers
WORKER_MODE=api-only
replicas: 3

# Worker containers (via docker-compose.workers.yml)
WORKER_MODE=worker-only
replicas: 5
```
**Result:** 3 API containers + 5 worker containers

---

### Scenario 3: Production (High Scale)
```yaml
# API containers (Kubernetes)
WORKER_MODE=api-only
replicas: 10
autoscaling: CPU > 70%

# Worker containers (Kubernetes + KEDA)
WORKER_MODE=worker-only
replicas: 20
autoscaling: Queue length > 50
```
**Result:** Auto-scaling based on load

---

## Configuration

### Environment Variables

```bash
# Worker mode
WORKER_MODE=hybrid|api-only|worker-only

# Worker concurrency (jobs per worker)
EXECUTION_WORKER_CONCURRENCY=5

# State TTL
EXECUTION_STATE_TTL=86400        # 24 hours
EXECUTION_COMPLETION_TTL=3600    # 1 hour
```

### Docker Compose

```yaml
services:
  nodedrop:
    environment:
      - WORKER_MODE=${WORKER_MODE:-hybrid}
      - EXECUTION_WORKER_CONCURRENCY=${EXECUTION_WORKER_CONCURRENCY:-5}
```

---

## Testing Worker Modes

### Test 1: Hybrid Mode (Default)
```bash
npm run start
# Expected: "✅ Initialized execution worker (running: true, mode: hybrid)"
```

### Test 2: API-Only Mode
```bash
WORKER_MODE=api-only npm run start
# Expected: "ℹ️  Worker disabled (WORKER_MODE=api-only)"
```

### Test 3: Worker-Only Mode
```bash
npm run start:worker
# Expected: Worker starts without HTTP server
```

---

## Monitoring

Check worker status via health endpoint:

```bash
curl http://localhost:5678/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "worker": {
    "isRunning": true,
    "mode": "hybrid",
    "activeJobs": 3,
    "processedJobs": 150
  },
  "queue": {
    "waiting": 5,
    "active": 3,
    "completed": 150,
    "failed": 2
  }
}
```
