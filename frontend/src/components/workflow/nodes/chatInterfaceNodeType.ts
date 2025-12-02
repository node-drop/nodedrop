/**
 * Chat Interface Node Type Definition
 *
 * This file defines the node type configuration for registering
 * the Chat Interface node in the workflow system.
 */

export const chatInterfaceNodeType = {
  type: "chatInterface",
  displayName: "Chat Interface",
  name: "chatInterface",
  group: ["communication", "ai"],
  version: 1,
  description: "Interactive chat interface for AI conversations",
  defaults: {
    name: "Chat Interface",
    color: "#3b82f6",
  },
  icon: "MessageCircle",
  inputs: ["main"],
  outputs: ["main"],
  properties: [
    {
      displayName: "Model",
      name: "model",
      type: "string",
      default: "GPT-4",
      description: "AI model to use for chat",
      placeholder: "GPT-4",
    },
    {
      displayName: "System Prompt",
      name: "systemPrompt",
      type: "string",
      typeOptions: {
        rows: 4,
      },
      default: "You are a helpful assistant.",
      description: "System prompt to configure AI behavior",
    },
    {
      displayName: "Placeholder Text",
      name: "placeholder",
      type: "string",
      default: "Type a message...",
      description: "Placeholder text for the input field",
    },
    {
      displayName: "Initial Messages",
      name: "messages",
      type: "json",
      default: "[]",
      description: "Initial messages to display (JSON array)",
    },
    {
      displayName: "Temperature",
      name: "temperature",
      type: "number",
      default: 0.7,
      typeOptions: {
        minValue: 0,
        maxValue: 2,
        numberPrecision: 1,
      },
      description: "Controls randomness in responses (0-2)",
    },
    {
      displayName: "Max Tokens",
      name: "maxTokens",
      type: "number",
      default: 2000,
      description: "Maximum number of tokens in response",
    },
    {
      displayName: "Enable Streaming",
      name: "enableStreaming",
      type: "boolean",
      default: false,
      description: "Enable streaming responses",
    },
  ],
  credentials: [
    {
      name: "openAiApi",
      required: true,
      displayOptions: {
        show: {
          model: ["GPT-3.5", "GPT-4"],
        },
      },
    },
  ],
};

/**
 * Integration with WorkflowEditor
 *
 * Add this to your node types mapping in WorkflowEditor.tsx:
 *
 * ```tsx
 * import { ChatInterfaceNode } from './nodes'
 *
 * const nodeTypes = {
 *   ...existingNodeTypes,
 *   chatInterface: ChatInterfaceNode,
 * }
 * ```
 *
 * Add to available nodes list:
 *
 * ```tsx
 * const availableNodes = [
 *   ...existingNodes,
 *   chatInterfaceNodeType,
 * ]
 * ```
 */

/**
 * Example: Creating a Chat Interface Node Programmatically
 *
 * ```tsx
 * const newChatNode = {
 *   id: `chat-${Date.now()}`,
 *   type: 'chatInterface',
 *   position: { x: 250, y: 100 },
 *   data: {
 *     label: 'AI Chat Assistant',
 *     nodeType: 'chatInterface',
 *     parameters: {
 *       model: 'GPT-4',
 *       systemPrompt: 'You are a helpful assistant.',
 *       temperature: 0.7,
 *       maxTokens: 2000,
 *       enableStreaming: false,
 *     },
 *     placeholder: 'Ask me anything...',
 *     disabled: false,
 *     messages: [],
 *   },
 * }
 *
 * // Add to workflow
 * addNode(newChatNode)
 * ```
 */

/**
 * Backend Integration Example
 *
 * Create a backend endpoint to handle chat requests:
 *
 * ```typescript
 * // backend/src/nodes/ChatInterface/ChatInterface.node.ts
 *
 * import { IExecuteFunctions, INodeExecutionData } from 'nd-workflow'
 *
 * export class ChatInterface {
 *   async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
 *     const items = this.getInputData()
 *     const returnData: INodeExecutionData[] = []
 *
 *     for (let i = 0; i < items.length; i++) {
 *       const model = this.getNodeParameter('model', i) as string
 *       const systemPrompt = this.getNodeParameter('systemPrompt', i) as string
 *       const messages = this.getNodeParameter('messages', i) as any[]
 *       const temperature = this.getNodeParameter('temperature', i) as number
 *       const maxTokens = this.getNodeParameter('maxTokens', i) as number
 *
 *       // Call your AI service here
 *       const response = await callAIService({
 *         model,
 *         systemPrompt,
 *         messages,
 *         temperature,
 *         maxTokens,
 *       })
 *
 *       returnData.push({
 *         json: {
 *           messages: [...messages, response],
 *           lastResponse: response,
 *         },
 *       })
 *     }
 *
 *     return [returnData]
 *   }
 * }
 * ```
 */

export default chatInterfaceNodeType;
