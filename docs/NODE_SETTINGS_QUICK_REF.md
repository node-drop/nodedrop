# Node Settings Quick Reference

## For Node Developers

### 1. Add Settings to Your Node

```javascript
const MyNode = {
  type: "myNode",
  displayName: "My Node",
  // ... other properties

  // Define which settings this node supports
  settings: {
    // Enable these default settings for this node type
    defaultEnabled: ["continueOnFail", "retryOnFail", "timeout", "notes"],

    // Optional: Add custom settings specific to this node
    custom: {
      cacheResults: {
        displayName: "Cache Results",
        name: "cacheResults",
        type: "boolean",
        default: false,
        description: "Cache results for faster subsequent executions",
      },
    },
  },

  execute: async function (inputData) {
    // Access settings via this.settings
    const continueOnFail = this.settings?.continueOnFail ?? false;
    const timeout = this.settings?.timeout ?? 30000;
    const cacheResults = this.settings?.cacheResults ?? false;

    // Use settings in your logic
    try {
      // Your node logic here
      return [{ main: [{ json: result }] }];
    } catch (error) {
      if (continueOnFail) {
        return [{ main: [{ json: { error: true, message: error.message } }] }];
      }
      throw error;
    }
  },
};
```

### 2. Available Default Settings

| Setting            | Type    | Default | Description                                          |
| ------------------ | ------- | ------- | ---------------------------------------------------- |
| `continueOnFail`   | boolean | false   | Continue workflow even if node fails                 |
| `alwaysOutputData` | boolean | false   | Output data even on errors (requires continueOnFail) |
| `retryOnFail`      | boolean | false   | Automatically retry on failure                       |
| `maxRetries`       | number  | 3       | Maximum retry attempts                               |
| `retryDelay`       | number  | 1000    | Delay between retries (ms)                           |
| `timeout`          | number  | 30000   | Execution timeout (ms)                               |
| `notes`            | string  | ""      | Documentation notes                                  |

### 3. Custom Settings Types

```javascript
custom: {
  // Boolean setting
  enableFeature: {
    displayName: "Enable Feature",
    name: "enableFeature",
    type: "boolean",
    default: false,
    description: "Enable special feature",
  },

  // Number setting
  batchSize: {
    displayName: "Batch Size",
    name: "batchSize",
    type: "number",
    default: 100,
    description: "Number of items to process per batch",
  },

  // String setting
  apiVersion: {
    displayName: "API Version",
    name: "apiVersion",
    type: "string",
    default: "v1",
    description: "API version to use",
    placeholder: "v1, v2, etc.",
  },

  // Options setting
  mode: {
    displayName: "Mode",
    name: "mode",
    type: "options",
    default: "standard",
    options: [
      { name: "Standard", value: "standard", description: "Standard processing" },
      { name: "Fast", value: "fast", description: "Fast mode (less accurate)" },
      { name: "Accurate", value: "accurate", description: "Accurate mode (slower)" },
    ],
    description: "Processing mode",
  },

  // JSON setting
  config: {
    displayName: "Configuration",
    name: "config",
    type: "json",
    default: "{}",
    description: "Advanced configuration options",
  },
}
```

### 4. Conditional Settings

```javascript
custom: {
  enableCache: {
    displayName: "Enable Cache",
    name: "enableCache",
    type: "boolean",
    default: false,
    description: "Enable result caching",
  },
  cacheDuration: {
    displayName: "Cache Duration (seconds)",
    name: "cacheDuration",
    type: "number",
    default: 3600,
    description: "How long to cache results",
    // Only show when enableCache is true
    displayOptions: {
      show: {
        enableCache: [true],
      },
    },
  },
}
```

### 5. Migration from Properties to Settings

**Before:**

```javascript
properties: [
  {
    displayName: "Continue On Fail",
    name: "continueOnFail",
    type: "boolean",
    default: false,
    description: "Continue on error",
  },
  // ... other properties
],
execute: async function (inputData) {
  const continueOnFail = await this.getNodeParameter("continueOnFail");
}
```

**After:**

```javascript
properties: [
  // Remove continueOnFail from properties
  // ... other properties
],
settings: {
  defaultEnabled: ["continueOnFail"],
},
execute: async function (inputData) {
  const continueOnFail = this.settings?.continueOnFail ?? false;
}
```

## For Users

### Using Settings Tab

