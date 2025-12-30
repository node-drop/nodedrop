/**
 * Node Schema Builder
 * 
 * Generates compact, AI-friendly documentation about node structure,
 * connections, and configuration patterns.
 */

// Schema constants are defined in nodeSchema.ts and used for reference
// The buildNodeSchemaReference function generates inline documentation

/**
 * Builds a compact schema reference for the AI prompt
 * This replaces the need for individual node examples
 */
export function buildNodeSchemaReference(): string {
  return `
## NODE SCHEMA REFERENCE

### CONNECTION TYPES
| Type | Source Output | Target Input | Usage |
|------|---------------|--------------|-------|
| Main | main | main | Standard data flow |
| Model | modelService | modelService | LLM → ai-agent |
| Memory | memoryService | memoryService | Memory → ai-agent |
| Tool | toolService | toolService | Tool → ai-agent (multiple allowed) |
| Branch | output0, output1... | main | Switch/IfElse routing |

### NODE ROLES & PLACEMENT
| Role | Position | Connection Rule |
|------|----------|-----------------|
| trigger | FIRST | Outputs main only |
| response | LAST | Receives main only |
| agent | MIDDLE | Main + service inputs |
| model-service | BELOW agent | modelService → agent |
| memory-service | BELOW agent | memoryService → agent |
| tool-service | BELOW agent | toolService → agent |
| branching | MIDDLE | Multiple outputs |
| action | MIDDLE | main → main |

### EXPRESSION SYNTAX
Format: \`={{expression}}\` (MUST start with =)

| Pattern | Example | Use Case |
|---------|---------|----------|
| Field access | \`={{fieldName}}\` | Current item data |
| Nested field | \`={{user.email}}\` | Nested object |
| Node reference | \`={{$node["Name"].json.field}}\` | Specific node output |
| Date/Time | \`={{$today}}\`, \`={{DateTime.now().toISO()}}\` | Timestamps |
| Conditional | \`={{status === "active" ? "Yes" : "No"}}\` | Ternary |

### PARAMETER TYPES
| Type | Format | Expression Support |
|------|--------|-------------------|
| string | "value" or ={{expr}} | Yes |
| number | 42 or ={{expr}} | Yes |
| boolean | true/false | Yes |
| options | Exact value from "o" array | No |
| json | Valid JSON object | Yes (in values) |
| conditionRow | {key, expression, value} | key=fieldName (no expr) |

### CONDITION OPERATORS (for IfElse/Switch)
equal, notEqual, larger, largerEqual, smaller, smallerEqual, contains, notContains, startsWith, endsWith, isEmpty, isNotEmpty, regex

### CONDITION KEY RULE
The "key" in conditions is the FIELD NAME from incoming data (NOT an expression):
✓ Correct: {"key": "status", "expression": "equal", "value": "active"}
✗ Wrong: {"key": "={{status}}", "expression": "equal", "value": "active"}

### COMPLEX NODE PARAMETER PATTERNS

### COMPLEX NODE PARAMETER PATTERNS

**⚠️ CRITICAL: Use EXACT property names shown below!**

**Switch Node (rules mode):**
\`\`\`json
{
  "mode": "rules",
  "outputsCount": 2,
  "rules": [
    {"condition": {"key": "status", "expression": "equal", "value": "pending"}},
    {"condition": {"key": "status", "expression": "equal", "value": "completed"}}
  ]
}
\`\`\`
- ⚠️ Use "condition" (SINGULAR), NOT "conditions"
- Each rule = one output (Rule 0 → output0, Rule 1 → output1)
- "key" is the field name from input data (e.g., "status", "type", "value")
- "expression" is the operator (equal, notEqual, contains, etc.)
- "value" is what to compare against
- "outputsCount" MUST equal number of rules

**IfElse Node (simple mode):**
\`\`\`json
{
  "mode": "simple",
  "condition": {"key": "isActive", "expression": "equal", "value": "true"}
}
\`\`\`

**IfElse Node (combine mode):**
\`\`\`json
{
  "mode": "combine",
  "combineOperation": "AND",
  "conditions": [
    {"condition": {"key": "status", "expression": "equal", "value": "active"}},
    {"condition": {"key": "role", "expression": "equal", "value": "admin"}}
  ]
}
\`\`\`

**Set Node:**
\`\`\`json
{
  "includeInputData": true,
  "values": [
    {"keyValue": {"key": "fieldName", "value": "fieldValue"}},
    {"keyValue": {"key": "status", "value": "active"}}
  ]
}
\`\`\`
- ⚠️ Use "keyValue" with "key"/"value", NOT "name"/"value"

### WORKFLOW PATTERNS

**Linear Flow:**
trigger → action → action (all main connections)

**AI Agent Pattern:**
\`\`\`
trigger ──main──> ai-agent ──main──> next
                    ↑
    model ─modelService─┘
    memory ─memoryService─┘
    tool ─toolService─┘
\`\`\`
Position: agent at y=0, services at y=150

**Branching (IfElse):**
\`\`\`
trigger → ifElse ─true──> path_a
                 └false─> path_b
\`\`\`

**Branching (Switch):**
\`\`\`
trigger → switch ─output0─> path_a
                 ├output1─> path_b
                 └output2─> path_c
\`\`\`

### NODE ID FORMAT
Use: {type}_{number} (e.g., trigger_1, http_request_1, ai_agent_1)

### POSITIONING
- Sequential: x += 300
- Service nodes: y += 150 below parent
- Branches: y offset ±100

### DATA FLOW
- Data flows automatically through main connections
- Each item is {json: {...data}}
- Access with ={{fieldName}} (shorthand for json.fieldName)
- Service connections provide capabilities, NOT data
`.trim();
}

