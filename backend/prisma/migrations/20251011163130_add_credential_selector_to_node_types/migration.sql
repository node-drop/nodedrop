-- AlterTable
ALTER TABLE "node_types" ADD COLUMN     "credentialSelector" JSONB,
ADD COLUMN     "credentials" JSONB;
