# Multi-Tenancy Implementation (Option 2)

This document describes the multi-tenancy implementation for NodeDrop SaaS.

## Architecture Overview

We implemented **Option 2: Shared Application + Database Isolation** where:
- Single application instance serves all tenants
- Data is isolated using `workspaceId` column on all tenant-scoped tables
- Workspace context is injected via middleware

## Schema Changes

### New Models

1. **Workspace** - The tenant boundary
   - `id`, `name`, `slug` (unique)
   - `ownerId` - User who created the workspace
   - `plan` - Subscription tier (free, pro, enterprise)
   - Plan limits: `maxMembers`, `maxWorkflows`, `maxExecutionsPerMonth`, `maxCredentials`
   - Usage tracking: `currentMonthExecutions`, `usageResetAt`
   - Billing fields: `billingEmail`, `stripeCustomerId`

2. **WorkspaceMember** - User membership in workspaces
   - `workspaceId`, `userId`
   - `role` - OWNER, ADMIN, MEMBER, VIEWER
   - `invitedBy`, `joinedAt`

3. **WorkspaceInvitation** - Pending invitations
   - `workspaceId`, `email`, `role`
   - `token` (unique), `expiresAt`, `acceptedAt`

### Modified Models (added `workspaceId`)

| Model | Notes |
|-------|-------|
| User | Added `defaultWorkspaceId` |
| Workflow | `workspaceId` (nullable for migration) |
| Credential | `workspaceId` (nullable for migration) |
| Variable | `workspaceId` (nullable for migration) |
| Team | `workspaceId` (nullable for migration) |
| Execution | `workspaceId` (denormalized for queries) |
| TriggerJob | `workspaceId` (denormalized for queries) |
| WebhookRequestLog | `workspaceId` (denormalized for queries) |
| NodeType | `workspaceId` (null = global, value = workspace custom node) |

## New Files

### Services
- `backend/src/services/WorkspaceService.ts` - Workspace CRUD, member management, invitations, usage tracking

### Middleware
- `backend/src/middleware/workspace.ts` - Workspace context injection and validation
  - `requireWorkspace` - Requires workspace context (from header, param, or default)
  - `requireWorkspaceRole` - Requires specific workspace role
  - `checkWorkspaceLimit` - Validates resource limits before creation
  - `optionalWorkspace` - Attaches workspace if available

### Routes
- `backend/src/routes/workspaces.ts` - Workspace API endpoints

### Types
- `backend/src/types/workspace.types.ts` - Workspace-related type definitions

## API Endpoints

### Workspace Management
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:workspaceId` - Get workspace details
- `PATCH /api/workspaces/:workspaceId` - Update workspace
- `DELETE /api/workspaces/:workspaceId` - Delete workspace (owner only)

### Member Management
- `GET /api/workspaces/:workspaceId/members` - List members
- `POST /api/workspaces/:workspaceId/members/invite` - Invite member
- `POST /api/workspaces/invitations/:token/accept` - Accept invitation
- `PATCH /api/workspaces/:workspaceId/members/:userId` - Update member role
- `DELETE /api/workspaces/:workspaceId/members/:userId` - Remove member

### Usage & Context
- `GET /api/workspaces/:workspaceId/usage` - Get usage statistics
- `GET /api/workspaces/current` - Get current workspace context
- `POST /api/workspaces/:workspaceId/set-default` - Set default workspace

## Migration

### Schema Migration
```bash
cd backend
npx prisma migrate deploy
```

### Data Migration
After schema migration, run the data migration script:
```bash
psql -d your_database -f prisma/migrations/20251210000000_add_workspace_multitenancy/data-migration.sql
```

This will:
1. Create a personal workspace for each existing user
2. Add users as OWNER of their workspace
3. Set default workspace for each user
4. Migrate all existing data (workflows, credentials, variables, teams) to user's workspace
5. Backfill denormalized `workspaceId` on executions, trigger_jobs, webhook_logs

## Next Steps (TODO)

### Phase 2: Update Services to Use Workspace Context ✅ COMPLETED

All services have been updated to:
1. Accept `workspaceId` parameter via `WorkspaceQueryOptions`
2. Filter queries by `workspaceId`
3. Set `workspaceId` on new records

Services updated:
- [x] WorkflowService - Added workspace filtering to create, get, list, search, duplicate, and stats methods
- [x] CredentialService - Added workspace filtering to create and getCredentials methods
- [x] VariableService - Added workspace filtering to create, getVariables, getVariablesForExecution, and stats methods
- [x] TeamService - Added workspace filtering to createTeam and getUserTeams methods
- [x] ExecutionService - Added workspace filtering to getExecution, listExecutions, and getExecutionStats methods
- [x] TriggerService - Added workspace filtering to getActivePollingTriggers and getAllActiveTriggers methods
- [x] NodeService - Added workspace support for registerNode (custom nodes) and getNodeTypes methods

**Note:** After applying the Prisma migration, run `npx prisma generate` to regenerate the Prisma client with the new workspace fields.

#### WorkspaceQueryOptions Pattern

All updated services use a consistent `WorkspaceQueryOptions` interface:

```typescript
interface WorkspaceQueryOptions {
  workspaceId?: string;
}
```

This is passed as an optional last parameter to service methods:

```typescript
// Example usage in WorkflowService
async createWorkflow(userId: string, data: CreateWorkflowRequest, options?: WorkspaceQueryOptions)
async listWorkflows(userId: string, query: WorkflowQueryRequest, options?: WorkspaceQueryOptions)
async getWorkflow(id: string, userId?: string, options?: WorkspaceQueryOptions)

