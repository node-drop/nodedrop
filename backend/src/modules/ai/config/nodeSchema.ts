/**
 * Node Schema Skeleton System
 * 
 * This module provides a structured schema definition that helps the AI understand
 * how to configure nodes, connect them properly, and use expressions correctly.
 * Instead of providing examples for each node, we define patterns and rules that
 * apply universally.
 */

// =============================================================================
// CONNECTION TYPES & PATTERNS
// =============================================================================

/**
 * Defines the types of connections between nodes
 */
export const CONNECTION_TYPES = {
  /** Standard data flow connection */
  MAIN: {
    sourceOutput: 'main',
    targetInput: 'main',
    description: 'Standard data flow between nodes',
    dataFlow: 'Items from source node flow to target node'
  },
  /** Model service connection (for AI agents) */
  MODEL_SERVICE: {
    sourceOutput: 'modelService',
    targetInput: 'modelService',
    description: 'Connects LLM model nodes to AI agents',
    providers: ['openai-model', 'anthropic-model', 'ollama-model']
  },
  /** Memory service connection (for AI agents) */
  MEMORY_SERVICE: {
    sourceOutput: 'memoryService',
    targetInput: 'memoryService',
    description: 'Connects memory nodes to AI agents for conversation history',
    providers: ['buffer-memory', 'window-memory', 'redis-memory', 'postgres-memory']
  },
  /** Tool service connection (for AI agents) */
  TOOL_SERVICE: {
    sourceOutput: 'toolService',
    targetInput: 'toolService',
    description: 'Connects tool nodes to AI agents for capabilities',
    providers: ['http-request-tool', 'calculator-tool', 'code-tool', 'knowledge-base-tool'],
    multipleAllowed: true
  },
  /** Branching outputs (for Switch/IfElse) */
  BRANCH: {
    sourceOutputPattern: 'output{N}', // output0, output1, etc.
    targetInput: 'main',
    description: 'Conditional routing to different paths'
  }
} as const;

// =============================================================================
// NODE ROLE DEFINITIONS
// =============================================================================

/**
 * Defines node roles and their placement rules
 */
export const NODE_ROLES = {
  TRIGGER: {
    role: 'trigger',
    position: 'FIRST',
    description: 'Starts workflow execution',
    rules: [
      'Must be the first node in any workflow',
      'Only one trigger per workflow (except sub-workflows)',
      'Outputs to main connection'
    ],
    identifiers: ['manual-trigger', 'webhook', 'cron', 'schedule', 'chat', 'form-trigger', 'workflow-called', 'error-trigger']
  },
  RESPONSE: {
    role: 'response',
    position: 'LAST',
    description: 'Sends response back to caller',
    rules: [
      'Must be the last node in webhook-triggered workflows',
      'Required when webhook expects a response',
      'Receives from main connection'
    ],
    identifiers: ['http-response', 'api-response']
  },
  AGENT: {
    role: 'agent',
    position: 'MIDDLE',
    description: 'AI agent that processes data using LLM',
    rules: [
      'Requires model service connection (REQUIRED)',
      'Recommends memory service connection',
      'Can accept multiple tool service connections',
      'Receives main input, outputs main'
    ],
    identifiers: ['ai-agent']
  },
  MODEL_SERVICE: {
    role: 'model-service',
    position: 'BELOW_AGENT',
    description: 'Provides LLM capability to AI agent',
    rules: [
      'Connects ONLY to ai-agent modelService input',
      'Does NOT connect to main flow',
      'Position below the agent node visually'
    ],
    identifiers: ['openai-model', 'anthropic-model', 'ollama-model']
  },
  MEMORY_SERVICE: {
    role: 'memory-service',
    position: 'BELOW_AGENT',
    description: 'Provides conversation memory to AI agent',
    rules: [
      'Connects ONLY to ai-agent memoryService input',
      'Does NOT connect to main flow',
      'Position below the agent node visually'
    ],
    identifiers: ['buffer-memory', 'window-memory', 'redis-memory']
  },
  TOOL_SERVICE: {
    role: 'tool-service',
    position: 'BELOW_AGENT',
    description: 'Provides tools/capabilities to AI agent',
    rules: [
      'Connects ONLY to ai-agent toolService input',
      'Multiple tools can connect to same agent',
      'Does NOT connect to main flow'
    ],
    identifiers: ['http-request-tool', 'calculator-tool', 'code-tool', 'knowledge-base-tool']
  },
  BRANCHING: {
    role: 'branching',
    position: 'MIDDLE',
    description: 'Routes data to different paths based on conditions',
    rules: [
      'IfElse: outputs "true" and "false"',
      'Switch: outputs "output0", "output1", etc.',
      'Each output can connect to different downstream nodes'
    ],
    identifiers: ['ifElse', 'switch']
  },
  ACTION: {
    role: 'action',
    position: 'MIDDLE',
    description: 'Performs operations on data',
    rules: [
      'Receives main input, outputs main',
      'Can be chained sequentially'
    ],
    identifiers: [] // Most nodes fall into this category
  }
} as const;

// =============================================================================
// EXPRESSION SYNTAX PATTERNS
// =============================================================================

/**
 * Expression patterns for referencing data between nodes
 */
export const EXPRESSION_PATTERNS = {
  /** Basic expression syntax */
  SYNTAX: {
    prefix: '=',
    wrapper: '{{...}}',
    fullFormat: '={{expression}}',
    description: 'All expressions must start with = and wrap dynamic parts in {{}}'
  },
  
  /** Common expression patterns */
  PATTERNS: {
    /** Reference current item's JSON data */
    CURRENT_ITEM: {
      pattern: '={{fieldName}}',
      examples: ['={{message}}', '={{data.id}}', '={{user.email}}'],
      description: 'Access field from current item'
    },
    /** Reference specific node's output */
    NODE_REFERENCE: {
      pattern: '={{$node["Node Name"].json.fieldName}}',
      examples: [
        '={{$node["HTTP Request"].json.body}}',
        '={{$node["Set Data"].json.status}}'
      ],
      description: 'Access specific node output by name'
    },
    /** Reference all items from a node */
    ALL_ITEMS: {
      pattern: '={{$node["Node Name"].json}}',
      description: 'Get entire JSON output from a node'
    },
    /** Current date/time */
    DATETIME: {
      patterns: [
        '={{$today}}',
        '={{DateTime.now().toISO()}}',
        '={{DateTime.now().toISODate()}}',
        '={{DateTime.now().plus({days: 1}).toISO()}}'
      ],
      description: 'Date and time utilities'
    },
    /** Conditional expressions */
    CONDITIONAL: {
      pattern: '={{condition ? valueIfTrue : valueIfFalse}}',
      examples: ['={{status === "active" ? "Yes" : "No"}}'],
      description: 'Ternary conditional expression'
    }
  },

  /** Helper functions available in expressions */
  HELPERS: {
    isExecuted: {
      signature: 'isExecuted(nodeName: string): boolean',
      description: 'Check if a node has been executed'
    },
    hasData: {
      signature: 'hasData(nodeName: string): boolean',
      description: 'Check if a node has output data'
    },
    getNodeData: {
      signature: 'getNodeData(nodeName: string, defaultValue?: any): any',
      description: 'Get node output with optional default'
    }
  }
} as const;

// =============================================================================
// PARAMETER TYPE PATTERNS
// =============================================================================

/**
 * Defines how different parameter types should be configured
 */
export const PARAMETER_PATTERNS = {
  /** Simple types */
  STRING: {
    type: 'string',
    format: '"value"',
    supportsExpressions: true,
    example: { static: '"Hello"', dynamic: '={{message}}' }
  },
  NUMBER: {
    type: 'number',
    format: 'numeric value',
    supportsExpressions: true,
    example: { static: 42, dynamic: '={{count}}' }
  },
  BOOLEAN: {
    type: 'boolean',
    format: 'true | false',
    supportsExpressions: true,
    example: { static: true, dynamic: '={{isActive}}' }
  },
  OPTIONS: {
    type: 'options',
    format: 'One of the allowed values from "o" array',
    supportsExpressions: false,
    rule: 'MUST use exact value from options list'
  },
  
  /** Complex types */
  JSON: {
    type: 'json',
    format: 'Valid JSON object or array',
    supportsExpressions: true,
    example: '{"key": "value", "nested": {"field": "={{data}}"}}',
    rule: 'Can mix static and dynamic values'
  },
  COLLECTION: {
    type: 'collection',
    format: 'Array of objects with specific structure',
    rule: 'Follow the structure shown in node example or paramExamples'
  },
  CONDITION_ROW: {
    type: 'conditionRow',
    format: '{ key: string, expression: operator, value: any }',
    operators: [
      'equal', 'notEqual', 'larger', 'largerEqual', 'smaller', 'smallerEqual',
      'contains', 'notContains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty', 'regex'
    ],
    example: '{ "key": "status", "expression": "equal", "value": "active" }',
    rule: 'The "key" field references incoming data field names directly (not expressions)'
  }
} as const;

// =============================================================================
// WORKFLOW PATTERNS
// =============================================================================

/**
 * Common workflow patterns the AI should recognize and implement
 */
