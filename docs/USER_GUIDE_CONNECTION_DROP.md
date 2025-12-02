# 🎯 Connection Drop Feature - User Guide

## What is Connection Drop?

Connection Drop is a new, intuitive way to add and connect nodes in your workflow. Instead of adding a node and then connecting it manually, you can now **drag a connection from any output handle and drop it on the canvas** to instantly open a searchable node menu.

## How to Use

### Method 1: Quick Connect (New!)

1. **Hover over any node** in your workflow
2. **Click and hold** on the output handle (the circle on the right side of the node)
3. **Drag** the connection line toward empty space on the canvas
4. **Release** the mouse button on the canvas (not on another node)
5. A **searchable dialog appears** showing all available nodes
6. **Type to search** or scroll through categories
7. **Click on a node** to select it
8. The node is **automatically created and connected**!

### Visual Example

```
Step 1: Start Dragging
┌─────────────┐
│   Trigger   │○ ←── Click here
└─────────────┘

Step 2: Drag Over Canvas
┌─────────────┐
│   Trigger   │○~~~~~~~~~>
└─────────────┘

Step 3: Release on Canvas
┌─────────────┐         ✋
│   Trigger   │○
└─────────────┘

Step 4: Dialog Appears
┌─────────────┐    ┌──────────────────┐
│   Trigger   │○   │ Add Node         │
└─────────────┘    │ ┌──────────────┐ │
                   │ │ Search...    │ │
                   │ └──────────────┘ │
                   │ 🔧 HTTP Request  │
                   │ ✉️  Send Email   │
                   │ 📝 Code          │
                   └──────────────────┘

Step 5: Connected!
┌─────────────┐    ┌──────────────┐
│   Trigger   │○──>│ HTTP Request │
└─────────────┘    └──────────────┘
```

## When to Use Each Method

### 🎯 Use Connection Drop When:

- You know you want to connect from a specific node
- You want visual feedback during the connection
- You're building a workflow from left to right
- You prefer drag-and-drop interactions

**Example:** "I have a Trigger, and I want to connect it to an HTTP Request"

### ➕ Use Node Palette When:

- You're starting a new workflow
- You want to place a node at a specific location first
- You're browsing available nodes

**Example:** "Let me explore what nodes are available"

### 🔗 Use Edge Button When:

- You want to insert a node between two existing nodes
- You have an existing connection to modify

**Example:** "I need to add validation between these two nodes"

## Tips & Tricks

### 💡 Quick Search

The search dialog supports smart searching:

- Type node names: `http`, `email`, `slack`
- Search descriptions: `api`, `send`, `transform`
- Search categories: `trigger`, `data`, `communication`

### 💡 Position Control

- The new node appears **200px to the right** of the source node
- It maintains the **same vertical position**
- You can still **drag it** after creation to fine-tune

### 💡 Multiple Outputs

For nodes with multiple outputs (like Switch, IF):

- The connection **remembers which output** you dragged from
- The new node **connects to that specific output**
- Output labels are preserved

### 💡 Keyboard Navigation

After the dialog opens:

- **Type** to filter nodes
- **↓↑** Arrow keys to navigate results
- **Enter** to select highlighted node
- **Esc** to cancel

## Common Workflows

### Workflow 1: Linear Flow

```
Trigger → Process → Transform → Send → Done
```

**Steps:**

1. Drag from Trigger → Select "HTTP Request"
2. Drag from HTTP Request → Select "Code"
3. Drag from Code → Select "Send Email"
4. Done!

### Workflow 2: Branching Flow

```
          ┌→ Process A → Output A
Trigger →Switch
          └→ Process B → Output B
```

**Steps:**

1. Add Switch node
2. Drag from "Output A" → Select "Process A"
3. Drag from "Output B" → Select "Process B"
4. Continue building each branch

### Workflow 3: Error Handling

```
HTTP Request → Transform → Send
     ↓
   Error Handler
```

**Steps:**

1. Build main flow: HTTP → Transform → Send
2. Drag from HTTP Request error output → Select "Error Handler"

## Comparison with Other Methods

| Feature          | Connection Drop | Node Palette | Edge Button    |
| ---------------- | --------------- | ------------ | -------------- |
| Speed            | ⚡⚡⚡ Fast     | ⚡⚡ Medium  | ⚡⚡⚡ Fast    |
| Visual Feedback  | ✅ Yes          | ❌ No        | ⚠️ Limited     |
| Auto-Connect     | ✅ Yes          | ❌ No        | ✅ Yes         |
| Position Control | ⚠️ Auto         | ✅ Full      | ⚠️ Auto        |
| Use Case         | New connections | First node   | Insert between |

## Troubleshooting

### ❓ Dialog doesn't appear when I drop

**Solution:** Make sure you're dropping on empty canvas space, not on another node. The canvas has a grid pattern background.

### ❓ Can't drag from output handle

**Solution:** Check if you're in read-only mode or execution view. Connection dragging is disabled in these modes for safety.

### ❓ Wrong output is connected

**Solution:** The system remembers which output you dragged from. Make sure to drag from the correct output handle if your node has multiple outputs.

### ❓ Node appears in wrong position

**Solution:** After creation, you can still drag the node to adjust its position. The initial position is calculated automatically.

### ❓ Search doesn't find my node

**Solution:** Try different search terms:

- Try the node category (e.g., "data", "trigger")
- Try the node description keywords
- Scroll through the categories manually

## Advanced Usage

### Custom Node Types

If you have custom nodes installed:

- They appear in the search results
- Search works across custom nodes too
- Categories are respected

### Multiple Connections

To create multiple connections from the same node:

1. Drag from output → Drop → Select node A
2. Drag from **same output** → Drop → Select node B
3. Both nodes are now connected in parallel

### Complex Workflows

For complex workflows with many branches:

1. Build the main path first
2. Use Connection Drop for primary branches
3. Use Edge Button to insert nodes between existing ones
4. Fine-tune positions at the end

## Keyboard Shortcuts

While using Connection Drop:

- **Esc** - Cancel connection drag
- **Space** - (While dragging) Quick search (future feature)
- **Cmd/Ctrl + Z** - Undo last node creation

In the search dialog:

- **Type** - Filter results
- **↓↑** - Navigate results
- **Enter** - Select highlighted node
- **Esc** - Close dialog

## FAQ

**Q: Can I drop on another node to connect?**
A: Yes! If you drop on another node's input handle, it creates a normal connection without opening the dialog.

**Q: Does this work with trigger nodes?**
A: Yes! Trigger nodes work exactly the same way.

**Q: Can I cancel after opening the dialog?**
A: Yes, press Esc or click outside the dialog to cancel.

**Q: Will this affect my existing workflows?**
A: No, this is an additional feature. All existing functionality remains the same.

**Q: Can I use this in read-only mode?**
A: No, connection dragging is disabled in read-only and execution modes for safety.

**Q: Does this work on touch devices?**
A: Yes! The feature supports both mouse and touch events.

## Best Practices

1. **Plan your flow** - Think about the general structure before building
2. **Build left to right** - Use Connection Drop to build flows naturally
3. **Use search** - Don't scroll, type to find nodes quickly
4. **Adjust positions later** - Focus on connections first, positioning second
5. **Combine methods** - Use all three methods (Connection Drop, Palette, Edge Button) as needed

## Video Tutorials

📹 Coming soon:

- Basic usage tutorial
- Advanced workflows
- Tips and tricks
- Common patterns

## Feedback

We'd love to hear your thoughts!

- What works well?
- What could be improved?
- What features would you like to see?

---

**Happy workflow building! 🚀**
