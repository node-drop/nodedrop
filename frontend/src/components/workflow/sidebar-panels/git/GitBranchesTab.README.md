# GitBranchesTab Component

## Overview

The `GitBranchesTab` component provides a comprehensive branch management interface for Git-enabled workflows. It displays local and remote branches, allows branch creation and switching, and handles uncommitted changes warnings.

## Requirements

Implements the following requirements from the design document:

- **6.1**: Create new branches with validation
- **6.2**: Switch branches and load branch-specific configuration
- **6.3**: Display all local and remote branches
- **6.4**: Handle uncommitted changes during branch switch
- **6.5**: Validate branch names against Git conventions

## Features

### Branch Display

- **Separate Sections**: Local and remote branches are displayed in separate sections
- **Current Branch Highlighting**: The active branch is highlighted with a "Current" badge and check icon
- **Last Commit Info**: Shows commit hash, message, author, and timestamp for each branch
- **Branch Count**: Header displays total number of branches

### Branch Creation

- **New Branch Dialog**: Modal dialog for creating new branches
- **Branch Name Validation**: Enforces Git naming conventions:
  - No spaces
  - No double dots (..)
  - Cannot start or end with dot (.)
  - No invalid characters (~^:?*[]\)
  - Cannot end with .lock
  - Must be unique
- **Real-time Feedback**: Validation errors shown immediately
- **Keyboard Support**: Press Enter to create branch

### Branch Switching

- **Click to Switch**: Click any non-current branch to switch to it
- **Uncommitted Changes Warning**: Shows dialog if uncommitted changes exist
- **Loading State**: Visual feedback during branch switch operation
- **Automatic Refresh**: Reloads status and commit history after switch

### Branch Deletion

- **Delete Button**: Appears on hover for non-current branches
- **Confirmation Dialog**: Requires confirmation before deletion
- **Protection**: Cannot delete current branch
- **Warning Messages**: Clear feedback for invalid operations

### Visual Design

- **Icons**: 
  - GitBranch icon for branches
  - Check icon for current branch
  - Laptop icon for local branches section
  - Globe icon for remote branches section
- **Color Coding**: Current branch uses primary color
- **Hover Effects**: Interactive elements highlight on hover
- **Loading Indicators**: Spinners for async operations

## Props

```typescript
interface GitBranchesTabProps {
  workflowId: string    // The workflow ID for Git operations
  readOnly?: boolean    // Disable all modification actions
}
```

## Usage

```tsx
import { GitBranchesTab } from '@/components/workflow/sidebar-panels/git/GitBranchesTab'

function GitPanel({ workflowId }) {
  return (
    <GitBranchesTab 
      workflowId={workflowId}
      readOnly={false}
    />
  )
}
```

## State Management

Uses the `useGitStore` Zustand store for:

- `branches`: Array of all branches (local and remote)
- `currentBranch`: Name of the currently checked out branch
- `isLoadingBranches`: Loading state for branch list
- `branchesError`: Error message if branch loading fails
- `isSwitchingBranch`: Loading state for branch switch operation
- `isCreatingBranch`: Loading state for branch creation
- `operationError`: Error message for failed operations
- `status`: Git status including uncommitted changes

### Actions

- `loadBranches(workflowId)`: Fetch all branches
- `createBranch(workflowId, branchName)`: Create new branch
- `switchBranch(workflowId, branchName)`: Switch to different branch
- `clearErrors()`: Clear all error states

## Branch Name Validation Rules

The component enforces Git's branch naming conventions:

1. **No empty names**: Branch name cannot be empty or whitespace-only
2. **No double dots**: Cannot contain ".."
3. **No leading/trailing dots**: Cannot start or end with "."
4. **No spaces**: Spaces are not allowed
5. **No special characters**: Cannot contain ~^:?*[]\
6. **No .lock suffix**: Cannot end with ".lock"
7. **Must be unique**: Cannot match existing branch name

## Error Handling

### Branch Loading Errors
- Displays error alert at top of component
- Shows error message from store
- Allows retry by reloading

### Branch Creation Errors
- Validation errors shown via toast notifications
- API errors displayed with specific message
- Dialog remains open for correction

### Branch Switch Errors
- Shows error toast with failure reason
- Preserves current branch on failure
- Allows retry

### Uncommitted Changes
- Detects uncommitted changes before switch
- Shows warning dialog with change count
- Offers options to commit or discard (future implementation)

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactions
- **ARIA Labels**: Proper labels for screen readers
- **Focus Management**: Logical focus order in dialogs
- **Button States**: Clear disabled states for unavailable actions

## Performance Considerations

- **Memoization**: Component wrapped in `memo()` to prevent unnecessary re-renders
- **Callback Optimization**: Uses `useCallback` for event handlers
- **Conditional Rendering**: Only renders visible sections
- **Lazy Loading**: Branches loaded on demand

## Future Enhancements

1. **Branch Deletion**: Full implementation of branch deletion (currently shows placeholder)
2. **Discard Changes**: Implement actual discard functionality for uncommitted changes
3. **Branch Comparison**: Show diff between branches
4. **Merge Operations**: Add merge functionality
5. **Branch Search**: Filter branches by name
6. **Branch Sorting**: Sort by name, date, or other criteria
7. **Branch Details**: Expand to show more commit history per branch

## Testing

Comprehensive test coverage includes:

- Branch list display (local and remote)
- Current branch highlighting
- Branch creation with validation
- Branch switching with uncommitted changes handling
- Branch deletion protection
- Loading and error states
- Read-only mode
- Branch name validation rules

Run tests:
```bash
npm test GitBranchesTab.test.tsx
```

## Related Components

- `GitPanel`: Parent component that contains the branches tab
- `GitSourceControlTab`: Sibling tab for commit operations
- `GitHistoryTab`: Sibling tab for commit history
- `GitConnectionSection`: Connection management component

## Dependencies

- `@/stores/git`: Git state management
- `@/services/git.service`: Git API service
- `@/hooks/useToast`: Toast notifications
- `@/components/ui/*`: UI components (Button, Dialog, Input, etc.)
- `lucide-react`: Icons