export const WORKFLOW_PATTERNS = {
  LINEAR: {
    name: 'Linear Flow',
    description: 'Simple sequential processing',
    structure: 'trigger → action → action → ...',
    connectionType: 'main → main',
    example: {
      nodes: ['manual-trigger', 'http-request', 'set', 'http-request'],
      connections: 'Each node connects to next via main'
    }
  },
  
  WEBHOOK_RESPONSE: {
    name: 'Webhook with Response',
    description: 'API endpoint that returns data',
    structure: 'webhook → processing → http-response',
    rules: [
      'Must start with webhook trigger',
      'Must end with http-response',
      'Response node sends data back to caller'
    ]
  },
  
  AI_AGENT: {
    name: 'AI Agent Pattern',
    description: 'LLM-powered processing with tools',
    structure: `
      trigger → ai-agent → next-action
                  ↑
         model + memory + tools (service connections)
    `,
    rules: [
      'Model connection is REQUIRED',
      'Memory connection is RECOMMENDED',
      'Tools are OPTIONAL based on needs',
      'Service nodes positioned below agent'
    ],
    positioning: {
      agent: { x: 300, y: 0 },
      model: { x: 200, y: 150 },
      memory: { x: 400, y: 150 },
      tools: { x: 600, y: 150 } // Additional tools at x+200 each
    }
  },
  
  BRANCHING: {
    name: 'Conditional Branching',
    description: 'Route data based on conditions',
    structures: {
      ifElse: {
        outputs: ['true', 'false'],
        description: 'Binary decision (yes/no)'
      },
      switch: {
        outputs: ['output0', 'output1', 'output2', '...'],
        description: 'Multi-path routing based on rules'
      }
    },
    rules: [
      'Each branch output connects to different downstream nodes',
      'Branches can merge back using Merge node',
      'Unmatched items in Switch are discarded unless fallback exists'
    ]
  },
  
  LOOP: {
    name: 'Loop Pattern',
    description: 'Iterate over items',
    structure: `
      trigger → loop ─┬─ (Loop output) → action-in-loop ─┐
                      │                                   │
                      │←──────────────────────────────────┘
                      │
                      └─ (Done output) → after-loop-action
    `,
    rules: [
      'Loop output: processes each item',
      'Done output: executes after all items processed',
      'Actions in loop connect back to loop node'
    ]
  },
  
  PARALLEL: {
    name: 'Parallel Processing',
    description: 'Process multiple paths simultaneously',
    structure: 'trigger → split → [path1, path2, ...] → merge → continue',
    rules: [
      'Split node divides data into parallel paths',
      'Merge node combines results back',
      'Each path processes independently'
    ]
  }
} as const;

// =============================================================================
// NODE CONFIGURATION RULES
// =============================================================================

/**
 * Universal rules for configuring any node
 */
export const CONFIGURATION_RULES = {
  REQUIRED_PARAMS: {
    rule: 'Always set parameters marked with req: true',
    consequence: 'Workflow will fail if required parameters are missing'
  },
  
  OPTIONS_PARAMS: {
    rule: 'For "options" type, use ONLY values from the "o" array',
    consequence: 'Invalid option values will cause errors'
  },
  
  EXPRESSIONS: {
    rule: 'Dynamic values must use ={{expression}} format',
    examples: {
      correct: '={{message}}',
      incorrect: '{{message}}' // Missing = prefix
    }
  },
  
  CONDITION_KEYS: {
    rule: 'In IfElse/Switch conditions, "key" is the field name from incoming data',
    examples: {
      correct: { key: 'status', expression: 'equal', value: 'active' },
      incorrect: { key: '={{status}}', expression: 'equal', value: 'active' }
    },
    description: 'The node automatically checks incoming data - no expression needed for key'
  },
  
  NODE_IDS: {
    rule: 'Use descriptive, unique IDs',
    format: '{nodeType}_{number}',
    examples: ['trigger_1', 'http_request_1', 'set_data_1', 'ai_agent_1']
  },
  
  POSITIONING: {
    rule: 'Space nodes to avoid overlap',
    horizontal: 'x += 300 for each sequential node',
    vertical: 'y += 150 for service nodes below parent',
    branching: 'y offset for parallel branches (e.g., -100, +100)'
  }
} as const;

// =============================================================================
// DATA FLOW UNDERSTANDING
// =============================================================================

/**
 * How data flows between nodes
 */
export const DATA_FLOW = {
  ITEM_STRUCTURE: {
    description: 'Each item in the flow is a JSON object',
    format: '{ json: { ...data }, pairedItem: { item: index } }',
    access: 'Use ={{fieldName}} to access json.fieldName'
  },
  
  AUTOMATIC_FLOW: {
    description: 'Data automatically flows through main connections',
    rule: 'Output of one node becomes input of the next',
    example: 'If Set outputs {status: "active"}, next node receives it automatically'
  },
  
  MULTIPLE_ITEMS: {
    description: 'Nodes can output multiple items',
    behavior: 'Each item is processed by downstream nodes',
    example: 'HTTP Request returning array → each item flows separately'
  },
  
  SERVICE_DATA: {
    description: 'Service connections (model/memory/tool) do NOT carry data',
    rule: 'They provide capabilities, not data flow',
    example: 'Model node provides LLM access, not data'
  }
} as const;

