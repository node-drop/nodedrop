import {
    NodeDefinition,
    NodeInputData,
    NodeOutputData,
} from "../../types/node.types";

/**
 * Error data passed to the Error Trigger when a workflow fails
 */
export interface WorkflowErrorData {
  /** The execution ID that failed */
  executionId: string;
  /** The workflow ID that failed */
  workflowId: string;
  /** The workflow name */
  workflowName: string;
  /** The node ID that caused the failure (if applicable) */
  failedNodeId?: string;
  /** The node name that caused the failure */
  failedNodeName?: string;
  /** The node type that caused the failure */
  failedNodeType?: string;
  /** The error message */
  errorMessage: string;
  /** The error stack trace (if available) */
  errorStack?: string;
  /** When the error occurred */
  errorTimestamp: string;
  /** When the execution started */
  executionStartedAt: string;
  /** The execution mode (manual, webhook, schedule, etc.) */
  executionMode?: string;
  /** The user ID who owns the workflow */
  userId?: string;
  /** Additional error context */
  errorContext?: Record<string, any>;
}

/**
 * Error Trigger Node
 *
 * This node is used as the starting point for error handling workflows.
 * When a workflow has this workflow set as its "Error Workflow" in settings,
 * this trigger will receive the error details when that workflow fails.
 *
 * Usage:
 * 1. Create a workflow with this Error Trigger as the starting node
 * 2. Add notification nodes (Slack, Email, etc.) connected to it
 * 3. In other workflows, set this workflow as the "Error Workflow" in settings
 */
export const ErrorTriggerNode: NodeDefinition = {
  identifier: "error-trigger",
  displayName: "Error Trigger",
  name: "errorTrigger",
  group: ["trigger"],
  nodeCategory: "trigger",
  triggerType: "error",
  version: 2,
  description:
    "Receives error data when a workflow fails. Set this workflow as the Error Workflow in other workflows' settings.",
  ai: {
    description: "The starting point for Error Handling workflows. Receives error details (message, node, timestamp) when another workflow fails.",
    useCases: [
      "Send error alerts to Slack/Email",
      "Log errors to a database",
      "Attempt auto-recovery strategies"
    ],
    tags: ["error", "failure", "catch", "exception", "handler"],
    rules: [
      "Must be the first node in the workflow",
      "Configure this workflow as the 'Error Workflow' in other workflows' settings"
    ],
    complexityScore: 3
  },
  icon: "lucide:bug",
  color: "#EF4444",
  defaults: {},
  inputs: [],
  outputs: ["main"],
  properties: [],
  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    // The error data is passed through inputData when triggered by the error handler
    const errorData = inputData.main?.[0]?.[0] as WorkflowErrorData | undefined;

    if (!errorData) {
      this.logger?.warn("Error trigger executed without error data");
      return [
        {
          main: [
            {
              json: {
                triggeredAt: new Date().toISOString(),
                triggerType: "error",
                message:
                  "Error trigger executed but no error data was provided. This workflow should be set as the Error Workflow in another workflow's settings.",
              },
            },
          ],
        },
      ];
    }

    this.logger?.info("Error trigger fired", {
      executionId: errorData.executionId,
      workflowId: errorData.workflowId,
      workflowName: errorData.workflowName,
      failedNodeId: errorData.failedNodeId,
      errorMessage: errorData.errorMessage,
    });

    return [
      {
        main: [
          {
            json: {
              triggeredAt: new Date().toISOString(),
              triggerType: "error",
              // Flatten error data for easier access in expressions
              executionId: errorData.executionId,
              workflowId: errorData.workflowId,
              workflowName: errorData.workflowName,
              failedNodeId: errorData.failedNodeId,
              failedNodeName: errorData.failedNodeName,
              failedNodeType: errorData.failedNodeType,
              errorMessage: errorData.errorMessage,
              errorStack: errorData.errorStack,
              errorTimestamp: errorData.errorTimestamp,
              executionStartedAt: errorData.executionStartedAt,
              executionMode: errorData.executionMode,
              // Also include full error object for advanced use
              error: errorData,
            },
          },
        ],
      },
    ];
  },
};
