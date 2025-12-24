# Git Store Documentation

## Overview

The Git store manages all Git version control state for workflows in the application. It provides a centralized state management solution using Zustand with persistence support.

## Requirements

This store implements the following requirements:
- **1.4**: Display connection status and current branch
- **4.1**: Display current branch name and sync status
- **4.2**: Display count of uncommitted changes
- **4.3**: Display number of commits ahead of remote

## State Structure

### Connection State
- `repositoryInfo`: Information about the connected repository
- `isConnected`: Whether a repository is connected
- `isConnecting`: Loading state for connection operations
- `connectionError`: Error message from connection operations

### Git Status State
- `status`: Current Git status (changes, staged files, sync info)
- `isLoadingStatus`: Loading state for status refresh
- `statusError`: Error message from status operations
- `lastStatusUpdate`: Timestamp of last status update

### Branch State
- `branches`: Array of all branches (local and remote)
- `currentBranch`: Name of the current branch
- `isLoadingBranches`: Loading state for branch operations
- `branchesError`: Error message from branch operations

### Commit History State
- `commits`: Array of commits in history
- `isLoadingCommits`: Loading state for commit operations
- `commitsError`: Error message from commit operations
- `selectedCommit`: Currently selected commit for viewing details

### Operation States
- `isCommitting`: Loading state for commit operation
- `isPushing`: Loading state for push operation
- `isPulling`: Loading state for pull operation
- `isSwitchingBranch`: Loading state for branch switch
- `isCreatingBranch`: Loading state for branch creation
- `operationError`: Error message from Git operations

### Operation Results
- `lastPushResult`: Result of last push operation
- `lastPullResult`: Result of last pull operation

## Usage Examples

### Basic Usage

```typescript
import { useGitStore } from '@/stores';

function GitPanel() {
  const {
    isConnected,
    repositoryInfo,
    status,
    currentBranch,
    connectRepository,
    refreshStatus,
  } = useGitStore();

  // Check if connected
  if (!isConnected) {
    return <GitConnectionForm onConnect={connectRepository} />;
  }

  // Display status
  return (
    <div>
      <h3>Branch: {currentBranch}</h3>
      <p>Changes: {status?.changes.length || 0}</p>
      <p>Unpushed commits: {status?.unpushedCommits || 0}</p>
      <button onClick={() => refreshStatus(workflowId)}>
        Refresh
      </button>
    </div>
  );
}
```

### Connection Management

```typescript
// Initialize a new repository
await initRepository(workflowId);

// Connect to existing repository
await connectRepository(workflowId, {
  repositoryUrl: 'https://github.com/user/repo.git',
  branch: 'main',
  credentials: {
    type: 'personal_access_token',
    token: 'ghp_xxxxx',
    provider: 'github',
  },
});

// Disconnect
await disconnectRepository(workflowId);

// Get repository info
await getRepositoryInfo(workflowId);
```

### Status Management

```typescript
// Refresh Git status
await refreshStatus(workflowId);

// Clear status
clearStatus();

// Access status data
const { status } = useGitStore();
console.log('Modified:', status?.modified);
console.log('Changes:', status?.changes);
console.log('Ahead:', status?.ahead);
console.log('Behind:', status?.behind);
```

### Branch Operations

```typescript
// Load branches
await loadBranches(workflowId);

// Create new branch
await createBranch(workflowId, 'feature-branch');

// Switch branch
await switchBranch(workflowId, 'main');

// Set current branch (UI only)
setCurrentBranch('main');
```

### Commit Operations

```typescript
// Create commit
await commit(workflowId, 'Add new feature', workflowData);

// Load commit history
await loadCommitHistory(workflowId, 50, 0);

// Select commit for viewing
selectCommit(commit);

// Revert to commit
await revertToCommit(workflowId, commitHash);

// Create branch from commit
await createBranchFromCommit(workflowId, commitHash, 'hotfix');
```

### Push/Pull Operations

```typescript
// Push commits
await push(workflowId);

// Push with options
await push(workflowId, { force: true, branch: 'main' });

// Pull changes
await pull(workflowId);

// Pull with options
await pull(workflowId, { strategy: 'rebase' });

// Sync (pull then push)
await sync(workflowId);
```

### Error Handling

```typescript
// Clear all errors
clearErrors();

// Set operation error
setOperationError('Custom error message');

// Access errors
const {
  connectionError,
  statusError,
  branchesError,
  commitsError,
  operationError,
} = useGitStore();
```

### Selective State Subscription

For better performance, subscribe only to the state you need:

```typescript
// Subscribe to specific state
const isConnected = useGitStore(state => state.isConnected);
const currentBranch = useGitStore(state => state.currentBranch);
const status = useGitStore(state => state.status);

// Subscribe to multiple related states
const { branches, currentBranch, isLoadingBranches } = useGitStore(
  state => ({
    branches: state.branches,
    currentBranch: state.currentBranch,
    isLoadingBranches: state.isLoadingBranches,
  })
);
```

### Persistence

The store automatically persists the following to localStorage:
- `repositoryInfo`: Repository connection information
- `isConnected`: Connection status
- `currentBranch`: Current branch name

This allows the UI to restore connection state on page reload.

## Best Practices

1. **Always check connection status** before performing Git operations
2. **Handle errors gracefully** - all async operations can throw errors
3. **Refresh status after operations** - most operations automatically refresh status
4. **Use selective subscriptions** - only subscribe to state you need for better performance
5. **Clear errors** - call `clearErrors()` when dismissing error messages
6. **Reset on logout** - call `reset()` when user logs out or switches workflows

## Integration with UI Components

The Git store is designed to work seamlessly with the Git UI components:

- **GitPanel**: Main panel component that uses connection and status state
- **GitConnectionSection**: Uses connection management actions
- **GitSourceControlTab**: Uses status, commit, push, and pull actions
- **GitHistoryTab**: Uses commit history state and actions
- **GitBranchesTab**: Uses branch state and actions

## Testing

The store includes comprehensive unit tests covering:
- Initial state
- Connection management
- Status management
- Branch operations
- Commit operations
- Push/Pull operations
- Error handling
- Reset functionality

Run tests with:
```bash
npm test -- git.test.ts --run
```

## Type Safety

All actions and state are fully typed using TypeScript interfaces from the Git service. This ensures type safety throughout the application when working with Git operations.
