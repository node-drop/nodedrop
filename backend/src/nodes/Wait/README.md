# Wait Node

Pause workflow execution for a duration, until a specific time, or until an external webhook call resumes it.

## Modes

### 1. After Time Interval
Wait for a specified duration before continuing.

**Parameters:**
- `duration` (number): How long to wait
- `unit` (options): seconds, minutes, hours, days

**Example:**
```json
{
  "mode": "afterInterval",
  "duration": 30,
  "unit": "seconds"
}
```

### 2. At Specific Time
Wait until a specific date and time.

**Parameters:**
- `dateTime` (string): ISO format datetime (e.g., `2024-12-31T09:00:00`)

**Example:**
```json
{
  "mode": "atDateTime",
  "dateTime": "2024-12-31T09:00:00"
}
```

### 3. On Webhook Call
Wait until an external webhook call resumes the execution. Perfect for human-in-the-loop workflows.

**How it works:**
1. When the Wait node executes in webhook mode, it **pauses the entire workflow execution**
2. The execution state is saved to the database (survives server restarts)
3. A resume URL is generated and available in the node output
4. When the webhook URL is called, execution resumes from exactly where it paused
5. Downstream nodes receive the webhook data merged with original input

**Parameters:**
- `maxWaitTime` (number): Maximum time to wait before timeout (0 = no timeout, max 30 days)
- `maxWaitUnit` (options): minutes, hours, days
- `allowDataInResume` (boolean): Allow webhook to pass data to next node

**Example:**
```json
{
  "mode": "onWebhook",
  "maxWaitTime": 24,
  "maxWaitUnit": "hours",
  "allowDataInResume": true
}
```

**Output (before pause):**
```json
{
  "_waitId": "abc123",
  "_waitMode": "webhook",
  "_resumeUrl": "http://localhost:4000/webhook/wait/abc123/resume",
  "_expiresAt": "2024-12-31T09:00:00.000Z",
  "_allowDataInResume": true,
  "_status": "waiting"
}
```

**Output (after resume, passed to downstream nodes):**
```json
{
  "_waitId": "abc123",
  "_webhookData": {
    "method": "POST",
    "body": { "approved": true, "comment": "Looks good!" },
    "timestamp": "2024-12-30T10:00:00.000Z"
  },
  "_resumedAt": "2024-12-30T10:00:00.000Z",
  "_resumedVia": "webhook"
}
```

## Resume Webhook API

### Endpoint
```
GET    /webhook/wait/{waitId}/resume
POST   /webhook/wait/{waitId}/resume
PUT    /webhook/wait/{waitId}/resume
PATCH  /webhook/wait/{waitId}/resume
DELETE /webhook/wait/{waitId}/resume
```

The allowed HTTP method can be configured in the Wait node's Webhook Options.

### Request Examples

**POST with JSON data:**
```bash
curl -X POST http://localhost:4000/webhook/wait/abc123/resume \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "comment": "Looks good!"}'
```

**GET simple resume:**
```bash
curl http://localhost:4000/webhook/wait/abc123/resume
```

**With Basic Authentication (httpBasicAuth credential):**
```bash
curl -X POST http://localhost:4000/webhook/wait/abc123/resume \
  -u "username:password" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```

**With Header Authentication (httpHeaderAuth credential):**
```bash
curl -X POST http://localhost:4000/webhook/wait/abc123/resume \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```

**With Query Authentication (webhookQueryAuth credential):**
```bash
curl -X POST "http://localhost:4000/webhook/wait/abc123/resume?token=your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```

### Webhook Options

**Authentication** (separate credential field):
- Uses the same credential system as Webhook Trigger node
- Supported credential types: `httpBasicAuth`, `httpHeaderAuth`, `webhookQueryAuth`
- Credentials are securely stored and resolved at execution time

**Options Collection:**

| Option | Description | Default |
|--------|-------------|---------|
| HTTP Method | Restrict to specific HTTP method (GET, POST, PUT, PATCH, DELETE) or allow all | All Methods |
| Success Response Message | Custom message returned on successful resume | Workflow resumed successfully |
| Allowed Origins (CORS) | Comma-separated list of allowed origins, or * for all | * |
| IP Whitelist | Comma-separated list of allowed IPs or CIDR ranges | (empty = allow all) |

