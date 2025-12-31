CREATE TABLE IF NOT EXISTS "scheduled_waits" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"execution_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"node_id" text NOT NULL,
	"user_id" text,
	"resume_at" timestamp NOT NULL,
	"wait_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input_data" json,
	"execution_state" json,
	"webhook_data" json,
	"webhook_options" json,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"resumed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_waits_execution_id_idx" ON "scheduled_waits" ("execution_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_waits_workflow_id_idx" ON "scheduled_waits" ("workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_waits_status_idx" ON "scheduled_waits" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_waits_resume_at_idx" ON "scheduled_waits" ("resume_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_waits_pending_resume_idx" ON "scheduled_waits" ("status", "resume_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_waits_user_id_idx" ON "scheduled_waits" ("user_id");
