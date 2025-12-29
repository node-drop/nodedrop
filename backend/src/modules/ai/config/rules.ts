export const AI_CONNECTION_RULES = [
    // Trigger Node Rules
    "**Trigger Nodes FIRST**: Nodes like 'manual-trigger', 'webhook', 'cron', 'schedule', 'chat' MUST be the FIRST node in any workflow. Never place them in the middle or end.",
    
    // Response Node Rules  
    "**Response Nodes LAST**: Nodes like 'http-response', 'api-response' MUST be the LAST node in webhook-triggered workflows. They send data back to the caller.",
    
    // AI Agent Service Node Rules
    "**Model Nodes → ai-agent ONLY**: Nodes like 'openai-model', 'anthropic-model' connect ONLY to ai-agent's 'modelService' input. They output 'modelService', not 'main'.",
    "**Memory Nodes → ai-agent ONLY**: Nodes like 'buffer-memory', 'window-memory' connect ONLY to ai-agent's 'memoryService' input. They output 'memoryService', not 'main'.",
    "**Tool Nodes → ai-agent ONLY**: Nodes ending in '-tool' (e.g., 'slack-tool', 'http-request-tool', 'calculator-tool') connect ONLY to ai-agent's 'toolService' input. They output 'toolService', not 'main'.",
    "**Agent Configuration**: When using 'ai-agent', you MUST connect: 1) A model node (required), 2) A memory node (recommended), 3) Tool nodes (optional, based on user needs).",
    
    // Data Flow Rules
    "**Delay Node Placement**: 'delay' node goes BETWEEN action nodes for rate limiting or waiting. Never as first node. Common pattern: http-request → delay → http-request.",
    "**Transform Before Use**: If data needs reshaping, use 'code' or 'transform' node between the source and destination nodes.",
    "**Loop Node**: 'loop' node iterates over arrays. Connect data source → loop → action inside loop.",
    
    // Standalone vs Agent Pattern
    "**Standalone Services**: Regular action nodes (e.g., 'slack', 'gmail', 'http-request') connect via 'main' output to 'main' input in sequence.",
    "**Agent-Tool Pattern**: If user wants AI to decide when to use a service, use the '-tool' variant connected to ai-agent's toolService.",
    
    // Type Compatibility
    "**Type Compatibility**: Service outputs (modelService, memoryService, toolService) connect ONLY to matching service inputs. 'main' outputs connect to 'main' inputs.",
];

export const AI_GENERATION_CONSTRAINTS = [
    "Do not hallucinate parameters that are not in the provided schema.",
    "Prefer simple, linear flows unless parallel processing is explicitly requested.",
    "**Expression Syntax**: When referencing data from previous nodes, ALWAYS prefix with '=' (e.g., '={{message}}', '={{data.id}}', '={{response.body}}'). Never use '{{variable}}' without the '=' prefix.",
    "**Node Naming**: Use descriptive IDs like 'trigger_1', 'delay_1', 'http_request_1' - not generic names.",
    "**Minimal Nodes**: Use the fewest nodes necessary. Don't add unnecessary transforms or delays unless requested.",
];

// Node connection recommendations - used by AIContextBuilder
export const NODE_CONNECTION_PATTERNS = {
    // Trigger nodes - must be first
    triggers: ['manual-trigger', 'webhook', 'cron', 'schedule', 'chat', 'form-trigger'],
    
    // Response nodes - must be last (in webhook flows)
    responses: ['http-response', 'api-response'],
    
    // Service nodes that connect to ai-agent service inputs (not main)
    agentServices: {
        model: ['openai-model', 'anthropic-model', 'ollama-model'],
        memory: ['buffer-memory', 'window-memory', 'redis-memory', 'postgres-memory'],
        tools: ['http-request-tool', 'calculator-tool', 'slack-tool', 'gmail-tool', 'code-tool', 'knowledge-base-tool']
    },
    
    // Common workflow patterns
    patterns: [
        { name: 'api-with-delay', sequence: ['trigger', 'http-request', 'delay', 'http-request'] },
        { name: 'webhook-response', sequence: ['webhook', 'action...', 'http-response'] },
        { name: 'ai-agent-basic', sequence: ['trigger', 'ai-agent + model + memory'] },
        { name: 'ai-agent-with-tools', sequence: ['trigger', 'ai-agent + model + memory + tools'] },
    ]
};
