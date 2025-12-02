/**
 * Node Settings Manager
 *
 * Manages node settings at different levels (global, workflow, node type, node instance)
 * and provides methods to resolve the final settings for a node.
 */

import {
  DEFAULT_NODE_SETTINGS,
  NodeSetting,
  NodeSettings,
  NodeSettingsConfig,
  ResolvedNodeSettings,
  SettingsLevel,
  SettingsOverride,
} from "../types/settings.types";

export class NodeSettingsManager {
  private static instance: NodeSettingsManager;
  private globalSettings: Map<string, any> = new Map();
  private workflowSettings: Map<string, Map<string, any>> = new Map();
  private nodeTypeSettings: Map<string, Map<string, any>> = new Map();

  private constructor() {
    // Initialize with default values
    this.initializeDefaults();
  }

  public static getInstance(): NodeSettingsManager {
    if (!NodeSettingsManager.instance) {
      NodeSettingsManager.instance = new NodeSettingsManager();
    }
    return NodeSettingsManager.instance;
  }

  /**
   * Initialize default global settings
   */
  private initializeDefaults(): void {
    Object.entries(DEFAULT_NODE_SETTINGS).forEach(([key, setting]) => {
      this.globalSettings.set(key, setting.default);
    });
  }

  /**
   * Get all available default settings
   */
  public getAvailableSettings(): NodeSettings {
    return DEFAULT_NODE_SETTINGS;
  }

  /**
   * Get a specific default setting definition
   */
  public getSettingDefinition(settingName: string): NodeSetting | undefined {
    return DEFAULT_NODE_SETTINGS[settingName];
  }

  /**
   * Set a global setting value
   */
  public setGlobalSetting(settingName: string, value: any): void {
    this.globalSettings.set(settingName, value);
  }

  /**
   * Get a global setting value
   */
  public getGlobalSetting(settingName: string): any {
    return this.globalSettings.get(settingName);
  }

  /**
   * Set workflow-level settings
   */
  public setWorkflowSettings(
    workflowId: string,
    settings: Record<string, any>
  ): void {
    if (!this.workflowSettings.has(workflowId)) {
      this.workflowSettings.set(workflowId, new Map());
    }
    const workflowSettingsMap = this.workflowSettings.get(workflowId)!;
    Object.entries(settings).forEach(([key, value]) => {
      workflowSettingsMap.set(key, value);
    });
  }

  /**
   * Set node type settings (applies to all nodes of a specific type)
   */
  public setNodeTypeSettings(
    nodeType: string,
    settings: Record<string, any>
  ): void {
    if (!this.nodeTypeSettings.has(nodeType)) {
      this.nodeTypeSettings.set(nodeType, new Map());
    }
    const nodeTypeSettingsMap = this.nodeTypeSettings.get(nodeType)!;
    Object.entries(settings).forEach(([key, value]) => {
      nodeTypeSettingsMap.set(key, value);
    });
  }

  /**
   * Resolve final settings for a node instance
   * Settings are applied in order of priority:
   * 1. Node instance settings (highest priority)
   * 2. Node type settings
   * 3. Workflow settings
   * 4. Global settings (lowest priority)
   */
  public resolveSettings(
    nodeType: string,
    workflowId: string,
    nodeSettings: NodeSettingsConfig
  ): ResolvedNodeSettings {
    const resolved: ResolvedNodeSettings = {};

    // Start with global settings
    this.globalSettings.forEach((value, key) => {
      resolved[key] = value;
    });

    // Apply workflow settings
    const workflowSettingsMap = this.workflowSettings.get(workflowId);
    if (workflowSettingsMap) {
      workflowSettingsMap.forEach((value, key) => {
        resolved[key] = value;
      });
    }

    // Apply node type settings
    const nodeTypeSettingsMap = this.nodeTypeSettings.get(nodeType);
    if (nodeTypeSettingsMap) {
      nodeTypeSettingsMap.forEach((value, key) => {
        resolved[key] = value;
      });
    }

    // Apply node instance settings (only for enabled settings)
    nodeSettings.enabledSettings.forEach((settingName: string) => {
      if (nodeSettings.values[settingName] !== undefined) {
        resolved[settingName] = nodeSettings.values[settingName];
      }
    });

    // Add custom settings if any
    if (nodeSettings.customSettings) {
      Object.entries(nodeSettings.customSettings).forEach(
        ([key, settingDef]) => {
          if (nodeSettings.values[key] !== undefined) {
            resolved[key] = nodeSettings.values[key];
          } else {
            resolved[key] = (settingDef as any).default;
          }
        }
      );
    }

    return resolved;
  }