// Example usage in CredentialService
async createCredential(userId: string, name: string, type: string, data: CredentialData, expiresAt?: Date, options?: WorkspaceQueryOptions)
async getCredentials(userId: string, type?: string, options?: WorkspaceQueryOptions)

// Example usage in VariableService
async createVariable(userId: string, key: string, value: string, description?: string, scope?: "GLOBAL" | "LOCAL", workflowId?: string, options?: WorkspaceQueryOptions)
async getVariables(userId: string, search?: string, scope?: "GLOBAL" | "LOCAL", workflowId?: string, options?: WorkspaceQueryOptions)

// Example usage in TeamService
static async createTeam(data: CreateTeamData) // workspaceId is part of CreateTeamData
static async getUserTeams(userId: string, options?: WorkspaceQueryOptions)

// Example usage in ExecutionService
async getExecution(executionId: string, userId: string, options?: WorkspaceQueryOptions)
async listExecutions(userId: string, filters: ExecutionFilters, options?: WorkspaceQueryOptions)
async getExecutionStats(userId?: string, options?: WorkspaceQueryOptions)

// Example usage in TriggerService
async getActivePollingTriggers(userId: string, options?: WorkspaceQueryOptions)
async getAllActiveTriggers(userId: string, options?: WorkspaceQueryOptions)

// Example usage in NodeService
async registerNode(nodeDefinition: NodeDefinition, isCore: boolean, options?: WorkspaceQueryOptions)
async getNodeTypes(options?: WorkspaceQueryOptions)
```

### Phase 3: Update Routes ✅ COMPLETED

All routes have been updated to:
1. Use `requireWorkspace` middleware
2. Pass workspace context to services via `{ workspaceId: req.workspace?.workspaceId }`
3. Use `checkWorkspaceLimit` for creation endpoints (workflows, credentials)

Routes updated:
- [x] `workflows.ts` - All CRUD operations now workspace-scoped
- [x] `credentials.ts` - All CRUD operations now workspace-scoped
- [x] `executions.ts` - All operations now workspace-scoped
- [x] `triggers.ts` - All trigger operations now workspace-scoped
- [x] `teams.ts` - All team operations now workspace-scoped
- [x] `variables.ts` (via controller) - All variable operations now workspace-scoped
- [x] `flow-execution.ts` - All flow execution operations now workspace-scoped
- [x] `webhook-logs.ts` - All webhook log operations now workspace-scoped

Services updated with workspace options:
- [x] `VariableService` - Added workspace options to getVariable, updateVariable, deleteVariable, bulkUpsertVariables, replaceVariablesInText
- [x] `TriggerService` - Added workspace options to createTrigger, updateTrigger, deleteTrigger, handleManualTrigger, getTriggerEvents, getTriggerStats

### Phase 4: Frontend Changes ✅ COMPLETED

- [x] Workspace switcher component (`WorkspaceSwitcher.tsx`)
- [x] Create workspace modal (`CreateWorkspaceModal.tsx`)
- [x] Workspace usage card (`WorkspaceUsageCard.tsx`)
- [x] Workspace context and provider (`WorkspaceContext.tsx`)
- [x] Workspace store with Zustand (`workspace.ts`)
- [x] Workspace service for API calls (`workspace.ts`)
- [x] Workspace types (`workspace.ts`)
- [x] API client updated to include `x-workspace-id` header
- [x] App.tsx updated with WorkspaceProvider
- [x] App sidebar updated with WorkspaceSwitcher

Additional components implemented:
- [x] Workspace settings modal (`WorkspaceSettingsModal.tsx`)
- [x] Invite member modal (`InviteMemberModal.tsx`)
- [x] Manage members dialog (`ManageMembersDialog.tsx`)
- [x] Workspaces list component (`WorkspacesList.tsx`)
- [x] Accept invitation page (`AcceptInvitationPage.tsx`)
- [x] Route for invitation acceptance (`/workspaces/invitations/:token/accept`)

### Phase 5: Billing Integration

- [ ] Stripe integration for subscriptions
- [ ] Plan upgrade/downgrade flow
- [ ] Usage-based billing (if needed)
- [ ] Invoice management

## Workspace Context Header

Clients should send workspace context via header:
```
x-workspace-id: ws_abc123
```

If not provided, the user's default workspace is used.

## Plan Limits

| Plan | Members | Workflows | Executions/Month | Credentials |
|------|---------|-----------|------------------|-------------|
| Free | 1       | 5        | 1,000 | 10 |
| Pro  | 10      | 50        | 10,000 | 100 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited |
