# Node Helper Methods

This document explains the generic helper methods available to all nodes through the `NodeExecutionContext`.

## Overview

All node implementations have access to a set of utility functions through the `this` context during execution. These helpers provide common functionality for data manipulation and processing.

## Available Methods

### 1. `resolveValue(value: string | any, item: any): any`

Resolves placeholder expressions in a value string using data from an item.

**Purpose:** Replace template syntax like `{{json.fieldName}}` with actual values from the item data.

**Usage:**

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  const fieldValue = this.getNodeParameter('fieldValue') as string;
  const items = this.extractJsonData(inputData.main || []);

  for (const item of items) {
    // Resolve placeholder in the field value
    const resolvedValue = this.resolveValue(fieldValue, item);
    console.log(resolvedValue); // Actual value from item
  }
}
```

**Examples:**

```typescript
const item = { name: "John", address: { city: "NYC" } };

this.resolveValue("Hello {{json.name}}", item);
// Returns: "Hello John"

this.resolveValue("City: {{json.address.city}}", item);
// Returns: "City: NYC"

this.resolveValue("Static text", item);
// Returns: "Static text" (no placeholders)
```

### 2. `resolvePath(obj: any, path: string): any`

Resolves a nested field path in an object.

**Purpose:** Extract values from deeply nested objects using dot notation.

**Usage:**

```typescript
const data = {
  user: {
    profile: {
      name: "Alice",
      settings: { theme: "dark" },
    },
  },
};

const name = this.resolvePath(data, "user.profile.name");
// Returns: "Alice"

const theme = this.resolvePath(data, "user.profile.settings.theme");
// Returns: "dark"
```

**Array Support:**

```typescript
const data = { items: [{ id: 1 }, { id: 2 }] };

const firstId = this.resolvePath(data, "items[0].id");
// Returns: 1
```

### 3. `extractJsonData(items: any[]): any[]`

Extracts the actual data from items that may be wrapped in `{json: {...}}` format.

**Purpose:** Unwrap items to access the actual data objects.

**Usage:**

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  const rawItems = inputData.main || [];

  // Extract the actual data objects
  const items = this.extractJsonData(rawItems);

  // Now work with clean data objects
  items.forEach(item => {
    console.log(item.id); // Direct access to properties
  });
}
```

**Example:**

```typescript
const wrapped = [
  { json: { id: 1, name: "Item 1" } },
  { json: { id: 2, name: "Item 2" } },
];

const unwrapped = this.extractJsonData(wrapped);
// Returns: [
//   { id: 1, name: "Item 1" },
//   { id: 2, name: "Item 2" }
// ]
```

### 4. `wrapJsonData(items: any[]): any[]`

Wraps data items in the standard `{json: {...}}` format expected by the workflow engine.

**Purpose:** Prepare output data in the correct format for downstream nodes.

**Usage:**

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  const processedData = [
    { id: 1, result: "success" },
    { id: 2, result: "success" }
  ];

  // Wrap data for output
  const wrappedItems = this.wrapJsonData(processedData);

  return [{ main: wrappedItems }];
}
```

### 5. `normalizeInputItems(items: any[] | any[][]): any[]`

Normalizes input data by unwrapping nested arrays if needed.

**Purpose:** Handle different input structures consistently.

**Usage:**

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  // Normalize input (handles both [] and [[]] structures)
  const items = this.normalizeInputItems(inputData.main || []);

  // Extract data objects
  const processedItems = this.extractJsonData(items);

  // Process items...
}
```

**Example:**

```typescript
// Handles nested array structure
const nested = [[{ json: { id: 1 } }]];
this.normalizeInputItems(nested);
// Returns: [{ json: { id: 1 } }]

// Handles flat array structure
const flat = [{ json: { id: 1 } }];
this.normalizeInputItems(flat);
// Returns: [{ json: { id: 1 } }]
```

## Complete Example: IF Node

Here's how the IF node uses these helper methods:

```typescript
export const IfNode: NodeDefinition = {
  // ... node configuration ...

  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    const value1 = this.getNodeParameter("value1") as string;
    const operation = this.getNodeParameter("operation") as string;
    const value2 = this.getNodeParameter("value2") as string;

    // Step 1: Normalize and extract input items using context helpers
    let items = this.normalizeInputItems(inputData.main || []);
    const processedItems = this.extractJsonData(items);

    const trueItems: any[] = [];
    const falseItems: any[] = [];

    // Step 2: Process each item
    for (const item of processedItems) {
      if (!item || typeof item !== "object") {
        continue;
      }

      // Step 3: Resolve placeholders using the generic method
      const resolvedValue1 = this.resolveValue(value1, item);
      const resolvedValue2 = this.resolveValue(value2, item);

      // Step 4: Evaluate condition
      const conditionResult = evaluateCondition(
        resolvedValue1,
        operation,
        resolvedValue2
      );

      // Step 5: Wrap and route items
      const wrappedItem = { json: item };
      if (conditionResult) {
        trueItems.push(wrappedItem);
      } else {
        falseItems.push(wrappedItem);
      }
    }

    // Step 6: Return outputs
    return [{ true: trueItems }, { false: falseItems }];
  },
};
```

## Best Practices

1. **Always normalize input data first:**

   ```typescript
   const items = this.normalizeInputItems(inputData.main || []);
   const processedItems = this.extractJsonData(items);
   ```

2. **Use `resolveValue` for user-provided field references:**

   ```typescript
   const fieldValue = this.getNodeParameter("field") as string;
   const resolved = this.resolveValue(fieldValue, item);
   ```

3. **Use `resolvePath` for direct programmatic access:**

   ```typescript
   const value = this.resolvePath(item, "user.profile.email");
   ```

4. **Always wrap output data:**
   ```typescript
   const wrappedItem = { json: processedItem };
   outputItems.push(wrappedItem);
   ```

## Implementation Location

These helper methods are implemented in:

- **Source:** `backend/src/utils/nodeHelpers.ts`
- **Type Definition:** `backend/src/types/node.types.ts` (NodeExecutionContext interface)
- **Injection:** `backend/src/services/NodeService.ts` and `backend/src/services/SecureExecutionService.ts`

## Testing

When writing tests for nodes, make sure to mock these helper methods:

```typescript
const mockContext = {
  getNodeParameter: jest.fn(),
  resolveValue: jest.fn((value, item) => {
    // Mock implementation
    return value.replace(/\{\{json\.(\w+)\}\}/, (_, key) => item[key]);
  }),
  extractJsonData: jest.fn((items) => items.map((i) => i.json || i)),
  normalizeInputItems: jest.fn((items) => items),
  // ... other methods
};
```

## Migration Guide

If you have existing nodes with local `resolveValue` implementations:

1. Remove the local function
2. Replace calls to `resolveValue(...)` with `this.resolveValue(...)`
3. Use `this.normalizeInputItems()` and `this.extractJsonData()` instead of manual unwrapping

**Before:**

```typescript
const resolveValue = (value: string, item: any): any => {
  // local implementation...
};

const resolved = resolveValue(fieldValue, item);
```

**After:**

```typescript
// Remove local function, use context method
const resolved = this.resolveValue(fieldValue, item);
```
