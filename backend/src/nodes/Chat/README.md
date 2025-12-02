# AI Chat Node

A custom backend node for AI-powered chat interactions in your node-drop workflow automation system.

## ✅ Status

**REGISTERED AND READY TO USE!**

The Chat node has been successfully registered in your system and is available in the workflow editor.

## 📋 Node Details

- **Type**: `chat`
- **Display Name**: AI Chat
- **Icon**: 💬
- **Color**: #3b82f6 (Blue)
- **Group**: Communication, AI
- **Inputs**: 1 (main)
- **Outputs**: 1 (main)

## 🎯 Features

- Multiple AI model selection (GPT-3.5, GPT-4, GPT-4 Turbo)
- Configurable system prompt
- Conversation history support
- Temperature control
- Max tokens configuration
- Optional metadata output
- Error handling
- Logging support

## 📝 Parameters

### AI Model

- **Type**: Options
- **Default**: gpt-3.5-turbo
- **Options**:
  - GPT-3.5 Turbo (Fast and cost-effective)
  - GPT-4 (Most capable model)
  - GPT-4 Turbo (Latest with improved performance)

### System Prompt

- **Type**: String
- **Default**: "You are a helpful AI assistant."
- **Description**: Defines AI behavior and personality

### User Message

- **Type**: String
- **Required**: Yes
- **Description**: The message to send to the AI

### Conversation History

- **Type**: JSON
- **Default**: []
- **Format**: `[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]`

### Temperature

- **Type**: Number
- **Default**: 0.7
- **Range**: 0 to 2
- **Description**: Controls randomness (0=focused, 2=creative)

### Max Tokens

- **Type**: Number
- **Default**: 2000
- **Range**: 1 to 4000
- **Description**: Maximum length of AI response

### Include Metadata

- **Type**: Boolean
- **Default**: false
- **Description**: Include token usage and model info in output

## 📤 Output Format

### Basic Output

```json
{
  "message": "AI response text",
  "conversation": [...],
  "lastMessage": {
    "role": "assistant",
    "content": "..."
  },
  "userMessage": "Original message",
  "model": "gpt-3.5-turbo"
}
```

### With Metadata

```json
{
  "message": "...",
  "metadata": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 2000,
    "timestamp": "2025-10-09T...",
    "tokensUsed": {
      "prompt": 100,
      "completion": 150,
      "total": 250
    },
    "status": "demo",
    "note": "..."
  }
}
```

## 🚀 Usage in Workflow

### Simple Chat

```
Manual Trigger → AI Chat → Output
```

### Chat with Context

```
HTTP Request → AI Chat → Send Response
```

### Multi-step Conversation

```
Input → AI Chat (analyze) → AI Chat (elaborate) → Save
```

## ⚠️ Current Status: DEMO MODE

The node currently returns **simulated responses** for demonstration purposes.

### To Connect to Real AI:

#### 1. Install AI SDK

```bash
npm install openai
# or
npm install @anthropic-ai/sdk
```

#### 2. Add API Key

Set environment variable:

```bash
OPENAI_API_KEY=your-api-key-here
```

#### 3. Update ChatNode.ts

Replace the demo response code (around line 157) with actual API calls:

```typescript
// Replace this demo code:
const aiResponse = {
  role: "assistant",
  content: `✨ [Demo Response using ${model}] ✨...`,
  timestamp: new Date().toISOString(),
};

// With actual API call:
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: model,
  messages: messages.map((m) => ({
    role: m.role,
    content: m.content,
  })),
  temperature: temperature,
  max_tokens: maxTokens,
});

const aiResponse = {
  role: "assistant",
  content: completion.choices[0].message.content,
  timestamp: new Date().toISOString(),
};
```

## 📍 File Location

- **Node Definition**: `backend/src/nodes/Chat/ChatNode.ts`
- **Index**: `backend/src/nodes/Chat/index.ts`

## 🔄 Updating the Node

After making changes:

```bash
cd backend
npm run nodes:register
```

## 🧪 Testing

The node will appear in your workflow editor's node palette under the "Communication" or "AI" category.

To test:

1. Create a new workflow
2. Add the "AI Chat" node
3. Configure the parameters
4. Add input data
5. Execute the workflow
6. View the output

## 💡 Tips

- **Temperature Settings**:

  - 0.0-0.3: Precise, factual responses
  - 0.4-0.7: Balanced responses
  - 0.8-2.0: Creative, varied responses

- **Token Management**:

  - Short answer: 500 tokens
  - Paragraph: 1000 tokens
  - Long form: 2000+ tokens

- **System Prompts**: Be specific about role and desired behavior

- **Conversation History**: Pass previous messages to maintain context

## 🐛 Troubleshooting

**Node not appearing?**

- Run `npm run nodes:register`
- Check console for errors
- Verify file structure

**Execution errors?**

- Check input data format
- Verify parameters are correct
- Review error output in execution details

**Want real AI responses?**

- Follow the "Connect to Real AI" steps above
- Ensure API key is valid
- Check network connectivity

## 📚 Related Files

- Frontend Chat Interface Component: `frontend/src/components/workflow/nodes/ChatInterfaceNode.tsx`
- Custom Nodes Directory: `backend/custom-nodes/chat/`

## ✨ Next Steps

1. Test the node in a workflow
2. Connect to a real AI service
3. Customize the response format
4. Add error handling improvements
5. Implement streaming responses
6. Add function calling support

---

**Status**: ✅ Registered and Working (Demo Mode)  
**Version**: 1.0.0  
**Last Updated**: October 9, 2025
