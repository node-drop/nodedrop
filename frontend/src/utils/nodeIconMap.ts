/**
 * Node Icon Mapping
 * Centralized mapping of node types to their visual icons
 * Supports both emoji icons and FontAwesome icon references
 */

export interface NodeIconConfig {
  icon: string;
  color: string;
  description?: string;
}

/**
 * Icon map for all node types
 * Icons can be:
 * - Emoji (e.g., "🤖", "⚡")
 * - FontAwesome reference (e.g., "fa:globe", "fa:code-branch")
 * - Single letter (e.g., "S", "J")
 */
export const NODE_ICON_MAP: Record<string, NodeIconConfig> = {
  // ===== TRIGGER NODES =====
  "manual-trigger": {
    icon: "⚡",
    color: "#4CAF50",
    description: "Manual workflow trigger",
  },
  "webhook-trigger": {
    icon: "🪝",
    color: "#FF6B35",
    description: "Webhook trigger",
  },
  "schedule-trigger": {
    icon: "⏰",
    color: "#9C27B0",
    description: "Schedule trigger",
  },
  "workflow-called": {
    icon: "fa:phone-alt",
    color: "#16A085",
    description: "Called by another workflow",
  },
  "chat-trigger": {
    icon: "💬",
    color: "#0084FF",
    description: "Chat interface trigger",
  },

  // ===== AI NODES =====
  openai: {
    icon: "svg:openai",
    color: "#10A37F",
    description: "OpenAI (GPT-4, GPT-3.5)",
  },
  anthropic: {
    icon: "🧠",
    color: "#D97757",
    description: "Anthropic Claude",
  },

  // ===== ACTION NODES =====
  "http-request": {
    icon: "fa:globe",
    color: "#2196F3",
    description: "HTTP Request",
  },
  "workflow-trigger": {
    icon: "fa:play-circle",
    color: "#10B981",
    description: "Trigger another workflow",
  },

  // ===== TRANSFORM NODES =====
  set: {
    icon: "S",
    color: "#4CAF50",
    description: "Set values",
  },
  code: {
    icon: "lucide:code",
    color: "#FF6B6B",
    description: "Execute code",
  },
  json: {
    icon: "fa:code",
    color: "#FF9800",
    description: "Compose JSON",
  },

  // ===== LOGIC NODES =====
  if: {
    icon: "fa:code-branch",
    color: "#9C27B0",
    description: "Conditional routing",
  },
  switch: {
    icon: "fa:random",
    color: "#673AB7",
    description: "Multiple branch routing",
  },

  // ===== INTEGRATION NODES =====
  "google-sheets-trigger": {
    icon: "📊",
    color: "#34A853",
    description: "Google Sheets trigger",
  },

  // ===== UTILITY NODES =====
  "image-preview": {
    icon: "🖼️",
    color: "#FF5722",
    description: "Image preview",
  },
  "test-upload": {
    icon: "📤",
    color: "#607D8B",
    description: "Test file upload",
  },

  // ===== TEMPLATE NODES =====
  "custom-template": {
    icon: "🎨",
    color: "#E91E63",
    description: "Custom template node",
  },
  "dynamic-properties": {
    icon: "⚙️",
    color: "#795548",
    description: "Dynamic properties node",
  },
};

/**
 * Get icon configuration for a node type
 * Returns default config if node type not found
 */
export function getNodeIcon(nodeType: string): NodeIconConfig {
  return (
    NODE_ICON_MAP[nodeType] || {
      icon: "❓",
      color: "#9E9E9E",
      description: "Unknown node type",
    }
  );
}

/**
 * Check if an icon is a FontAwesome reference
 */
export function isFontAwesomeIcon(icon: string): boolean {
  return icon.startsWith("fa:");
}

/**
 * Get FontAwesome class name from icon reference
 * e.g., "fa:globe" -> "fa-globe"
 */
export function getFontAwesomeClass(icon: string): string {
  if (!isFontAwesomeIcon(icon)) {
    return "";
  }
  return `fa ${icon.replace("fa:", "fa-")}`;
}

/**
 * Check if an icon is an emoji
 */
export function isEmojiIcon(icon: string): boolean {
  // Simple check: if it's not FontAwesome and not a single ASCII letter, assume emoji
  return (
    !isFontAwesomeIcon(icon) &&
    (icon.length > 1 || /[\u{1F300}-\u{1F9FF}]/u.test(icon))
  );
}

/**
 * Register or update a node icon at runtime
 */
export function registerNodeIcon(
  nodeType: string,
  config: NodeIconConfig
): void {
  NODE_ICON_MAP[nodeType] = config;
}

/**
 * Get all registered node types
 */
export function getAllNodeTypes(): string[] {
  return Object.keys(NODE_ICON_MAP);
}

/**
 * Get icon map for a specific category
 */
export function getIconsByCategory(
  category:
    | "trigger"
    | "action"
    | "transform"
    | "ai"
    | "logic"
    | "integration"
    | "utility"
): Record<string, NodeIconConfig> {
  const categoryMap: Record<string, string[]> = {
    trigger: [
      "manual-trigger",
      "webhook-trigger",
      "schedule-trigger",
      "workflow-called",
      "chat-trigger",
      "google-sheets-trigger",
    ],
    action: ["http-request", "workflow-trigger"],
    transform: ["set", "code", "json"],
    logic: ["if", "switch"],
    ai: ["openai", "anthropic"],
    integration: ["google-sheets-trigger"],
    utility: [
      "image-preview",
      "test-upload",
      "custom-template",
      "dynamic-properties",
    ],
  };

  const result: Record<string, NodeIconConfig> = {};
  const nodeTypes = categoryMap[category] || [];

  nodeTypes.forEach((type) => {
    if (NODE_ICON_MAP[type]) {
      result[type] = NODE_ICON_MAP[type];
    }
  });

  return result;
}
