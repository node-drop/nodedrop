# Node Creation Guide

Complete reference for creating new nodes in the workflow automation system.

---

## Quick Start

```bash
# Create a new node using CLI
npm run nodes:create MyNewNode
```

Or manually create:
```
backend/src/nodes/MyNewNode/
├── index.ts           # Export file
└── MyNewNode.node.ts  # Implementation
```

---

## Basic Node Structure

```typescript
import {
  NodeDefinition,
  NodeInputData,
  NodeOutputData,
} from "../../types/node.types";

export const MyNode: NodeDefinition = {
  // Required: Unique identifier
  identifier: "myNode",
  
  // Display info
  displayName: "My Node",
  name: "myNode",
  group: ["transform"],  // "transform" | "trigger" | "action" | "ai"
  version: 1,
  description: "Short description of what this node does",
  
  // Visual
  icon: "lucide:box",    // See Icon Reference below
  color: "#4CAF50",      // Hex color
  
  // Connections
  inputs: ["main"],
  outputs: ["main"],
  
  // Default parameter values
  defaults: {
    myParam: "default value",
  },
  
  // Properties (form fields) - see Field Types Reference
  properties: [
    {
      displayName: "My Parameter",
      name: "myParam",
      type: "string",
      required: true,
      default: "",
      description: "What this parameter does",
    },
  ],
  
  // AI metadata - IMPORTANT for AI agent usage
  ai: {
    description: "Detailed explanation for AI agents",
    useCases: ["Use case 1", "Use case 2"],
    tags: ["keyword1", "keyword2"],
    rules: ["Important rule 1", "Important rule 2"],
    complexityScore: 3,  // 1-10, lower is simpler
    jsonExample: '{"myParam": "example value"}',
  },
  
  // Execution logic
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    // Get parameters
    const myParam = this.getNodeParameter("myParam") as string;
    
    // Process input
    const items = this.normalizeInputItems(inputData.main || []);
    const processedItems = this.extractJsonData(items);
    
    // Your logic here
    const results = processedItems.map(item => ({
      ...item,
      newField: myParam,
    }));
    
    // Return wrapped output
    return [{ main: results.map(item => ({ json: item })) }];
  },
};
```

---

## Field Types Reference

### Basic Input Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text input with expression support | Names, IDs, simple text |
| `text` | Plain text input (no expressions) | Static values |
| `number` | Numeric input | Counts, timeouts, limits |
| `boolean` | Checkbox | Enable/disable features |
| `switch` | Toggle switch | On/off settings |
| `password` | Masked input | API keys, secrets |
| `email` | Email input with validation | Email addresses |
| `url` | URL input with validation | Endpoints, links |
| `textarea` | Multi-line text with expressions | Long text, templates |
| `json` | JSON editor | Complex objects, configs |
| `dateTime` | Date/time picker | Timestamps, schedules |
| `hidden` | Hidden field | Internal values |

### Selection Types

| Type | Description | Example |
|------|-------------|---------|
| `options` | Dropdown select | Method (GET/POST), Mode |
| `autocomplete` | Searchable dropdown | Large option lists |
| `multiOptions` | Multi-select checkboxes | Multiple selections |

### Complex Types

| Type | Description | Example |
|------|-------------|---------|
| `collection` | Group of fields (single object) | Optional settings |
| `collection` + `multipleValues` | Repeatable field group | Key-value pairs, conditions |
| `fixedCollection` | Predefined structure with repeating items | Headers, parameters |
| `conditionRow` | Condition builder (key, operator, value) | IF conditions |
| `keyValueRow` | Key-value pair input | Set node values |
| `expression` | Expression-only input | Dynamic values |
| `credential` | Credential selector | Auth configuration |
| `custom` | Custom component | Code editor, special UI |
| `columnsMap` | Dynamic column mapping | Spreadsheet columns |
| `button` | Action button | Clear memory, test |

---

## Property Configuration

### Basic Property

