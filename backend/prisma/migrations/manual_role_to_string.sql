-- Migration: Convert role from UserRole enum to String
-- This migration converts existing ADMIN/USER values to lowercase admin/user

-- Step 1: Add a temporary column
ALTER TABLE "users" ADD COLUMN "role_new" TEXT DEFAULT 'user';

-- Step 2: Copy and convert data (ADMIN -> admin, USER -> user)
UPDATE "users" SET "role_new" = LOWER("role"::TEXT);

-- Step 3: Drop the old column
ALTER TABLE "users" DROP COLUMN "role";

-- Step 4: Rename the new column
ALTER TABLE "users" RENAME COLUMN "role_new" TO "role";

-- Step 5: Set NOT NULL constraint and default
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';

-- Step 6: Drop the old enum type (if not used elsewhere)
DROP TYPE IF EXISTS "UserRole";
