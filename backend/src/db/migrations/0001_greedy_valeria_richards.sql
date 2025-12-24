CREATE TABLE IF NOT EXISTS "workflow_git_configs" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"workflow_id" text NOT NULL,
	"user_id" text NOT NULL,
	"repository_url" text NOT NULL,
	"branch" text DEFAULT 'main' NOT NULL,
	"remote_name" text DEFAULT 'origin' NOT NULL,
	"local_path" text NOT NULL,
	"last_sync_at" timestamp,
	"last_commit_hash" text,
	"unpushed_commits" integer DEFAULT 0,
	"connected" boolean DEFAULT true,
	"last_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "workflow_git_configs_workflow_id_unique" UNIQUE("workflow_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_git_credentials" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"user_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"encrypted_token" text NOT NULL,
	"token_type" text DEFAULT 'personal_access_token' NOT NULL,
	"provider" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_git_configs_workflow_id_idx" ON "workflow_git_configs" ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_git_configs_user_id_idx" ON "workflow_git_configs" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_git_credentials_user_workflow_idx" ON "workflow_git_credentials" ("user_id","workflow_id");