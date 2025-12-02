# Quick Integration Guide

## How to Add Chat Interface Node to Your Workflow Editor

### Step 1: Import the Component

Find your `WorkflowEditor.tsx` or `WorkflowCanvas.tsx` file and add:

```tsx
import { ChatInterfaceNode } from "@/components/workflow/nodes";
```

### Step 2: Register the Node Type

Add the chat interface to your node types mapping:

```tsx
// In your WorkflowEditor component or where you define nodeTypes
const nodeTypes = useMemo(
  () => ({
    // ... your existing node types
    customNode: CustomNode,
    // Add this line:
    chatInterface: ChatInterfaceNode,
  }),
  []
);
```

### Step 3: Add to Available Nodes (Optional)

If you have a node palette or sidebar, add the chat interface node:

```tsx
import { chatInterfaceNodeType } from "@/components/workflow/nodes";

const availableNodes = [
  // ... your existing nodes
  {
    type: "chatInterface",
    displayName: "Chat Interface",
    group: "communication",
    icon: "MessageCircle",
    description: "Interactive chat interface for AI conversations",
  },
];
```

### Step 4: Create Node Function (Optional)

If you have a function to create new nodes, add:

```tsx
function createChatNode(position: { x: number; y: number }) {
  return {
    id: `chat-${Date.now()}`,
    type: "chatInterface",
    position,
    data: {
      label: "AI Chat",
      nodeType: "chatInterface",
      model: "GPT-4",
      placeholder: "Type a message...",
      disabled: false,
      parameters: {},
    },
  };
}
```

### Step 5: Test It!

You can test immediately by:

#### Option A: Using the Demo Component

```tsx
// Add to your routes or pages
import { ChatInterfaceNodeDemo } from "@/components/workflow/nodes";

// Use in your component
<ChatInterfaceNodeDemo />;
```

#### Option B: Using the Visual Test Suite

```tsx
import { ChatInterfaceNodeVisualTest } from "@/components/workflow/nodes";

// Use in your component
<ChatInterfaceNodeVisualTest />;
```

#### Option C: Add Directly to Existing Workflow

```tsx
// Add to your initial nodes or create programmatically
const newNode = {
  id: "chat-1",
  type: "chatInterface",
  position: { x: 250, y: 100 },
  data: {
    label: "AI Chat",
    nodeType: "chatInterface",
    model: "GPT-4",
    disabled: false,
    parameters: {},
  },
};

// Add to your workflow
setNodes((nodes) => [...nodes, newNode]);
```

## Example: Complete Integration

```tsx
// WorkflowEditor.tsx
import { useCallback, useMemo, useState } from "react";
import ReactFlow, { addEdge, Background, Controls } from "reactflow";
import { ChatInterfaceNode } from "@/components/workflow/nodes";
import { CustomNode } from "./CustomNode";
import "reactflow/dist/style.css";

export function WorkflowEditor() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Register node types
  const nodeTypes = useMemo(
    () => ({
      customNode: CustomNode,
      chatInterface: ChatInterfaceNode, // Add this
    }),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  // Function to add a chat node
  const addChatNode = () => {
    const newNode = {
      id: `chat-${Date.now()}`,
      type: "chatInterface",
      position: { x: 250, y: 100 },
      data: {
        label: "AI Chat",
        nodeType: "chatInterface",
        model: "GPT-4",
        placeholder: "Type a message...",
        disabled: false,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="h-screen w-full">
      <button onClick={addChatNode}>Add Chat Node</button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

## Verification Checklist

After integration, verify:

- [ ] Node appears on canvas
- [ ] Node can be dragged
- [ ] Input handle is visible (left side, blue)
- [ ] Output handle is visible (right side, green)
- [ ] Can send messages
- [ ] Messages appear in correct bubbles
- [ ] Typing indicator works
- [ ] Timestamps display correctly
- [ ] Enter key sends message
- [ ] Send button is clickable
- [ ] Empty state shows when no messages
- [ ] Model badge appears if model is set
- [ ] Node can be selected
- [ ] Connections work with other nodes

## Troubleshooting

### Node doesn't appear

- Check that `chatInterface` is added to `nodeTypes`
- Verify import path is correct
- Check console for errors

### Styling looks wrong

- Ensure shadcn/ui components are installed
- Check Tailwind CSS configuration
- Verify `base-node.tsx` component exists

### Handles not connecting

- Check ReactFlow version compatibility
- Ensure handles are not disabled
- Verify handle IDs are unique

### Messages not sending

- Check console for errors
- Verify state management is working
- Check if node is disabled or in read-only mode

## Next Steps

1. **Test the Demo**: Run `ChatInterfaceNodeDemo` first
2. **Visual Testing**: Use `ChatInterfaceNodeVisualTest` for comprehensive testing
3. **Backend Integration**: Connect to your AI service
4. **Customize**: Adjust colors, sizes, and behavior
5. **Deploy**: Add to production workflow system

## Support Files

- **Documentation**: `CHAT_INTERFACE_NODE.md`
- **Examples**: `chatInterfaceExamples.ts`
- **Type Definitions**: `chatInterfaceNodeType.ts`
- **Visual Tests**: `ChatInterfaceNodeVisualTest.tsx`
- **Demo**: `ChatInterfaceNodeDemo.tsx`

## Quick Links

```tsx
// Import everything at once
import {
  ChatInterfaceNode,
  ChatInterfaceNodeDemo,
  ChatInterfaceNodeVisualTest,
  chatInterfaceNodeType,
  chatInterfaceExamples,
} from "@/components/workflow/nodes";
```

---

**Integration Time**: ~5 minutes  
**Complexity**: Low  
**Dependencies**: Already installed  
**Ready**: Yes! 🎉
