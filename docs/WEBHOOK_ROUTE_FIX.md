# Webhook Route Fix

## Problem

Getting error: `Route GET /webhook/bb71f9a1-6ab3-4157-8555-da74322a3f9d not found`

## Root Cause

The webhook route pattern `"/:webhookId/*?"` was not matching correctly in Express.js.

## Solution

Split the route into two separate handlers:

1. **Primary route** - `"/:webhookId"` - handles webhooks without path suffix
2. **Secondary route** - `"/:webhookId/*"` - handles webhooks with path suffix

## Changes Made

### File: `backend/src/routes/webhook.ts`

**Before:**

```typescript
router.all("/:webhookId/*?", asyncHandler(...));
```

**After:**

```typescript
// Primary route (no path suffix)
router.all("/:webhookId", asyncHandler(...));

// Secondary route (with path suffix)
router.all("/:webhookId/*", asyncHandler(...));
```

## How to Apply the Fix

### 1. Restart Backend Server

The webhook route changes require a server restart:

**If running with npm:**

```bash
cd backend
npm run dev  # or npm start
```

**If running with Docker:**

```bash
docker-compose restart backend
```

**If running manually:**

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### 2. Verify Server Startup

Look for this message in the logs:

```
📨 Webhook endpoint (public):
   - http://localhost:4000/webhook/{webhookId}
```

### 3. Test the Webhook

**Option A: Using the test endpoint**

```bash
curl -X POST http://localhost:4000/webhook/bb71f9a1-6ab3-4157-8555-da74322a3f9d/test
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Webhook is configured and ready to receive requests",
  "webhookId": "bb71f9a1-6ab3-4157-8555-da74322a3f9d",
  "timestamp": "2025-10-10T10:00:00.000Z"
}
```

**Option B: Actually trigger the webhook**

```bash
curl -X POST http://localhost:4000/webhook/bb71f9a1-6ab3-4157-8555-da74322a3f9d \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Important Notes

### Webhook Must Be Active

For the webhook to work, the workflow containing the webhook trigger must be:

1. **Saved** - Workflow exists in database
2. **Active** - Workflow is turned on/activated

**Activation happens when:**

- User saves workflow with webhook trigger
- `TriggerService.activateTrigger()` is called
- Webhook ID is registered in `webhookTriggers` Map

### Check if Webhook is Registered

To verify if a webhook ID is registered:

```bash
# This will tell you if the webhook exists (without triggering it)
curl -X POST http://localhost:4000/webhook/{your-webhook-id}/test
```

**If webhook is registered:**

```json
{
  "success": true,
  "message": "Webhook is configured and ready to receive requests"
}
```

**If webhook is NOT registered:**

```json
{
  "success": false,
  "error": "Webhook not found or not active"
}
```

## Troubleshooting

### 1. Route Still Not Found

**Check:**

- ✅ Server was restarted after code changes
- ✅ No compilation errors in backend
- ✅ `webhook.ts` is imported in `index.ts`
- ✅ Route is mounted: `app.use("/webhook", webhookRoutes)`

**Verify route registration:**

```bash
# Check server logs on startup
📨 Webhook endpoint (public):
   - http://localhost:4000/webhook/{webhookId}
```

### 2. Webhook Not Found Error

**Possible causes:**

- Workflow is not saved
- Workflow is not active/activated
- Webhook ID doesn't match (check for typos)
- TriggerService hasn't initialized

**How to fix:**

1. Open workflow in editor
2. Check webhook trigger node has webhook URL configured
3. Save the workflow
4. Activate the workflow (toggle switch)
5. Wait a few seconds for trigger to initialize
6. Try webhook request again

### 3. Check Server Logs

When a webhook request arrives, you should see:

```
📨 Webhook received: POST /webhook/{id}
📝 Headers: {...}
📝 Body: {...}
📝 Query: {...}
✅ Webhook processed successfully - Execution ID: exec-123
```

**If you see nothing**, the route isn't registered.  
**If you see error messages**, check the specific error.

### 4. Common Errors

**"Webhook trigger not found"**

- Workflow is not active
- Webhook ID not registered
- Solution: Activate the workflow

**"Webhook authentication failed"**

- Authentication is configured but credentials don't match
- Solution: Check authentication settings or disable it

**"Route not found"**

- Server wasn't restarted
- Import error in index.ts
- Solution: Restart server, check imports

## Testing Workflow

### Step-by-Step Test

1. **Create a test workflow**

   ```
   Webhook Trigger → Set Node (echo data) → Response
   ```

2. **Configure webhook trigger**

   - Open node configuration
   - Copy webhook URL (test environment)
   - Set HTTP Method: POST
   - Set Authentication: None
   - Save workflow

3. **Activate workflow**

   - Toggle workflow active switch
   - Wait for "Workflow activated" confirmation

4. **Test with curl**

   ```bash
   curl -X POST http://localhost:4000/webhook/{your-id} \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello from webhook"}'
   ```

5. **Check response**

   ```json
   {
     "success": true,
     "message": "Webhook received and workflow triggered",
     "executionId": "exec-123",
     "timestamp": "2025-10-10T10:00:00.000Z"
   }
   ```

6. **View execution**
   - Go to workflow
   - Click "Executions" tab
   - See the triggered execution
   - View input data

## Quick Reference

### Webhook URL Format

```
http://localhost:4000/webhook/{webhookId}
http://localhost:4000/webhook/{webhookId}/custom-path
```

### Test Endpoint

```
http://localhost:4000/webhook/{webhookId}/test
```

### Supported HTTP Methods

- GET
- POST
- PUT
- DELETE
- PATCH
- All other methods

### Required Steps for Working Webhook

1. ✅ Backend server running
2. ✅ Webhook route registered (`app.use("/webhook", webhookRoutes)`)
3. ✅ Workflow saved with webhook trigger
4. ✅ Workflow activated
5. ✅ Webhook ID matches in URL and workflow

---

**After applying this fix and restarting the server, your webhooks should work correctly!** 🎉
