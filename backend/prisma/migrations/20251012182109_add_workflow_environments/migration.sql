-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "EnvironmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('SUCCESS', 'FAILED', 'ROLLBACK');

-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "environment" "EnvironmentType" NOT NULL DEFAULT 'DEVELOPMENT';

-- CreateTable
CREATE TABLE "workflow_environments" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "environment" "EnvironmentType" NOT NULL DEFAULT 'DEVELOPMENT',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "connections" JSONB NOT NULL DEFAULT '[]',
    "triggers" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "variables" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" TIMESTAMP(3),
    "deployedBy" TEXT,
    "deploymentNote" TEXT,
    "status" "EnvironmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_environment_deployments" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "deployedBy" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceEnvironment" "EnvironmentType",
    "deploymentNote" TEXT,
    "snapshot" JSONB NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "rollbackFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_environment_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_environments_workflowId_idx" ON "workflow_environments"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_environments_environment_idx" ON "workflow_environments"("environment");

-- CreateIndex
CREATE INDEX "workflow_environments_status_idx" ON "workflow_environments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_environments_workflowId_environment_key" ON "workflow_environments"("workflowId", "environment");

-- CreateIndex
CREATE INDEX "workflow_environment_deployments_environmentId_idx" ON "workflow_environment_deployments"("environmentId");

-- CreateIndex
CREATE INDEX "workflow_environment_deployments_deployedAt_idx" ON "workflow_environment_deployments"("deployedAt");

-- CreateIndex
CREATE INDEX "executions_environment_idx" ON "executions"("environment");

-- AddForeignKey
ALTER TABLE "workflow_environments" ADD CONSTRAINT "workflow_environments_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_environment_deployments" ADD CONSTRAINT "workflow_environment_deployments_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "workflow_environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