  /**
   * Get enabled settings for a node based on its configuration
   */
  public getEnabledSettings(nodeSettings: NodeSettingsConfig): NodeSettings {
    const enabled: NodeSettings = {};

    // Get enabled default settings
    nodeSettings.enabledSettings.forEach((settingName: string) => {
      const settingDef = DEFAULT_NODE_SETTINGS[settingName];
      if (settingDef) {
        enabled[settingName] = settingDef;
      }
    });

    // Add custom settings
    if (nodeSettings.customSettings) {
      Object.entries(nodeSettings.customSettings).forEach(([key, value]) => {
        enabled[key] = value as NodeSetting;
      });
    }

    return enabled;
  }

  /**
   * Create default settings config for a new node
   */
  public createDefaultConfig(): NodeSettingsConfig {
    return {
      enabledSettings: ["continueOnFail", "notes"], // Enable commonly used settings by default
      values: {},
    };
  }

  /**
   * Validate settings values against their definitions
   */
  public validateSettings(
    settings: Record<string, any>,
    settingsConfig: NodeSettingsConfig
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate each setting
    Object.entries(settings).forEach(([key, value]) => {
      const settingDef =
        DEFAULT_NODE_SETTINGS[key] || settingsConfig.customSettings?.[key];

      if (!settingDef) {
        errors.push(`Unknown setting: ${key}`);
        return;
      }

      // Type validation
      if (settingDef.type === "boolean" && typeof value !== "boolean") {
        errors.push(`Setting ${key} must be a boolean`);
      } else if (settingDef.type === "number" && typeof value !== "number") {
        errors.push(`Setting ${key} must be a number`);
      } else if (settingDef.type === "string" && typeof value !== "string") {
        errors.push(`Setting ${key} must be a string`);
      }

      // Required validation
      if (settingDef.required && (value === undefined || value === null)) {
        errors.push(`Setting ${key} is required`);
      }

      // Options validation
      if (settingDef.options && settingDef.type === "options") {
        const validValues = settingDef.options.map((opt) => opt.value);
        if (!validValues.includes(value)) {
          errors.push(
            `Setting ${key} must be one of: ${validValues.join(", ")}`
          );
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Apply settings overrides from different levels
   */
  public applyOverrides(overrides: SettingsOverride[]): void {
    overrides.forEach((override) => {
      switch (override.level) {
        case SettingsLevel.GLOBAL:
          Object.entries(override.settings).forEach(([key, value]) => {
            this.setGlobalSetting(key, value);
          });
          break;

        case SettingsLevel.WORKFLOW:
          if (override.targetId) {
            this.setWorkflowSettings(override.targetId, override.settings);
          }
          break;

        case SettingsLevel.NODE_TYPE:
          if (override.targetId) {
            this.setNodeTypeSettings(override.targetId, override.settings);
          }
          break;

        case SettingsLevel.NODE_INSTANCE:
          // Node instance settings are handled directly in the node configuration
          break;
      }
    });
  }

  /**
   * Export all settings for backup/restore
   */
  public exportSettings(): {
    global: Record<string, any>;
    workflows: Record<string, Record<string, any>>;
    nodeTypes: Record<string, Record<string, any>>;
  } {
    const global: Record<string, any> = {};
    this.globalSettings.forEach((value, key) => {
      global[key] = value;
    });

    const workflows: Record<string, Record<string, any>> = {};
    this.workflowSettings.forEach((settingsMap, workflowId) => {
      workflows[workflowId] = {};
      settingsMap.forEach((value, key) => {
        workflows[workflowId][key] = value;
      });
    });

    const nodeTypes: Record<string, Record<string, any>> = {};
    this.nodeTypeSettings.forEach((settingsMap, nodeType) => {
      nodeTypes[nodeType] = {};
      settingsMap.forEach((value, key) => {
        nodeTypes[nodeType][key] = value;
      });
    });

    return { global, workflows, nodeTypes };
  }

  /**
   * Import settings from backup
   */
  public importSettings(data: {
    global?: Record<string, any>;
    workflows?: Record<string, Record<string, any>>;
    nodeTypes?: Record<string, Record<string, any>>;
  }): void {
    if (data.global) {
      Object.entries(data.global).forEach(([key, value]) => {
        this.setGlobalSetting(key, value);
      });
    }

    if (data.workflows) {
      Object.entries(data.workflows).forEach(([workflowId, settings]) => {
        this.setWorkflowSettings(workflowId, settings);
      });
    }

    if (data.nodeTypes) {
      Object.entries(data.nodeTypes).forEach(([nodeType, settings]) => {
        this.setNodeTypeSettings(nodeType, settings);
      });
    }
  }

  /**
   * Clear all settings and reset to defaults
   */
  public reset(): void {
    this.globalSettings.clear();
    this.workflowSettings.clear();
    this.nodeTypeSettings.clear();
    this.initializeDefaults();
  }
}

// Export singleton instance
export const nodeSettingsManager = NodeSettingsManager.getInstance();
