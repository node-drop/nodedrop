-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "snapshotHash" TEXT,
ADD COLUMN     "snapshotVersion" TEXT,
ADD COLUMN     "workflowSnapshot" JSONB;
