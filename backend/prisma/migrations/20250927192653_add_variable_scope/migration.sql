/*
  Warnings:

  - A unique constraint covering the columns `[userId,key,workflowId]` on the table `variables` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VariableScope" AS ENUM ('GLOBAL', 'LOCAL');

-- DropIndex
DROP INDEX "variables_userId_key_key";

-- AlterTable
ALTER TABLE "variables" ADD COLUMN     "scope" "VariableScope" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "workflowId" TEXT;

-- CreateIndex
CREATE INDEX "variables_userId_scope_idx" ON "variables"("userId", "scope");

-- CreateIndex
CREATE INDEX "variables_workflowId_idx" ON "variables"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "variables_userId_key_workflowId_key" ON "variables"("userId", "key", "workflowId");

-- AddForeignKey
ALTER TABLE "variables" ADD CONSTRAINT "variables_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
