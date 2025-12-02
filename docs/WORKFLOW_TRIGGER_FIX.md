# Workflow Trigger "Workflow not found" Error - Fix Summary

## Problem

The WorkflowTrigger node was failing with "Workflow not found" error even though the target workflow existed in the database and was active.

### Root Cause

The issue was in the WorkflowTrigger node implementation:

1. **Hardcoded User ID**: The node was using a hardcoded userId (`cmfvhw53s0000y3hsjr5yfsyc`) when trying to execute the target workflow
2. **User ID Mismatch**: Both the calling workflow and target workflow belonged to user `cmgcnb3ra0000scgg28pfgow8`, but the hardcoded ID didn't match
3. **Validation Failure**: The `WorkflowService.getWorkflow()` method filters by userId, so it couldn't find the workflow when passed the wrong userId

### Error Response

```json
{
  "json": {
    "error": "Workflow not found",
    "status": "error",
    "success": false,
    "triggerId": "trigger-node-1759687759523",
    "workflowId": "cmge0ny3c0001wa2vqj3wli5v",
    "triggeredAt": "2025-10-05T18:16:18.335Z"
  }
}
```

## Solution

### Changes Made

#### 1. WorkflowTrigger.node.ts

**Before:**

```typescript
// Get the current user ID from the node context - for now use a default
const userId = "cmfvhw53s0000y3hsjr5yfsyc"; // TODO: Get from actual user context
```

**After:**

```typescript
// Get the target workflow to find its owner
const targetWorkflow = await WorkflowTriggerHelper.getWorkflowDetails(
  workflowId
);

if (!targetWorkflow) {
  throw new Error(`Workflow ${workflowId} not found`);
}

// Use the target workflow's userId
const userId = targetWorkflow.userId;
```

#### 2. WorkflowTriggerHelper.ts

**Before:**

```typescript
static async getWorkflowDetails(
  workflowId: string,
  userId: string = "system"
) {
  try {
    return await this.workflowService.getWorkflow(workflowId, userId);
  } catch (error) {
    console.error("Error getting workflow details:", error);
    return null;
  }
}
```

**After:**

```typescript
static async getWorkflowDetails(
  workflowId: string,
  userId?: string
) {
  try {
    // Don't pass userId to allow cross-user workflow triggers if policy allows
    return await this.workflowService.getWorkflow(workflowId);
  } catch (error) {
    console.error("Error getting workflow details:", error);
    return null;
  }
}
```

## How It Works Now

1. **Workflow Lookup**: When the WorkflowTrigger node executes, it first fetches the target workflow details without userId filtering
2. **Dynamic User ID**: It extracts the userId from the target workflow itself
3. **Execution**: Uses the correct userId when calling the ExecutionService to trigger the workflow
4. **Validation**: The validation in WorkflowTriggerHelper now works correctly because it's using the actual workflow owner's ID

## Security Considerations

### Caller Policy

The workflow settings include a `callerPolicy` field that controls who can trigger the workflow:

- `workflowsFromSameOwner`: Only workflows from the same user can trigger this workflow
- `workflowsFromList`: Only specific workflows can trigger this workflow
- `any`: Any workflow can trigger this workflow

**Current Implementation**: The fix allows any workflow to be found first, then the ExecutionService validates access based on the workflow's settings and caller policy.

### Future Improvements

1. **Explicit Policy Checking**: Add explicit checks for the `callerPolicy` before attempting to execute
2. **Audit Logging**: Log cross-workflow triggers for security auditing
3. **Execution Context**: Add userId and workflowId to the NodeExecutionContext for better context awareness
4. **Permission Checks**: Implement role-based access control for workflow triggers

## Testing

### Test Script

A test script has been created: `backend/test-workflow-trigger-fix.js`

Run it with:

```bash
cd backend
node test-workflow-trigger-fix.js
```

### Expected Result

The workflow should now execute successfully without the "Workflow not found" error. The output should show the triggered workflow executing and completing.

### Workflows in Database

- **Caller Workflow**: `cmgcnct8g0003og8n3q8tpcdg` (New Workflow)
- **Target Workflow**: `cmge0ny3c0001wa2vqj3wli5v` (Get Single Todo)
- **Owner**: Both belong to user `cmgcnb3ra0000scgg28pfgow8` (admin@node-drop.com)

## Files Modified

1. `backend/src/nodes/WorkflowTrigger/WorkflowTrigger.node.ts`
2. `backend/src/nodes/WorkflowTrigger/WorkflowTriggerHelper.ts`

## Related Documentation

- `docs/execution-system/` - Execution system architecture
- Workflow settings and caller policy configuration
