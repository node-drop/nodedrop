# Quick Reference: Custom Form Templates

## Yes! You CAN pass custom templates! ✅

Instead of using standard form properties, you can pass complete custom templates using the `type: "custom"` property type.

## Quick Syntax

```typescript
properties: [
  {
    displayName: "Your Custom Field",
    name: "yourField",
    type: "custom", // ← Use 'custom' type
    component: "YourComponentName", // ← Component identifier
    componentProps: {
      // ← Pass any template config
      template: "your-template-type",
      // ... any props your component needs
    },
  },
];
```

## Common Custom Templates

### 1. JSON Editor

```typescript
{
  type: "custom",
  component: "JsonEditor",
  componentProps: {
    template: "json-schema-editor",
    schema: { /* your JSON schema */ }
  }
}
```

### 2. Code Editor

```typescript
{
  type: "custom",
  component: "CodeEditor",
  componentProps: {
    template: "monaco-editor",
    language: "javascript",
    height: "400px"
  }
}
```

### 3. Query Builder

```typescript
{
  type: "custom",
  component: "QueryBuilder",
  componentProps: {
    template: "visual-query-builder",
    config: { fields: [...], operators: {...} }
  }
}
```

### 4. Field Mapper

```typescript
{
  type: "custom",
  component: "FieldMapper",
  componentProps: {
    template: "drag-drop-mapper",
    sourceFields: [...],
    targetFields: [...]
  }
}
```

### 5. Rich Text Editor

```typescript
{
  type: "custom",
  component: "RichTextEditor",
  componentProps: {
    template: "wysiwyg-editor",
    toolbar: ["bold", "italic", "link"]
  }
}
```

### 6. Table Editor

```typescript
{
  type: "custom",
  component: "TableEditor",
  componentProps: {
    template: "spreadsheet-table",
    columns: [...]
  }
}
```

### 7. Multi-Step Wizard

```typescript
{
  type: "custom",
  component: "WizardForm",
  componentProps: {
    template: "multi-step-wizard",
    steps: [...]
  }
}
```

## Mix Standard + Custom

You can mix standard properties with custom templates:

```typescript
properties: [
  // Standard dropdown
  {
    displayName: "Mode",
    name: "mode",
    type: "options",  // ← Standard type
    options: [...]
  },

  // Custom template
  {
    displayName: "Config",
    name: "config",
    type: "custom",   // ← Custom type
    component: "JsonEditor",
    componentProps: {...}
  }
]
```

## Conditional Display

Show custom templates based on other fields:

```typescript
{
  type: "custom",
  component: "CodeEditor",
  displayOptions: {
    show: {
      mode: ["advanced"]  // Only show when mode = "advanced"
    }
  }
}
```

## Full Example

See these files for complete examples:

- `backend/src/nodes/examples/DynamicProperties.node.ts` - Basic example with custom templates
- `backend/src/nodes/examples/CustomTemplate.node.ts` - Comprehensive examples of all template types
- `docs/CUSTOM_TEMPLATES.md` - Full documentation

## Key Points

✅ **Yes, you can pass complete templates** using `type: "custom"`
✅ Custom templates work alongside standard properties
✅ Use `component` to specify which frontend component to render
✅ Use `componentProps` to pass your template configuration
✅ Supports conditional display with `displayOptions`
✅ Full TypeScript support

## When to Use

**Use Custom Templates when you need:**

- JSON/code editors
- Visual builders
- Drag-and-drop interfaces
- Rich text editing
- Complex multi-step forms
- Dynamic field generation
- Custom validation logic

**Use Standard Properties when you need:**

- Simple text inputs
- Number inputs
- Dropdowns
- Checkboxes
- Basic form fields
