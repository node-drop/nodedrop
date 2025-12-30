// Connection rules - these are now mostly covered by nodeSchema.ts
// Keeping only the most critical reminders that aren't in the schema reference
export const AI_CONNECTION_RULES = [
    "**Delay Node**: Goes BETWEEN action nodes for rate limiting. Pattern: http-request → delay → http-request.",
    "**Transform Before Use**: If data needs reshaping, use 'code' or 'set' node between source and destination.",
    "**Standalone vs Agent-Tool**: Regular nodes (slack, gmail) use main→main. For AI-controlled services, use '-tool' variant with ai-agent.",
];

export const AI_GENERATION_CONSTRAINTS = [
    "Do not hallucinate parameters not in the schema.",
    "Prefer simple, linear flows unless parallel processing is explicitly requested.",
    "Use the fewest nodes necessary. Don't add unnecessary transforms or delays.",
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