1. **Open node configuration**
2. **Click "Settings" tab** (next to "Parameters")
3. **Enable/disable settings** with checkboxes
4. **Configure values** for enabled settings
5. **Save changes**

### Settings vs Parameters

- **Parameters**: Node-specific configuration (URL, credentials, filters, etc.)
- **Settings**: Common options that work across all nodes (error handling, timeouts, etc.)

### Common Use Cases

#### 1. Handle Errors Gracefully

```
Settings Tab:
☑ Continue On Fail: [●] Enabled
☑ Always Output Data: [●] Enabled
```

Result: Node outputs error data instead of stopping workflow

#### 2. Retry Failed Operations

```
Settings Tab:
☑ Retry On Fail: [●] Enabled
☑ Max Retries: [3]
☑ Retry Delay: [2000] ms
```

Result: Node retries up to 3 times with 2-second delays

#### 3. Set Custom Timeout

```
Settings Tab:
☑ Timeout: [60000] ms
```

Result: Node times out after 60 seconds instead of default 30

#### 4. Document Your Workflow

```
Settings Tab:
☑ Notes: [This node fetches user data from the API.
         It runs every hour as part of the sync process.]
```

Result: Team members can see notes about what the node does

## Best Practices

### For Node Developers

1. **Use default settings** instead of creating custom ones when possible
2. **Keep settings separate** from parameters (settings = how, parameters = what)
3. **Provide good defaults** for custom settings
4. **Use displayOptions** to show/hide related settings
5. **Document custom settings** with clear descriptions

### For Users

1. **Enable only needed settings** to keep UI clean
2. **Use notes** to document complex workflows
3. **Set timeouts** for long-running operations
4. **Enable retries** for unreliable external services
5. **Use Continue On Fail** for error-tolerant workflows

## Examples

### Example 1: HTTP Request Node

```javascript
settings: {
  defaultEnabled: ["continueOnFail", "alwaysOutputData", "retryOnFail", "timeout"],
  custom: {
    followRedirects: {
      displayName: "Follow Redirects",
      name: "followRedirects",
      type: "boolean",
      default: true,
      description: "Follow HTTP redirects",
    },
    maxRedirects: {
      displayName: "Max Redirects",
      name: "maxRedirects",
      type: "number",
      default: 5,
      description: "Maximum redirects to follow",
      displayOptions: {
        show: { followRedirects: [true] },
      },
    },
  },
}
```

### Example 2: Database Nodes (MySQL/PostgreSQL)

```javascript
settings: {
  defaultEnabled: ["continueOnFail", "notes"],
  custom: {
    connectionTimeout: {
      displayName: "Connection Timeout (ms)",
      name: "connectionTimeout",
      type: "number",
      default: 10000,
      description: "Connection timeout",
    },
  },
}
```

### Example 3: AI/LLM Nodes

```javascript
settings: {
  defaultEnabled: ["continueOnFail", "retryOnFail", "timeout"],
  custom: {
    streaming: {
      displayName: "Enable Streaming",
      name: "streaming",
      type: "boolean",
      default: false,
      description: "Stream responses as they're generated",
    },
    temperature: {
      displayName: "Temperature",
      name: "temperature",
      type: "number",
      default: 0.7,
      description: "Controls randomness (0-1)",
    },
  },
}
```

## FAQ

### Q: When should I use settings vs parameters?

**A:** Use settings for "how" the node behaves (error handling, timeouts, caching). Use parameters for "what" the node does (URLs, data, filters).

### Q: Can settings be required?

**A:** Yes, add `required: true` to the setting definition. However, most settings should have sensible defaults.

### Q: Can I disable default settings?

**A:** Yes, just don't include them in `defaultEnabled`. Users can still manually enable them if needed.

### Q: How do settings affect node versioning?

**A:** Settings are separate from node versions. Adding/modifying settings doesn't require a version bump.

### Q: Can settings be dynamic?

**A:** Yes, use `displayOptions` to show/hide settings based on other setting values.

## Checklist for Node Migration

- [ ] Identify properties that should be settings
- [ ] Remove those properties from `properties` array
- [ ] Add `settings` configuration to node definition
- [ ] Update `execute` function to use `this.settings` instead of `this.getNodeParameter`
- [ ] Test with settings enabled/disabled
- [ ] Update node documentation
- [ ] Test backward compatibility

## Support

For questions or issues with the settings system:

1. Check documentation: `/docs/NODE_SETTINGS_SYSTEM.md`
2. Review examples in existing nodes
3. Ask in development channel
