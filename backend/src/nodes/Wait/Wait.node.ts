import {
  NodeDefinition,
  NodeInputData,
  NodeOutputData,
} from "../../types/node.types";
import { getWaitJobManager } from "../../services/execution/WaitJobManager";
import { ExecutionPauseError } from "../../errors/ExecutionPauseError";

/**
 * Wait Node - Pause workflow execution
 *
 * Modes:
 * - After Time Interval: Wait for X seconds/minutes/hours/days
 * - At Specific Time: Wait until a specific date and time
 * - On Webhook Call: Wait until an external webhook resumes the execution
 */
export const WaitNode: NodeDefinition = {
  identifier: "wait",
  displayName: "Wait",
  name: "wait",
  group: ["flow"],
  version: 1,
  description: "Pause workflow execution for a duration, until a specific time, or until webhook call",
  ai: {
    description:
      "Pauses workflow execution. Use for rate limiting, delays, waiting for user confirmation via webhook, or scheduling.",
    useCases: [
      "Rate limit API requests",
      "Wait for user confirmation via webhook URL",
      "Wait for external system callback",
      "Schedule action for specific time",
    ],
    tags: ["wait", "delay", "pause", "sleep", "timer", "schedule", "webhook", "approval"],
    rules: [
      "For 'afterInterval' mode: set 'duration' and 'unit'",
      "For 'atDateTime' mode: set 'dateTime' in ISO format",
      "For 'onWebhook' mode: returns resumeUrl in output",
    ],
    complexityScore: 2,
    jsonExample: '{"mode": "onWebhook", "maxWaitTime": 24, "maxWaitUnit": "hours"}',
  },
  icon: "lucide:clock",
  color: "#9C27B0",
  defaults: {
    mode: "afterInterval",
    duration: 5,
    unit: "seconds",
    dateTime: "",
    maxWaitTime: 24,
    maxWaitUnit: "hours",
    allowDataInResume: true,
  },
  inputs: ["main"],
  outputs: ["main"],
  properties: [
    {
      displayName: "Resume",
      name: "mode",
      type: "options",
      required: true,
      default: "afterInterval",
      description: "When to resume workflow execution",
      options: [
        { name: "After Time Interval", value: "afterInterval", description: "Wait for a specified duration" },
        { name: "At Specific Time", value: "atDateTime", description: "Wait until a specific date and time" },
        { name: "On Webhook Call", value: "onWebhook", description: "Wait until an external webhook call resumes execution" },
      ],
    },
    {
      displayName: "Wait Duration",
      name: "duration",
      type: "number",
      required: true,
      default: 5,
      description: "How long to wait",
      displayOptions: { show: { mode: ["afterInterval"] } },
    },
    {
      displayName: "Unit",
      name: "unit",
      type: "options",
      required: true,
      default: "seconds",
      description: "Time unit for the wait duration",
      displayOptions: { show: { mode: ["afterInterval"] } },
      options: [
        { name: "Seconds", value: "seconds" },
        { name: "Minutes", value: "minutes" },
        { name: "Hours", value: "hours" },
        { name: "Days", value: "days" },
      ],
    },
    {
      displayName: "Date & Time",
      name: "dateTime",
      type: "string",
      required: true,
      default: "",
      description: "The date and time to wait until (ISO format)",
      placeholder: "2024-12-31T09:00:00",
      displayOptions: { show: { mode: ["atDateTime"] } },
    },
    {
      displayName: "Maximum Wait Time",
      name: "maxWaitTime",
      type: "number",
      required: false,
      default: 24,
      description: "Maximum time to wait for webhook call before timing out",
      displayOptions: { show: { mode: ["onWebhook"] } },
    },
    {
      displayName: "Max Wait Unit",
      name: "maxWaitUnit",
      type: "options",
      required: false,
      default: "hours",
      description: "Time unit for maximum wait time",
      displayOptions: { show: { mode: ["onWebhook"] } },
      options: [
        { name: "Minutes", value: "minutes" },
        { name: "Hours", value: "hours" },
        { name: "Days", value: "days" },
      ],
    },
    {
      displayName: "Allow Data in Resume",
      name: "allowDataInResume",
      type: "boolean",
      required: false,
      default: true,
      description: "Allow the webhook call to pass data to the next node",
      displayOptions: { show: { mode: ["onWebhook"] } },
    },
    {
      displayName: "Authentication",
      name: "webhookAuthentication",
      type: "credential",
      required: false,
      default: "",
      description: "Require authentication for incoming webhook resume requests (optional)",
      placeholder: "None (allow all requests)",
      allowedTypes: ["httpBasicAuth", "httpHeaderAuth", "webhookQueryAuth"],
      displayOptions: { show: { mode: ["onWebhook"] } },
    },
    {
      displayName: "Webhook Options",
      name: "webhookOptions",
      type: "collection",
      placeholder: "Add Option",
      default: {},
      description: "Advanced webhook configuration options",
      displayOptions: { show: { mode: ["onWebhook"] } },
      options: [
        {
          name: "httpMethod",
          displayName: "HTTP Method",
          type: "options",
          default: "ALL",
          description: "HTTP method(s) to accept for the resume webhook",
          options: [
            { name: "All Methods", value: "ALL" },
            { name: "GET", value: "GET" },
            { name: "POST", value: "POST" },
            { name: "PUT", value: "PUT" },
            { name: "PATCH", value: "PATCH" },
            { name: "DELETE", value: "DELETE" },
          ],
        },
        {
          name: "responseMessage",
          displayName: "Success Response Message",
          type: "string",
          default: "Workflow resumed successfully",
          description: "Custom message to return when webhook is called successfully",
        },
        {
          name: "allowedOrigins",
          displayName: "Allowed Origins (CORS)",
          type: "string",
          default: "*",
          placeholder: "https://example.com, https://app.example.com",
          description: "Comma-separated list of allowed origins for CORS. Use * to allow all origins.",
        },
        {
          name: "ipWhitelist",
          displayName: "IP Whitelist",
          type: "string",
          default: "",
          placeholder: "192.168.1.1, 10.0.0.0/8",
          description: "Comma-separated list of allowed IP addresses or CIDR ranges. Leave blank to allow all IPs.",
        },
      ] as any,
    },
  ],

  execute: async function (inputData: NodeInputData): Promise<NodeOutputData[]> {
    const mode = this.getNodeParameter("mode") as string;

    // Normalize input items
    const items = inputData.main || [];
    let normalizedItems = items;
    if (items.length === 1 && Array.isArray(items[0])) {
      normalizedItems = items[0];
    }

    const multipliers: Record<string, number> = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };

    // ========== WEBHOOK MODE ==========
    if (mode === "onWebhook") {
      const waitJobManager = getWaitJobManager();
      
      // Debug logging
      this.logger.info(`[Wait Node] Webhook mode - checking context`, {
        hasWaitJobManager: !!waitJobManager,
        executionId: this.executionId,
        workflowId: this.workflowId,
        nodeId: this.nodeId,
      });
      
      if (!waitJobManager || !this.executionId || !this.workflowId || !this.nodeId) {
        const missing = [];
        if (!waitJobManager) missing.push('WaitJobManager');
        if (!this.executionId) missing.push('executionId');
        if (!this.workflowId) missing.push('workflowId');
        if (!this.nodeId) missing.push('nodeId');
        
        this.logger.error(`[Wait Node] Missing context for webhook mode: ${missing.join(', ')}`);
        throw new Error(`Webhook wait mode requires: ${missing.join(', ')}`);
      }

      const maxWaitTime = this.getNodeParameter("maxWaitTime") as number || 24;
      const maxWaitUnit = this.getNodeParameter("maxWaitUnit") as string || "hours";
      const allowDataInResume = this.getNodeParameter("allowDataInResume") as boolean ?? true;
      const webhookOptions = this.getNodeParameter("webhookOptions") as any || {};
      
      // Resolve authentication credentials if configured
      let authConfig: any = { type: 'none' };
      try {
        const webhookAuth = this.getNodeParameter("webhookAuthentication") as string;
        if (webhookAuth && webhookAuth !== '') {
          // Get credentials using the credential system
          const credentials = await this.getCredentials(webhookAuth);
          if (credentials) {
            // Determine auth type from credential type
            const credentialType = (credentials as any)._credentialType || webhookAuth;
            
            if (credentialType === 'httpBasicAuth' || credentialType.includes('Basic')) {
              authConfig = {
                type: 'basic',
                settings: {
                  username: credentials.username,
                  password: credentials.password,
                },
              };
            } else if (credentialType === 'httpHeaderAuth' || credentialType.includes('Header')) {
              authConfig = {
                type: 'header',
                settings: {
                  headerName: credentials.name || 'Authorization',
                  expectedValue: credentials.value,
                },
              };
            } else if (credentialType === 'webhookQueryAuth' || credentialType.includes('Query')) {
              authConfig = {
                type: 'query',
                settings: {
                  queryParam: credentials.paramName || 'token',
                  expectedValue: credentials.value,
                },
              };
            }
            
            this.logger.info(`[Wait Node] Resolved authentication credentials`, {
              credentialType,
              authType: authConfig.type,
            });
          }
        }
      } catch (error) {
        this.logger.warn(`[Wait Node] Failed to resolve authentication credentials`, { error });
        // Continue without authentication
      }

      let timeoutMs = maxWaitTime * (multipliers[maxWaitUnit] || 3600000);
      const maxWebhookWait = 30 * 24 * 60 * 60 * 1000; // 30 days max
      if (timeoutMs > maxWebhookWait || timeoutMs === 0) {
        timeoutMs = maxWebhookWait;
      }

      const resumeAt = new Date(Date.now() + timeoutMs);

      this.logger.info(`[Wait Node] Creating webhook wait`, {
        executionId: this.executionId,
        timeout: `${maxWaitTime} ${maxWaitUnit}`,
        expiresAt: resumeAt.toISOString(),
        webhookOptions,
      });

      try {
        // Schedule the wait - this creates the DB record and BullMQ timeout job
        const waitId = await waitJobManager.scheduleWaitForWebhook({
          executionId: this.executionId,
          workflowId: this.workflowId,
          nodeId: this.nodeId,
          userId: this.userId,
          resumeAt,
          inputData: normalizedItems,
          reason: `Waiting for webhook call (timeout: ${maxWaitTime} ${maxWaitUnit})`,
          webhookOptions: {
            httpMethod: webhookOptions.httpMethod || 'ALL',
            authConfig,
            responseMessage: webhookOptions.responseMessage || 'Workflow resumed successfully',
            allowedOrigins: webhookOptions.allowedOrigins || '*',
            ipWhitelist: webhookOptions.ipWhitelist || '',
            allowDataInResume,
          },
        });

        const baseUrl = process.env.BACKEND_URL || process.env.BASE_URL || 'http://localhost:4000';
        const resumeUrl = `${baseUrl}/webhook/wait/${waitId}/resume`;

        this.logger.info(`[Wait Node] Webhook wait created, pausing execution: ${waitId}`, { resumeUrl });

        // Prepare output data that will be available when resumed
        const outputData: any = {
          _waitId: waitId,
          _waitMode: 'webhook',
          _resumeUrl: resumeUrl,
          _expiresAt: resumeAt.toISOString(),
          _allowDataInResume: allowDataInResume,
          _status: 'waiting',
        };

        // Include original input data
        if (normalizedItems.length > 0) {
          const firstItem = normalizedItems[0];
          if (firstItem && typeof firstItem === 'object') {
            if ('json' in firstItem) {
              Object.assign(outputData, firstItem.json);
            } else {
              Object.assign(outputData, firstItem);
            }
          }
        }

        // Throw ExecutionPauseError to signal the engine to pause
        // The engine will save execution state and stop processing
        throw new ExecutionPauseError({
          waitId,
          waitType: 'webhook',
          resumeAt,
          resumeUrl,
          outputData,
          message: `Waiting for webhook call at ${resumeUrl}`,
        });
      } catch (error) {
        // Re-throw ExecutionPauseError (it's expected)
        if (ExecutionPauseError.isExecutionPauseError(error)) {
          throw error;
        }
        this.logger.error(`[Wait Node] Failed to create webhook wait`, { error });
        throw error;
      }
    }

    // ========== TIME-BASED MODES ==========
    let waitMs: number;
    let resumeAt: Date;

    if (mode === "afterInterval") {
      const duration = this.getNodeParameter("duration") as number;
      const unit = this.getNodeParameter("unit") as string;
      waitMs = duration * (multipliers[unit] || 1000);
      resumeAt = new Date(Date.now() + waitMs);
      this.logger.info(`[Wait Node] Waiting for ${duration} ${unit} (${waitMs}ms)`);
    } else if (mode === "atDateTime") {
      const dateTimeStr = this.getNodeParameter("dateTime") as string;
      if (!dateTimeStr) throw new Error("Date & Time is required");
      const targetTime = new Date(dateTimeStr);
      if (isNaN(targetTime.getTime())) throw new Error(`Invalid date format: "${dateTimeStr}"`);
      resumeAt = targetTime;
      waitMs = Math.max(0, targetTime.getTime() - Date.now());
      this.logger.info(`[Wait Node] Waiting until ${dateTimeStr} (${waitMs}ms)`);
    } else {
      throw new Error(`Unknown wait mode: ${mode}`);
    }

    // Cap at 7 days
    const maxWaitMs = 7 * 24 * 60 * 60 * 1000;
    if (waitMs > maxWaitMs) {
      this.logger.warn(`[Wait Node] Capping wait at 7 days`);
      waitMs = maxWaitMs;
      resumeAt = new Date(Date.now() + waitMs);
    }

    // Execute wait - ALL waits are now persistent (survive server restarts)
    if (waitMs > 0) {
      const waitJobManager = getWaitJobManager();
      
      // Use persistent wait for ALL durations (not just > 2 min)
      // This ensures waits survive server restarts
      if (waitJobManager && this.executionId && this.workflowId && this.nodeId) {
        const waitType = mode === 'afterInterval' ? 'duration' : 'datetime';
        const reason = mode === 'afterInterval' 
          ? `Wait for ${this.getNodeParameter("duration")} ${this.getNodeParameter("unit")}`
          : `Wait until ${this.getNodeParameter("dateTime")}`;

        try {
          // Schedule persistent wait - this creates DB record and BullMQ job
          const waitId = await waitJobManager.scheduleWait({
            executionId: this.executionId,
            workflowId: this.workflowId,
            nodeId: this.nodeId,
            userId: this.userId,
            resumeAt,
            waitType,
            inputData: normalizedItems,
            reason,
          });

          this.logger.info(`[Wait Node] Persistent wait scheduled: ${waitId}`, {
            waitMs,
            resumeAt: resumeAt.toISOString(),
          });

          // Prepare output data for when resumed
          const outputData: any = {
            _waitId: waitId,
            _waitMode: mode,
            _waitType: waitType,
            _resumeAt: resumeAt.toISOString(),
            _status: 'waiting',
          };

          // Include original input data
          if (normalizedItems.length > 0) {
            const firstItem = normalizedItems[0];
            if (firstItem && typeof firstItem === 'object') {
              if ('json' in firstItem) {
                Object.assign(outputData, firstItem.json);
              } else {
                Object.assign(outputData, firstItem);
              }
            }
          }

          // Throw ExecutionPauseError to signal the engine to pause
          throw new ExecutionPauseError({
            waitId,
            waitType,
            resumeAt,
            outputData,
            message: `Waiting ${reason}`,
          });
        } catch (error) {
          // Re-throw ExecutionPauseError (it's expected)
          if (ExecutionPauseError.isExecutionPauseError(error)) {
            throw error;
          }
          // For other errors, fall back to in-memory wait
          this.logger.warn(`[Wait Node] Failed to schedule persistent wait, using in-memory`, { error });
        }
      }
      
      // Fallback: In-memory wait (only if persistent scheduling failed)
      this.logger.info(`[Wait Node] Using in-memory wait (fallback)`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.logger.info(`[Wait Node] Wait complete`);
    }

    // Return output
    if (normalizedItems.length === 0) {
      return [{
        main: [{
          json: {
            _waitCompleted: true,
            _waitMode: mode,
            _waitDuration: waitMs,
            _resumedAt: new Date().toISOString(),
          },
        }],
      }];
    }

    const outputItems = normalizedItems.map((item: any) => {
      if (item && typeof item === "object" && "json" in item) return item;
      return { json: item };
    });

    return [{ main: outputItems }];
  },
};
