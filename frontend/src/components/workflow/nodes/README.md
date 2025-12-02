# Workflow Nodes - Interactive Components

## 🎯 Overview

This directory contains reusable interactive node components for the workflow canvas, built on top of the generic `BaseNodeWrapper` component.

## 🧩 Components

### BaseNodeWrapper (Generic Component)

A reusable wrapper for creating expandable/collapsible interactive nodes with consistent behavior.

**Documentation:**

- 📖 [Full Documentation](./BASE_NODE_WRAPPER.md)
- ⚡ [Quick Start Guide](./BASE_NODE_WRAPPER_QUICK_START.md)

**Features:**

- ✅ Expand/collapse functionality
- ✅ Context menu integration
- ✅ Customizable icons and colors
- ✅ Input/output handles
- ✅ Persistent state management
- ✅ Responsive design

**Example Usage:**

```tsx
import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { Star } from "lucide-react";

<BaseNodeWrapper
  id={id}
  selected={selected}
  data={data}
  isExpanded={isExpanded}
  onToggleExpand={handleToggle}
  Icon={Star}
  iconColor="bg-yellow-500"
  expandedContent={<YourContent />}
/>;
```

### ChatInterfaceNode

An interactive chat interface node for AI conversations.

**Quick Start:**

**Features:**

- � Real-time chat interface
- 📜 Message history with timestamps
- ⌨️ Typing indicators
- 🎨 Beautiful UI with shadcn components
- 🔌 Full workflow integration

### ImagePreviewNode

An example node for displaying image previews with download and fullscreen capabilities.

**Features:**

- 🖼️ Image display with zoom
- ⬇️ Download functionality
- 🖥️ Fullscreen mode
- 🔄 Error handling and retry

## 📁 Files in this Directory

1. **BaseNodeWrapper.tsx** - Generic wrapper component
2. **ChatInterfaceNode.tsx** - Chat interface implementation
3. **ImagePreviewNode.tsx** - Image preview implementation
4. **ChatInterfaceNodeDemo.tsx** - Chat demo
5. **chatInterfaceNodeType.ts** - Node type definitions
6. **BASE_NODE_WRAPPER.md** - Complete wrapper documentation
7. **BASE_NODE_WRAPPER_QUICK_START.md** - Quick start guide
8. **CHAT_INTERFACE_NODE.md** - Chat node documentation
9. **index.ts** - Exports

## 🚀 Quick Start - Create Your Own Node

See [BASE_NODE_WRAPPER_QUICK_START.md](./BASE_NODE_WRAPPER_QUICK_START.md) for a 5-minute guide to creating custom interactive nodes.

## 🚀 Using Existing Nodes

### 1. The node component is ready to use!

Location: `frontend/src/components/workflow/nodes/ChatInterfaceNode.tsx`

### 2. View the Demo

```tsx
import { ChatInterfaceNodeDemo } from "@/components/workflow/nodes/ChatInterfaceNodeDemo";

function App() {
  return <ChatInterfaceNodeDemo />;
}
```

### 3. Use in Your Workflow

```tsx
import { ChatInterfaceNode } from "@/components/workflow/nodes";

const nodeTypes = {
  chatInterface: ChatInterfaceNode,
};

const nodes = [
  {
    id: "chat-1",
    type: "chatInterface",
    position: { x: 250, y: 100 },
    data: {
      label: "AI Chat",
      nodeType: "chatInterface",
      model: "GPT-4",
      placeholder: "Ask me anything...",
      disabled: false,
      parameters: {},
    },
  },
];
```

## ✨ Features

- ✅ Interactive chat interface
- ✅ Message history with timestamps
- ✅ Typing indicators
- ✅ User and assistant message bubbles
- ✅ ReactFlow integration with handles
- ✅ Read-only mode during execution
- ✅ Keyboard shortcuts (Enter to send)
- ✅ Model badge display
- ✅ Beautiful shadcn/ui design

## 🎨 Customization

### Change Message Area Height

```tsx
<ScrollArea className="h-[300px] px-3 py-2"> // Change 300px
```

### Change Node Width

```tsx
<BaseNode className={`w-[380px] ...`}> // Change 380px
```

### Change Colors

```tsx
// User messages
className = "bg-blue-500 text-white";

// Assistant messages
className = "bg-secondary text-foreground";
```

## 🔌 Integration Steps

### In WorkflowEditor.tsx

```tsx
import { ChatInterfaceNode } from "./nodes";

const nodeTypes = {
  // ...existing node types
  chatInterface: ChatInterfaceNode,
};
```

### Add to Available Nodes

```tsx
import { chatInterfaceNodeType } from "./nodes/chatInterfaceNodeType";

const availableNodes = [
  // ...existing nodes
  chatInterfaceNodeType,
];
```

## 📝 Node Data Structure

```typescript
{
  label: string                    // Node display name
  nodeType: 'chatInterface'        // Node type identifier
  parameters: Record<string, any>  // Custom parameters
  disabled: boolean                // Whether node is disabled
  messages?: Message[]             // Initial messages
  placeholder?: string             // Input placeholder
  systemPrompt?: string            // AI system prompt
  model?: string                   // AI model name
}
```

## 🎯 Next Steps

1. **Test the Demo**: Run `ChatInterfaceNodeDemo` to see it in action
2. **Integrate Backend**: Connect to your AI service (see `chatInterfaceNodeType.ts`)
3. **Customize Styling**: Modify colors and sizes to match your theme
4. **Add Features**: Implement file uploads, markdown support, etc.

## 📚 Documentation

Full documentation is available in `CHAT_INTERFACE_NODE.md`

## 🐛 Known Limitations

- Currently uses simulated AI responses (demo mode)
- No message persistence (cleared on refresh)
- No multi-line input support yet

## 💡 Tips

- Use with other workflow nodes to create AI-powered automation
- Connect input handle to receive context from previous nodes
- Connect output handle to send chat results to next nodes
- Customize the AI response logic in the `handleSendMessage` function

## 🔗 Dependencies

All required dependencies are already installed:

- `reactflow` ✅
- `lucide-react` ✅
- `@/components/ui/*` (shadcn/ui) ✅
- `@/components/base-node` ✅

## 🎉 You're All Set!

The Chat Interface Node is ready to use in your workflow system!
