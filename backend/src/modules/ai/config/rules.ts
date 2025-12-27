export const AI_CONNECTION_RULES = [
    "**Tool/Service Usage**: Service nodes that function as tools (e.g., 'gmail', 'slack', 'google-sheets') should primarily be connected to output of 'ai-agent' nodes when used to empower the agent.",
    "**Agent-Tool Pattern**: If the user intent is to give an agent capabilities, connect the tool node to the agent's 'tools' input or sequence it after the agent.",
    "**Standalone Services**: If a service node is used as a standalone trigger or action (without an AI agent), standard logic applies (e.g., Cron -> Gmail).",
    "**Type Compatibility**: Respect the 'types' of inputs and outputs. Do not connect mismatched types (e.g. string to object) unless a transformer is used.",
    "**Agent Configuration**: When using an 'ai-agent' node, you MUST connect a 'model' node (e.g., 'openai-chat') and a 'memory' node (e.g., 'buffer-window-memory') to its respective inputs. Connect 'tools' only if the user request requires external capabilities.",
];

export const AI_GENERATION_CONSTRAINTS = [
    "Do not hallucinate parameters that are not in the provided schema.",
    "Prefer simple, linear flows unless parallel processing is explicitly requested.",
];
