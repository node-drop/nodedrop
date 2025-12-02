# Webhook Registration Guide

## Current Issue: "Webhook trigger not found"

✅ **Good News:** The route is working! The server found the `/webhook/{id}` endpoint.  
❌ **Issue:** The webhook ID `bb71f9a1-6ab3-4157-8555-da74322a3f9d` is not registered in the system yet.

## Why This Happens

Webhooks need to be **registered** before they can receive requests. Registration happens when:

1. You create a workflow with a **Webhook Trigger** node
2. You configure the webhook (it gets a unique ID)
3. You **save** the workflow
4. You **activate** the workflow

Only then will the webhook ID be registered and start listening for requests.

## 🔍 Step-by-Step: How to Register a Webhook

### Step 1: Create a Workflow with Webhook Trigger

1. **Open the workflow editor**
2. **Add a Webhook Trigger node** from the node palette
3. **Configure the node:**
   - The `WebhookUrlGenerator` component will auto-generate a webhook ID
   - Copy the test URL (e.g., `http://localhost:4000/webhook/abc-123...`)
   - Configure HTTP Method (GET, POST, etc.)
   - Set Authentication if needed

### Step 2: Save the Workflow

Click the **Save** button in the workflow editor. This stores the workflow in the database.

### Step 3: Activate the Workflow

Toggle the **Active** switch to ON. This triggers:

- `TriggerService.activateTrigger()` is called
- The webhook ID is registered in `webhookTriggers` Map
- The webhook is now listening for requests

### Step 4: Test the Webhook

Now you can send requests to your webhook URL:

```bash
curl -X POST http://localhost:4000/webhook/{your-webhook-id} \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 🛠️ Debugging Tools

### 1. List All Registered Webhooks

Check which webhooks are currently active:

```bash
curl http://localhost:4000/webhook/debug/list
```

**Example Response:**

```json
{
  "success": true,
  "count": 2,
  "webhooks": [
    {
      "webhookId": "abc-123-def-456",
      "workflowId": "workflow-1",
      "nodeId": "node-1",
      "httpMethod": "POST",
      "active": true
    },
    {
      "webhookId": "xyz-789-uvw-012",
      "workflowId": "workflow-2",
      "nodeId": "node-2",
      "httpMethod": "GET",
      "active": true
    }
  ],
  "timestamp": "2025-10-10T20:22:11.239Z"
}
```

If you see no webhooks:

```json
{
  "success": true,
  "message": "No webhooks are currently registered",
  "count": 0,
  "webhooks": []
}
```

### 2. Test Specific Webhook

Check if a specific webhook ID is registered:

```bash
curl -X POST http://localhost:4000/webhook/{webhookId}/test
```

**If registered:**

```json
{
  "success": true,
  "message": "Webhook is configured and ready to receive requests",
  "webhookId": "abc-123..."
}
```

**If NOT registered:**

```json
{
  "success": false,
  "error": "Webhook not found or not active",
  "webhookId": "abc-123..."
}
```

### 3. Check Server Logs

When a workflow with webhook trigger is activated, you should see:

```
Webhook trigger activated: abc-123-def-456-ghi-789
```

## 📋 Troubleshooting Checklist

### Webhook Not Registering

- [ ] **Is the workflow saved?**

  - Check: Open workflow, see if there's a "Save" button (unsaved changes)
  - Fix: Click Save

- [ ] **Is the workflow active?**

  - Check: Look for green "Active" toggle in workflow editor
  - Fix: Toggle the Active switch to ON

- [ ] **Does the webhook node have a webhook ID?**

  - Check: Open webhook trigger node, see if "Webhook URL" field has a UUID
  - Fix: If empty, close and reopen the node (it should auto-generate)

- [ ] **Is the webhook ID correct?**

  - Check: Compare the ID in your test URL with the one in the workflow
  - Fix: Copy the correct URL from the workflow node

- [ ] **Has the server loaded the trigger?**
  - Check: Look at server logs for "Webhook trigger activated: {id}"
  - Fix: Restart the server or re-activate the workflow

### Workflow Activation Issues

If activating the workflow doesn't register the webhook:

1. **Check server logs for errors**

   ```
   ❌ Error activating trigger: ...
   ```

2. **Try deactivating and reactivating**

   - Toggle OFF
   - Wait 2 seconds
   - Toggle ON
   - Check logs

3. **Restart the backend server**

   ```bash
   # Stop server (Ctrl+C)
   cd backend
   npm run dev
   ```

4. **Check database**
   - Verify workflow exists in database
   - Verify triggers field contains webhook trigger

## 🎯 Example: Complete Webhook Setup

### 1. Create Test Workflow

**Workflow Structure:**

```
[Webhook Trigger] → [Set Node] → [Respond to Webhook]
```

### 2. Configure Webhook Trigger Node

```json
{
  "webhookUrl": "bb71f9a1-6ab3-4157-8555-da74322a3f9d",
  "httpMethod": "POST",
  "path": "",
  "authentication": "none",
  "responseMode": "onReceived"
}
```

### 3. Configure Set Node (Echo Data)

```json
{
  "values": {
    "receivedData": "={{ $json }}"
  }
}
```

### 4. Save and Activate

1. Click **Save** button
2. Toggle **Active** to ON
3. Wait for confirmation: "Workflow activated"

### 5. Verify Registration

```bash
# Check if webhook is registered
curl http://localhost:4000/webhook/debug/list
```

Should show your webhook ID in the list.

### 6. Test the Webhook

```bash
curl -X POST http://localhost:4000/webhook/bb71f9a1-6ab3-4157-8555-da74322a3f9d \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello webhook!", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Webhook received and workflow triggered",
  "executionId": "exec-abc-123",
  "timestamp": "2025-10-10T20:30:00.000Z"
}
```

### 7. View Execution

1. Go to workflow editor
2. Click **Executions** tab
3. See the execution that was triggered
4. Click on it to view details and data

## 🔄 Workflow Lifecycle & Webhook Registration

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  User creates webhook trigger node                     │
│  ↓                                                      │
│  WebhookUrlGenerator auto-generates UUID               │
│  ↓                                                      │
│  User saves workflow                                   │
│  ↓                                                      │
│  Workflow stored in database                           │
│  ↓                                                      │
│  User activates workflow (toggle ON)                   │
│  ↓                                                      │
│  API: POST /api/workflows/{id}/activate                │
│  ↓                                                      │
│  TriggerService.activateTrigger() called               │
│  ↓                                                      │
│  Webhook ID extracted from node parameters             │
│  ↓                                                      │
│  webhookTriggers.set(webhookId, trigger)               │
│  ↓                                                      │
│  ✅ Webhook is now registered and listening            │
│  ↓                                                      │
│  External requests to /webhook/{webhookId} work!       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚨 Common Mistakes

### 1. Testing Before Activating

❌ **Wrong:** Create workflow → Immediately test webhook  
✅ **Correct:** Create workflow → Save → Activate → Test webhook

### 2. Wrong Webhook ID

❌ **Wrong:** Using `bb71f9a1-...` when workflow has `cc82g0b2-...`  
✅ **Correct:** Copy the exact webhook URL from the workflow node

### 3. Workflow Not Active

❌ **Wrong:** Saved but not activated  
✅ **Correct:** Both saved AND activated (toggle ON)

### 4. Server Not Restarted

❌ **Wrong:** Made code changes, didn't restart  
✅ **Correct:** Restart backend server after any code changes

## 📞 Need Help?

### Quick Diagnostic Command

Run this to see your webhook status:

```bash
echo "=== Checking Webhook Registration ==="
curl -s http://localhost:4000/webhook/debug/list | json_pp
echo ""
echo "=== Testing Your Specific Webhook ==="
curl -s -X POST http://localhost:4000/webhook/bb71f9a1-6ab3-4157-8555-da74322a3f9d/test | json_pp
```

### What to Check

1. **Is your webhook in the list?** → If no, workflow isn't active
2. **Test returns 404?** → Webhook not registered
3. **Test returns 200?** → Webhook is ready! Try triggering it

---

## ✅ Solution for Your Current Issue

Since you're getting "Webhook trigger not found" for `bb71f9a1-6ab3-4157-8555-da74322a3f9d`:

**You need to:**

1. **Go to the workflow editor**
2. **Open or create a workflow with a Webhook Trigger node**
3. **Make sure the webhook URL field shows:** `bb71f9a1-6ab3-4157-8555-da74322a3f9d`
4. **Save the workflow** (click Save button)
5. **Activate the workflow** (toggle Active switch to ON)
6. **Wait 2-3 seconds** for registration to complete
7. **Try your webhook request again**

**Or create a new webhook:**

If you don't have a workflow for that ID, create a new one and copy the newly generated webhook URL instead.

The webhook system is working correctly - you just need to register your webhook by activating a workflow! 🎉