```typescript
{
  displayName: "Field Label",
  name: "fieldName",           // Parameter name in code
  type: "string",
  required: true,
  default: "",
  description: "Help text shown to user",
  placeholder: "Enter value...",
}
```

### Options (Dropdown)

```typescript
{
  displayName: "HTTP Method",
  name: "method",
  type: "options",
  required: true,
  default: "GET",
  options: [
    { name: "GET", value: "GET", description: "Retrieve data" },
    { name: "POST", value: "POST", description: "Send data" },
    { name: "PUT", value: "PUT", description: "Update data" },
    { name: "DELETE", value: "DELETE", description: "Remove data" },
  ],
}
```

### Conditional Display

```typescript
{
  displayName: "Request Body",
  name: "body",
  type: "json",
  default: "{}",
  displayOptions: {
    show: {
      method: ["POST", "PUT", "PATCH"],  // Only show when method is one of these
    },
  },
}
```

### Collection (Repeating Fields)

```typescript
{
  displayName: "Values",
  name: "values",
  type: "collection",
  default: [],
  typeOptions: {
    multipleValues: true,
    multipleValueButtonText: "Add Value",
  },
  component: "RepeatingField",
  componentProps: {
    compact: true,
    titleField: "keyValue.key",  // Field to show as item title
    fields: [
      {
        displayName: "Key Value",
        name: "keyValue",
        type: "keyValueRow",
        required: true,
        default: { key: "", value: "" },
        componentProps: {
          keyPlaceholder: "Field name",
          valuePlaceholder: "Value",
        },
      },
    ],
  },
}
```

### Condition Row

```typescript
{
  displayName: "Condition",
  name: "condition",
  type: "conditionRow",
  required: true,
  default: { key: "", expression: "equal", value: "" },
  options: [
    { name: "Equal", value: "equal" },
    { name: "Not Equal", value: "notEqual" },
    { name: "Contains", value: "contains" },
    { name: "Is Empty", value: "isEmpty" },
    // ... more operators
  ],
  componentProps: {
    keyPlaceholder: "Field to check",
    valuePlaceholder: "Compare value",
    expressionPlaceholder: "Select operator",
  },
}
```

### Credential Selector

```typescript
{
  displayName: "Authentication",
  name: "authentication",
  type: "credential",
  required: false,
  default: "",
  allowedTypes: ["httpBasicAuth", "httpBearerAuth", "apiKey"],
  placeholder: "Select authentication...",
}
```

### Custom Component

```typescript
{
  displayName: "Code",
  name: "code",
  type: "custom",
  required: true,
  default: "// Your code here",
  component: "CodeEditor",
  componentProps: {
    language: "javascript",
  },
}
```

### Dynamic Options (Load from API)

```typescript
{
  displayName: "Spreadsheet",
  name: "spreadsheetId",
  type: "autocomplete",
  required: true,
  default: "",
  typeOptions: {
    loadOptionsMethod: "getSpreadsheets",
    loadOptionsDependsOn: ["credentials"],
  },
}
```

---

## AI Metadata Reference

The `ai` property helps AI agents understand and use your node correctly.

