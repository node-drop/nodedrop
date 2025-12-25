CREATE TABLE IF NOT EXISTS "nodes" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"identifier" text NOT NULL,
	"display_name" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"group" text[] DEFAULT ARRAY[]::text[],
	"version" integer DEFAULT 1,
	"defaults" json DEFAULT '{}'::json,
	"inputs" text[] DEFAULT ARRAY[]::text[],
	"outputs" text[] DEFAULT ARRAY[]::text[],
	"inputs_config" json,
	"properties" json DEFAULT '[]'::json,
	"credentials" json,
	"credential_selector" json,
	"icon" text,
	"color" text,
	"output_component" text,
	"active" boolean DEFAULT true,
	"is_core" boolean DEFAULT false,
	"is_template" boolean DEFAULT false,
	"template_data" json,
	"node_category" text,
	"workspace_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nodes_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
DROP TABLE "node_types";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nodes_identifier_unique" ON "nodes" ("identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nodes_workspace_id_idx" ON "nodes" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nodes_is_core_idx" ON "nodes" ("is_core");