### Response (Success)
```json
{
  "success": true,
  "message": "Workflow resumed successfully",
  "executionId": "exec-456",
  "nodeId": "node-789",
  "timestamp": "2024-12-30T10:00:00.000Z"
}
```

### Response (Method Not Allowed)
```json
{
  "success": false,
  "error": "Method Not Allowed",
  "message": "This webhook only accepts POST requests",
  "allowed_methods": ["POST"],
  "timestamp": "2024-12-30T10:00:00.000Z"
}
```

### Response (Unauthorized)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication failed",
  "timestamp": "2024-12-30T10:00:00.000Z"
}
```

### Response (Forbidden - IP not allowed)
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "IP address not allowed",
  "timestamp": "2024-12-30T10:00:00.000Z"
}
```

### Response (Already Resumed)
```json
{
  "success": false,
  "error": "Conflict",
  "message": "Wait already resumed",
  "executionId": "exec-456",
  "timestamp": "2024-12-30T10:00:00.000Z"
}
```

### Response (Expired)
```json
{
  "success": false,
  "error": "Gone",
  "message": "Wait has expired",
  "executionId": "exec-456",
  "timestamp": "2024-12-30T10:00:00.000Z"
}
```

## Use Cases

### 1. Human Approval Workflow
```
Trigger → Process Data → Wait (webhook) → [PAUSED]
                              ↓
                         User clicks approval link
                              ↓
                         [RESUMED] → Send Confirmation Email
```

### 2. AI Confirmation
```
AI Agent → Generate Response → Wait (webhook) → [PAUSED]
                                    ↓
                              User confirms via webhook
                                    ↓
                              [RESUMED] → AI continues
```

### 3. External System Callback
```
Start Process → Call External API → Wait (webhook) → [PAUSED]
                                         ↓
                                   External system calls back
                                         ↓
                                   [RESUMED] → Process Result
```

### 4. Rate Limiting
```
HTTP Request → Wait (2 seconds) → HTTP Request → Wait (2 seconds) → ...
```

### 5. Scheduled Actions
```
Trigger → Wait (until 9:00 AM) → Send Daily Report
```

## Persistence & State Management

### Time-based waits
- **All time-based waits are now persistent**: Stored in database + BullMQ job queue
  - Survives server restarts
  - Automatically resumed when time expires
  - Execution pauses and resumes just like webhook waits
- **Fallback**: If persistent scheduling fails, falls back to in-memory setTimeout

### Webhook waits
- **Always persistent**: Full execution state saved to database
- **Survives server restarts**: Execution can resume even after server restart
- **State includes**:
  - All node outputs collected so far
  - Node execution states
  - Execution path
  - Trigger data
- **BullMQ timeout job**: Handles expiration if webhook not called in time

### Deduplication
- If a wait is scheduled for the same execution+node combination, any existing pending wait is automatically cancelled
- Prevents duplicate wait records from accumulating

### Cleanup
- Old wait records (expired, cancelled, resumed) are automatically cleaned up after 7 days
- Cleanup runs hourly in the background

## Database Schema

Waits are stored in the `scheduled_waits` table:

| Column | Type | Description |
|--------|------|-------------|
| id | text | Unique wait ID (used in resume URL) |
| execution_id | text | Associated execution |
| workflow_id | text | Associated workflow |
| node_id | text | Wait node ID |
| user_id | text | User who started the execution |
| resume_at | timestamp | When to auto-resume (timeout for webhooks) |
| wait_type | text | 'duration', 'datetime', or 'webhook' |
| status | text | 'pending', 'resumed', 'cancelled', 'expired' |
| input_data | json | Data to pass through when resuming |
| execution_state | json | Full execution context for resume (webhook waits) |
| webhook_data | json | Data received when webhook is called |
| webhook_options | json | Authentication and configuration options for webhook |
| reason | text | Human-readable description |
| created_at | timestamp | When wait was created |
| resumed_at | timestamp | When wait was resumed |
| cancelled_at | timestamp | When wait was cancelled |

## Execution Status

When a workflow hits a webhook Wait node:
- Execution status changes to `PAUSED`
- `pausedAt` timestamp is set
- When resumed via webhook:
  - Execution status changes back to `RUNNING`
  - `resumedAt` timestamp is set
  - Execution continues from downstream nodes

## Limits

- Maximum time-based wait: 7 days
- Maximum webhook wait timeout: 30 days
- Webhook waits without timeout default to 30 days