```typescript
ai: {
  // Detailed description for AI (more verbose than user description)
  description: "Modifies existing data items by adding or updating fields. Use this to prepare data for the next node.",
  
  // Specific scenarios where this node excels
  useCases: [
    "Rename fields (e.g. set 'newKey' = '{{json.oldKey}}')",
    "Add timestamp or static values",
    "Calculate simple values",
  ],
  
  // Search keywords for AI to find this node
  tags: ["set", "update", "modify", "add field", "transform"],
  
  // CRITICAL rules AI must follow
  rules: [
    "Can use dot notation for nested fields (e.g. 'user.address.city')",
    "Each value entry MUST have a 'keyValue' object with 'key' and 'value' properties",
    "Expression must be one of: equal, notEqual, larger, smaller, contains, isEmpty",
  ],
  
  // Complexity score (1-10) - AI prefers simpler nodes
  complexityScore: 2,
  
  // Example parameter structures for complex nodes
  parameterExamples: {
    values: [
      {
        description: "Set a single field",
        value: [{ keyValue: { key: "status", value: "active" } }],
      },
      {
        description: "Set multiple fields",
        value: [
          { keyValue: { key: "status", value: "active" } },
          { keyValue: { key: "role", value: "admin" } },
        ],
      },
    ],
  },
  
  // Complete JSON example(s) - most direct way to show structure
  jsonExample: '{"includeInputData": true, "values": [{"keyValue": {"key": "fieldName", "value": "fieldValue"}}]}',
  
  // Or multiple examples
  jsonExample: [
    '{"mode": "simple", "condition": {"key": "status", "expression": "equal", "value": "active"}}',
    '{"mode": "combine", "combineOperation": "AND", "conditions": [...]}',
  ],
  
  // Recommended node connections
  recommendations: {
    inputs: {
      main: ["HttpRequest", "Set", "Code"],
    },
    outputs: {
      main: ["Set", "HttpRequest", "IfElse"],
    },
  },
}
```

---

## Execution Context

Inside `execute`, you have access to:

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  // Get parameter values
  const param = this.getNodeParameter("paramName") as string;
  const paramWithDefault = this.getNodeParameter("paramName", 0) as string;
  
  // Get credentials
  const creds = await this.getCredentials("httpBasicAuth");
  
  // Logging
  this.logger.info("Processing...", { itemCount: items.length });
  this.logger.error("Failed", { error: err.message });
  
  // Settings (from Settings tab)
  const continueOnFail = this.settings?.continueOnFail ?? false;
  
  // Utility functions
  const items = this.normalizeInputItems(inputData.main || []);
  const data = this.extractJsonData(items);
  const value = this.resolveValue("{{json.field}}", item);
  const nested = this.resolvePath(obj, "user.address.city");
  
  // State management (for stateful nodes like Loop)
  const state = this.getNodeState?.() || {};
  this.setNodeState?.({ currentIndex: 5 });
}
```

---

## Multiple Outputs

```typescript
// Define multiple outputs
outputs: ["true", "false"],
outputNames: ["True", "False"],

// Return data to specific outputs
execute: async function(inputData): Promise<NodeOutputData[]> {
  const trueItems = [...];
  const falseItems = [...];
  
  return [
    { true: trueItems.map(i => ({ json: i })) },
    { false: falseItems.map(i => ({ json: i })) },
  ];
}
```

---

## Icon Reference

Use Lucide icons (preferred) or Font Awesome:

```typescript
icon: "lucide:code"        // Lucide icon
icon: "lucide:milestone"   // Lucide icon
icon: "fa:globe"           // Font Awesome
icon: "fa:random"          // Font Awesome
icon: "S"                  // Single letter fallback
```

Common icons:
- `lucide:code` - Code/script
- `lucide:milestone` - Branching/conditions
- `lucide:repeat` - Loops
- `lucide:git-merge` - Merge
- `lucide:split` - Split
- `lucide:clock` - Schedule/time
- `lucide:webhook` - Webhooks
- `lucide:mail` - Email
- `lucide:database` - Data storage
- `lucide:filter` - Filter
- `lucide:pause` - Wait/delay

---

## Common Patterns

### Transform Node (modify data)

```typescript
execute: async function(inputData): Promise<NodeOutputData[]> {
  const items = this.normalizeInputItems(inputData.main || []);
  const data = this.extractJsonData(items);
  
  const results = data.map(item => ({
    ...item,
    newField: "value",
  }));
  
  return [{ main: results.map(i => ({ json: i })) }];
}
```

### Filter Node (route data)

```typescript
execute: async function(inputData): Promise<NodeOutputData[]> {
  const items = this.normalizeInputItems(inputData.main || []);
  const data = this.extractJsonData(items);
  
  const passed = data.filter(item => item.status === "active");
  const failed = data.filter(item => item.status !== "active");
  
  return [
    { passed: passed.map(i => ({ json: i })) },
    { failed: failed.map(i => ({ json: i })) },
  ];
}
```

### Trigger Node

```typescript
identifier: "myTrigger",
triggerType: "webhook",  // or "schedule", "manual", "event"
inputs: [],              // Triggers have no inputs
outputs: ["main"],

