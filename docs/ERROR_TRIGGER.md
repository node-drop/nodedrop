# Error Workflow

NodeDrop allows you to configure an error workflow that automatically executes when a workflow fails. This is the same approach used by n8n.

## How It Works

1. Create an error handling workflow (with Error Trigger or Manual Trigger)
2. In the workflow you want to monitor, go to **Workflow Settings**
3. Select your error handling workflow from the **Error Workflow** dropdown
4. When the monitored workflow fails, the error workflow executes with full error details

## Setup Guide

### Step 1: Create an Error Handling Workflow

1. Create a new workflow
2. Add an **Error Trigger** node (or Manual Trigger)
3. Connect notification nodes (Slack, Email, HTTP Request, etc.)
4. Save and **activate** the workflow

Example workflow:
```
[Error Trigger] → [Slack Message]
```

### Step 2: Configure Error Workflow in Settings

1. Open the workflow you want to monitor
2. Click the **Settings** button (gear icon)
3. In the **Error Workflow** dropdown, select your error handling workflow
4. Save the workflow

That's it! When this workflow fails, your error workflow will be triggered.

## Error Data Structure

The Error Trigger receives the following data:

```json
{
  "triggeredAt": "2024-01-15T10:30:00.000Z",
  "triggerType": "error",
  "executionId": "exec-123",
  "workflowId": "wf-456",
  "workflowName": "My Workflow",
  "failedNodeId": "node-789",
  "failedNodeName": "HTTP Request",
  "failedNodeType": "http-request",
  "errorMessage": "Connection timeout",
  "errorStack": "Error: Connection timeout\n    at ...",
  "errorTimestamp": "2024-01-15T10:30:00.000Z",
  "executionStartedAt": "2024-01-15T10:29:55.000Z",
  "executionMode": "webhook",
  "error": { /* full error object */ }
}
```

## Example: Slack Alert

Slack message template using expressions:
```
🚨 Workflow Failed!

Workflow: {{ $json.workflowName }}
Failed Node: {{ $json.failedNodeName }}
Error: {{ $json.errorMessage }}
Time: {{ $json.errorTimestamp }}
Execution ID: {{ $json.executionId }}
```

## Important Notes

1. **Infinite Loop Prevention**: A workflow cannot have itself as its error workflow
2. **Error Workflow Must Be Active**: The error workflow must be activated to receive errors
3. **Async Execution**: Error workflows fire asynchronously and don't block the original workflow
4. **One Error Workflow Per Workflow**: Each workflow can have one error workflow configured

## Troubleshooting

### Error workflow not firing?

1. Check that the error workflow is **active** (toggle in workflow list)
2. Verify the error workflow has a trigger node (Error Trigger or Manual Trigger)
3. Check server logs for error messages
4. Make sure the workflow actually failed (check Executions list)

### Check server logs

Look for these log messages:
```
🚨 Workflow execution failed
🔔 Firing error workflow: [workflow-id]
🚀 Executing error workflow "[name]"
✅ Error workflow "[name]" executed successfully
```
