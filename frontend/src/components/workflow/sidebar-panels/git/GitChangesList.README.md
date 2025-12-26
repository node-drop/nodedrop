# GitChangesList Component

## Overview

The `GitChangesList` component displays a list of changed files in a Git-enabled workflow. It provides visual indicators for change types (added, modified, deleted), staging status, and actions for managing changes.

## Requirements

- **Requirement 2.1**: Display workflow changes in a staging area

## Features

### Change Display
- **File List**: Shows all changed files with their paths
- **Change Types**: Visual indicators for:
  - Added files (green, FilePlus icon)
  - Modified files (blue, FileEdit icon)
  - Deleted files (red, FileX icon)
- **Staging Status**: Visual indicator showing which changes are staged
  - Staged: CheckCircle2 icon (green)
  - Unstaged: Circle icon (gray)

### Actions

#### Individual Change Actions
- **Stage**: Add an unstaged change to the staging area (Plus button)
- **Unstage**: Remove a staged change from the staging area (Minus button)
- **Discard**: Discard changes to a file (X button, destructive action)

#### Bulk Actions
- **Stage All**: Stage all unstaged changes at once
- **Unstage All**: Unstage all staged changes at once

### Empty State
When no changes exist, displays a friendly message:
- Green checkmark icon
- "No changes" message
- "Your workflow is up to date" subtitle

### Summary
Displays counts at the bottom:
- Number of staged changes
- Number of unstaged changes
- Total number of changes

## Props

```typescript
interface GitChangesListProps {
  workflowId: string      // The workflow ID
  changes: GitChange[]    // Array of changes to display
  readOnly?: boolean      // Disable all actions (default: false)
}
```

## Usage

```tsx
import { GitChangesList } from '@/components/workflow/sidebar-panels/git'

function MyComponent() {
  const changes = [
    { path: 'workflow.json', type: 'modified', staged: false },
    { path: 'nodes.json', type: 'added', staged: true },
  ]

  return (
    <GitChangesList
      workflowId="workflow-123"
      changes={changes}
    />
  )
}
```

## Styling

The component uses:
- Tailwind CSS for styling
- Lucide React icons for visual elements
- shadcn/ui components (Button, ScrollArea)
- Hover effects for interactive elements
- Color coding for change types

## Accessibility

- All buttons have descriptive `title` attributes for tooltips
- Proper ARIA roles for interactive elements
- Keyboard navigation support through standard button elements
- Visual indicators complement text labels

## Read-Only Mode

When `readOnly={true}`:
- All action buttons are disabled
- Bulk actions (Stage All, Unstage All) are disabled
- Individual change actions are hidden
- Component remains viewable but not interactive

## Future Enhancements

The component currently has placeholder handlers for actions. Future tasks will implement:
- Actual Git staging/unstaging operations via git service
- Discard changes with confirmation dialog
- Diff view for individual changes
- Conflict resolution UI

## Related Components

- **GitSourceControlTab**: Parent component that uses GitChangesList
- **GitCommitInput**: Sibling component for creating commits
- **GitPanel**: Top-level Git panel component

## Testing

Unit tests cover:
- Empty state rendering
- Change list display with various types
- Staged/unstaged indicators
- Bulk action button states
- Read-only mode behavior
- Summary count accuracy

See `__tests__/GitChangesList.test.tsx` for full test suite.
