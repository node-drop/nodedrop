# Custom Templates in Form Configuration

## Overview

You can pass custom templates instead of standard form fields using the `type: "custom"` property type. This allows you to create complex, interactive UI components in the frontend while maintaining a simple backend configuration.

## Basic Syntax

```typescript
{
  displayName: "Custom Field",
  name: "customField",
  type: "custom",           // Use 'custom' type
  required: false,
  default: {},
  description: "Field description",
  component: "ComponentName", // Your custom component identifier
  componentProps: {           // Props passed to your component
    template: "template-type",
    // ... additional props
  },
}
```

## Available Custom Template Types

### 1. JSON Schema Editor

For structured JSON configuration with validation:

```typescript
{
  displayName: "Configuration",
  name: "config",
  type: "custom",
  component: "JsonEditor",
  componentProps: {
    template: "json-schema-editor",
    mode: "code",
    enableValidation: true,
    schema: {
      type: "object",
      properties: {
        apiUrl: { type: "string", format: "uri" },
        timeout: { type: "number", minimum: 0 },
      },
    },
  },
}
```

### 2. Code Editor

For writing JavaScript, SQL, or other code:

```typescript
{
  displayName: "Custom Code",
  name: "code",
  type: "custom",
  component: "CodeEditor",
  componentProps: {
    template: "monaco-editor",
    language: "javascript",  // or "sql", "python", etc.
    height: "400px",
    theme: "vs-dark",
    options: {
      minimap: { enabled: false },
      fontSize: 14,
    },
  },
}
```

### 3. Visual Query Builder

For building complex queries visually:

```typescript
{
  displayName: "Query Builder",
  name: "query",
  type: "custom",
  component: "QueryBuilder",
  componentProps: {
    template: "visual-query-builder",
    config: {
      fields: [
        { name: "name", label: "Name", type: "string" },
        { name: "age", label: "Age", type: "number" },
      ],
      operators: {
        string: ["equals", "contains", "startsWith"],
        number: ["equals", "greaterThan", "lessThan"],
      },
    },
  },
}
```

### 4. Field Mapper

For drag-and-drop field mapping:

```typescript
{
  displayName: "Field Mapping",
  name: "mapping",
  type: "custom",
  component: "FieldMapper",
  componentProps: {
    template: "drag-drop-mapper",
    sourceFields: ["{{inputFields}}"],
    targetFields: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string", required: true },
    ],
    allowTransformations: true,
  },
}
```

### 5. Multi-Step Wizard

For complex configuration with multiple steps:

```typescript
{
  displayName: "Setup Wizard",
  name: "wizard",
  type: "custom",
  component: "WizardForm",
  componentProps: {
    template: "multi-step-wizard",
    steps: [
      {
        id: "step1",
        title: "Connection",
        fields: [
          { name: "host", label: "Host", type: "string" },
          { name: "port", label: "Port", type: "number" },
        ],
      },
      {
        id: "step2",
        title: "Authentication",
        fields: [
          { name: "authType", label: "Auth Type", type: "select" },
        ],
      },
    ],
  },
}
```

### 6. Rich Text Editor

For WYSIWYG text editing:

```typescript
{
  displayName: "Email Template",
  name: "template",
  type: "custom",
  component: "RichTextEditor",
  componentProps: {
    template: "wysiwyg-editor",
    toolbar: ["bold", "italic", "link", "image"],
    allowVariables: true,
    variables: ["{{firstName}}", "{{email}}"],
  },
}
```

### 7. Table/Spreadsheet Editor

For tabular data editing:

```typescript
{
  displayName: "Data Table",
  name: "table",
  type: "custom",
  component: "TableEditor",
  componentProps: {
    template: "spreadsheet-table",
    columns: [
      { name: "id", label: "ID", type: "number" },
      { name: "name", label: "Name", type: "string" },
      { name: "active", label: "Active", type: "boolean" },
    ],
    allowAddRow: true,
    allowDeleteRow: true,
  },
}
```

## Using Custom Templates with Display Options

You can conditionally show custom templates based on other field values:

```typescript
{
  displayName: "Advanced Query Builder",
  name: "advancedQuery",
  type: "custom",
  component: "QueryBuilder",
  displayOptions: {
    show: {
      mode: ["advanced"],  // Only show when mode is "advanced"
    },
  },
  componentProps: {
    template: "visual-query-builder",
    // ... config
  },
}
```

## Complete Example Node

```typescript
export const MyCustomNode: NodeDefinition = {
  type: "my-custom-node",
  displayName: "My Custom Node",
  name: "myCustomNode",
  group: ["transform"],
  version: 1,
  description: "Node with custom templates",
  defaults: {
    config: {},
    code: "",
  },
  inputs: ["main"],
  outputs: ["main"],

  properties: [
    // Standard property
    {
      displayName: "Mode",
      name: "mode",
      type: "options",
      options: [
        { name: "Simple", value: "simple" },
        { name: "Advanced", value: "advanced" },
      ],
      default: "simple",
    },

    // Custom template - shown conditionally
    {
      displayName: "Custom Configuration",
      name: "customConfig",
      type: "custom",
      component: "JsonEditor",
      displayOptions: {
        show: {
          mode: ["advanced"],
        },
      },
      componentProps: {
        template: "json-schema-editor",
        schema: {
          type: "object",
          properties: {
            apiKey: { type: "string" },
            endpoint: { type: "string" },
          },
        },
      },
    },
  ],

  execute: async function (inputData) {
    const mode = this.getNodeParameter("mode") as string;
    const customConfig = this.getNodeParameter("customConfig") as any;

    // Your execution logic here

    return [{ main: [] }];
  },
};
```

## Frontend Implementation

On the frontend, you need to register corresponding components:

```typescript
// frontend/src/components/custom-fields/index.ts
import JsonEditor from "./JsonEditor.vue";
import CodeEditor from "./CodeEditor.vue";
import QueryBuilder from "./QueryBuilder.vue";
// ... other components

export const customComponents = {
  JsonEditor: JsonEditor,
  CodeEditor: CodeEditor,
  QueryBuilder: QueryBuilder,
  // ... register all custom components
};
```

## Benefits of Custom Templates

1. **Flexibility**: Create complex UI interactions without changing backend code
2. **Reusability**: Same custom component can be used across multiple nodes
3. **Type Safety**: Full TypeScript support with `componentProps`
4. **Conditional Rendering**: Use `displayOptions` to show/hide based on other fields
5. **Rich Interactions**: Support drag-drop, code completion, visual builders, etc.

## Best Practices

1. **Start Simple**: Begin with standard properties, add custom templates only when needed
2. **Validate Input**: Always validate the data from custom templates in the execute function
3. **Provide Defaults**: Set reasonable default values for complex custom fields
4. **Document Props**: Clearly document what `componentProps` your custom component expects
5. **Error Handling**: Handle invalid configurations gracefully in both frontend and backend
6. **Performance**: Be mindful of performance with large datasets in table/grid components

## Standard vs Custom

Use **Standard Properties** when:

- Simple text, number, or boolean inputs
- Dropdown selections from fixed options
- Basic form validation is sufficient

Use **Custom Templates** when:

- Complex data structures (JSON, nested objects)
- Rich text or code editing
- Visual builders or wizards
- Drag-and-drop interactions
- Dynamic/conditional field generation
- Custom validation logic
- Third-party integrations (charts, maps, etc.)
