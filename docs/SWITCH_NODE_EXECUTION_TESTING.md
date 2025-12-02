# Switch Node Execution Testing Guide

## What Was Fixed

The Switch node's execute function now properly routes data to multiple outputs based on your configured conditions.

### Changes Made

1. **Output Format**: Returns array of outputs where each index matches an output configuration
2. **Empty Check**: Handles case when no outputs are configured
3. **Routing Logic**: Routes items to outputs based on index (0, 1, 2, etc.)

## How to Test

### Step 1: Configure Switch Node

Add outputs with conditions. For example:

**Output 1: "High Priority"**

- Field: `priority`
- Condition: `Greater Than`
- Value: `5`

**Output 2: "Medium Priority"**

- Field: `priority`
- Condition: `Greater Than`
- Value: `2`

**Output 3: "Low Priority"**

- Field: `priority`
- Condition: `Less or Equal`
- Value: `2`

### Step 2: Provide Test Data

Input data example:

```json
[
  { "priority": 8, "task": "Critical bug" },
  { "priority": 4, "task": "Feature request" },
  { "priority": 1, "task": "Documentation" },
  { "priority": 7, "task": "Performance issue" }
]
```

### Step 3: Expected Output

**Output 1 (High Priority)** - Items where priority > 5:

```json
[
  { "priority": 8, "task": "Critical bug" },
  { "priority": 7, "task": "Performance issue" }
]
```

**Output 2 (Medium Priority)** - Items where priority > 2:

```json
[{ "priority": 4, "task": "Feature request" }]
```

**Output 3 (Low Priority)** - Items where priority <= 2:

```json
[{ "priority": 1, "task": "Documentation" }]
```

## Execution Output Format

You should now see:

```json
{
  "success": true,
  "outputs": [
    {
      "main": [
        { "json": { "priority": 8, "task": "Critical bug" } },
        { "json": { "priority": 7, "task": "Performance issue" } }
      ]
    },
    {
      "main": [{ "json": { "priority": 4, "task": "Feature request" } }]
    },
    {
      "main": [{ "json": { "priority": 1, "task": "Documentation" } }]
    }
  ]
}
```

## Routing Rules

1. **First Match Wins**: Each item is routed to the FIRST output that matches
2. **Evaluation Order**: Outputs are evaluated in the order you configured them
3. **Fallback**: If no condition matches, item goes to last output (if fallback enabled)
4. **Empty Outputs**: Outputs with no matching items will have empty array

## Conditions Available

- **Equals**: Exact match
- **Not Equals**: Not equal to value
- **Contains**: String contains value
- **Does Not Contain**: String doesn't contain value
- **Starts With**: String starts with value
- **Ends With**: String ends with value
- **Greater Than**: Number comparison >
- **Less Than**: Number comparison <
- **Greater or Equal**: Number comparison >=
- **Less or Equal**: Number comparison <=
- **Is Empty**: Field is empty/null
- **Is Not Empty**: Field has value
- **Regex Match**: Regular expression match

## Example Workflow

```
Manual Trigger → Switch → [Multiple outputs]
                    ↓
                    ├─→ High Priority → Send Email
                    ├─→ Medium Priority → Create Ticket
                    └─→ Low Priority → Log Only
```

## Testing Different Scenarios

### Scenario 1: Status-based routing

```
Field: status
Conditions:
- Output 1: status equals "success" → Route to success handler
- Output 2: status equals "error" → Route to error handler
- Output 3: status equals "pending" → Route to pending handler
```

### Scenario 2: Range-based routing

```
Field: amount
Conditions:
- Output 1: amount greater than 1000 → Large orders
- Output 2: amount greater than 100 → Medium orders
- Output 3: amount less or equal 100 → Small orders
```

### Scenario 3: String matching

```
Field: email
Conditions:
- Output 1: email ends with "@company.com" → Internal
- Output 2: email contains "@" → External
```

## Debugging Tips

1. **Check Configuration**: Verify outputs are configured correctly
2. **Test Field Names**: Make sure field names match your input data
3. **Check Data Types**: Number comparisons need numeric values
4. **Order Matters**: Outputs are checked in order, first match wins
5. **Fallback Setting**: Check your fallback output setting

## Common Issues

### Issue: Empty outputs

- **Cause**: Field name doesn't match input data
- **Fix**: Check field names are exactly as in your data

### Issue: All items go to one output

- **Cause**: First condition matches everything
- **Fix**: Reorder outputs to check more specific conditions first

### Issue: Items getting dropped

- **Cause**: Fallback set to "None" and no conditions match
- **Fix**: Set fallback to "Last Output" or adjust conditions

---

**Status:** ✅ Ready to Test

Try executing the Switch node with test data and you should see items properly routed to different outputs! 🚀
