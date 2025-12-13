# Trigger Node Visual Updates

## Summary
Updated trigger nodes to have distinct visual differentiation with hexagon icon wrappers, trigger badges, and title/subtitle structure.

## Changes Made

### 1. Hexagon Icon Wrapper for Trigger Nodes
- **Files Modified:**
  - `frontend/src/components/common/NodeIconRenderer.tsx`
  - `frontend/src/components/workflow/components/NodeIcon.tsx`
  - `frontend/src/components/workflow/node-shapes.css`

- **Changes:**
  - Changed icon wrapper shape from circular (`rounded-full`) to hexagon (`clip-path-hexagon`) for trigger nodes
  - Added CSS class `.clip-path-hexagon` with polygon clip-path for hexagon shape
  - Applied conditionally based on `isTrigger` prop

### 2. Trigger Icon Badge
- **Files Modified:**
  - `frontend/src/components/common/NodeIconRenderer.tsx`
  - `frontend/src/components/workflow/components/NodeIcon.tsx`

- **Changes:**
  - Added Zap icon (⚡) badge overlay on top-right corner of icon wrapper for trigger nodes
  - Badge has yellow background (`bg-yellow-500`) with white Zap icon
  - Size-responsive badge (smaller for xs/sm sizes)
  - Positioned absolutely at `-top-0.5 -right-0.5`

### 3. Title and Subtitle Structure
- **Files Modified:**
  - `frontend/src/components/workflow/shared/NodeHeader.tsx`
  - `frontend/src/components/workflow/components/NodeHeader.tsx`
  - `frontend/src/components/workflow/nodes/BaseNodeWrapper.tsx`
  - `frontend/src/components/workflow/nodes/CollapsedNodeContent.tsx`

- **Changes:**
  - Added `nodeCategory` prop to NodeHeader components
  - Updated title structure to show:
    - **Title**: Node name (e.g., "Slack Trigger")
    - **Subtitle**: Node category (e.g., "Trigger")
  - Added `formatCategory()` helper to capitalize category names
  - Added `showSubtitle` prop (default: true) to control subtitle visibility
  - Subtitle shown in muted text color (`text-muted-foreground`)
  - Falls back to `headerInfo` if `nodeCategory` is not provided

### 4. CSS Updates
- **File Modified:**
  - `frontend/src/components/workflow/node-shapes.css`

- **Changes:**
  - Added `.clip-path-hexagon` class for icon wrappers
  - Uses rotated rectangles technique with `::before` and `::after` pseudo-elements
  - Base element + two rotated copies (60deg and -60deg) create hexagon shape
  - Background color applied to all three layers via `background-color: inherit`
  - Content positioned above hexagon with `z-index: 1`
  - Border radius of 10% for slightly rounded corners
  - Imported in `NodeIcon.tsx` and `NodeIconRenderer.tsx`

## Visual Result

### Before:
- Trigger nodes had circular icon wrappers (same as regular nodes)
- No visual indicator of trigger type
- Only node name shown in title

### After:
- Trigger nodes have hexagon icon wrappers
- Yellow Zap icon badge on icon wrapper
- Title shows node name + subtitle shows "Trigger" category
- Clear visual differentiation from regular nodes

## Example Usage

```tsx
// Trigger node will automatically get:
// - Hexagon icon wrapper
// - Zap icon badge
// - "Trigger" subtitle

<NodeIconRenderer
  icon="webhook"
  displayName="Webhook Trigger"
  backgroundColor="#4CAF50"
  isTrigger={true}  // ← Enables hexagon + badge
  size="md"
/>

<NodeHeader
  label="My Webhook"
  nodeCategory="trigger"  // ← Shows "Trigger" as subtitle
  icon={{ config: { icon: 'webhook', color: '#4CAF50', isTrigger: true } }}
/>
```

## Detection Logic

Trigger nodes are detected using:
- `nodeType.nodeCategory === 'trigger'` (in shared NodeHeader)
- `data.executionCapability === 'trigger'` (in BaseNodeWrapper and CustomNode)
- `isTrigger` prop passed to icon components

### Execution Capability Computation
The `executionCapability` is computed from `nodeCategory` in `workflowTransformers.ts`:
- `nodeCategory: 'trigger'` → `executionCapability: 'trigger'`
- `nodeCategory: 'condition'` → `executionCapability: 'condition'`
- `nodeCategory: 'transform'` → `executionCapability: 'transform'`
- All others → `executionCapability: 'action'`

## Benefits

1. **Instant Recognition**: Hexagon shape + Zap badge immediately identifies trigger nodes
2. **Visual Hierarchy**: Title/subtitle structure provides clear information hierarchy
3. **Consistency**: Applied automatically based on node category
4. **Accessibility**: Shape + icon + text provide multiple visual cues
5. **Professional**: Clean, modern design that matches workflow diagram conventions
