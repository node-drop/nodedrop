# Aggregate Node

Combine multiple items into one. Use for summarizing data, calculating totals, or grouping items.

## Modes

### Combine All
Collects all input items into a single array.

```json
{"mode": "combineAll", "includeItems": true}
```

**Input:**
```json
[{"name": "Alice"}, {"name": "Bob"}, {"name": "Carol"}]
```

**Output:**
```json
{"items": [{"name": "Alice"}, {"name": "Bob"}, {"name": "Carol"}], "count": 3}
```

---

### Summarize (Numeric)
Calculate sum, average, min, max on a numeric field.

```json
{"mode": "summarize", "aggregateField": "amount", "outputFieldName": "stats"}
```

**Input:**
```json
[{"amount": 100}, {"amount": 250}, {"amount": 150}]
```

**Output:**
```json
{
  "stats": {"sum": 500, "avg": 166.67, "min": 100, "max": 250, "count": 3},
  "field": "amount",
  "totalItems": 3,
  "validValues": 3
}
```

---

### Concatenate (Text)
Join text values from a field with a separator.

```json
{"mode": "concatenate", "aggregateField": "name", "separator": ", "}
```

**Input:**
```json
[{"name": "Alice"}, {"name": "Bob"}, {"name": "Carol"}]
```

**Output:**
```json
{"result": "Alice, Bob, Carol", "field": "name", "count": 3}
```

---

### Group By
Group items by a field value. Outputs one item per group.

```json
{"mode": "groupBy", "groupByField": "department", "includeItems": true}
```

**Input:**
```json
[
  {"name": "Alice", "department": "Sales"},
  {"name": "Bob", "department": "Engineering"},
  {"name": "Carol", "department": "Sales"}
]
```

**Output (2 items):**
```json
[
  {"department": "Sales", "count": 2, "items": [{"name": "Alice", ...}, {"name": "Carol", ...}]},
  {"department": "Engineering", "count": 1, "items": [{"name": "Bob", ...}]}
]
```

---

### First Item
Keep only the first item.

```json
{"mode": "first"}
```

---

### Last Item
Keep only the last item.

```json
{"mode": "last"}
```

---

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mode | options | Yes | Aggregation mode |
| aggregateField | string | For summarize/concatenate | Field to aggregate (supports dot notation) |
| outputFieldName | string | No | Name for output field (default: "result") |
| separator | string | For concatenate | Separator between values (default: ", ") |
| groupByField | string | For groupBy | Field to group items by |
| includeItems | boolean | No | Include original items in output |

## Use Cases

1. **Email Digest**: Collect all emails → Aggregate (Combine All) → Send single summary
2. **Sales Report**: Get orders → Aggregate (Summarize: amount) → Total revenue
3. **Category Counts**: Get products → Aggregate (Group By: category) → Count per category
4. **Build CSV**: Get records → Aggregate (Concatenate: id, separator: ",") → ID list

## Test Workflow

```
ManualTrigger → Code (generate data) → Aggregate → DataPreview
```

**Code node to generate test data:**
```javascript
return [
  {json: {name: "Alice", department: "Sales", amount: 100}},
  {json: {name: "Bob", department: "Engineering", amount: 250}},
  {json: {name: "Carol", department: "Sales", amount: 150}},
  {json: {name: "Dave", department: "Engineering", amount: 300}}
];
```
