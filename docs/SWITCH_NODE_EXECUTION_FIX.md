# ✅ Switch Node Execution Fixed - With Comprehensive Logging

## What Was Fixed

1. **Output Format**: Changed from `{ main: items }` to `{ outputName: items }` to match IF node pattern
2. **Comprehensive Logging**: Added detailed console logs like IF node for debugging
3. **Type Fix**: Changed routedOutputs from `Record<string, any[]>` to `Record<number, any[]>`

## Changes Made

### Output Format (Following IF Node Pattern)

**Before:**

```typescript
result.push({
  main: routedOutputs[i] || [],
});
```

**After:**

```typescript
const outputName = outputs[i].outputName || `output${i}`;
result.push({
  [outputName]: outputItems, // Use output name as key
});
```

### Added Comprehensive Logging

Now you'll see in the backend console:

```
=== SWITCH NODE EXECUTION START ===
inputData: {...}
Raw items: [...]
Processed items: [...]
Mode: rules
Outputs configuration: [...]

Evaluating item 0: {...}
  Checking output 0 (Success): field="status", condition="equals", value="success"
  Item field value: "success"
  ✓ MATCH! Routing to output 0

Evaluating item 1: {...}
  Checking output 0 (Success): field="status", condition="equals", value="success"
  Item field value: "error"
  ✗ No match
  Checking output 1 (Error): field="status", condition="equals", value="error"
  Item field value: "error"
  ✓ MATCH! Routing to output 1

Output 0 (Success): 1 items
Output 1 (Error): 1 items
=== SWITCH NODE EXECUTION END ===
```

## Expected Output Format

### Example with 3 outputs:

**Output 1: "Success"**
**Output 2: "Error"**
**Output 3: "Pending"**

**Result:**

```json
[
  {
    "Success": [{ "json": { "status": "success", "id": 1 } }]
  },
  {
    "Error": [{ "json": { "status": "error", "id": 2 } }]
  },
  {
    "Pending": [{ "json": { "status": "pending", "id": 3 } }]
  }
]
```

## How to Debug

1. **Open Backend Console** - Look for the Switch node logs
2. **Check Input Data** - See what data is received
3. **Track Each Item** - See which output each item routes to
4. **Verify Conditions** - See if conditions are matching as expected
5. **Check Final Output** - See what's being returned

## Common Issues & Solutions

### Issue: Empty outputs

**Check logs for:**

- `Raw items: []` → Input is empty
- `Processed items: []` → Data extraction failed
- `No outputs configured` → Need to add outputs in config

### Issue: Wrong routing

**Check logs for:**

- Item field value vs expected value
- Condition type (equals, contains, etc.)
- Match/No match indicators

### Issue: All items discarded

**Check logs for:**

- `Discarding item (fallback is "none")` → Change fallback setting
- No match indicators for all outputs → Check conditions

## Testing Steps

1. **Add Manual Trigger** → Switch Node
2. **Configure Switch** with test outputs:

   - Output Name: "High"
   - Field: "priority"
   - Condition: "Greater Than"
   - Value: "5"

3. **Execute with test data:**

```json
[
  { "priority": 8, "task": "Fix bug" },
  { "priority": 3, "task": "Update docs" }
]
```

4. **Check Backend Console** for logs
5. **Check Execution Output** - should see:

```json
[
  {
    "High": [{ "json": { "priority": 8, "task": "Fix bug" } }]
  }
]
```

## Output Key Names

- Uses `outputName` from configuration
- Falls back to `output0`, `output1`, `output2`, etc.
- Matches IF node pattern: `{ true: items }`, `{ false: items }`

---

**Status:** ✅ Fixed with Comprehensive Logging

Now execute the Switch node and check your backend console for detailed logs! 🚀
