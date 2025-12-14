-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- AlterTable: Add defaultWorkspaceId to users
ALTER TABLE "users" ADD COLUMN "defaultWorkspaceId" TEXT;

-- CreateTable: workspaces
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "billingEmail" TEXT,
    "stripeCustomerId" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 1,
    "maxWorkflows" INTEGER NOT NULL DEFAULT 5,
    "maxExecutionsPerMonth" INTEGER NOT NULL DEFAULT 1000,
    "maxCredentials" INTEGER NOT NULL DEFAULT 10,
    "currentMonthExecutions" INTEGER NOT NULL DEFAULT 0,
    "usageResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workspace_members
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workspace_invitations
CREATE TABLE "workspace_invitations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);


-- AlterTable: Add workspaceId to workflows
ALTER TABLE "workflows" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Add workspaceId to executions
ALTER TABLE "executions" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Add workspaceId to credentials
ALTER TABLE "credentials" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Add workspaceId to teams
ALTER TABLE "teams" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Add workspaceId to variables
ALTER TABLE "variables" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Add workspaceId to node_types
ALTER TABLE "node_types" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Add workspaceId to trigger_jobs
ALTER TABLE "trigger_jobs" ADD COLUMN "workspaceId" TEXT;

-- AlterTable: Add workspaceId to webhook_request_logs
ALTER TABLE "webhook_request_logs" ADD COLUMN "workspaceId" TEXT;

-- CreateIndex: workspaces
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex: workspace_members
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");

-- CreateIndex: workspace_invitations
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");
CREATE INDEX "workspace_invitations_token_idx" ON "workspace_invitations"("token");
CREATE INDEX "workspace_invitations_email_idx" ON "workspace_invitations"("email");
CREATE UNIQUE INDEX "workspace_invitations_workspaceId_email_key" ON "workspace_invitations"("workspaceId", "email");

-- CreateIndex: workflows (new indexes)
DROP INDEX IF EXISTS "workflows_userId_teamId_idx";
CREATE INDEX "workflows_userId_idx" ON "workflows"("userId");
CREATE INDEX "workflows_workspaceId_idx" ON "workflows"("workspaceId");
CREATE INDEX "workflows_teamId_idx" ON "workflows"("teamId");
CREATE INDEX "workflows_workspaceId_teamId_idx" ON "workflows"("workspaceId", "teamId");

-- CreateIndex: executions (new indexes)
CREATE INDEX "executions_workspaceId_idx" ON "executions"("workspaceId");
CREATE INDEX "executions_workspaceId_status_idx" ON "executions"("workspaceId", "status");
CREATE INDEX "executions_workspaceId_createdAt_idx" ON "executions"("workspaceId", "createdAt");

-- CreateIndex: credentials (new indexes)
CREATE INDEX "credentials_userId_idx" ON "credentials"("userId");
CREATE INDEX "credentials_workspaceId_idx" ON "credentials"("workspaceId");


-- CreateIndex: teams (new indexes)
CREATE INDEX "teams_workspaceId_idx" ON "teams"("workspaceId");

-- CreateIndex: variables (new indexes)
DROP INDEX IF EXISTS "variables_userId_key_workflowId_key";
DROP INDEX IF EXISTS "variables_userId_scope_idx";
CREATE INDEX "variables_userId_idx" ON "variables"("userId");
CREATE INDEX "variables_workspaceId_idx" ON "variables"("workspaceId");
CREATE INDEX "variables_workspaceId_scope_idx" ON "variables"("workspaceId", "scope");

-- CreateIndex: node_types (new indexes)
-- Keep identifier unique globally for backward compatibility
CREATE INDEX "node_types_workspaceId_idx" ON "node_types"("workspaceId");
CREATE INDEX "node_types_isCore_idx" ON "node_types"("isCore");

-- CreateIndex: trigger_jobs (new indexes)
CREATE INDEX "trigger_jobs_workspaceId_idx" ON "trigger_jobs"("workspaceId");

-- CreateIndex: webhook_request_logs (new indexes)
CREATE INDEX "webhook_request_logs_workspaceId_timestamp_idx" ON "webhook_request_logs"("workspaceId", "timestamp");

-- AddForeignKey: workspaces
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: workspace_members
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: workflows
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: executions
ALTER TABLE "executions" ADD CONSTRAINT "executions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: credentials
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: teams
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: variables
ALTER TABLE "variables" ADD CONSTRAINT "variables_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: node_types
ALTER TABLE "node_types" ADD CONSTRAINT "node_types_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: trigger_jobs
ALTER TABLE "trigger_jobs" ADD CONSTRAINT "trigger_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: webhook_request_logs
ALTER TABLE "webhook_request_logs" ADD CONSTRAINT "webhook_request_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: Unique constraints that include workspaceId will be added after data migration
-- when workspaceId is made non-nullable. For now, we keep the old unique constraints.
