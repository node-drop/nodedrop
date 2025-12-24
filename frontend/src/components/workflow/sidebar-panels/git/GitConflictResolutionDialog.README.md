# GitConflictResolutionDialog Component

## Overview

The `GitConflictResolutionDialog` component provides a user interface for resolving Git merge conflicts. It displays conflicting files, shows diff views, and provides options to accept ours/theirs or manually edit the resolution.

## Requirements

- **3.4**: WHEN a push operation fails due to conflicts THEN the Workflow System SHALL notify the user and provide conflict resolution options
- **7.3**: WHEN a pull operation encounters merge conflicts THEN the Workflow System SHALL present the conflicts and provide resolution tools

## Features

### Conflict File List
- Displays all conflicting files in a sidebar
- Shows resolution status for each file (resolved/unresolved)
- Allows navigation between files
- Highlights currently selected file

### Diff View
- Shows "Your Changes (Ours)" - current local version
- Shows "Their Changes (Theirs)" - incoming remote version
- Displays content in formatted, readable blocks
- Syntax highlighting for JSON content

### Resolution Strategies

1. **Accept Ours**: Use the local version
2. **Accept Theirs**: Use the remote version
3. **Manual Edit**: Manually edit the content to create a custom resolution

### Progress Tracking
- Visual progress bar showing resolution status
- Count of resolved vs total files
- Percentage completion indicator

### Resolution Workflow
1. Select a conflicting file from the list
2. Review both versions (ours and theirs)
3. Choose a resolution strategy
4. Mark the file as resolved
5. Repeat for all files
6. Click "Resolve All Conflicts" when complete

## Props

```typescript
interface GitConflictResolutionDialogProps {
  open: boolean                                    // Dialog open state
  onOpenChange: (open: boolean) => void           // Dialog state change handler
  conflicts: ConflictFile[]                        // Array of conflict files
  onResolve: (resolutions: Map<string, string>) => Promise<void>  // Resolution handler
  onCancel: () => void                            // Cancel handler
  isResolving?: boolean                           // Loading state during resolution
}

interface ConflictFile {
  path: string          // File path
  ours: string          // Local version content
  theirs: string        // Remote version content
  base?: string         // Common ancestor version (optional)
  resolved: boolean     // Resolution status
  resolution?: string   // Resolved content (if already resolved)
}
```

## Usage

```tsx
import { GitConflictResolutionDialog } from './GitConflictResolutionDialog'

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictFile[]>([])

  const handleResolve = async (resolutions: Map<string, string>) => {
    // Send resolutions to backend
    await gitService.resolveConflicts(workflowId, resolutions)
    setShowDialog(false)
  }

  const handleCancel = () => {
    setShowDialog(false)
  }

  return (
    <GitConflictResolutionDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      conflicts={conflicts}
      onResolve={handleResolve}
      onCancel={handleCancel}
      isResolving={false}
    />
  )
}
```

## Integration with Git Store

The dialog is automatically opened when a pull operation detects conflicts:

```typescript
// In GitSourceControlTab
useEffect(() => {
  if (lastPullResult?.conflicts) {
    setShowConflictDialog(true)
  }
}, [lastPullResult])
```

## User Experience

### Visual Feedback
- Unresolved files show orange alert icon
- Resolved files show green checkmark icon
- Progress bar updates as files are resolved
- Selected resolution is highlighted in green

### Keyboard Navigation
- Click files to navigate
- Tab through resolution buttons
- Enter to confirm resolution

### Error Handling
- Validates that all files are resolved before allowing submission
- Shows error messages if resolution fails
- Preserves state if user cancels

## Accessibility

- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

## Testing

The component includes comprehensive tests covering:
- Rendering conflict list
- Progress tracking
- Resolution strategy selection
- Manual editing
- File navigation
- Button states and interactions

Run tests with:
```bash
npm test GitConflictResolutionDialog.test.tsx
```

## Future Enhancements

Potential improvements for future iterations:
- Side-by-side diff view
- Syntax highlighting for different file types
- Three-way merge view (base, ours, theirs)
- Conflict markers in manual edit mode
- Undo/redo for manual edits
- Search within file content
- Line-by-line conflict resolution
