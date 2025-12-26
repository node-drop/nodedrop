# GitSourceControlTab Component

## Overview

The GitSourceControlTab component provides the main source control interface for Git operations in the workflow editor. It displays the current Git status, changes, and provides actions for committing, pushing, pulling, and syncing with remote repositories.

## Location

`frontend/src/components/workflow/sidebar-panels/git/GitSourceControlTab.tsx`

## Requirements

Implements requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.5, 7.1

## Props

```typescript
interface GitSourceControlTabProps {
  workflowId: string    // The ID of the workflow
  readOnly?: boolean    // Whether the component is in read-only mode (default: false)
}
```

## Features

### Status Display

- **Changes Count**: Shows total number of changes with staged/unstaged breakdown
- **Sync Status**: Displays unpushed commits count or "Up to date" indicator
- **Ahead/Behind**: Shows commits ahead/behind remote repository
- **Real-time Updates**: Automatically refreshes status on mount and after operations

### Action Buttons

#### Push
- Uploads unpushed commits to remote repository
- Disabled when no unpushed commits exist
- Shows loading state during operation
- Displays success/error notifications

#### Pull
- Fetches and merges changes from remote repository
- Shows loading state during operation
- Handles conflicts with warning notifications
- Displays success/error notifications

#### Sync
- Performs pull followed by push in sequence
- Combines both operations for convenience
- Shows loading state during operation
- Displays success notification when complete

#### Refresh
- Manually refreshes Git status
- Shows spinner animation during refresh
- Displays success notification when complete

### Child Components

#### GitChangesList
- Displays list of changed files
- Shows change type (added, modified, deleted)
- Indicates staged status
- Placeholder implementation (full version in task 19)

#### GitCommitInput
- Provides commit message input
- Shows character counter (500 max)
- Displays staged changes count
- Validates commit message
- Placeholder implementation (full version in task 20)

## State Management

Uses the Git store (`useGitStore`) for:
- Git status data
- Operation states (pushing, pulling, committing)
- Error states
- Last operation results

## Notifications

Uses global toast manager (`useGlobalToast`) for:
- Success notifications (green)
- Error notifications (red, longer duration)
- Warning notifications (yellow, for conflicts)

## Loading States

- **Pushing**: Shows "Pushing..." with spinner
- **Pulling**: Shows "Pulling..." with spinner
- **Syncing**: Shows "Syncing..." with spinner
- **Loading Status**: Shows "Loading status..." with spinner
- **Refreshing**: Shows spinner on refresh button

## Error Handling

- Displays operation errors in alert component
- Shows status errors in alert component
- Provides detailed error messages
- Clears errors before new operations

## Read-Only Mode

When `readOnly={true}`:
- All action buttons are disabled
- Commit input is disabled
- Status display remains functional
- Refresh button remains functional

## Usage Example

```tsx
import { GitSourceControlTab } from '@/components/workflow/sidebar-panels/git'

function MyComponent() {
  return (
    <GitSourceControlTab 
      workflowId="workflow-123"
      readOnly={false}
    />
  )
}
```

## Integration

### In GitPanel

The component is rendered as a tab content in the GitPanel:

```tsx
<TabsContent value="source-control" className="h-full m-0">
  <GitSourceControlTab
    workflowId={workflowId}
    readOnly={readOnly}
  />
</TabsContent>
```

### With Git Store

Automatically integrates with Git store for:
- Status updates
- Operation execution
- Error handling
- Result notifications

## Styling

- Uses Tailwind CSS for styling
- Follows shadcn/ui design patterns
- Responsive layout with flex containers
- Proper scrolling with ScrollArea component
- Consistent spacing and typography

## Accessibility

- Proper ARIA labels on buttons
- Keyboard navigation support
- Screen reader friendly
- Loading states announced
- Error messages accessible

## Performance

- Memoized with React.memo
- Efficient re-renders
- Debounced status updates
- Minimal state updates
- Lazy loading of child components

## Testing

Comprehensive test suite covering:
- Component rendering
- Status display
- Button interactions
- Loading states
- Error handling
- Notifications
- Read-only mode
- Empty states

See: `__tests__/GitSourceControlTab.test.tsx`

## Future Enhancements

1. **Task 19**: Full GitChangesList implementation with stage/unstage
2. **Task 20**: Full GitCommitInput with workflow data integration
3. **Task 23**: Conflict resolution UI
4. **Task 25**: Automatic status polling
5. **Task 26**: Enhanced notifications

## Dependencies

- React 18+
- Zustand (Git store)
- Lucide React (icons)
- shadcn/ui components
- Custom toast system

## Related Components

- `GitPanel` - Parent container
- `GitChangesList` - Child component for changes
- `GitCommitInput` - Child component for commits
- `GitConnectionSection` - Connection management
- `GitHistoryTab` - Commit history
- `GitBranchesTab` - Branch management
