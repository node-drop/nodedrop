# Repeating Field Component

## Overview

The `RepeatingField` component is a generic, reusable form component that allows users to dynamically add, remove, reorder, and duplicate form sections. It's perfect for scenarios where you need multiple instances of the same form fields.

## ✨ Features

- ✅ **Add/Remove Items** - Dynamically add and remove items
- ✅ **Drag & Drop Reordering** - Reorder items with drag and drop
- ✅ **Duplicate Items** - Clone existing items with one click
- ✅ **Collapsible Sections** - Expand/collapse items to save space
- ✅ **Min/Max Limits** - Set minimum and maximum number of items
- ✅ **Custom Headers** - Customize how each item header appears
- ✅ **Validation** - Per-item and per-field validation support
- ✅ **Default Values** - Pre-populate new items with default values

## 📦 Installation

The component is already installed in your form-generator package:

```typescript
import { RepeatingField } from "@/components/ui/form-generator";
```

## 🚀 Basic Usage

### Example 1: HTTP Headers

```tsx
import { RepeatingField, createField } from "@/components/ui/form-generator";
import { useState } from "react";

function HttpHeadersExample() {
  const [headers, setHeaders] = useState<RepeatingFieldItem[]>([]);

  return (
    <RepeatingField
      displayName="Header"
      fields={[
        createField({
          name: "key",
          displayName: "Header Name",
          type: "string",
          required: true,
        }),
        createField({
          name: "value",
          displayName: "Header Value",
          type: "string",
          required: true,
        }),
      ]}
      value={headers}
      onChange={setHeaders}
      addButtonText="Add Header"
    />
  );
}
```

### Example 2: Switch Node Outputs

```tsx
import { RepeatingField, createField } from "@/components/ui/form-generator";

function SwitchNodeExample() {
  const [outputs, setOutputs] = useState<RepeatingFieldItem[]>([]);

  return (
    <RepeatingField
      displayName="Output"
      fields={[
        createField({
          name: "outputName",
          displayName: "Output Name",
          type: "string",
          required: true,
        }),
        createField({
          name: "condition",
          displayName: "Condition",
          type: "options",
          required: true,
          options: [
            { name: "Equals", value: "equals" },
            { name: "Contains", value: "contains" },
            { name: "Greater Than", value: "greaterThan" },
          ],
        }),
        createField({
          name: "value",
          displayName: "Value",
          type: "string",
          required: true,
        }),
      ]}
      value={outputs}
      onChange={setOutputs}
      minItems={1}
      maxItems={10}
      addButtonText="Add Output"
      itemHeaderRenderer={(item, index) => (
        <span>{item.values.outputName || `Output ${index + 1}`}</span>
      )}
    />
  );
}
```

## 📖 Props API

### Required Props

| Prop          | Type                                    | Description                                |
| ------------- | --------------------------------------- | ------------------------------------------ |
| `displayName` | `string`                                | Display name for the repeating field group |
| `fields`      | `FormFieldConfig[]`                     | Field configurations for each item         |
| `value`       | `RepeatingFieldItem[]`                  | Current values array                       |
| `onChange`    | `(value: RepeatingFieldItem[]) => void` | Change handler                             |

### Optional Props

| Prop                 | Type                                     | Default      | Description                   |
| -------------------- | ---------------------------------------- | ------------ | ----------------------------- |
| `minItems`           | `number`                                 | `0`          | Minimum number of items       |
| `maxItems`           | `number`                                 | `undefined`  | Maximum number of items       |
| `addButtonText`      | `string`                                 | `'Add Item'` | Text for the add button       |
| `allowReorder`       | `boolean`                                | `true`       | Enable drag & drop reordering |
| `allowDuplicate`     | `boolean`                                | `true`       | Show duplicate button         |
| `allowDelete`        | `boolean`                                | `true`       | Show delete button            |
| `defaultItemValues`  | `Record<string, any>`                    | `{}`         | Default values for new items  |
| `itemHeaderRenderer` | `(item, index) => ReactNode`             | `null`       | Custom header renderer        |
| `errors`             | `Record<string, Record<string, string>>` | `{}`         | Validation errors             |
| `disabled`           | `boolean`                                | `false`      | Disable all interactions      |
| `className`          | `string`                                 | `''`         | Custom CSS class              |
| `showItemNumbers`    | `boolean`                                | `true`       | Show item numbers in headers  |
| `collapsedByDefault` | `boolean`                                | `false`      | Start items collapsed         |

## 🎨 Advanced Examples

### Custom Header Renderer

```tsx
<RepeatingField
  displayName="API Parameter"
  fields={[...]}
  value={params}
  onChange={setParams}
  itemHeaderRenderer={(item, index) => (
    <div className="flex items-center gap-2">
      <span className="font-mono">{item.values.name}</span>
      <span className="text-xs text-muted-foreground">
        ({item.values.type})
      </span>
      {item.values.required && (
        <span className="text-xs text-red-500">*</span>
      )}
    </div>
  )}
/>
```

### With Validation

