# Chat Interface Node

A custom ReactFlow node component that provides an interactive chat interface for AI conversations within your workflow.

## Features

- 📱 **Interactive Chat UI** - Full-featured chat interface with message history
- 💬 **Real-time Messaging** - Send and receive messages with typing indicators
- 🎨 **Beautiful Design** - Built with shadcn/ui components and ReactFlow Base Node
- 🔌 **ReactFlow Integration** - Seamlessly integrates with ReactFlow canvas
- ⚡ **Customizable** - Configure model, system prompt, and placeholder text
- 🔒 **Read-only Mode** - Automatically disables during workflow execution

## Installation

The component uses the ReactFlow Base Node from shadcn/ui:

```bash
npx shadcn@latest add https://ui.reactflow.dev/base-node
```

## Usage

### Basic Setup

```tsx
import { ChatInterfaceNode } from "@/components/workflow/nodes";
import ReactFlow from "reactflow";
import "reactflow/dist/style.css";

const nodeTypes = {
  chatInterface: ChatInterfaceNode,
};

function MyWorkflow() {
  const nodes = [
    {
      id: "chat-1",
      type: "chatInterface",
      position: { x: 250, y: 100 },
      data: {
        label: "AI Chat Assistant",
        nodeType: "chatInterface",
        parameters: {},
        disabled: false,
      },
    },
  ];

  return <ReactFlow nodes={nodes} nodeTypes={nodeTypes} />;
}
```

### Node Data Properties

| Property       | Type                  | Description                  | Default               |
| -------------- | --------------------- | ---------------------------- | --------------------- |
| `label`        | `string`              | The display name of the node | `'Chat Interface'`    |
| `nodeType`     | `string`              | Type identifier for the node | `'chatInterface'`     |
| `parameters`   | `Record<string, any>` | Custom parameters            | `{}`                  |
| `disabled`     | `boolean`             | Whether the node is disabled | `false`               |
| `messages`     | `Message[]`           | Initial message history      | `[]`                  |
| `placeholder`  | `string`              | Input placeholder text       | `'Type a message...'` |
| `systemPrompt` | `string`              | System prompt for AI         | `undefined`           |
| `model`        | `string`              | AI model name to display     | `undefined`           |

### Message Interface

```tsx
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
```

### Example with Initial Messages

```tsx
const chatNode = {
  id: "chat-1",
  type: "chatInterface",
  position: { x: 250, y: 100 },
  data: {
    label: "Customer Support Bot",
    nodeType: "chatInterface",
    model: "GPT-4",
    placeholder: "How can we help you?",
    systemPrompt: "You are a helpful customer support assistant.",
    messages: [
      {
        id: "1",
        role: "assistant",
        content: "Hello! How can I assist you today?",
        timestamp: new Date(),
      },
    ],
    disabled: false,
    parameters: {},
  },
};
```

## Customization

### Styling

The node uses Tailwind CSS classes and can be customized through the `className` prop:

```tsx
<BaseNode className={`w-[380px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
```

### Message Height

Adjust the message area height by modifying the `ScrollArea` component:

```tsx
<ScrollArea className="h-[300px] px-3 py-2">
```

### Color Scheme

Customize the color scheme by modifying the message bubble classes:

```tsx
// User messages
className = "bg-blue-500 text-white";

// Assistant messages
className = "bg-secondary text-foreground";
```

## Features

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line (in multi-line mode)

### Typing Indicator

The component shows a typing indicator when the AI is "thinking":

```tsx
{
  isTyping && (
    <div className="flex gap-1">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
    </div>
  );
}
```

### ReactFlow Handles

The node includes both input and output handles:

- **Input Handle** (left): Blue color, connects to previous nodes
- **Output Handle** (right): Green color, connects to next nodes

```tsx
<Handle
  type="target"
  position={Position.Left}
  id="input"
  className="w-3 h-3 !bg-blue-500 border-2 border-white"
/>

<Handle
  type="source"
  position={Position.Right}
  id="output"
  className="w-3 h-3 !bg-green-500 border-2 border-white"
/>
```

## Integration with Workflow

### Connecting to Other Nodes

The chat interface node can be connected to:

1. **Input nodes** - Receive context or data from previous nodes
2. **Output nodes** - Send chat results to next nodes in the workflow

### Read-only Mode

The node automatically enters read-only mode during workflow execution:

```tsx
const { executionState } = useWorkflowStore();
const isReadOnly = !!executionState.executionId;
```

## Demo

A demo component is included to showcase the chat interface node:

```tsx
import { ChatInterfaceNodeDemo } from "@/components/workflow/nodes/ChatInterfaceNodeDemo";

function App() {
  return <ChatInterfaceNodeDemo />;
}
```

## Dependencies

- `reactflow` - ReactFlow library
- `lucide-react` - Icons
- `@/components/ui/*` - shadcn/ui components
- `@/components/base-node` - ReactFlow Base Node component
- `@/stores` - Workflow store

## Component Structure

```
ChatInterfaceNode/
├── Header (BaseNodeHeader)
│   ├── Icon (MessageCircle)
│   ├── Title
│   └── Model Badge (optional)
├── Content (BaseNodeContent)
│   └── ScrollArea
│       ├── Empty State (if no messages)
│       ├── Message List
│       └── Typing Indicator
└── Footer (BaseNodeFooter)
    ├── Input Field
    └── Send Button
```

## Tips

1. **Message Persistence**: To persist messages across sessions, connect the node to a database or state management solution
2. **AI Integration**: Replace the demo AI response with actual API calls to your AI service
3. **Styling**: Use the shadcn/ui theme system to match your application's design
4. **Performance**: For large message histories, consider implementing message pagination or virtualization

## Future Enhancements

- [ ] Multi-line input support
- [ ] File upload capability
- [ ] Message editing and deletion
- [ ] Markdown rendering in messages
- [ ] Code syntax highlighting
- [ ] Export chat history
- [ ] Voice input/output
- [ ] Message reactions
- [ ] Typing indicators from multiple users

## License

This component is part of the node-drop project.
