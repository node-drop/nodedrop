# Webhook URL Generator - Quick Reference

## Visual Example

```
┌─────────────────────────────────────────────────────────────┐
│ Webhook Trigger Configuration                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🌐 Webhook URLs                                             │
│ Use these URLs to trigger your workflow from external       │
│ services                                                     │
│                                                              │
│ ┌─────────────────┬─────────────────┐                      │
│ │ [🧪 Test URL]   │ [ 🌍 Prod URL ] │                      │
│ └─────────────────┴─────────────────┘                      │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 🧪 Test Environment                     localhost    │   │
│ │                                                      │   │
│ │ [http://localhost:4000/webhook/abc-123...] [📋 Copy]│   │
│ │                                                      │   │
│ │ Use this URL for testing your webhook during        │   │
│ │ development                                          │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ─────────────────────────────────────────                   │
│                                                              │
│ Webhook ID                                                  │
│ [abc-123-def-456-ghi-789] [Regenerate]                     │
│ ⚠️ Regenerating will invalidate the old webhook URL        │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ How to use:                                            │ │
│ │ 1. Copy the webhook URL for your environment          │ │
│ │ 2. Configure it in your external service              │ │
│ │ 3. Send HTTP requests to trigger this workflow        │ │
│ │ 4. View execution results in the workflow history     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ HTTP Method                                                 │
│ ▼ [POST ▼]                                                  │
│                                                              │
│ Path (Optional)                                             │
│ [custom-endpoint]                                           │
│                                                              │
│ Authentication                                              │
│ ▼ [None ▼]                                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Code Example

### Webhook Node Configuration

```typescript
// Example webhook trigger node in workflow
{
  id: "webhook-1",
  type: "webhook-trigger",
  name: "Webhook Trigger",
  position: { x: 100, y: 100 },
  parameters: {
    webhookUrl: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    httpMethod: "POST",
    path: "github-webhook",
    authentication: "none",
    responseMode: "onReceived",
    responseData: "firstEntryJson"
  }
}
```

### Generated URLs

**Test Environment:**

```
http://localhost:4000/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890/github-webhook
```

**Production Environment:**

```
https://your-domain.com/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890/github-webhook
```

## Using the Webhook

### cURL Example

```bash
# Test webhook
curl -X POST \
  http://localhost:4000/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{"event": "push", "repository": "my-repo"}'
```

### JavaScript/Fetch Example

```javascript
// Trigger webhook from your application
async function triggerWorkflow(data) {
  const webhookUrl =
    "http://localhost:4000/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await response.json();
}

// Usage
triggerWorkflow({
  event: "user_signup",
  user: {
    email: "user@example.com",
    name: "John Doe",
  },
});
```

### Python Example

```python
import requests

webhook_url = "http://localhost:4000/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890"

payload = {
    "event": "data_update",
    "timestamp": "2025-10-10T10:00:00Z",
    "data": {"key": "value"}
}

response = requests.post(webhook_url, json=payload)
print(response.json())
```

## Integration Examples

### GitHub Webhook

1. Go to your GitHub repository settings
2. Navigate to "Webhooks" → "Add webhook"
3. Paste the production webhook URL
4. Select events to trigger
5. Save webhook

**Webhook URL:**

```
https://your-domain.com/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890/github
```

### Slack Outgoing Webhook

1. Go to Slack App settings
2. Create new Outgoing Webhook
3. Add webhook URL
4. Configure trigger words

**Webhook URL:**

```
https://your-domain.com/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890/slack
```

### Zapier Integration

1. Create new Zap
2. Select "Webhooks by Zapier" as action
3. Choose "POST"
4. Paste webhook URL
5. Configure payload

**Webhook URL:**

```
https://your-domain.com/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890/zapier
```

## Testing Workflow

### 1. Development Testing

```bash
# Use test URL
curl -X POST http://localhost:4000/webhook/{webhook-id} \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 2. Staging Testing

```bash
# Use staging environment
curl -X POST https://staging.your-domain.com/webhook/{webhook-id} \
  -H "Content-Type: application/json" \
  -d '{"environment": "staging"}'
```

### 3. Production Testing

```bash
# Use production URL
curl -X POST https://your-domain.com/webhook/{webhook-id} \
  -H "Content-Type: application/json" \
  -d '{"environment": "production"}'
```

## Common Patterns

### Webhook with Authentication

```typescript
{
  webhookUrl: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  httpMethod: "POST",
  authentication: "header",
  headerName: "X-API-Key",
  expectedValue: "your-secret-key"
}
```

### Webhook with Path Routing

```typescript
{
  webhookUrl: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  path: "events/user-created",
  httpMethod: "POST"
}
```

### GET Webhook with Query Params

```typescript
{
  webhookUrl: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  httpMethod: "GET",
  path: "data-sync"
}

// URL: http://localhost:4000/webhook/{id}/data-sync?param=value
```

## Monitoring

### Check Webhook Executions

1. Open workflow
2. Go to "Executions" tab
3. Filter by "webhook" trigger type
4. View request details and responses

### Debug Webhook Issues

```bash
# Test with verbose output
curl -v -X POST http://localhost:4000/webhook/{webhook-id} \
  -H "Content-Type: application/json" \
  -d '{"debug": true}'
```

## Security Best Practices

1. **Use Authentication**: Enable header or query auth for production
2. **HTTPS Only**: Use HTTPS URLs in production
3. **IP Whitelisting**: Restrict webhook sources if possible
4. **Rate Limiting**: Implement rate limits for webhook endpoints
5. **Validate Payloads**: Verify webhook signatures when available
6. **Monitor Access**: Log all webhook requests
7. **Rotate IDs**: Periodically regenerate webhook IDs

## Troubleshooting

### Webhook Not Triggering

✅ **Check:**

- Workflow is active
- Webhook ID is correct
- Backend server is running
- Firewall allows incoming requests
- Correct HTTP method is used

### 404 Not Found

✅ **Verify:**

- Webhook URL is complete
- No extra slashes in URL
- Webhook ID is registered
- Path parameter is correct

### 401 Unauthorized

✅ **Confirm:**

- Authentication is configured correctly
- Headers/query params match expected values
- Credentials haven't expired

### 500 Server Error

✅ **Review:**

- Backend logs for errors
- Workflow node configurations
- Input data format
- Node execution errors

## Quick Commands

```bash
# Copy test URL (macOS)
echo "http://localhost:4000/webhook/{id}" | pbcopy

# Copy test URL (Linux)
echo "http://localhost:4000/webhook/{id}" | xclip -selection clipboard

# Copy test URL (Windows PowerShell)
Set-Clipboard "http://localhost:4000/webhook/{id}"

# Test webhook with curl
curl -X POST http://localhost:4000/webhook/{id} \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test webhook with httpie
http POST http://localhost:4000/webhook/{id} test=true

# Monitor webhook logs (Docker)
docker logs -f nd-backend | grep webhook
```
