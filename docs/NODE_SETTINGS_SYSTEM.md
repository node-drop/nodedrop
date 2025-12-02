# Node Settings System Implementation Guide

## Overview

The Node Settings System provides a unified way to manage common configuration options across all nodes. Instead of repeating properties like "Continue On Fail" in every node definition, these settings appear in a separate **Settings** tab in the node configuration dialog.

## Architecture

### Backend Components

1. **`settings.types.ts`** - Type definitions for settings
2. **`NodeSettingsManager.ts`** - Service to manage settings at different levels
3. **Updated `node.types.ts`** - NodeDefinition now supports settings configuration

### Settings Levels (Priority Order)

Settings can be configured at multiple levels, with higher levels overriding lower levels:

1. **Node Instance** (highest priority) - Specific to a single node
2. **Node Type** - Applies to all nodes of a type (e.g., all HTTP Request nodes)
3. **Workflow** - Applies to all nodes in a workflow
4. **Global** (lowest priority) - Applies to all nodes across all workflows

### Default Settings Available

```typescript
{
  continueOnFail: boolean; // Continue workflow on error
  alwaysOutputData: boolean; // Output data even on errors
  retryOnFail: boolean; // Automatically retry on failure
  maxRetries: number; // Maximum retry attempts
  retryDelay: number; // Delay between retries (ms)
  timeout: number; // Execution timeout (ms)
  notes: string; // Documentation notes for the node
}
```

## How It Works

### 1. Node Definition

Nodes can specify which settings they support:

```typescript
export const HttpRequestNode: NodeDefinition = {
  type: "httpRequest",
  displayName: "HTTP Request",
  // ... other properties

  // Settings configuration
  settings: {
    // Specify which default settings this node type should enable
    defaultEnabled: [
      "continueOnFail",
      "alwaysOutputData",
      "retryOnFail",
      "timeout",
    ],

    // Optional: Add custom settings specific to this node type
    custom: {
      followRedirects: {
        displayName: "Follow Redirects",
        name: "followRedirects",
        type: "boolean",
        default: true,
        description: "Whether to follow HTTP redirects",
      },
    },
  },
};
```

### 2. Node Instance Configuration

Each node instance stores its settings configuration:

```json
{
  "id": "node-1",
  "type": "httpRequest",
  "parameters": {
    /* regular parameters */
  },
  "settings": {
    "enabledSettings": ["continueOnFail", "timeout"],
    "values": {
      "continueOnFail": true,
      "timeout": 60000
    }
  }
}
```

### 3. Settings Resolution

When a node executes, settings are resolved in this order:

```typescript
const settingsManager = NodeSettingsManager.getInstance();
const resolvedSettings = settingsManager.resolveSettings(
  nodeType, // "httpRequest"
  workflowId, // "workflow-123"
  nodeSettings // Node instance settings
);

// resolvedSettings contains the final merged settings
```

### 4. Using Settings in Node Execution

```typescript
execute: async function (inputData: NodeInputData): Promise<NodeOutputData[]> {
  // Get settings (provided by execution context)
  const continueOnFail = this.settings?.continueOnFail ?? false;
  const timeout = this.settings?.timeout ?? 30000;

  try {
    // Execute node logic
    const result = await doWork();
    return [{ main: [{ json: result }] }];
  } catch (error) {
    if (continueOnFail) {
      // Return error as data instead of throwing
      return [{
        main: [{
          json: {
            error: true,
            errorMessage: error.message
          }
        }]
      }];
    }
    throw error;
  }
}
```

## Frontend Implementation

### Settings Tab in Node Dialog

The node configuration dialog should have two tabs:

1. **Parameters** - Node-specific configuration (URL, method, etc.)
2. **Settings** - Common settings (Continue On Fail, Retry, etc.)

### Settings Tab Features

1. **Enable/Disable Settings** - Users can toggle which settings are active
2. **Setting Values** - Configure values for enabled settings
3. **Reset to Defaults** - Restore default values
4. **Setting Descriptions** - Helpful tooltips for each setting

### Example UI Structure

```
┌─────────────────────────────────────────┐
│ [Parameters] [Settings]                  │
├─────────────────────────────────────────┤
│                                          │
│ ☑ Continue On Fail                       │
│   Continue workflow even if node fails   │
│   [●] Enabled                            │
│                                          │
│ ☑ Always Output Data                     │
│   Output data including errors           │
│   [○] Disabled                           │
│                                          │
│ ☐ Retry On Fail                          │
│   Automatically retry on failure         │
│                                          │
│ ☑ Timeout                                │
│   Maximum execution time                 │
│   [30000] ms                             │
│                                          │
│ ☑ Notes                                  │
│   [Add notes about this node...]         │
│                                          │
└─────────────────────────────────────────┘
```

