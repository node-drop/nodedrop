# GitConnectionSection Component

## Overview

The `GitConnectionSection` component manages Git repository connections for workflows. It provides a form for connecting to remote Git repositories and displays connection status when connected.

## Requirements Implemented

- **1.1**: Repository connection initiation
- **1.2**: Valid credential handling and connection establishment
- **1.3**: Invalid credential error handling
- **1.5**: Clear connection UI in workflow interface
- **5.1**: Secure token storage (via GitCredentialManager)
- **5.4**: OAuth authentication support (placeholder for future implementation)

## Features

### Connection Form (Not Connected State)

1. **Repository URL Input**
   - HTTPS URL validation
   - Required field with validation
   - Placeholder example provided

2. **Branch Selection**
   - Optional field (defaults to 'main')
   - Allows custom branch specification

3. **Git Provider Selection**
   - GitHub
   - GitLab
   - Bitbucket

4. **Authentication Method Selection**
   - Personal Access Token (implemented)
   - OAuth (placeholder for task 11)

5. **Token Input**
   - Secure password masking
   - Toggle visibility with eye icon
   - Required field validation

6. **Form Validation**
   - Empty URL validation
   - Empty token validation
   - URL format validation
   - Clear error messages

7. **Help Section**
   - Instructions for obtaining tokens from each provider

### Connected State Display

1. **Connection Status**
   - Success indicator with green alert
   - Repository information panel

2. **Repository Information**
   - Repository URL with external link button
   - Current branch name
   - Last sync timestamp (if available)
   - Unpushed commits count (if any)

3. **Edit Credentials** ⭐ NEW FEATURE
   - Button to update credentials without disconnecting
   - Edit mode shows:
     - Current repository URL (read-only)
     - Current branch (read-only)
     - Provider selector
     - New token input with secure masking
     - Update and Cancel buttons
   - Use cases:
     - Token expired or revoked
     - Need to change token permissions
     - Security best practice (regular token rotation)
     - Switching between different tokens

4. **Disconnect Button**
   - Removes connection to remote repository
   - Requires user confirmation
   - Clears stored credentials
   - Permission requirements

### Connected State

1. **Connection Status**
   - Success indicator
   - Repository URL display with external link
   - Current branch display
   - Last sync timestamp
   - Unpushed commits count

2. **Disconnect Functionality**
   - Confirmation dialog
   - Respects readOnly prop

## Props

```typescript
interface GitConnectionSectionProps {
  workflowId: string          // The workflow ID to connect
  connected: boolean           // Current connection status
  repositoryInfo?: GitRepositoryInfo  // Repository info when connected
  readOnly?: boolean          // Disable all actions (default: false)
}
```

## Usage

```tsx
import { GitConnectionSection } from '@/components/workflow/sidebar-panels/git'

// Not connected state
<GitConnectionSection
  workflowId="workflow-123"
  connected={false}
/>

// Connected state
<GitConnectionSection
  workflowId="workflow-123"
  connected={true}
  repositoryInfo={repositoryInfo}
/>

// Read-only mode
<GitConnectionSection
  workflowId="workflow-123"
  connected={true}
  repositoryInfo={repositoryInfo}
  readOnly={true}
/>
```

## State Management

The component uses the `useGitStore` Zustand store for:
- `connectRepository(workflowId, config)` - Connect to repository
- `disconnectRepository(workflowId)` - Disconnect from repository
- `isConnecting` - Loading state
- `connectionError` - Error messages

## Validation Rules

1. **Repository URL**
   - Must not be empty
   - Must be a valid URL format
   - Should be HTTPS URL

2. **Access Token**
   - Must not be empty
   - Trimmed before submission

3. **Branch Name**
   - Optional (defaults to 'main')
   - Trimmed before submission

## Security Features

1. **Token Masking**
   - Password input type by default
   - Toggle visibility option
   - Token cleared from form after successful connection

2. **Secure Storage**
   - Tokens encrypted via GitCredentialManager
   - Never logged in plain text
   - Stored securely in backend

3. **Error Sanitization**
   - Connection errors don't expose sensitive data
   - Clear, user-friendly error messages

## Accessibility

- Proper label associations
- Required field indicators (*)
- Disabled states for loading/readonly
- Keyboard navigation support
- Screen reader friendly

## Styling

- Uses Tailwind CSS utility classes
- Consistent with application design system
- Responsive layout
- Dark mode support via CSS variables

## Future Enhancements

1. **OAuth Flow** (Task 11)
   - GitHub OAuth
   - GitLab OAuth
   - Bitbucket OAuth
   - Token refresh handling

2. **Advanced Features**
   - SSH key authentication
   - Multiple credential storage
   - Connection testing before save
   - Repository validation

## Testing

See `__tests__/GitConnectionSection.test.tsx` for comprehensive test coverage including:
- Form validation
- Connection flow
- Disconnect flow
- Error handling
- Loading states
- ReadOnly mode
- Token visibility toggle

## Dependencies

- `@/components/ui/button` - Button component
- `@/components/ui/input` - Input component
- `@/components/ui/label` - Label component
- `@/components/ui/select` - Select dropdown component
- `@/components/ui/alert` - Alert component
- `@/stores/git` - Git state management
- `@/services/git.service` - Git service types
- `lucide-react` - Icons

## Related Components

- `GitPanel` - Parent container component
- `GitSourceControlTab` - Source control operations (Task 18)
- `GitHistoryTab` - Commit history (Task 21)
- `GitBranchesTab` - Branch management (Task 22)
