-- Add banned fields required by better-auth admin plugin
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banExpires" TIMESTAMP(3);
