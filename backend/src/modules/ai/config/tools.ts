import { ChatCompletionTool } from "openai/resources/chat/completions";

export const AI_TOOLS: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "build_workflow",
            description: "Constructs, modifies, or completely replaces the automation workflow based on user specifications. Use this when the user asks to create, change, add, or fix something in the workflow structure.",
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
            description: "Provides textual advice, answers questions, or explains concepts without modifying the workflow. Use this for general questions, 'how-to' queries, or debugging advice where no structural change is requested.",
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
    }
];
