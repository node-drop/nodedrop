import { ChatCompletionTool } from "openai/resources/chat/completions";

export const AI_TOOLS: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "build_workflow",
            description: "Constructs, modifies, or completely replaces the automation workflow based on user specifications. ONLY use this when the user EXPLICITLY asks to create, build, add nodes, change, or fix the workflow structure. Do NOT use for questions, explanations, or advice - use advise_user instead.",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "A description of what changes were made to the workflow."
                    },
                    workflow: {
                        type: "object",
                        description: "The full valid Node-Drop workflow JSON object.",
                        properties: {
                            nodes: {
                                type: "array",
                                items: { 
                                    type: "object",
                                    description: "Node definition",
                                    properties: {
                                        id: { type: "string" },
                                        type: { type: "string" },
                                        name: { type: "string" },
                                        parameters: { type: "object" },
                                        disabled: { type: "boolean", description: "Whether the node is disabled (default: false)" },
                                        position: { 
                                            type: "object",
                                            properties: { x: { type: "number" }, y: { type: "number" } }
                                        }
                                    },
                                    required: ["id", "type", "name", "parameters", "position"]
                                }
                            },
                            connections: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        sourceNodeId: { type: "string" },
                                        sourceOutput: { type: "string" },
                                        targetNodeId: { type: "string" },
                                        targetInput: { type: "string" }
                                    },
                                    required: ["sourceNodeId", "sourceOutput", "targetNodeId", "targetInput"]
                                }
                            }
                        },
                        required: ["nodes", "connections"]
                    }
                },
                required: ["message", "workflow"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "advise_user",
            description: "DEFAULT TOOL for conversations. Provides textual advice, answers questions, or explains concepts. Use this for: questions like 'Can you explain?', 'What does this do?', 'How does X work?', general advice, debugging tips without structural changes, and ANY request where the user is NOT explicitly asking to build/modify/create workflow nodes.",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "The advice, answer, or explanation to display to the user."
                    },
                    suggestions: {
                        type: "array",
                        items: { type: "string" },
                        description: "Optional short bullet points of suggested next steps or actions."
                    }
                },
                required: ["message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_latest_execution_logs",
            description: "Fetches the full execution logs and errors from the most recent workflow run. Use this when the user mentions a failure, bug, or error, or asks 'why did it fail?'.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "validate_workflow",
            description: "Validates a workflow for errors before finalizing. Use this when creating complex workflows (especially with AI agents) to catch connection errors or missing parameters. Returns errors/warnings for self-correction.",
            parameters: {
                type: "object",
                properties: {
                    workflow: {
                        type: "object",
                        description: "The workflow object to validate before finalizing"
                    }
                },
                required: ["workflow"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "enhance_prompt",
            description: "Use this when the user's request is vague or ambiguous and needs clarification before building. Returns an enhanced, more specific version of their prompt along with clarifying questions. Use BEFORE build_workflow when the request lacks critical details like: specific API endpoints, data fields, trigger conditions, or output destinations.",
            parameters: {
                type: "object",
                properties: {
                    enhanced_prompt: {
                        type: "string",
                        description: "A more specific, actionable version of the user's original request with assumptions filled in."
                    },
                    assumptions: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of assumptions made while enhancing the prompt."
                    },
                    questions: {
                        type: "array",
                        items: { type: "string" },
                        description: "Clarifying questions to ask the user if assumptions are wrong."
                    },
                    confidence: {
                        type: "number",
                        description: "Confidence score 0-1 that the enhanced prompt matches user intent."
                    }
                },
                required: ["enhanced_prompt", "assumptions", "questions", "confidence"]
            }
        }
    }
];
