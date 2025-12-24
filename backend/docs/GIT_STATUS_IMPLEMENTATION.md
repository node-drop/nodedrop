# Git Status and Change Detection Implementation

## Overview

This document describes the implementation of Git status and change detection functionality for the workflow Git integration feature.

## Implementation Summary

### Task 5: Git Status and Change Detection

**Status**: ✅ Completed

**Requirements Addressed**:
- Requirement 2.1: Detect workflow modifications
- Requirement 4.1: Display current branch and sync status
- Requirement 4.2: Display count of modified files/changes
- Requirement 4.3: Display number of commits ahead of remote

### New Interfaces

#### GitStatus
```typescript
interface GitStatus {
  workflowId: string;
  branch: string;
  modified: boolean;
  staged: boolean;
  unpushedCommits: number;
  ahead: number;
  behind: number;
  changes: GitChange[];
}
```

#### GitChange
```typescript
interface GitChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  staged: boolean;
}
```

### New Methods

#### 1. `getStatus(workflowId, userId, currentWorkflow?): Promise<GitStatus>`

Main method that returns the complete Git status for a workflow.

**Features**:
- Validates Git configuration and connection
- Detects all file changes in the working directory
- Calculates ahead/behind counts relative to remote
- Returns comprehensive status information

**Error Handling**:
- Throws `AppError` if repository not configured (404)
- Throws `AppError` if repository not connected (400)
- Throws `AppError` if repository directory not found (404)

#### 2. `detectChanges(repoPath, workflowId, currentWorkflow?): Promise<GitChange[]>`

Private method that detects changes in the working directory.

**Features**:
- Uses `git.statusMatrix()` to get file status
- Identifies added, modified, and deleted files
- Determines if changes are staged or unstaged
- Filters out `.git` directory and auto-generated `README.md`

**Status Matrix Interpretation**:
- `[filepath, HEADStatus, WorkdirStatus, StageStatus]`
- Status codes: 0 = absent, 1 = present, 2 = modified
- Added: HEADStatus=0, WorkdirStatus=1
- Modified: HEADStatus=1, WorkdirStatus=2
- Deleted: HEADStatus=1, WorkdirStatus=0

#### 3. `getAheadCount(repoPath, branch, remoteName): Promise<number>`

Private method that calculates commits ahead of remote.

**Features**:
- Compares local commits with remote commits
- Returns count of commits in local but not in remote
- Handles case where remote branch doesn't exist (returns all local commits)
- Returns 0 on error

#### 4. `getBehindCount(repoPath, branch, remoteName): Promise<number>`

Private method that calculates commits behind remote.

**Features**:
- Compares remote commits with local commits
- Returns count of commits in remote but not in local
- Handles case where remote branch doesn't exist (returns 0)
- Returns 0 on error

## Testing

### Unit Tests

Comprehensive unit tests added to `GitService.test.ts`:

1. **No changes test**: Verifies clean repository returns empty status
2. **Modified files test**: Detects modified files correctly
3. **Added files test**: Detects newly added files
4. **Deleted files test**: Detects deleted files
5. **Multiple changes test**: Handles multiple changes of different types
6. **Ahead count test**: Calculates commits ahead correctly
7. **Behind count test**: Calculates commits behind correctly
8. **No remote branch test**: Handles missing remote branch gracefully
9. **Filter test**: Skips `.git` and `README.md` files
10. **Error handling tests**: Validates error conditions
11. **Staged/unstaged test**: Differentiates between staged and unstaged changes

### Integration Test

Created `GitService.integration.test.ts` to verify real Git operations:
- Tests actual file creation and change detection
- Verifies integration with isomorphic-git library
- Validates end-to-end functionality

## Usage Example

```typescript
const gitService = new GitService();

// Get status for a workflow
const status = await gitService.getStatus(workflowId, userId);

console.log(`Branch: ${status.branch}`);
console.log(`Modified: ${status.modified}`);
console.log(`Staged: ${status.staged}`);
console.log(`Ahead: ${status.ahead} commits`);
console.log(`Behind: ${status.behind} commits`);
console.log(`Changes: ${status.changes.length}`);

// Iterate through changes
for (const change of status.changes) {
  console.log(`${change.type}: ${change.path} (staged: ${change.staged})`);
}
```

## Dependencies

- `isomorphic-git`: Git operations
- `fs-extra`: File system operations
- `drizzle-orm`: Database queries

## Next Steps

The following tasks depend on this implementation:
- Task 6: Implement commit operations (uses getStatus to validate changes)
- Task 7: Implement push operations (uses ahead count)
- Task 8: Implement pull operations (uses behind count)
- Task 18: Implement GitSourceControlTab component (displays status)

## Notes

- The implementation uses `isomorphic-git` which provides a pure JavaScript Git implementation
- Status checks are efficient and don't require external Git binaries
- The ahead/behind calculation handles edge cases like missing remote branches
- All sensitive operations are logged for debugging and audit purposes
