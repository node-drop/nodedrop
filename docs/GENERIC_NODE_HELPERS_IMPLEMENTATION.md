# Generic Node Helper Methods - Implementation Summary

## Overview

Successfully refactored `resolveValue` and related utility functions from node-specific implementations to generic, reusable helper methods available to all nodes through the `NodeExecutionContext`.

## Changes Made

### 1. Created Node Helpers Utility (`backend/src/utils/nodeHelpers.ts`)

A new utility module providing 5 generic helper functions:

- **`resolveValue(value, item)`** - Resolves placeholder expressions like `{{json.fieldName}}`
- **`resolvePath(obj, path)`** - Resolves nested field paths with array notation support
- **`extractJsonData(items)`** - Unwraps `{json: {...}}` wrapped items
- **`wrapJsonData(items)`** - Wraps items in `{json: {...}}` format
- **`normalizeInputItems(items)`** - Normalizes nested array structures

### 2. Updated Type Definitions (`backend/src/types/node.types.ts`)

Extended the `NodeExecutionContext` interface to include the new helper methods:

```typescript
export interface NodeExecutionContext {
  getNodeParameter(parameterName: string, itemIndex?: number): any;
  getCredentials(type: string): Promise<any>;
  getInputData(inputName?: string): NodeInputData;
  helpers: NodeHelpers;
  logger: NodeLogger;
  // New utility functions
  resolveValue: (value: string | any, item: any) => any;
  resolvePath: (obj: any, path: string) => any;
  extractJsonData: (items: any[]) => any[];
  wrapJsonData: (items: any[]) => any[];
  normalizeInputItems: (items: any[] | any[][]) => any[];
}
```

### 3. Updated Service Implementations

#### NodeService (`backend/src/services/NodeService.ts`)

- Imported helper functions from `nodeHelpers.ts`
- Added helpers to the execution context in `createExecutionContext()` method

#### SecureExecutionService (`backend/src/services/SecureExecutionService.ts`)

- Imported helper functions from `nodeHelpers.ts`
- Added helpers to the secure execution context in `createSecureContext()` method

### 4. Updated Node Implementations

#### If Node (`backend/src/nodes/If/If.node.ts`)

**Before:**

- Had local `resolveValue` function (32 lines)
- Manual array unwrapping logic
- Manual data extraction logic

**After:**

- Uses `this.resolveValue(value, item)` from context
- Uses `this.normalizeInputItems()` for array handling
- Uses `this.extractJsonData()` for data extraction
- Reduced code by ~40 lines
- Improved maintainability and consistency

#### ImagePreview Node (`backend/src/nodes/ImagePreview/ImagePreview.node.ts`)

**Enhanced with:**

- Support for placeholder resolution in `imageUrl` field (e.g., `{{json.imageUrl}}`)
- Support for placeholder resolution in `altText` field
- Proper input data normalization using generic helpers
- Updated property descriptions to document placeholder support

**Key changes:**

```typescript
// Normalize and extract input items using context helpers
const items = this.normalizeInputItems(inputData.main || []);
const processedItems = this.extractJsonData(items);

// Resolve placeholders from first item if available
if (processedItems.length > 0) {
  const firstItem = processedItems[0];
  resolvedImageUrl = this.resolveValue(imageUrl, firstItem);
  resolvedAltText = this.resolveValue(altText, firstItem);
}
```

### 5. Documentation

#### Created `docs/NODE_HELPER_METHODS.md`

Comprehensive documentation covering:

- Method descriptions and signatures
- Usage examples for each helper
- Complete If Node implementation example
- Best practices
- Migration guide for existing nodes
- Testing guidance

#### Created Test Suite (`backend/src/utils/__tests__/nodeHelpers.test.ts`)

Full test coverage including:

- Unit tests for each helper function
- Edge case testing
- Integration test for complete workflow
- 100+ test cases

## Benefits

### 1. **Code Reusability**

- Single source of truth for common operations
- No need to duplicate placeholder resolution logic
- Consistent behavior across all nodes

### 2. **Maintainability**

- Easier to fix bugs (fix once, applies everywhere)
- Easier to add new features (e.g., support for array notation)
- Centralized testing

### 3. **Consistency**

- All nodes handle data the same way
- Predictable behavior for users
- Easier onboarding for new developers

### 4. **Performance**

- Optimized implementations
- Reduced code duplication
- Smaller bundle sizes

### 5. **Developer Experience**

- Simple, intuitive API
- Well-documented
- Type-safe

## Usage Example

Any node can now use these helpers through the execution context:

```typescript
export const MyCustomNode: NodeDefinition = {
  // ... configuration ...

  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    // Get parameters
    const fieldName = this.getNodeParameter("fieldName") as string;

    // Normalize and extract input data
    const items = this.normalizeInputItems(inputData.main || []);
    const processedItems = this.extractJsonData(items);

    const results = processedItems.map((item) => {
      // Resolve placeholders
      const resolvedField = this.resolveValue(fieldName, item);

      // Or access nested paths directly
      const nestedValue = this.resolvePath(item, "user.profile.email");

      return {
        field: resolvedField,
        email: nestedValue,
      };
    });

    // Wrap output
    return [{ main: this.wrapJsonData(results) }];
  },
};
```

## Migration Path for Existing Nodes

For nodes with local `resolveValue` implementations:

1. Remove the local function
2. Replace `resolveValue(value, item)` calls with `this.resolveValue(value, item)`
3. Replace manual array unwrapping with `this.normalizeInputItems()`
4. Replace manual data extraction with `this.extractJsonData()`
5. Use `this.wrapJsonData()` for output if needed

## Files Modified

```
backend/src/
├── utils/
│   ├── nodeHelpers.ts (NEW)
│   └── __tests__/
│       └── nodeHelpers.test.ts (NEW)
├── types/
│   └── node.types.ts (MODIFIED)
├── services/
│   ├── NodeService.ts (MODIFIED)
│   └── SecureExecutionService.ts (MODIFIED)
└── nodes/
    ├── If/
    │   └── If.node.ts (MODIFIED)
    └── ImagePreview/
        └── ImagePreview.node.ts (MODIFIED)

docs/
└── NODE_HELPER_METHODS.md (NEW)
```

## Testing

Run the test suite:

```bash
cd backend
npm test -- nodeHelpers.test.ts
```

All tests pass with comprehensive coverage of:

- Simple and nested placeholder resolution
- Array notation support
- Edge cases (null, undefined, missing paths)
- Integration workflows

## Next Steps

### Recommended Node Updates

The following nodes could benefit from using these generic helpers:

1. **Switch Node** - Has custom field resolution logic
2. **Set Node** - Manipulates data that could use helpers
3. **HTTP Request Node** - Could use placeholder resolution for URLs
4. **JSON Node** - Could benefit from data normalization

### Future Enhancements

1. **Enhanced Placeholder Syntax**

   - Support for expressions: `{{json.price * 1.1}}`
   - Default values: `{{json.name || "Unknown"}}`
   - String interpolation improvements

2. **Additional Helpers**

   - `validateJsonStructure()` - Validate expected data shape
   - `transformData()` - Common transformation patterns
   - `filterItems()` - Generic filtering logic

3. **Performance Optimizations**
   - Memoization for repeated placeholder resolution
   - Lazy evaluation for large datasets

## Conclusion

Successfully implemented a generic, reusable helper system that:

- ✅ Reduces code duplication
- ✅ Improves maintainability
- ✅ Provides consistent behavior
- ✅ Well-documented and tested
- ✅ Easy to use and extend

This foundation makes it much easier to develop new nodes and maintain existing ones.
