# Branch Node Labels Implementation

## Overview

This document describes the implementation of branch labels for conditional nodes (like IF nodes) in the workflow editor. Branch labels help users identify which path (e.g., "true" or "false") an edge represents when coming from branching nodes.

## Changes Made

### 1. CustomEdge Component (`frontend/src/components/workflow/CustomEdge.tsx`)

#### Added Edge Data Interface

```typescript
interface CustomEdgeData {
  label?: string;
}
```

#### Edge Label Display

- Added logic to extract branch labels from edge data
- Branch labels are displayed for edges coming from branching nodes
- Labels are color-coded:
  - **Green** for "true" branches
  - **Red** for "false" branches
  - **Blue** for other branch types

#### Label Styling

- Labels are always visible (not just on hover)
- Small, rounded badges with contrasting text
- Positioned at the center of the edge
- Non-interactive (don't interfere with edge controls)

### 2. WorkflowEditor Component (`frontend/src/components/workflow/WorkflowEditor.tsx`)

#### Edge Data Enhancement

Modified edge creation to include label information:

```typescript
const reactFlowEdges = workflow.connections.map((conn) => ({
  id: conn.id,
  source: conn.sourceNodeId,
  target: conn.targetNodeId,
  sourceHandle: conn.sourceOutput,
  targetHandle: conn.targetInput,
  data: {
    label: conn.sourceOutput !== "main" ? conn.sourceOutput : undefined,
  },
}));
```

The label is only set when the `sourceOutput` is not "main", which indicates a branch output.

## How It Works

### Branch Detection

1. When creating edges, the system checks if the `sourceOutput` is different from "main"
2. If it is, the output name (e.g., "true", "false") is passed as the edge label
3. The `CustomEdge` component renders this label with appropriate styling

### Node Types with Branches

Currently supported branching nodes:

- **IF Node**: Has outputs ["main", "true", "false"]
  - "true" path: shown with green label
  - "false" path: shown with red label

### Visual Hierarchy

- Branch labels have `z-index: 999` to appear below hover controls but above the edge
- Hover controls (`z-index: 1002+`) appear on top when hovering over the edge
- Labels are visible at all times for clarity

## Example Usage

When you add an IF node to a workflow:

1. The IF node has two output handles: "true" and "false"
2. When you connect from the "true" handle, the edge shows a green "true" label
3. When you connect from the "false" handle, the edge shows a red "false" label
4. This makes it immediately clear which path each connection represents

## Future Enhancements

Potential improvements:

1. Support for Switch nodes with multiple branches
2. Customizable label colors per node type
3. Label positioning options (start, middle, end of edge)
4. Option to show/hide labels in workspace settings
5. Label editing for custom branch names

## Related Files

- `frontend/src/components/workflow/CustomEdge.tsx` - Edge rendering with labels
- `frontend/src/components/workflow/WorkflowEditor.tsx` - Edge data preparation
- `backend/src/nodes/core/If.node.ts` - IF node definition with branch outputs
- `backend/src/types/node.types.ts` - Node type definitions

## Testing

To test the branch labels:

1. Create a new workflow
2. Add a Manual Trigger node
3. Add an IF node and connect it to the trigger
4. Configure the IF node with a condition
5. Add two more nodes and connect them to the IF node's "true" and "false" outputs
6. Observe the green "true" and red "false" labels on the edges

## Notes

- Branch labels are only shown for edges coming from nodes with multiple named outputs
- The "main" output (default output for most nodes) does not show a label
- Labels are rendered using EdgeLabelRenderer for proper positioning and z-index handling