## Migration Guide

### Removing Settings from Node Properties

**Before:**

```typescript
properties: [
  {
    displayName: "Continue On Fail",
    name: "continueOnFail",
    type: "boolean",
    default: false,
    description: "Continue on error",
  },
  // ... other properties
];
```

**After:**

```typescript
properties: [
  // Remove continueOnFail - it's now in settings
  // ... other properties
],
settings: {
  defaultEnabled: ["continueOnFail"],
}
```

### Updating Node Execution

**Before:**

```typescript
const continueOnFail = await this.getNodeParameter("continueOnFail");
```

**After:**

```typescript
const continueOnFail = this.settings?.continueOnFail ?? false;
```

## API Endpoints

### Get Available Settings

```
GET /api/settings/available
Returns: List of all available default settings
```

### Get Node Settings

```
GET /api/workflows/:workflowId/nodes/:nodeId/settings
Returns: Current settings configuration for a node
```

### Update Node Settings

```
PATCH /api/workflows/:workflowId/nodes/:nodeId/settings
Body: { enabledSettings: [...], values: {...} }
Returns: Updated settings
```

### Get Workflow Settings

```
GET /api/workflows/:workflowId/settings
Returns: Workflow-level settings overrides
```

### Update Workflow Settings

```
PATCH /api/workflows/:workflowId/settings
Body: { settingName: value, ... }
Returns: Updated workflow settings
```

## Benefits

1. **Consistency** - Same settings work the same way across all nodes
2. **Reduced Duplication** - Define common settings once
3. **Better UX** - Settings tab keeps node parameters clean and focused
4. **Flexibility** - Users can enable/disable settings per node
5. **Hierarchical** - Settings can be applied at multiple levels
6. **Extensibility** - Easy to add new common settings

## Next Steps

### Phase 1: Backend (Completed ✅)

- ✅ Settings type definitions
- ✅ NodeSettingsManager service
- ✅ Updated NodeDefinition type

### Phase 2: Frontend (To Do)

- [ ] Create SettingsTab component
- [ ] Update NodeDialog to show Settings tab
- [ ] Create settings UI controls
- [ ] Add enable/disable toggles
- [ ] Implement settings validation

### Phase 3: Migration (To Do)

- [ ] Update HTTP Request node to use settings
- [ ] Update MySQL node to use settings
- [ ] Update PostgreSQL node to use settings
- [ ] Remove duplicate properties from all nodes

### Phase 4: Advanced Features (Future)

- [ ] Global settings page
- [ ] Node type defaults page
- [ ] Settings presets/templates
- [ ] Import/export settings
- [ ] Settings documentation generator

## Example: Updating HTTP Request Node

```typescript
export const HttpRequestNode: NodeDefinition = {
  type: "httpRequest",
  displayName: "HTTP Request",
  name: "httpRequest",
  group: ["transform"],
  version: 1,
  description: "Make HTTP requests to any URL",

  // Enable settings
  settings: {
    defaultEnabled: [
      "continueOnFail",
      "alwaysOutputData",
      "retryOnFail",
      "timeout",
    ],
    custom: {
      followRedirects: {
        displayName: "Follow Redirects",
        name: "followRedirects",
        type: "boolean",
        default: true,
        description: "Whether to follow HTTP redirects",
      },
    },
  },

  properties: [
    // Remove continueOnFail, alwaysOutputData, timeout from here
    {
      displayName: "Method",
      name: "method",
      type: "options",
      // ...
    },
    // ... other properties
  ],

  execute: async function (inputData) {
    // Access settings via this.settings
    const continueOnFail = this.settings?.continueOnFail ?? false;
    const timeout = this.settings?.timeout ?? 30000;
    const retryOnFail = this.settings?.retryOnFail ?? false;

    // Use settings in execution logic
    // ...
  },
};
```

## Testing

```typescript
import { nodeSettingsManager } from "./NodeSettingsManager";

// Test settings resolution
const resolved = nodeSettingsManager.resolveSettings(
  "httpRequest",
  "workflow-123",
  {
    enabledSettings: ["continueOnFail", "timeout"],
    values: {
      continueOnFail: true,
      timeout: 60000,
    },
  }
);

console.log(resolved.continueOnFail); // true
console.log(resolved.timeout); // 60000
```

## Notes

- Settings are stored in the workflow JSON
- Settings tab appears next to Parameters tab
- Users can see which settings are available for each node type
- Settings can be copied between nodes
- Settings respect display conditions (e.g., alwaysOutputData only shows when continueOnFail is true)