```tsx
const [items, setItems] = useState<RepeatingFieldItem[]>([])
const [errors, setErrors] = useState<Record<string, Record<string, string>>>({})

// Validate items
const validateItems = (items: RepeatingFieldItem[]) => {
  const newErrors: Record<string, Record<string, string>> = {}

  items.forEach((item) => {
    const itemErrors: Record<string, string> = {}

    if (!item.values.name) {
      itemErrors.name = 'Name is required'
    }
    if (!item.values.value) {
      itemErrors.value = 'Value is required'
    }

    if (Object.keys(itemErrors).length > 0) {
      newErrors[item.id] = itemErrors
    }
  })

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

<RepeatingField
  displayName="Field"
  fields={[...]}
  value={items}
  onChange={(newItems) => {
    setItems(newItems)
    validateItems(newItems)
  }}
  errors={errors}
/>
```

### Collapsed by Default

```tsx
<RepeatingField
  displayName="Route"
  fields={[...]}
  value={routes}
  onChange={setRoutes}
  collapsedByDefault={true}
  itemHeaderRenderer={(item, index) => (
    <div>
      <span className="font-medium">{item.values.routeName}</span>
      <span className="text-xs text-muted-foreground ml-2">
        {item.values.method} {item.values.path}
      </span>
    </div>
  )}
/>
```

### With Min/Max Limits

```tsx
<RepeatingField
  displayName="Team Member"
  fields={[...]}
  value={members}
  onChange={setMembers}
  minItems={1}  // At least 1 member required
  maxItems={10} // Maximum 10 members
  addButtonText="Add Member"
/>
```

## 🔧 Use Cases

### 1. **Switch Node Outputs**

Add multiple conditional outputs with custom rules

### 2. **HTTP Headers**

Key-value pairs for API requests

### 3. **Query Parameters**

Dynamic URL parameters

### 4. **Form Fields**

Build dynamic forms with repeating field groups

### 5. **Routing Rules**

Define multiple routes with conditions

### 6. **API Endpoints**

Configure multiple API endpoints

### 7. **Environment Variables**

Manage multiple environment configurations

### 8. **Validation Rules**

Add multiple validation conditions

### 9. **Webhook Subscriptions**

Configure multiple webhook endpoints

### 10. **Data Transformations**

Define multiple transformation rules

## 💡 Tips & Best Practices

### 1. Use Custom Headers for Better UX

```tsx
itemHeaderRenderer={(item, index) => (
  <div>
    {item.values.name || `Item ${index + 1}`}
    {item.values.description && (
      <span className="text-xs">- {item.values.description}</span>
    )}
  </div>
)}
```

### 2. Provide Default Values

```tsx
<RepeatingField
  defaultItemValues={{
    type: "string",
    required: false,
    default: "",
  }}
  {...otherProps}
/>
```

### 3. Use Validation

Always validate items before submission:

```tsx
const handleSubmit = () => {
  if (validateItems(items)) {
    // Submit
  }
};
```

### 4. Collapse Long Lists

For items with many fields, use collapsed by default:

```tsx
<RepeatingField collapsedByDefault={true} {...otherProps} />
```

### 5. Set Reasonable Limits

```tsx
<RepeatingField
  minItems={1} // Require at least one
  maxItems={50} // Prevent performance issues
  {...otherProps}
/>
```

## 🎯 Backend Integration

### Using with Node Properties

```typescript
// backend/src/nodes/examples/Switch.node.ts
export const SwitchNode: NodeDefinition = {
  type: "switch",
  displayName: "Switch",
  // ...
  properties: [
    {
      displayName: "Outputs",
      name: "outputs",
      type: "collection",
      typeOptions: {
        multipleValues: true,
        multipleValueButtonText: "Add Output",
      },
      // Frontend will render this using RepeatingField
    },
  ],
  execute: async function (inputData) {
    const outputs = this.getNodeParameter("outputs") as any[];

    // Process outputs
    outputs.forEach((output) => {
      // Use output.field, output.condition, output.value
    });
  },
};
```

## 📚 Related Components

- `FormGenerator` - Main form generation component
- `FieldRenderer` - Individual field rendering
- `PropertyField` - Node property field wrapper

## 🐛 Troubleshooting

### Items not updating

Make sure you're passing a new array reference:

```tsx
onChange={(newItems) => setItems([...newItems])}
```

### Drag & drop not working

Ensure `allowReorder={true}` and items aren't disabled

### Validation not showing

Check that errors object matches the structure:

```tsx
{
  [itemId]: {
    [fieldName]: 'Error message'
  }
}
```

## 📄 Files

- **Component**: `frontend/src/components/ui/form-generator/RepeatingField.tsx`
- **Types**: `frontend/src/components/ui/form-generator/types.ts`
- **Examples**: `frontend/src/components/ui/form-generator/examples/RepeatingFieldExample.tsx`
- **Backend Example**: `backend/src/nodes/examples/Switch.node.ts`

## ✅ Summary

The `RepeatingField` component provides a complete solution for dynamic form sections with:

- Easy integration
- Flexible configuration
- Rich features (drag & drop, duplicate, collapse)
- Validation support
- Custom rendering options

Perfect for building nodes like Switch, HTTP Request, API integrations, and any scenario requiring repeated form groups!
