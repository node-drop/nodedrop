-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeExecutionStatus" ADD VALUE 'QUEUED';
ALTER TYPE "NodeExecutionStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "NodeExecutionStatus" ADD VALUE 'PAUSED';
ALTER TYPE "NodeExecutionStatus" ADD VALUE 'SKIPPED';
ALTER TYPE "NodeExecutionStatus" ADD VALUE 'IDLE';
ALTER TYPE "NodeExecutionStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "NodeExecutionStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "executionType" TEXT NOT NULL DEFAULT 'workflow',
ADD COLUMN     "flowExecutionPath" TEXT[],
ADD COLUMN     "flowMetrics" JSONB,
ADD COLUMN     "flowProgressData" JSONB,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "progress" INTEGER DEFAULT 0,
ADD COLUMN     "resumedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "node_executions" ADD COLUMN     "dependencies" TEXT[],
ADD COLUMN     "executionOrder" INTEGER,
ADD COLUMN     "parentNodeId" TEXT,
ADD COLUMN     "progress" INTEGER DEFAULT 0,
ADD COLUMN     "triggerId" TEXT,
ADD COLUMN     "visualState" JSONB;

-- CreateTable
CREATE TABLE "flow_execution_states" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "progress" INTEGER DEFAULT 0,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "inputData" JSONB,
    "outputData" JSONB,
    "error" JSONB,
    "dependencies" TEXT[],
    "executionOrder" INTEGER,
    "animationState" TEXT NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_execution_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_history" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "executedNodes" TEXT[],
    "executionPath" TEXT[],
    "metrics" JSONB,
    "error" JSONB,
    "duration" INTEGER,
    "nodeCount" INTEGER DEFAULT 0,
    "completedNodes" INTEGER DEFAULT 0,
    "failedNodes" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flow_execution_states_executionId_idx" ON "flow_execution_states"("executionId");

-- CreateIndex
CREATE INDEX "flow_execution_states_nodeId_idx" ON "flow_execution_states"("nodeId");

-- CreateIndex
CREATE INDEX "flow_execution_states_status_idx" ON "flow_execution_states"("status");

-- CreateIndex
CREATE INDEX "execution_history_executionId_idx" ON "execution_history"("executionId");

-- CreateIndex
CREATE INDEX "execution_history_workflowId_idx" ON "execution_history"("workflowId");

-- CreateIndex
CREATE INDEX "execution_history_startTime_idx" ON "execution_history"("startTime");

-- AddForeignKey
ALTER TABLE "flow_execution_states" ADD CONSTRAINT "flow_execution_states_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_history" ADD CONSTRAINT "execution_history_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_history" ADD CONSTRAINT "execution_history_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
