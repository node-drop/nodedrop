# Switch Node

Route data to different outputs based on rules or expressions. Perfect for conditional workflows, status-based routing, and multi-path processing.

## 📋 Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Modes](#modes)
- [Quick Start](#quick-start)
- [Complete Examples](#complete-examples)
- [Configuration](#configuration)
- [Supported Operations](#supported-operations)
- [Tips & Best Practices](#tips--best-practices)

---

## Overview

The Switch node evaluates incoming data and routes each item to a specific output based on conditions. Think of it as a traffic controller for your workflow data.

### Key Features

- ✅ **Dynamic Outputs** - Outputs created automatically based on rules
- ✅ **Two Modes** - Rules mode or Expression mode
- ✅ **13 Operations** - Equal, contains, regex, and more
- ✅ **Nested Fields** - Access deep object properties
- ✅ **Visual Labels** - Output labels show condition values
- ✅ **First Match Wins** - Items route to first matching rule

### When to Use

- Route orders by status (pending, completed, cancelled)
- Categorize users by subscription level
- Priority-based task routing
- A/B testing splits
- Error vs success path routing
- Multi-tenant data routing

---

## How It Works

```
Input Items → Evaluate Rules → Route to Outputs
```

### Flow Diagram

```
┌─────────────────┐
│   Input Data    │
│  [item1, item2] │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Switch Node    │
│                 │
│  Rule 1: status │
│    = "pending"  │──→ Output 0: [item1]
│                 │
│  Rule 2: status │
│    = "done"     │──→ Output 1: [item2]
│                 │
└─────────────────┘
```

### Key Concepts

1. **Rule = Output**: Each rule creates one output
2. **First Match Wins**: Item routes to first matching rule
3. **One Condition Per Rule**: Simple and clear
4. **Unmatched Items**: Discarded (not routed anywhere)

---

## Modes

### Rules Mode (Default)

Define rules with conditions. Each rule creates one output.

**Best for:**
- String comparisons
- Multiple conditions
- Readable configuration

**Example:**
```
Rule 1: status equals "pending" → Output 0
Rule 2: status equals "completed" → Output 1
Rule 3: status equals "cancelled" → Output 2
```

### Expression Mode

Use an expression that returns the output index.

**Best for:**
- Numeric routing values
- Simple field-based routing
- Data already has output indices

**Example:**
```
Expression: priority
Data: {priority: 0} → Output 0
Data: {priority: 1} → Output 1
Data: {priority: 2} → Output 2
```

---

## Quick Start

### 1. Basic Status Routing

**Workflow:**
```
Manual Trigger → JSON Node → Switch Node
```

**JSON Node:**
```json
[
  {"id": 1, "status": "pending"},
  {"id": 2, "status": "completed"}
]
```

**Switch Node:**
- Rule 1: `status` equals `pending`
- Rule 2: `status` equals `completed`

**Result:**
- Output 0: Item with status "pending"
- Output 1: Item with status "completed"

### 2. Priority Routing (Expression Mode)

**JSON Node:**
```json
[
  {"task": "Fix bug", "priority": 0},
  {"task": "Update docs", "priority": 2}
]
```

**Switch Node:**
- Mode: Expression
- Number of Outputs: 3
- Expression: `priority`

**Result:**
- Output 0: High priority task
- Output 1: (empty)
- Output 2: Low priority task

---

## Complete Examples

### Example 1: Order Processing

**Scenario:** Route orders to different processing paths

**JSON Data:**
```json
[
  {
    "orderId": "ORD-001",
    "customer": "Alice",
    "status": "pending",
    "amount": 150
  },
  {
    "orderId": "ORD-002",
    "customer": "Bob",
    "status": "completed",
    "amount": 200
  },
  {
    "orderId": "ORD-003",
    "customer": "Charlie",
    "status": "cancelled",
    "amount": 300
  }
]
```

**Switch Configuration:**

Mode: Rules

**Rule 1:**
- Field: `status`
- Operation: Equal
- Value: `pending`

**Rule 2:**
- Field: `status`
- Operation: Equal
- Value: `completed`

**Rule 3:**
- Field: `status`
- Operation: Equal
- Value: `cancelled`

**Workflow:**
```
JSON Node
    ↓
Switch Node
    ├─ Output 0 (pending) → Process Payment Node
    ├─ Output 1 (completed) → Send Confirmation Email
    └─ Output 2 (cancelled) → Issue Refund
```

**Output 0 (pending):**
```json
[{"orderId": "ORD-001", "customer": "Alice", "status": "pending", "amount": 150}]
```

**Output 1 (completed):**
```json
[{"orderId": "ORD-002", "customer": "Bob", "status": "completed", "amount": 200}]
```

**Output 2 (cancelled):**
```json
[{"orderId": "ORD-003", "customer": "Charlie", "status": "cancelled", "amount": 300}]
```

---

### Example 2: User Subscription Tiers

**Scenario:** Route users based on subscription level

**JSON Data:**
```json
[
  {
    "userId": "U-001",
    "name": "Alice",
    "subscription": {
      "tier": "premium",
      "active": true
    }
  },
  {
    "userId": "U-002",
    "name": "Bob",
    "subscription": {
      "tier": "basic",
      "active": true
    }
  },
  {
    "userId": "U-003",
    "name": "Charlie",
    "subscription": {
      "tier": "free",
      "active": true
    }
  }
]
```

**Switch Configuration:**

**Rule 1:**
- Field: `subscription.tier` (nested field!)
- Operation: Equal
- Value: `premium`

**Rule 2:**
- Field: `subscription.tier`
- Operation: Equal
- Value: `basic`

**Rule 3:**
- Field: `subscription.tier`
- Operation: Equal
- Value: `free`

**Workflow:**
```
JSON Node
    ↓
Switch Node
    ├─ Output 0 (premium) → Premium Features
    ├─ Output 1 (basic) → Basic Features
    └─ Output 2 (free) → Limited Features
```

---

### Example 3: Amount-Based Routing

**Scenario:** Route transactions by amount range

**JSON Data:**
```json
[
  {"id": "TX-001", "amount": 50},
  {"id": "TX-002", "amount": 500},
  {"id": "TX-003", "amount": 1500}
]
```

**Switch Configuration:**

**Rule 1:**
- Field: `amount`
- Operation: Smaller
- Value: `100`

**Rule 2:**
- Field: `amount`
- Operation: Smaller
- Value: `1000`

**Rule 3:**
- Field: `amount`
- Operation: Larger Equal
- Value: `1000`

**Result:**
- Output 0: Small transactions (< $100)
- Output 1: Medium transactions ($100-$999)
- Output 2: Large transactions (>= $1000)

**Note:** Rule order matters! Smaller amounts are checked first.

---

### Example 4: Email Filtering

**Scenario:** Route emails by subject keywords

**JSON Data:**
```json
[
  {
    "emailId": "E-001",
    "subject": "URGENT: Server down",
    "from": "alerts@company.com"
  },
  {
    "emailId": "E-002",
    "subject": "Weekly report",
    "from": "reports@company.com"
  },
  {
    "emailId": "E-003",
    "subject": "URGENT: Payment failed",
    "from": "billing@company.com"
  }
]
```

**Switch Configuration:**

**Rule 1:**
- Field: `subject`
- Operation: Contains
- Value: `URGENT`

**Rule 2:**
- Field: `subject`
- Operation: Contains
- Value: `report`

**Result:**
- Output 0: Urgent emails (2 items)
- Output 1: Reports (1 item)
- Discarded: Other emails

---

### Example 5: Priority Queue (Expression Mode)

**Scenario:** Route tasks by priority number

**JSON Data:**
```json
[
  {"taskId": "T-001", "title": "Fix critical bug", "priority": 0},
  {"taskId": "T-002", "title": "Update docs", "priority": 2},
  {"taskId": "T-003", "title": "Review PR", "priority": 1}
]
```

**Switch Configuration:**

- Mode: Expression
- Number of Outputs: 3
- Expression: `priority`

**Result:**
- Output 0: Critical tasks
- Output 1: High priority tasks
- Output 2: Medium priority tasks

**Workflow:**
```
JSON Node
    ↓
Switch Node (Expression: priority)
    ├─ Output 0 → Immediate Action
    ├─ Output 1 → Same Day
    └─ Output 2 → This Week
```

---

## Configuration

### Rules Mode

**Properties:**

1. **Rules** (Collection)
   - Each rule has one condition
   - Rule position = Output index
   - Rule 1 → Output 0, Rule 2 → Output 1, etc.

2. **Condition** (per rule)
   - **Field**: Field name to evaluate (e.g., `status`, `user.email`)
   - **Operation**: Comparison operation (see below)
   - **Value**: Value to compare against

### Expression Mode

**Properties:**

1. **Number of Outputs**: How many outputs to create (2-10)
2. **Output Expression**: Expression that returns output index
   - Direct field: `priority`
   - Template: `{{json.priority}}`
   - Nested: `{{json.user.level}}`

---

## Supported Operations

### Equality

- **Equal**: Exact match
  - Example: `status` equals `"active"`
  
- **Not Equal**: Not equal to value
  - Example: `status` not equals `"deleted"`

### Numeric Comparisons

- **Larger**: Greater than
  - Example: `age` larger `18`
  
- **Larger Equal**: Greater than or equal
  - Example: `score` larger equal `100`
  
- **Smaller**: Less than
  - Example: `price` smaller `50`
  
- **Smaller Equal**: Less than or equal
  - Example: `quantity` smaller equal `10`

### String Operations

- **Contains**: String contains substring
  - Example: `email` contains `"@gmail.com"`
  
- **Not Contains**: String doesn't contain substring
  - Example: `title` not contains `"draft"`
  
- **Starts With**: String starts with value
  - Example: `orderId` starts with `"ORD-"`
  
- **Ends With**: String ends with value
  - Example: `filename` ends with `".pdf"`

### Empty Checks

- **Is Empty**: Field is empty or whitespace
  - Example: `description` is empty
  
- **Is Not Empty**: Field has content
  - Example: `email` is not empty

### Pattern Matching

- **Regex**: Matches regular expression
  - Example: `email` regex `^[^@]+@[^@]+\.[^@]+$`

---

## Tips & Best Practices

### 1. Rule Order Matters

Place more specific rules first:

```
✅ Good:
  Rule 1: amount > 1000
  Rule 2: amount > 100
  Rule 3: amount > 0

❌ Bad:
  Rule 1: amount > 0  (catches everything!)
  Rule 2: amount > 100
  Rule 3: amount > 1000
```

### 2. Use Nested Fields

Access deep properties with dot notation:

```
user.profile.email
order.shipping.address.city
config.settings.notifications.enabled
```

### 3. Test with Sample Data

Use JSON node to create test data before connecting real sources.

### 4. Check Output Labels

Output labels on the canvas show condition values, making routing clear.

### 5. Handle Unmatched Items

Remember: unmatched items are discarded. If you need a "catch-all", add a rule with a broad condition:

```
Rule 1: status equals "active"
Rule 2: status equals "pending"
Rule 3: status is not empty  (catch-all)
```

### 6. Use Expression Mode for Numeric Routing

If your data already has numeric routing values, use Expression mode:

```
Data: {routeTo: 0}
Expression: routeTo
Result: Routes to Output 0
```

### 7. Debug with Logs

Check execution logs to see:
- Which items matched which rules
- Field values being evaluated
- Items that were discarded

### 8. Keep It Simple

One condition per rule = easy to understand. For complex logic, use multiple rules or pre-process with Set node.

---

## Common Patterns

### Pattern 1: Status-Based Workflow

```
Data Source → Switch (by status) → Different handlers
```

Use for: Orders, tickets, tasks, approvals

### Pattern 2: Priority Queue

```
Data Source → Switch (by priority) → Urgent/Normal/Low queues
```

Use for: Tasks, support tickets, alerts

### Pattern 3: A/B Testing

```
Users → Switch (by testGroup) → Version A / Version B
```

Use for: Feature testing, experiments

### Pattern 4: Error Handling

```
API Response → Switch (by error field) → Success / Error paths
```

Use for: API integrations, data validation

### Pattern 5: Multi-Tenant Routing

```
Requests → Switch (by tenantId) → Tenant-specific processing
```

Use for: SaaS applications, multi-customer systems

### Pattern 6: Geographic Routing

```
Users → Switch (by country) → Region-specific processing
```

Use for: Localization, compliance, regional features

---

## Troubleshooting

### Items Not Routing Correctly

**Problem:** Items going to wrong output or being discarded

**Solutions:**
1. Check field names match exactly (case-sensitive)
2. Verify field exists in your data
3. Check rule order (first match wins)
4. Look at execution logs for details

### All Items Discarded

**Problem:** No items routing to any output

**Solutions:**
1. Verify condition values match your data
2. Check for typos in field names
3. Ensure data type matches (string vs number)
4. Add debug logging to see field values

### Wrong Data Type

**Problem:** Numeric comparison not working

**Solutions:**
1. Ensure values are numbers, not strings
2. Use Set node to convert types if needed
3. Check if field contains expected data type

### Expression Not Working

**Problem:** Expression mode not routing correctly

**Solutions:**
1. Verify expression returns a number
2. Check output index is within range (0 to outputsCount-1)
3. Use template syntax: `{{json.fieldName}}`
4. Check execution logs for expression evaluation

---

## Advanced Usage

### Combining with Other Nodes

**Pre-processing:**
```
HTTP Request → Set Node (compute routing field) → Switch
```

**Post-processing:**
```
Switch → Multiple paths → Merge Node
```

**Conditional Routing:**
```
If/Else → Switch (on true branch) → Multiple handlers
```

### Dynamic Field Names

Use template expressions in field names:

```
Field: {{json.routingField}}
```

### Complex Conditions

For AND logic, use Set node to create computed field:

```
Set Node:
  isEligible = (age >= 18 && status === "active")

Switch Node:
  Rule: isEligible equals true
```

---

## Performance Considerations

- **Rule Evaluation**: O(n × m) where n = items, m = rules
- **Early Exit**: Stops at first matching rule (efficient)
- **Large Datasets**: Consider batching with Split node first
- **Many Rules**: Keep under 10 rules for best performance

---

## Comparison with Other Nodes

### Switch vs If/Else

| Feature | Switch | If/Else |
|---------|--------|---------|
| Outputs | 2-10 (dynamic) | 2 (fixed) |
| Rules | Multiple | Single or grouped |
| Use Case | Multi-path routing | Binary decisions |

**Use Switch when:** You need more than 2 outputs

**Use If/Else when:** Simple true/false routing

### Switch vs Split

| Feature | Switch | Split |
|---------|--------|-------|
| Logic | Condition-based | Batch/field-based |
| Routing | By rules | By structure |
| Use Case | Conditional routing | Data splitting |

**Use Switch when:** Routing based on field values

**Use Split when:** Dividing data into batches or groups

---



## Summary

The Switch node is your go-to tool for conditional routing in workflows:

✅ **Simple**: One condition per rule
✅ **Flexible**: Rules or Expression mode
✅ **Visual**: Output labels show routing logic
✅ **Powerful**: 13 operations, nested fields, regex support

Start with Rules mode for most use cases, switch to Expression mode when you have numeric routing values in your data.

Happy routing! 🎯
