# Git Components

This directory contains all Git-related components for the workflow editor's Git integration feature.

## Implemented Components

### GitPanel (Task 16) ✅

**Location:** `../GitPanel.tsx`

**Purpose:** Main Git panel component that renders in the RightSidebar when the Git tab is active.

**Features:**
- Connection status check on mount
- Conditional rendering based on connection state:
  - Shows "No workflow loaded" message when no workflowId
  - Shows GitConnectionSection when not connected
  - Shows Git sub-tabs when connected
- Branch selector dropdown in header
- Three sub-tabs: Source Control, History, Branches
- Integrates with Git store for state management

**Requirements:** 1.1, 1.4, 1.5

**Props:**
- `workflowId?: string` - The workflow ID to manage Git for
- `readOnly?: boolean` - Whether the panel is in read-only mode

**State Management:**
- Uses `useGitStore` for Git state
- Calls `getRepositoryInfo` on mount to check connection status
- Manages active sub-tab state locally

**UI Structure:**
```
GitPanel
├── No workflow message (if no workflowId)
├── GitConnectionSection (if not connected)
└── Connected state
    ├── Branch selector header
    │   ├── Current branch display
    │   └── Branch dropdown menu
    ├── Repository URL display
    └── Sub-tabs
        ├── Source Control tab
        ├── History tab
        └── Branches tab
```

## Placeholder Components (To be implemented)

### GitConnectionSection (Task 17)

**Purpose:** Git connection management UI

**Features (planned):**
- Repository URL input form
- Credential type selector (Personal Access Token / OAuth)
- Token input with secure masking
- Provider selector (GitHub, GitLab, Bitbucket)
- Connect/disconnect buttons
- Connection status display

**Requirements:** 1.1, 1.2, 1.3, 1.5, 5.1, 5.4

### GitSourceControlTab (Task 18)

**Purpose:** Source control operations UI

**Features (planned):**
- Changes count and status display
- GitChangesList component
- GitCommitInput component
- Action buttons (Push, Pull, Sync, Refresh)
- Loading states and notifications

**Requirements:** 2.1, 2.2, 2.5, 3.1, 3.2, 3.5, 7.1

### GitHistoryTab (Task 21)

**Purpose:** Commit history viewer

**Features (planned):**
- Commit list with timeline view
- Commit details display
- Revert to commit functionality
- Create branch from commit
- Pagination support

**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5

### GitBranchesTab (Task 22)

**Purpose:** Branch management UI

**Features (planned):**
- List of local and remote branches
- Current branch highlighting
- New branch creation
- Branch switching
- Branch deletion with confirmation
- Last commit info per branch

**Requirements:** 6.1, 6.2, 6.3, 6.4, 6.5

## Integration

The GitPanel is integrated into the RightSidebar component:

1. **Tab Trigger:** Git icon (GitBranch) in the TabsList
2. **Tab Value:** `'git'`
3. **Rendering:** Renders when `rightSidebarTab === 'git'`
4. **Props:** Receives `workflowId` from workflow store and `readOnly` flag

## State Management

All Git components use the `useGitStore` Zustand store for state management:

- **Connection state:** `isConnected`, `repositoryInfo`, `connectionError`
- **Branch state:** `branches`, `currentBranch`
- **Status state:** `status`, `changes`
- **Commit state:** `commits`, `selectedCommit`
- **Operation states:** `isCommitting`, `isPushing`, `isPulling`, etc.

## Next Steps

1. **Task 17:** Implement GitConnectionSection with connection form
2. **Task 18:** Implement GitSourceControlTab with changes and commit UI
3. **Task 19:** Implement GitChangesList component
4. **Task 20:** Implement GitCommitInput component
5. **Task 21:** Implement GitHistoryTab with commit history
6. **Task 22:** Implement GitBranchesTab with branch management

## Testing

Tests are located in `../__tests__/GitPanel.test.tsx` and verify:
- Component renders correctly in different states
- Connection status check on mount
- Conditional rendering based on connection state
- Branch selector functionality
- Sub-tab switching

## Dependencies

- `@/components/ui/*` - Shadcn UI components
- `lucide-react` - Icons
- `@/stores/git` - Git state management
- `@/services/git.service` - Git API service
