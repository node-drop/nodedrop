# GitHistoryTab Component

## Overview

The `GitHistoryTab` component displays the commit history for a workflow with a timeline view. It allows users to view commit details, revert to previous commits, and create branches from specific commits.

## Requirements

Implements requirements: 8.1, 8.2, 8.3, 8.4, 8.5

## Features

### Commit Display (Requirement 8.1)
- Displays commits in a timeline view with visual indicators
- Shows commit hash (short 7-character version), message, author, and timestamp
- Relative timestamps (e.g., "2 hours ago", "3 days ago")
- Timeline visualization with connecting lines between commits

### Commit Selection (Requirement 8.2)
- Click on any commit to view expanded details
- Expanded view shows:
  - Full commit hash
  - Complete commit message
  - Author name
  - Full timestamp
  - Parent commit hash
- Click again to collapse details

### Revert to Commit (Requirement 8.3)
- "Revert to this commit" button in expanded commit view
- Confirmation dialog before reverting
- Restores workflow configuration to the selected commit state
- Creates a new commit with the reverted state
- Success/error notifications

### Pagination (Requirement 8.4)
- Loads commits in batches of 20
- "Load more" button to fetch additional commits
- Automatically detects when all commits have been loaded
- Loading indicators during fetch operations

### Create Branch from Commit (Requirement 8.5)
- "Create branch" button in expanded commit view
- Dialog to enter new branch name
- Validates branch name before creation
- Creates branch starting from the selected commit
- Success/error notifications

## Props

```typescript
interface GitHistoryTabProps {
  workflowId: string      // The workflow ID to load history for
  readOnly?: boolean      // If true, hides action buttons (default: false)
}
```

## Usage

```tsx
import { GitHistoryTab } from './git/GitHistoryTab'

function MyComponent() {
  return (
    <GitHistoryTab 
      workflowId="workflow-123"
      readOnly={false}
    />
  )
}
```

## State Management

Uses the `useGitStore` Zustand store for:
- `commits`: Array of commit objects
- `isLoadingCommits`: Loading state for commit fetching
- `commitsError`: Error message if loading fails
- `selectedCommit`: Currently selected commit for detail view
- `operationError`: Error from revert/branch operations
- `loadCommitHistory()`: Fetch commits with pagination
- `selectCommit()`: Select/deselect a commit
- `revertToCommit()`: Revert workflow to a commit
- `createBranchFromCommit()`: Create branch from commit
- `clearErrors()`: Clear error states

## UI Components

### Timeline View
- Visual timeline with dots and connecting lines
- Hover effects for better interactivity
- Active state highlighting for selected commits
- Responsive layout that works in sidebar

### Commit Item
- Compact view showing essential information
- Expandable to show full details
- Action buttons appear only when expanded
- Icons for visual clarity (User, Hash, Clock)

### Dialogs
- **Revert Dialog**: Confirmation with warning about creating new commit
- **Branch Dialog**: Input field for branch name with validation

### Empty States
- "No commits yet" when repository has no commits
- "Loading commits..." during initial load
- Error alerts for failed operations

## Pagination

- Initial load: 20 commits (offset 0)
- Load more: Next 20 commits (offset 20, 40, etc.)
- Automatically hides "Load more" when all commits loaded
- Tracks current page to calculate correct offset

## Date Formatting

Relative time formatting:
- "just now" - less than 1 minute
- "X minutes ago" - less than 1 hour
- "X hours ago" - less than 24 hours
- "X days ago" - less than 7 days
- "Jan 15" - older dates (with year if different)

Full timestamp shown in expanded view.

## Read-Only Mode

When `readOnly={true}`:
- Commit selection still works
- Details can be viewed
- Action buttons (Revert, Create Branch) are hidden
- Prevents accidental modifications

## Error Handling

- Network errors during commit loading
- Failed revert operations
- Failed branch creation
- Invalid branch names
- All errors shown with toast notifications
- Error messages displayed in alert components

## Accessibility

- Keyboard navigation support
- Proper ARIA labels
- Focus management in dialogs
- Disabled states clearly indicated
- Screen reader friendly

## Testing

Comprehensive test coverage in `__tests__/GitHistoryTab.test.tsx`:
- Rendering commit list
- Commit selection/deselection
- Expanded details display
- Revert operation with confirmation
- Branch creation with validation
- Pagination functionality
- Loading and error states
- Read-only mode behavior

## Integration

Integrated into `GitPanel` as the "History" tab:
- Accessible when Git repository is connected
- Shares state with other Git tabs
- Coordinates with branch selector
- Updates after commits, reverts, or branch operations

## Performance Considerations

- Pagination prevents loading entire history at once
- Memoized with `React.memo` to prevent unnecessary re-renders
- Efficient date formatting with caching
- Debounced operations to prevent rapid API calls

## Future Enhancements

Potential improvements:
- Diff view showing changes in each commit
- Search/filter commits by message or author
- Commit comparison between two commits
- Cherry-pick commits to current branch
- Visual branch graph for merge commits
- Export commit history
