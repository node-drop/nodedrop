# Node Helper Methods - Quick Reference

## Available in all Node Execution Contexts

### 🔄 Data Normalization & Extraction

```typescript
// Normalize nested arrays: [[items]] → [items]
const items = this.normalizeInputItems(inputData.main || []);

// Extract data: [{json: {...}}] → [{...}]
const data = this.extractJsonData(items);

// Wrap data: [{...}] → [{json: {...}}]
const wrapped = this.wrapJsonData(data);
```

### 🔍 Placeholder Resolution

```typescript
// Resolve {{json.fieldName}} placeholders
const resolved = this.resolveValue("Hello {{json.name}}", item);
// With item = {name: "John"} → "Hello John"

// Supports nested paths
const nested = this.resolveValue("{{json.user.email}}", item);
// With item = {user: {email: "john@example.com"}} → "john@example.com"
```

### 🎯 Direct Path Access

```typescript
// Access nested properties directly
const email = this.resolvePath(item, "user.profile.email");

// Supports array notation
const firstId = this.resolvePath(item, "items[0].id");
```

## Common Pattern: Processing Input Data

```typescript
execute: async function (inputData: NodeInputData): Promise<NodeOutputData[]> {
  // 1. Get parameters
  const fieldName = this.getNodeParameter("fieldName") as string;

  // 2. Normalize & extract
  const items = this.normalizeInputItems(inputData.main || []);
  const processedItems = this.extractJsonData(items);

  // 3. Process each item
  const results = processedItems.map(item => {
    const resolved = this.resolveValue(fieldName, item);
    return { result: resolved };
  });

  // 4. Return wrapped output
  return [{ main: this.wrapJsonData(results) }];
}
```

## Example: IF Node Implementation

```typescript
// Get parameters
const value1 = this.getNodeParameter("value1") as string;
const value2 = this.getNodeParameter("value2") as string;

// Normalize and extract
const items = this.normalizeInputItems(inputData.main || []);
const processedItems = this.extractJsonData(items);

// Process
for (const item of processedItems) {
  // Resolve placeholders
  const resolvedValue1 = this.resolveValue(value1, item);
  const resolvedValue2 = this.resolveValue(value2, item);

  // Your logic here...
}
```

## Example: ImagePreview Node Implementation

```typescript
// Get parameters
const imageUrl = this.getNodeParameter("imageUrl") as string;

// Normalize and extract
const items = this.normalizeInputItems(inputData.main || []);
const processedItems = this.extractJsonData(items);

// Resolve from first item if available
let resolvedImageUrl = imageUrl;
if (processedItems.length > 0) {
  resolvedImageUrl = this.resolveValue(imageUrl, processedItems[0]);
}

// Use resolvedImageUrl...
```

## Property Descriptions

When adding placeholder support to node properties:

```typescript
{
  displayName: "Field Name",
  name: "fieldName",
  type: "string",
  description: "Field to process. Use {{json.fieldName}} to reference input data.",
}
```

## Migration from Local Implementation

**Before:**

```typescript
// Local function
const resolveValue = (value: string, item: any): any => {
  // 30+ lines of code...
};

// Manual unwrapping
let items = inputData.main || [];
if (items.length === 1 && Array.isArray(items[0])) {
  items = items[0];
}
const processedItems = items.map((item) => item?.json || item);

// Usage
const resolved = resolveValue(value, item);
```

**After:**

```typescript
// Use context helpers
const items = this.normalizeInputItems(inputData.main || []);
const processedItems = this.extractJsonData(items);
const resolved = this.resolveValue(value, item);
```

## Testing

Mock the helpers in tests:

```typescript
const mockContext = {
  getNodeParameter: jest.fn(),
  resolveValue: jest.fn((val, item) =>
    val.replace(/\{\{json\.(\w+)\}\}/, (_, k) => item[k])
  ),
  extractJsonData: jest.fn((items) => items.map((i) => i.json || i)),
  normalizeInputItems: jest.fn((items) => items),
  wrapJsonData: jest.fn((items) => items.map((i) => ({ json: i }))),
  resolvePath: jest.fn((obj, path) => {
    const keys = path.split(".");
    return keys.reduce((acc, key) => acc?.[key], obj);
  }),
};
```

## Full Documentation

See `docs/NODE_HELPER_METHODS.md` for complete documentation with detailed examples.
