# GitCommitInput Component

## Overview

The `GitCommitInput` component provides a commit message input interface with validation, character counting, and commit action functionality for the Git integration feature.

## Requirements

- **2.2**: Commit message input and validation
- **2.3**: Empty commit message prevention

## Features

### 1. Commit Message Input
- Textarea for entering commit messages
- Maximum length: 500 characters
- Minimum length: 1 character (after trimming)
- Placeholder text: "Describe your changes..."
- Disabled when:
  - No changes exist
  - Currently committing
  - Read-only mode

### 2. Character Count Display
- Shows current character count vs. maximum (e.g., "125/500")
- Highlights in orange when approaching limit (>90%)
- Updates in real-time as user types

### 3. Staged Changes Count
- Displays number of staged changes
- Format: "X change(s) staged" or "No changes staged"
- Updates based on Git status

### 4. Commit Message Validation
- **Empty Message**: Prevents commit with empty or whitespace-only messages
- **Max Length**: Prevents commit when message exceeds 500 characters
- **Real-time Feedback**: Clears validation errors as user types
- **Error Display**: Shows validation errors in an alert component

### 5. Commit Button
- Enabled only when:
  - Has unsaved changes (workflow `isDirty` flag OR Git status has changes)
  - Message is valid (non-empty, within length limit)
  - Not currently committing
  - Not in read-only mode
  - Workflow is loaded
- Shows loading state during commit operation
- Icon: GitCommit icon from lucide-react
- Tooltip provides helpful context

**Note**: The button checks the workflow's `isDirty` state, similar to how the Save button works. This ensures that any workflow modifications (adding/removing nodes, changing connections, updating settings) will enable the commit button, even if Git hasn't detected the changes yet.

### 6. Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Commit changes (when button is enabled)
- Prevents default Enter behavior to allow multi-line messages

### 7. Workflow Integration
- Accesses workflow data from `useWorkflowStore`
- Transforms workflow to `WorkflowData` format for Git service
- Validates workflow has required data before committing

### 8. Success/Error Handling
- **Success**: 
  - Clears commit message
  - Shows success toast notification
  - Refreshes Git status (handled by store)
- **Error**:
  - Displays error in validation alert
  - Shows error toast notification
  - Preserves commit message for retry

### 9. Helper Text
- Shows "Make changes to your workflow to enable commits" when no changes exist
- Provides clear guidance to users

## Props

```typescript
interface GitCommitInputProps {
  workflowId: string          // The workflow ID for commit operations
  stagedChangesCount: number  // Number of staged changes
  hasChanges: boolean         // Whether there are any changes
  readOnly?: boolean          // Optional read-only mode flag
}
```

## Usage

```tsx
import { GitCommitInput } from './GitCommitInput'

<GitCommitInput
  workflowId="workflow-123"
  stagedChangesCount={3}
  hasChanges={true}
  readOnly={false}
/>
```

## Dependencies

- **Stores**:
  - `useGitStore`: Git operations and state
  - `useWorkflowStore`: Workflow data access
- **Hooks**:
  - `useGlobalToast`: Toast notifications
- **UI Components**:
  - `Button`: Commit button
  - `Textarea`: Message input
  - `Label`: Input label
  - `Alert`: Validation error display
- **Icons**:
  - `GitCommit`: Commit button icon
  - `Loader2`: Loading spinner
  - `AlertCircle`: Error alert icon

## Validation Rules

1. **Minimum Length**: 1 character (after trimming whitespace)
2. **Maximum Length**: 500 characters (including whitespace)
3. **Required**: Message cannot be empty or whitespace-only
4. **Workflow**: Workflow must be loaded with nodes and connections

## Error Messages

- "Commit message cannot be empty" - When message is empty or whitespace-only
- "Commit message cannot exceed 500 characters" - When message is too long
- "No workflow loaded" - When workflow is not available
- "Workflow data is incomplete" - When workflow lacks required fields
- Custom error messages from Git service on commit failure

## Accessibility

- Proper ARIA labels for form elements
- `aria-invalid` attribute on textarea when validation fails
- `aria-describedby` links textarea to error message
- Descriptive button titles for screen readers
- Keyboard navigation support

## Testing

The component includes comprehensive unit tests covering:
- Rendering and UI elements
- Character count updates
- Validation logic
- Commit button states
- Success/error handling
- Keyboard shortcuts
- Workflow integration
- Edge cases

## Implementation Notes

1. **Workflow Data Transformation**: The component transforms the frontend `Workflow` type to the `WorkflowData` format expected by the Git service. The `triggers` field is set to an empty array as triggers are managed separately in the workflow system.

2. **State Management**: Uses local state for commit message and validation errors, while Git operations are managed through the Zustand store.

3. **Performance**: Component is memoized with `React.memo` to prevent unnecessary re-renders.

4. **User Experience**: Provides immediate feedback through validation, character counting, and clear button states to guide users through the commit process.
