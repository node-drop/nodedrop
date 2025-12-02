# FormGenerator

A powerful, extensible form generator built with React and shadcn/ui components. Supports conditional field visibility, validation, and custom field types.

## Features

- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🎨 **shadcn/ui Integration**: Uses all shadcn/ui form components for consistent styling
- 🔄 **Conditional Logic**: Show/hide fields based on other field values
- ✅ **Built-in Validation**: Comprehensive validation with custom rules support
- 🧩 **Extensible**: Easy to add custom field types and components
- 📱 **Responsive**: Mobile-friendly design
- ♿ **Accessible**: ARIA-compliant form components

## Supported Field Types

- `string` - Text input with expression/variable support (for workflow nodes)
- `text` - Simple text input (for credentials and basic forms)
- `number` - Number input with min/max validation
- `boolean` - Checkbox input
- `switch` - Toggle switch
- `options` - Single select dropdown
- `multiOptions` - Multiple checkbox selection
- `textarea` - Multi-line text input with expression support
- `password` - Password input with visibility toggle
- `email` - Email input with validation
- `url` - URL input with validation
- `json` - JSON editor with syntax validation
- `dateTime` - Date and time picker
- `credential` - Credential selector
- `autocomplete` - Autocomplete dropdown with search
- `collection` - Nested repeating fields
- `custom` - Custom component integration

## Basic Usage

```tsx
import { FormGenerator, createField } from "@/components/ui/form-generator";

const fields = [
  createField({
    name: "username",
    displayName: "Username",
    type: "string",
    required: true,
    placeholder: "Enter username",
  }),
  createField({
    name: "email",
    displayName: "Email",
    type: "email",
    required: true,
  }),
];

function MyForm() {
  const [values, setValues] = useState({});

  return (
    <FormGenerator
      fields={fields}
      values={values}
      onChange={(name, value) =>
        setValues((prev) => ({ ...prev, [name]: value }))
      }
    />
  );
}
```

## Advanced Features

### Conditional Field Visibility

Fields can be shown or hidden based on other field values:

```tsx
createField({
  name: "notificationEmail",
  displayName: "Notification Email",
  type: "email",
  displayOptions: {
    show: { enableNotifications: [true] }, // Show when enableNotifications is true
    hide: { userType: ["guest"] }, // Hide when userType is 'guest'
  },
});
```

### Field Validation

Built-in validation rules with custom validation support:

```tsx
createField({
  name: "age",
  displayName: "Age",
  type: "number",
  required: true,
  validation: {
    min: 18,
    max: 100,
    custom: (value) => {
      if (value < 21) return "Must be 21 or older";
      return null;
    },
  },
});
```

### Custom Field Types

Create custom field components:

```tsx
function CustomSlider({ value, onChange, field }) {
  return (
    <div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
      <span>{value}</span>
    </div>
  );
}

const field = createField({
  name: "rating",
  displayName: "Rating",
  type: "custom",
  customComponent: CustomSlider,
});
```

## API Reference

### FormGeneratorProps

| Prop                    | Type                                 | Required | Description                   |
| ----------------------- | ------------------------------------ | -------- | ----------------------------- |
| `fields`                | `FormFieldConfig[]`                  | ✅       | Array of field configurations |
| `values`                | `Record<string, any>`                | ✅       | Current form values           |
| `onChange`              | `(name: string, value: any) => void` | ✅       | Value change handler          |
| `errors`                | `Record<string, string>`             | ❌       | External validation errors    |
| `onFieldBlur`           | `(name: string, value: any) => void` | ❌       | Field blur handler            |
| `disabled`              | `boolean`                            | ❌       | Disable all fields            |
| `className`             | `string`                             | ❌       | Container CSS class           |
| `fieldClassName`        | `string`                             | ❌       | Field container CSS class     |
| `showRequiredIndicator` | `boolean`                            | ❌       | Show required field indicator |
| `requiredIndicator`     | `ReactNode`                          | ❌       | Custom required indicator     |

### FormFieldConfig

| Property          | Type                     | Description                  |
| ----------------- | ------------------------ | ---------------------------- |
| `name`            | `string`                 | Unique field identifier      |
| `displayName`     | `string`                 | Field label                  |
| `type`            | `FieldType`              | Field input type             |
| `required`        | `boolean`                | Is field required            |
| `default`         | `any`                    | Default value                |
| `description`     | `string`                 | Help text                    |
| `placeholder`     | `string`                 | Input placeholder            |
| `options`         | `FormFieldOption[]`      | Options for select fields    |
| `displayOptions`  | `FieldVisibilityOptions` | Conditional visibility rules |
| `validation`      | `FieldValidation`        | Validation rules             |
| `disabled`        | `boolean`                | Is field disabled            |
| `readonly`        | `boolean`                | Is field read-only           |
| `customComponent` | `ComponentType`          | Custom field component       |

## Utility Functions

### createField(config)

Creates a field configuration with defaults applied.

### createOptions(options)

Helper to create option arrays for select fields.

### createDisplayOptions(options)

Helper to create conditional display rules.

### createValidation(rules)

Helper to create validation rule objects.

## Integration with Node Configuration

The FormGenerator integrates seamlessly with the existing node configuration system through the `PropertyField` component:

```tsx
<PropertyField
  property={nodeProperty}
  value={currentValue}
  parameters={allParameters}
  nodeTypeProperties={nodeType.properties}
  validationErrors={errors}
  onChange={handleChange}
/>
```

## Examples

See `examples/FormGeneratorExample.tsx` for a comprehensive example demonstrating all features.

## Migration Guide

### From Custom Form Fields

If you're migrating from custom form field components:

1. Replace individual field components with `FormGenerator`
2. Convert field definitions to `FormFieldConfig` format
3. Update validation logic to use the built-in validation system
4. Replace custom conditional logic with `displayOptions`

### Field Type Mapping

| Old Type            | New Type       | Notes                      |
| ------------------- | -------------- | -------------------------- |
| Custom text input   | `string`       | Direct replacement         |
| Custom number input | `number`       | Includes validation        |
| Custom checkbox     | `boolean`      | Consistent styling         |
| Custom select       | `options`      | Enhanced with descriptions |
| Custom multi-select | `multiOptions` | Checkbox-based selection   |
| Custom JSON editor  | `json`         | Built-in syntax validation |

## Best Practices

1. **Field Naming**: Use descriptive, kebab-case field names
2. **Validation**: Prefer built-in validation over custom rules when possible
3. **Conditional Logic**: Keep display conditions simple and predictable
4. **Custom Components**: Follow the `CustomFieldProps` interface
5. **Performance**: Use `onFieldBlur` for expensive validations
6. **Accessibility**: Provide meaningful descriptions for complex fields

## Performance

The FormGenerator is optimized for performance:

- Only visible fields are rendered
- Validation runs only when necessary
- Field dependencies are tracked efficiently
- Re-renders are minimized through careful state management