execute: async function(): Promise<NodeOutputData[]> {
  // Trigger data comes from external source
  const triggerData = this.getInputData();
  return [{ main: [{ json: triggerData }] }];
}
```

---

## Validation Checklist

Before submitting a new node:

- [ ] `identifier` is unique and lowercase
- [ ] `displayName` is user-friendly
- [ ] `description` explains what the node does
- [ ] `ai.description` provides detailed AI guidance
- [ ] `ai.rules` lists critical requirements
- [ ] `ai.jsonExample` shows complete parameter structure
- [ ] All required properties have sensible defaults
- [ ] `displayOptions` used for conditional fields
- [ ] Error handling with meaningful messages
- [ ] Logging for debugging
- [ ] `index.ts` exports the node correctly

---

## Testing

```bash
# Validate node structure
npm run nodes:validate

# Register all nodes
npm run nodes:register

# List all nodes
npm run nodes:list
```

---

## Examples

See existing nodes for reference:
- **Simple**: `Set`, `Json`
- **Conditions**: `IfElse`, `Switch`
- **Loops**: `Loop`
- **HTTP**: `HttpRequest`
- **Code**: `Code`
- **Triggers**: `WebhookTrigger`, `ScheduleTrigger`


---

## Complete Field Types Reference

### All Available FieldRenderer Types

Based on `frontend/src/components/ui/form-generator/FieldRenderer.tsx`:

| Type | Component | Description | Use Case |
|------|-----------|-------------|----------|
| `hidden` | Hidden input | Invisible field, value still submitted | Internal IDs, state |
| `credential` | UnifiedCredentialSelector | Auth credential picker | API authentication |
| `string` | ExpressionInput | Text with expression support `{{json.x}}` | Dynamic text values |
| `text` | Input | Plain text (no expressions) | Static text |
| `password` | Input (masked) | Password field with show/hide | Secrets, API keys |
| `email` | Input (email) | Email validation | Email addresses |
| `url` | Input (url) | URL validation | Endpoints, links |
| `number` | Input (number) | Numeric with min/max/step | Counts, timeouts |
| `textarea` | ExpressionInput | Multi-line with expressions | Templates, long text |
| `boolean` | Checkbox | Checkbox with label | Enable/disable |
| `switch` | Switch | Toggle switch with label | On/off settings |
| `options` | Select | Dropdown select | Single choice from list |
| `autocomplete` | AutoComplete / DynamicAutocomplete | Searchable dropdown | Large lists, dynamic options |
| `multiOptions` | Checkbox group | Multiple selection | Multi-select |
| `json` | Textarea (monospace) | JSON editor | Objects, configs |
| `dateTime` | Input (datetime-local) | Date/time picker | Timestamps |
| `conditionRow` | ConditionRow | Key + Operator + Value | IF conditions |
| `keyValueRow` | KeyValueRow | Key + Value pair | Set values |
| `columnsMap` | DynamicAutocomplete (special) | Column mapping UI | Spreadsheet columns |
| `button` | Button | Action button | Clear memory, test |
| `expression` | WorkflowExpressionField | Expression-only input | Dynamic routing |
| `collection` | CollectionField | Nested optional fields | Optional settings group |
| `collection` + `multipleValues` | RepeatingField | Repeatable field group | Lists of items |
| `fixedCollection` + `multipleValues` | RepeatingField | Predefined repeatable structure | Headers, params |
| `custom` | Registry or inline | Custom component | Code editor, special UI |

### Type Options

```typescript
typeOptions: {
  // For collection/fixedCollection
  multipleValues: true,              // Enable repeating
  multipleValueButtonText: "Add Item", // Button text
  
  // For autocomplete
  loadOptionsMethod: "methodName",   // Dynamic loading method
  loadOptionsDependsOn: ["field1"],  // Reload when these change
  
  // For button
  action: "clearMemory",             // Special action
  variant: "default",                // Button variant
  size: "default",                   // Button size
  buttonText: "Click Me",            // Button label
  className: "custom-class",         // CSS class
}
```

### Component Props

```typescript
componentProps: {
  // For RepeatingField
  compact: true,                     // Compact display
  titleField: "keyValue.key",        // Field to show as title
  fields: [...],                     // Nested field definitions
  
  // For conditionRow/keyValueRow
  keyPlaceholder: "Field name",
  valuePlaceholder: "Value",
  expressionPlaceholder: "Select...",
  
  // For custom components
  language: "javascript",            // CodeEditor language
  dependsOn: ["field1", "field2"],   // Pass dependent values
  variableCategories: [...],         // Expression field categories
}
```

### Validation Options

```typescript
validation: {
  min: 0,                            // Minimum value/length
  max: 100,                          // Maximum value/length
}
```

### Display Options

```typescript
displayOptions: {
  show: {
    fieldName: ["value1", "value2"], // Show when fieldName is one of these
  },
  hide: {
    fieldName: ["value3"],           // Hide when fieldName is this
  },
}
```

---

## Custom Components Registry

Available custom components (registered in `customComponentRegistry.ts`):

| Component | Description |
|-----------|-------------|
| `CodeEditor` | Monaco-based code editor |
| `SimpleRepeater` | Simple list repeater |
| `SpreadsheetSelector` | Google Sheets picker |
| `SheetSelector` | Sheet tab picker |
| `ColumnSelector` | Column picker |

### Using Custom Components

```typescript
// Registry-based
{
  type: "custom",
  component: "CodeEditor",
  componentProps: {
    language: "javascript",
  },
}

