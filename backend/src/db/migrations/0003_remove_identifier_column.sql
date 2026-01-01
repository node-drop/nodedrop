-- Migration: Remove identifier column and use name as unique identifier
-- This migration removes the identifier column from the nodes table
-- and makes the name column the unique identifier instead

-- Step 1: Drop the old unique index on identifier
DROP INDEX IF EXISTS "nodes_identifier_unique";

-- Step 2: Ensure name column is not null and unique
ALTER TABLE "nodes" ALTER COLUMN "name" SET NOT NULL;

-- Step 3: Create unique index on name column
CREATE UNIQUE INDEX IF NOT EXISTS "nodes_name_unique" ON "nodes" ("name");

-- Step 4: Copy identifier data to name if name is empty (safety measure)
UPDATE "nodes" SET "name" = "identifier" WHERE "name" IS NULL OR "name" = '';

-- Step 5: Drop the identifier column
ALTER TABLE "nodes" DROP COLUMN IF EXISTS "identifier";
