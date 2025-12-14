-- Data Migration Script for Workspace Multi-tenancy
-- Run this AFTER the schema migration has been applied
-- This script creates personal workspaces for existing users and migrates their data

-- Step 1: Create a personal workspace for each existing user
INSERT INTO "workspaces" ("id", "name", "slug", "description", "ownerId", "plan", "maxMembers", "maxWorkflows", "maxExecutionsPerMonth", "maxCredentials", "createdAt", "updatedAt")
SELECT 
    'ws_' || "id",  -- Generate workspace ID from user ID
    COALESCE("name", 'Personal Workspace') || '''s Workspace',
    LOWER(REPLACE(COALESCE("email", "id"), '@', '-at-')) || '-workspace',
    'Personal workspace',
    "id",
    'free',
    5,      -- maxMembers for free plan
    10,     -- maxWorkflows for free plan  
    1000,   -- maxExecutionsPerMonth for free plan
    20,     -- maxCredentials for free plan
    NOW(),
    NOW()
FROM "users"
WHERE NOT EXISTS (
    SELECT 1 FROM "workspaces" WHERE "ownerId" = "users"."id"
);

-- Step 2: Add each user as OWNER member of their workspace
INSERT INTO "workspace_members" ("id", "workspaceId", "userId", "role", "joinedAt")
SELECT 
    'wsm_' || "id",
    'ws_' || "id",
    "id",
    'OWNER',
    NOW()
FROM "users"
WHERE EXISTS (
    SELECT 1 FROM "workspaces" WHERE "id" = 'ws_' || "users"."id"
)
AND NOT EXISTS (
    SELECT 1 FROM "workspace_members" WHERE "userId" = "users"."id" AND "workspaceId" = 'ws_' || "users"."id"
);

-- Step 3: Set default workspace for each user
UPDATE "users" 
SET "defaultWorkspaceId" = 'ws_' || "id"
WHERE "defaultWorkspaceId" IS NULL
AND EXISTS (SELECT 1 FROM "workspaces" WHERE "id" = 'ws_' || "users"."id");

-- Step 4: Migrate workflows to user's workspace
UPDATE "workflows" 
SET "workspaceId" = 'ws_' || "userId"
WHERE "workspaceId" IS NULL;

-- Step 5: Migrate credentials to user's workspace
UPDATE "credentials"
SET "workspaceId" = 'ws_' || "userId"
WHERE "workspaceId" IS NULL;

-- Step 6: Migrate variables to user's workspace
UPDATE "variables"
SET "workspaceId" = 'ws_' || "userId"
WHERE "workspaceId" IS NULL;

-- Step 7: Migrate teams to owner's workspace
UPDATE "teams"
SET "workspaceId" = 'ws_' || "ownerId"
WHERE "workspaceId" IS NULL;

-- Step 8: Migrate executions (denormalized workspaceId from workflow)
UPDATE "executions" e
SET "workspaceId" = w."workspaceId"
FROM "workflows" w
WHERE e."workflowId" = w."id"
AND e."workspaceId" IS NULL;

-- Step 9: Migrate trigger_jobs (denormalized workspaceId from workflow)
UPDATE "trigger_jobs" tj
SET "workspaceId" = w."workspaceId"
FROM "workflows" w
WHERE tj."workflowId" = w."id"
AND tj."workspaceId" IS NULL;

-- Step 10: Migrate webhook_request_logs (denormalized workspaceId from workflow)
UPDATE "webhook_request_logs" wrl
SET "workspaceId" = w."workspaceId"
FROM "workflows" w
WHERE wrl."workflowId" = w."id"
AND wrl."workspaceId" IS NULL;

-- Verification queries (run these to check migration success)
-- SELECT COUNT(*) as users_without_workspace FROM "users" WHERE "defaultWorkspaceId" IS NULL;
-- SELECT COUNT(*) as workflows_without_workspace FROM "workflows" WHERE "workspaceId" IS NULL;
-- SELECT COUNT(*) as credentials_without_workspace FROM "credentials" WHERE "workspaceId" IS NULL;
-- SELECT COUNT(*) as variables_without_workspace FROM "variables" WHERE "workspaceId" IS NULL;
-- SELECT COUNT(*) as teams_without_workspace FROM "teams" WHERE "workspaceId" IS NULL;
