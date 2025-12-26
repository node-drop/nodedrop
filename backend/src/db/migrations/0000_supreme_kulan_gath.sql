CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expires_at" timestamp,
	"password" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"name" text,
	"image" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"active" boolean DEFAULT true,
	"preferences" json DEFAULT '{}'::json,
	"default_workspace_id" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credential_shares" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"credential_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"shared_with_user_id" text,
	"shared_with_team_id" text,
	"permission" text DEFAULT 'USE' NOT NULL,
	"shared_at" timestamp DEFAULT now(),
	"shared_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credentials" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"data" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "execution_history" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"execution_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"trigger_type" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"status" text NOT NULL,
	"executed_nodes" text[] DEFAULT ARRAY[]::text[],
	"execution_path" text[] DEFAULT ARRAY[]::text[],
	"metrics" json,
	"error" json,
	"duration" integer,
	"node_count" integer DEFAULT 0,
	"completed_nodes" integer DEFAULT 0,
	"failed_nodes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "executions" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"workflow_id" text NOT NULL,
	"workspace_id" text,
	"environment" text DEFAULT 'DEVELOPMENT' NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	"paused_at" timestamp,
	"resumed_at" timestamp,
	"cancelled_at" timestamp,
	"trigger_data" json,
	"error" json,
	"execution_type" text DEFAULT 'workflow' NOT NULL,
	"flow_execution_path" text[] DEFAULT ARRAY[]::text[],
	"flow_metrics" json,
	"flow_progress_data" json,
	"progress" integer DEFAULT 0,
	"workflow_snapshot" json,
	"snapshot_version" text,
	"snapshot_hash" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flow_execution_states" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"execution_id" text NOT NULL,
	"node_id" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"progress" integer DEFAULT 0,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration" integer,
	"input_data" json,
	"output_data" json,
	"error" json,
	"dependencies" text[] DEFAULT ARRAY[]::text[],
	"execution_order" integer,
	"animation_state" text DEFAULT 'idle' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "node_executions" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"node_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"status" text DEFAULT 'WAITING' NOT NULL,
	"input_data" json,
	"output_data" json,
	"error" json,
	"started_at" timestamp,
	"finished_at" timestamp,
	"dependencies" text[] DEFAULT ARRAY[]::text[],
	"execution_order" integer,
	"parent_node_id" text,
	"progress" integer DEFAULT 0,
	"trigger_id" text,
	"visual_state" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_git_configs" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"workflow_id" text NOT NULL,
	"user_id" text NOT NULL,
	"repository_url" text NOT NULL,
	"branch" text DEFAULT 'main' NOT NULL,
	"remote_name" text DEFAULT 'origin' NOT NULL,
	"credential_id" text,
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
CREATE TABLE IF NOT EXISTS "workspace_invitations" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"token" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "workspace_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"invited_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"billing_email" text,
	"stripe_customer_id" text,
	"max_members" integer DEFAULT 1,
	"max_workflows" integer DEFAULT 5,
	"max_executions_per_month" integer DEFAULT 1000,
	"max_credentials" integer DEFAULT 10,
	"current_month_executions" integer DEFAULT 0,
	"usage_reset_at" timestamp DEFAULT now(),
	"settings" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"workspace_id" text,
	"color" text DEFAULT '#3b82f6',
	"settings" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_environment_deployments" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"environment_id" text NOT NULL,
	"version" text NOT NULL,
	"deployed_by" text NOT NULL,
	"deployed_at" timestamp DEFAULT now(),
	"source_environment" text,
	"deployment_note" text,
	"snapshot" json NOT NULL,
	"status" text DEFAULT 'SUCCESS' NOT NULL,
	"rollback_from" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_environments" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"workflow_id" text NOT NULL,
	"environment" text DEFAULT 'DEVELOPMENT' NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"nodes" json DEFAULT '[]'::json,
	"connections" json DEFAULT '[]'::json,
	"triggers" json DEFAULT '[]'::json,
	"settings" json DEFAULT '{}'::json,
	"variables" json DEFAULT '{}'::json,
	"active" boolean DEFAULT false,
	"deployed_at" timestamp,
	"deployed_by" text,
	"deployment_note" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"user_id" text NOT NULL,
	"workspace_id" text,
	"team_id" text,
	"nodes" json DEFAULT '[]'::json,
	"connections" json DEFAULT '[]'::json,
	"triggers" json DEFAULT '[]'::json,
	"settings" json DEFAULT '{}'::json,
	"active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "variables" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"scope" text DEFAULT 'GLOBAL' NOT NULL,
	"workflow_id" text,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "trigger_jobs" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"workflow_id" text NOT NULL,
	"workspace_id" text,
	"trigger_id" text NOT NULL,
	"type" text DEFAULT 'schedule' NOT NULL,
	"job_key" text NOT NULL,
	"cron_expression" text,
	"poll_interval" integer,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_run" timestamp,
	"next_run" timestamp,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"last_error" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "trigger_jobs_job_key_unique" UNIQUE("job_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_request_logs" (
	"id" text PRIMARY KEY DEFAULT cuid() NOT NULL,
	"type" text DEFAULT 'webhook' NOT NULL,
	"webhook_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"workspace_id" text,
	"user_id" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"headers" json NOT NULL,
	"body" json,
	"query" json,
	"ip" text NOT NULL,
	"user_agent" text,
	"status" text NOT NULL,
	"reason" text,
	"response_code" integer NOT NULL,
	"response_time" integer NOT NULL,
	"execution_id" text,
	"test_mode" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_idx" ON "accounts" ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "verifications_identifier_value_idx" ON "verifications" ("identifier","value");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_unique" ON "categories" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credential_shares_credential_id_idx" ON "credential_shares" ("credential_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credential_shares_shared_with_user_id_idx" ON "credential_shares" ("shared_with_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credential_shares_shared_with_team_id_idx" ON "credential_shares" ("shared_with_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credential_shares_owner_user_id_idx" ON "credential_shares" ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credential_shares_credential_user_unique" ON "credential_shares" ("credential_id","shared_with_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credential_shares_credential_team_unique" ON "credential_shares" ("credential_id","shared_with_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credentials_user_id_idx" ON "credentials" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credentials_workspace_id_idx" ON "credentials" ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credentials_user_name_unique" ON "credentials" ("user_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_history_execution_id_idx" ON "execution_history" ("execution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_history_workflow_id_idx" ON "execution_history" ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_history_start_time_idx" ON "execution_history" ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_workflow_id_idx" ON "executions" ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_workspace_id_idx" ON "executions" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_environment_idx" ON "executions" ("environment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_status_idx" ON "executions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_workspace_status_idx" ON "executions" ("workspace_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_workspace_created_idx" ON "executions" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flow_execution_states_execution_id_idx" ON "flow_execution_states" ("execution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flow_execution_states_node_id_idx" ON "flow_execution_states" ("node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flow_execution_states_status_idx" ON "flow_execution_states" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "node_executions_execution_id_idx" ON "node_executions" ("execution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "node_executions_node_id_idx" ON "node_executions" ("node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "node_executions_status_idx" ON "node_executions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_git_configs_workflow_id_idx" ON "workflow_git_configs" ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_git_configs_user_id_idx" ON "workflow_git_configs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_git_configs_credential_id_idx" ON "workflow_git_configs" ("credential_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invitations_workspace_email_unique" ON "workspace_invitations" ("workspace_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invitations_token_idx" ON "workspace_invitations" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_invitations_email_idx" ON "workspace_invitations" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_invitations_workspace_id_idx" ON "workspace_invitations" ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_user_unique" ON "workspace_members" ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_members_workspace_id_idx" ON "workspace_members" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_members_user_id_idx" ON "workspace_members" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_owner_id_idx" ON "workspaces" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_slug_idx" ON "workspaces" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_team_user_unique" ON "team_members" ("team_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_team_id_idx" ON "team_members" ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_owner_id_idx" ON "teams" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_workspace_id_idx" ON "teams" ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_workspace_slug_unique" ON "teams" ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_environment_deployments_environment_id_idx" ON "workflow_environment_deployments" ("environment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_environment_deployments_deployed_at_idx" ON "workflow_environment_deployments" ("deployed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_environments_workflow_id_idx" ON "workflow_environments" ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_environments_environment_idx" ON "workflow_environments" ("environment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_environments_status_idx" ON "workflow_environments" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_environments_workflow_environment_unique" ON "workflow_environments" ("workflow_id","environment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_user_id_idx" ON "workflows" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_workspace_id_idx" ON "workflows" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_team_id_idx" ON "workflows" ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_workspace_team_idx" ON "workflows" ("workspace_id","team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variables_user_id_idx" ON "variables" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variables_workspace_id_idx" ON "variables" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variables_workflow_id_idx" ON "variables" ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "variables_user_scope_idx" ON "variables" ("user_id","scope");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "variables_user_key_workflow_unique" ON "variables" ("user_id","key","workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nodes_identifier_unique" ON "nodes" ("identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nodes_workspace_id_idx" ON "nodes" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nodes_is_core_idx" ON "nodes" ("is_core");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_jobs_workflow_id_idx" ON "trigger_jobs" ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_jobs_workspace_id_idx" ON "trigger_jobs" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_jobs_active_idx" ON "trigger_jobs" ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_jobs_type_idx" ON "trigger_jobs" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trigger_jobs_workflow_trigger_unique" ON "trigger_jobs" ("workflow_id","trigger_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_type_webhook_timestamp_idx" ON "webhook_request_logs" ("type","webhook_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_type_workflow_timestamp_idx" ON "webhook_request_logs" ("type","workflow_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_type_user_timestamp_idx" ON "webhook_request_logs" ("type","user_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_webhook_id_timestamp_idx" ON "webhook_request_logs" ("webhook_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_workflow_id_timestamp_idx" ON "webhook_request_logs" ("workflow_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_workspace_id_timestamp_idx" ON "webhook_request_logs" ("workspace_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_user_id_timestamp_idx" ON "webhook_request_logs" ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_request_logs_timestamp_idx" ON "webhook_request_logs" ("timestamp");