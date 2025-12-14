/**
 * Node Settings System
 *
 * This module defines the settings system for nodes. Settings are common
 * configuration options that appear in a separate "Settings" tab in the
 * node configuration dialog, separate from the main "Parameters" tab.
 * 
 * Core types (NodeSetting, NodeSettingsConfig) are imported from @nodedrop/types.
 */

import { NodeSetting, NodeSettingsConfig } from "@nodedrop/types";

// Re-export shared types
export type { NodeSetting, NodeSettingsConfig };

/**
 * Collection of node settings keyed by setting name
 */
export interface NodeSettings {
  [key: string]: NodeSetting;
}

/**
 * Default settings that are available for all nodes
 * Users can enable/disable these per node
 */
export const DEFAULT_NODE_SETTINGS: NodeSettings = {
  continueOnFail: {
    displayName: "Continue On Fail",
    name: "continueOnFail",
    type: "boolean",
    default: false,
    description:
      "If enabled, the node will continue execution even if an error occurs. The error information will be returned as output data instead of stopping the workflow.",
  },
  alwaysOutputData: {
    displayName: "Always Output Data",
    name: "alwaysOutputData",
    type: "boolean",
    default: false,
    description:
      "If enabled, the node will always output data, including error responses. Useful when you want to process error responses in your workflow.",
    displayOptions: {
      show: {
        continueOnFail: [true],
      },
    },
  },
  retryOnFail: {
    displayName: "Retry On Fail",
    name: "retryOnFail",
    type: "boolean",
    default: false,
    description:
      "If enabled, the node will automatically retry execution if it fails.",
  },
  maxRetries: {
    displayName: "Max Retries",
    name: "maxRetries",
    type: "number",
    default: 3,
    description: "Maximum number of retry attempts",
    displayOptions: {
      show: {
        retryOnFail: [true],
      },
    },
  },
  retryDelay: {
    displayName: "Retry Delay (ms)",
    name: "retryDelay",
    type: "number",
    default: 1000,
    description: "Delay between retry attempts in milliseconds",
    displayOptions: {
      show: {
        retryOnFail: [true],
      },
    },
  },
  timeout: {
    displayName: "Timeout (ms)",
    name: "timeout",
    type: "number",
    default: 30000,
    description:
      "Maximum time in milliseconds the node is allowed to run before timing out. Set to 0 for no timeout.",
  },
  notes: {
    displayName: "Notes",
    name: "notes",
    type: "string",
    default: "",
    description:
      "Add notes or comments about this node. Notes are for documentation purposes only and do not affect execution.",
    placeholder: "Add notes about this node...",
  },
};

// NodeSettingsConfig is imported from @nodedrop/types above

/**
 * Settings that can be applied at different levels
 */
export enum SettingsLevel {
  GLOBAL = "global", // Applied to all nodes
  WORKFLOW = "workflow", // Applied to all nodes in a workflow
  NODE_TYPE = "nodeType", // Applied to all nodes of a specific type
  NODE_INSTANCE = "nodeInstance", // Applied to a specific node instance
}

export interface SettingsOverride {
  level: SettingsLevel;
  targetId?: string; // workflow ID or node type
  settings: Record<string, any>;
}

/**
 * Result of merging settings from different levels
 */
export interface ResolvedNodeSettings {
  [key: string]: any;
}
