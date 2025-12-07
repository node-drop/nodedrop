# Expression Prefix Convention

## Overview

This project implements the n8n-style `=` prefix convention for distinguishing between fixed values and expressions in workflow parameters.

## How It Works

### Detection Logic

- **Expression Mode**: Values starting with `=` are treated as expressions
- **Fixed Mode**: Values without the `=` prefix are treated as literal strings

### Examples

```json
{
  "name": "=kkkk",           // Expression (starts with =)
  "value": "xxxxxx",         // Fixed value (no = prefix)
  "email": "={{ $json.email }}"  // Expression with {{ }} syntax
}
```

## Implementation Details

### Frontend Components

#### MiniExpressionEditor
- Automatically strips the `=` prefix when displaying values
- Adds the `=` prefix when saving values in expression mode
- Detects expression mode when user types `{{` in fixed mode

#### Full ExpressionEditor
- Strips `=` prefix from `initialValue` for display
- Adds `=` prefix to emitted values when they contain `{{ }}`

#### KeyValueRow
- Strips `=` prefix before passing to MiniExpressionEditor
- Adds `=` prefix when onChange is called with expression values

### Backend Processing

#### JSON Node
The backend JSON node processes the `=` prefix:

```typescript
// Check if key starts with = (expression mode)
if (typeof processedKey === "string" && processedKey.startsWith("=")) {
  // Strip the = and evaluate as expression
  processedKey = processedKey.substring(1);
  // Evaluate the expression here
}
```

## User Experience

1. **Fixed Mode**: User types normal text → saved without `=` prefix
2. **Expression Mode**: User types `{{ }}` → automatically adds `=` prefix
3. **Loading**: Values with `=` prefix → displayed in expression mode
4. **Loading**: Values without `=` → displayed in fixed mode

## Benefits

- **Simple Storage**: No need for separate metadata fields
- **Self-Contained**: The value itself indicates its mode
- **Compatible**: Follows n8n's established convention
- **Minimal**: Single character prefix keeps data compact
