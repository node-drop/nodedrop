/**
 * Routes Setup
 * 
 * Centralizes all route registration
 */

import { Express } from "express";

// API Routes
import aiMemoryRoutes from "../modules/ai/routes/aiMemoryRoutes";
import { aiRoutes } from "../modules/ai/routes/aiRoutes";
import { authRoutes } from "./auth";
import { backupRoutes } from "./backup";
import credentialRoutes from "./credentials";
import { customNodeRoutes } from "./custom-nodes";
import debugCredentialsRoutes from "./debug-credentials";
import editionRoutes from "./edition";
import environmentRoutes from "./environment";
import executionControlRoutes from "./execution-control";
import executionHistoryRoutes from "./execution-history";
import executionRecoveryRoutes from "./execution-recovery";
import executionResumeRoutes from "./execution-resume";
import { executionRoutes } from "./executions";
import flowExecutionRoutes from "./flow-execution";
import { gitRouter } from "./git";
import googleRoutes from "./google";
import { nodeTypeRoutes } from "./node-types";
import { nodeRoutes } from "./nodes";
import oauthGenericRoutes from "./oauth-generic";
import { publicChatsRoutes } from "./public-chats";
import { publicFormsRoutes } from "./public-forms";
import systemRoutes from "./system";
import teamRoutes from "./teams";
import triggerRoutes from "./triggers";
import userRoutes from "./user.routes";
import variableRoutes from "./variables";
import webhookRoutes from "./webhook";
import webhookLogsRoutes from "./webhook-logs";
import { workflowRoutes } from "./workflows";
import workspaceRoutes from "./workspaces";

export function setupRoutes(app: Express): void {
  // Debug routes (remove in production)
  app.use("/api", debugCredentialsRoutes);

  // Auth & Users
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);

  // System
  app.use("/api/system", systemRoutes);
  app.use("/api/edition", editionRoutes);

  // Core API
  app.use("/api/workflows", workflowRoutes);
  app.use("/api", environmentRoutes);
  app.use("/api/executions", executionRoutes);
  app.use("/api/executions", executionResumeRoutes);
  app.use("/api/nodes", nodeRoutes);
  app.use("/api/node-types", nodeTypeRoutes);
  app.use("/api/credentials", credentialRoutes);
  app.use("/api/variables", variableRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/triggers", triggerRoutes);
  app.use("/api/custom-nodes", customNodeRoutes);

  // Execution
  app.use("/api/flow-execution", flowExecutionRoutes);
  app.use("/api/execution-control", executionControlRoutes);
  app.use("/api/execution-history", executionHistoryRoutes);
  app.use("/api/execution-recovery", executionRecoveryRoutes);

  // OAuth & External
  app.use("/api", oauthGenericRoutes);
  app.use("/api/google", googleRoutes);

  // AI
  app.use("/api/ai-memory", aiMemoryRoutes);
  app.use("/api/ai", aiRoutes);

  // Backup & Git
  app.use("/api/backup", backupRoutes);
  app.use("/api", webhookLogsRoutes);
  app.use("/api/git", gitRouter);

  // Public endpoints (webhooks, forms, chats)
  app.use("/webhook/forms", publicFormsRoutes);
  app.use("/webhook/chats", publicChatsRoutes);
  app.use("/webhook", webhookRoutes);
}
