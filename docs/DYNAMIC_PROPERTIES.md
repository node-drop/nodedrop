# Dynamic Properties in Custom Nodes

This document explains the new feature that allows node properties to be defined as **functions** (templates) instead of static arrays, enabling dynamic property generation based on context or other factors.

## Overview

Previously, node properties were defined as static arrays:

```typescript
properties: [
  {
    displayName: "Field Name",
    name: "fieldName",
    type: "string",
    // ... other properties
  },
];
```

Now, properties can also be defined as a **function** that returns an array of properties:

```typescript
properties: function(): NodeProperty[] {
  // Dynamic logic here
  return [
    {
      displayName: "Field Name",
      name: "fieldName",
      type: "string",
      // ... other properties
    }
  ];
}
```

## Benefits

1. **Dynamic Generation**: Properties can be generated based on runtime context, user permissions, available resources, etc.
2. **Conditional Properties**: Easily add or remove properties based on conditions
3. **Reusable Logic**: Property generation logic can include loops, conditions, and helper functions
4. **Maintainability**: Complex property structures can be broken down into manageable parts

## Type Definition Changes

### Updated NodeDefinition Interface

```typescript
export interface NodeDefinition {
  // ... other properties
  properties: NodeProperty[] | (() => NodeProperty[]); // Now accepts both static and dynamic
  // ... other properties
}
```

### New NodePropertyOption Interface

```typescript
export interface NodePropertyOption {
  name: string;
  value: any;
  description?: string; // Now supports descriptions on options
}

export interface NodeProperty {
  // ... other properties
  options?: NodePropertyOption[]; // Updated to use the new interface
  // ... other properties
}
```

## Example Implementation

See `backend/src/nodes/examples/DynamicProperties.node.ts` for a complete working example:

```typescript
export const DynamicPropertiesNode: NodeDefinition = {
  type: "dynamic-properties-example",
  displayName: "Dynamic Properties Example",
  // ... other node configuration

  properties: function (): NodeProperty[] {
    const baseProperties: NodeProperty[] = [
      {
        displayName: "Operation Type",
        name: "operationType",
        type: "options",
        required: true,
        default: "transform",
        options: [
          {
            name: "Transform",
            value: "transform",
            description: "Transform the data",
          },
          { name: "Filter", value: "filter", description: "Filter the data" },
          {
            name: "Aggregate",
            value: "aggregate",
            description: "Aggregate data",
          },
        ],
      },
    ];

    // Build properties dynamically based on operation type
    const transformProperties: NodeProperty[] = [
      {
        displayName: "Field Name",
        name: "fieldName",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: { operationType: ["transform"] },
        },
      },
      // ... more transform properties
    ];

    const filterProperties: NodeProperty[] = [
      // ... filter properties
    ];

    const aggregateProperties: NodeProperty[] = [
      // ... aggregate properties
    ];

    // Combine all properties
    return [
      ...baseProperties,
      ...transformProperties,
      ...filterProperties,
      ...aggregateProperties,
    ];
  },

  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    // ... execution logic
  },
};
```

## Use Cases

### 1. Organization-Specific Properties

```typescript
properties: function(): NodeProperty[] {
  const userOrg = this.getCredentials('organizationId');

  if (userOrg === 'enterprise') {
    return [
      // ... enterprise properties
    ];
  } else {
    return [
      // ... standard properties
    ];
  }
}
```

### 2. Resource-Based Properties

```typescript
properties: function(): NodeProperty[] {
  const availableAPIs = this.getAvailableAPIs();

  return [
    {
      displayName: "API Selection",
      name: "apiSelect",
      type: "options",
      options: availableAPIs.map(api => ({
        name: api.name,
        value: api.id,
        description: api.description
      }))
    }
  ];
}
```

### 3. Conditional Property Sets

```typescript
properties: function(): NodeProperty[] {
  const baseProps = [...];
  const advancedProps = [...];

  // Only include advanced properties if feature flag is enabled
  if (this.featureFlags.advancedMode) {
    return [...baseProps, ...advancedProps];
  }

  return baseProps;
}
```

## Backend Changes

### NodeService Updates

The `NodeService` class now includes a helper method to resolve properties:

```typescript
private resolveProperties(
  properties: NodeProperty[] | (() => NodeProperty[])
): NodeProperty[] {
  if (typeof properties === "function") {
    return properties();
  }
  return properties;
}
```

This method is called in:

- `registerNode()` - Before saving to database
- `getNodeSchema()` - When retrieving node schema
- `getNodeTypes()` - When listing all node types
- `validateNodeDefinition()` - When validating node definitions

### Database Storage

When a node is registered:

1. If properties is a function, it's executed to get the resolved properties array
2. The resolved array is stored in the database
3. The original node definition (with the function) remains in the in-memory registry

This ensures:

- Database always contains concrete properties
- Runtime can regenerate properties dynamically
- Backward compatibility with existing nodes

## Frontend Compatibility

The frontend automatically works with dynamic properties because:

1. The `getNodeSchema()` API always returns resolved properties
2. The frontend receives `NodeProperty[]` arrays as always
3. No frontend changes are required

## Migration Guide

### Converting Static Properties to Dynamic

Before:

```typescript
properties: [
  { displayName: "Name", name: "name", type: "string" },
  { displayName: "Value", name: "value", type: "number" },
];
```

After:

```typescript
properties: function(): NodeProperty[] {
  return [
    { displayName: "Name", name: "name", type: "string" },
    { displayName: "Value", name: "value", type: "number" }
  ];
}
```

### Best Practices

1. **Keep it Simple**: Only use dynamic properties when truly needed
2. **Performance**: Avoid expensive operations in the properties function
3. **Deterministic**: Properties function should return consistent results for the same context
4. **Documentation**: Document what conditions affect property generation
5. **Testing**: Test all possible property combinations

## Testing

To test a node with dynamic properties:

```typescript
describe("DynamicPropertiesNode", () => {
  it("should generate properties correctly", () => {
    const node = DynamicPropertiesNode;

    // Resolve properties
    const properties =
      typeof node.properties === "function"
        ? node.properties()
        : node.properties;

    expect(properties).toHaveLength(expectedLength);
    expect(properties[0].name).toBe("expectedName");
  });
});
```

## Backwards Compatibility

- ✅ Existing nodes with static properties continue to work without changes
- ✅ Mixed usage: Some nodes can use static, others dynamic
- ✅ Database schema unchanged
- ✅ Frontend API unchanged
- ✅ Existing workflows unaffected

## Future Enhancements

Potential future improvements:

1. Context-aware property generation (pass execution context)
2. Async property generation (for fetching from external sources)
3. Property caching and invalidation strategies
4. Property versioning for A/B testing

## Summary

The dynamic properties feature provides:

- **Flexibility**: Generate properties based on any logic
- **Simplicity**: Clean function-based API
- **Compatibility**: Works with all existing code
- **Power**: Enable complex, conditional node configurations

This enhancement makes custom nodes more powerful while maintaining backward compatibility and ease of use.