/**
 * Generates connection guidance based on node roles
 */
export function getConnectionGuidance(sourceRole: string, targetRole: string): string {
  const guidance: Record<string, Record<string, string>> = {
    'trigger': {
      'action': 'main → main',
      'agent': 'main → main',
      'branching': 'main → main',
      'response': 'main → main (only if no processing needed)'
    },
    'action': {
      'action': 'main → main',
      'agent': 'main → main',
      'branching': 'main → main',
      'response': 'main → main'
    },
    'model-service': {
      'agent': 'modelService → modelService'
    },
    'memory-service': {
      'agent': 'memoryService → memoryService'
    },
    'tool-service': {
      'agent': 'toolService → toolService'
    },
    'agent': {
      'action': 'main → main',
      'response': 'main → main',
      'branching': 'main → main'
    },
    'branching': {
      'action': 'output{N} → main (where N is branch index)',
      'response': 'output{N} → main'
    }
  };

  return guidance[sourceRole]?.[targetRole] || 'main → main';
}

/**
 * Validates a proposed connection between nodes
 */
export function validateConnection(
  sourceNode: { role?: string; outputs: string[] },
  targetNode: { role?: string; inputs: string[]; serviceInputs?: string[] },
  sourceOutput: string,
  targetInput: string
): { valid: boolean; reason?: string } {
  // Service connections validation
  if (sourceOutput === 'modelService') {
    if (targetInput !== 'modelService') {
      return { valid: false, reason: 'modelService output must connect to modelService input' };
    }
    return { valid: true };
  }
  
  if (sourceOutput === 'memoryService') {
    if (targetInput !== 'memoryService') {
      return { valid: false, reason: 'memoryService output must connect to memoryService input' };
    }
    return { valid: true };
  }
  
  if (sourceOutput === 'toolService') {
    if (targetInput !== 'toolService') {
      return { valid: false, reason: 'toolService output must connect to toolService input' };
    }
    return { valid: true };
  }

  // Trigger must be first
  if (sourceNode.role === 'trigger' && targetNode.role === 'trigger') {
    return { valid: false, reason: 'Cannot connect trigger to trigger' };
  }

  // Response must be last
  if (sourceNode.role === 'response') {
    return { valid: false, reason: 'Response node cannot have outgoing connections' };
  }

  // Service nodes can only connect to agents
  if (['model-service', 'memory-service', 'tool-service'].includes(sourceNode.role || '')) {
    if (targetNode.role !== 'agent') {
      return { valid: false, reason: `${sourceNode.role} can only connect to ai-agent` };
    }
  }

  return { valid: true };
}

/**
 * Suggests the next logical node based on current workflow state
 */
export function suggestNextNode(
  currentNodes: Array<{ type: string; role?: string }>,
  userIntent?: string
): string[] {
  const suggestions: string[] = [];
  const hasAgent = currentNodes.some(n => n.role === 'agent');
  const hasTrigger = currentNodes.some(n => n.role === 'trigger');
  const hasModel = currentNodes.some(n => n.role === 'model-service');
  const hasMemory = currentNodes.some(n => n.role === 'memory-service');

  // If no trigger, suggest one
  if (!hasTrigger) {
    suggestions.push('manual-trigger', 'webhook', 'chat');
  }

  // If has agent but no model, MUST add model
  if (hasAgent && !hasModel) {
    suggestions.push('openai-model', 'anthropic-model');
  }

  // If has agent but no memory, recommend memory
  if (hasAgent && !hasMemory) {
    suggestions.push('buffer-memory', 'window-memory');
  }

  // General suggestions based on intent
  if (userIntent?.toLowerCase().includes('api') || userIntent?.toLowerCase().includes('http')) {
    suggestions.push('http-request');
  }
  if (userIntent?.toLowerCase().includes('condition') || userIntent?.toLowerCase().includes('if')) {
    suggestions.push('ifElse', 'switch');
  }
  if (userIntent?.toLowerCase().includes('transform') || userIntent?.toLowerCase().includes('modify')) {
    suggestions.push('set', 'code');
  }

  return [...new Set(suggestions)]; // Remove duplicates
}