// Inline custom component
{
  type: "custom",
  customComponent: ({ value, onChange, field, allValues }) => (
    <MyCustomComponent value={value} onChange={onChange} />
  ),
}
```

---

## Condition Operators Reference

Available operators for `conditionRow` type:

| Operator | Description | Example |
|----------|-------------|---------|
| `equal` | Exact match | `status == "active"` |
| `notEqual` | Not equal | `status != "deleted"` |
| `larger` | Greater than (numeric) | `count > 10` |
| `largerEqual` | Greater or equal | `count >= 10` |
| `smaller` | Less than (numeric) | `count < 100` |
| `smallerEqual` | Less or equal | `count <= 100` |
| `contains` | String contains | `name contains "john"` |
| `notContains` | String doesn't contain | `email notContains "spam"` |
| `startsWith` | String starts with | `url startsWith "https"` |
| `endsWith` | String ends with | `file endsWith ".json"` |
| `isEmpty` | Value is empty/null | `notes isEmpty` |
| `isNotEmpty` | Value has content | `email isNotEmpty` |
| `regex` | Regex pattern match | `phone regex "^\d{10}$"` |

---

## Expression Syntax

Expressions use `{{...}}` syntax:

```typescript
// Access current item data
"{{json.fieldName}}"
"{{json.user.email}}"
"{{json.items[0].name}}"

// Access previous node output
"{{$node['NodeName'].json.field}}"

// Access workflow variables
"{{$workflow.id}}"
"{{$execution.id}}"

// Loop context
"{{$index}}"
"{{$iteration}}"
"{{$total}}"
```

---

## Error Handling Pattern

```typescript
execute: async function(inputData): Promise<NodeOutputData[]> {
  const continueOnFail = this.settings?.continueOnFail ?? false;
  
  try {
    // Your logic
    const result = await doSomething();
    return [{ main: [{ json: result }] }];
    
  } catch (error) {
    this.logger.error("Operation failed", { error: error.message });
    
    if (continueOnFail) {
      return [{
        main: [{
          json: {
            error: true,
            errorMessage: error.message,
            timestamp: new Date().toISOString(),
          },
        }],
      }];
    }
    
    throw error;
  }
}
```
