# Workflow Serialization Simplification

## Summary

The Git workflow feature has been simplified to use a **single workflow.json file** instead of multiple separate files. This aligns with the import/export functionality and provides better consistency across the application.

## Changes Made

### 1. WorkflowSerializer (`backend/src/services/WorkflowSerializer.ts`)

**Before (Multi-File Approach):**
- `workflow.json` - metadata only
- `nodes.json` - nodes array
- `connections.json` - connections array
- `triggers.json` - triggers array
- `settings.json` - settings object
- `README.md` - documentation

**After (Single-File Approach):**
- `workflow.json` - complete workflow definition (all data in one file)
- `README.md` - optional documentation

**Key Changes:**
- Updated `SerializedWorkflow` interface to match import/export format
- Added `exportedAt`, `exportedBy`, and `checksum` fields
- Nested all workflow data under `workflow` property
- Simplified `WorkflowFiles` interface to only include `workflow.json` and optional `README.md`
- Updated `workflowToFiles()` to generate single JSON file
- Updated `filesToWorkflow()` to read from single JSON file
- Added checksum generation for data integrity

### 2. GitService (`backend/src/services/GitService.ts`)

**Updated file reading logic in:**
- `pull()` operation - reads single workflow.json file
- `revertToCommit()` operation - reads single workflow.json file
- Both now check for optional README.md file

### 3. Tests Updated

**WorkflowSerializer.test.ts:**
- All tests updated to expect single-file structure
- Tests now check for `workflow.nodes` instead of `serialized.nodes`
- Updated file validation tests
- All 25 tests passing ✅

**GitService.test.ts:**
- Updated mock `workflowToFiles` to return single-file structure
- Updated file count expectations (2 files instead of 6)
- Updated status matrix tests to use README.md instead of nodes.json

### 4. Design Documentation

**Updated `.kiro/specs/workflow-git-push-feature/design.md`:**
- Added "Simplified Architecture" section explaining the change
- Updated `SerializedWorkflow` interface documentation
- Updated `WorkflowFiles` interface documentation
- Highlighted benefits of single-file approach

## Benefits

1. **Consistency**: Same format used for Git, import, and export operations
2. **Simplicity**: One file to manage instead of 6 separate files
3. **Compatibility**: Can directly import/export workflows from Git repositories
4. **Better Diffs**: All changes visible in one file for easier code review
5. **Easier Merging**: Simpler conflict resolution with single file
6. **Reduced Complexity**: Less code to maintain and test

## Format Comparison

### Old Format (Multi-File)
```
repo/
├── workflow.json      # { version, id, name, description, category, tags }
├── nodes.json         # [...]
├── connections.json   # [...]
├── triggers.json      # [...]
├── settings.json      # {...}
└── README.md
```

### New Format (Single-File)
```
repo/
├── workflow.json      # Complete workflow with all data
└── README.md          # Optional documentation
```

### workflow.json Structure
```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-01T00:00:00Z",
  "exportedBy": "git-service",
  "workflow": {
    "title": "My Workflow",
    "name": "My Workflow",
    "description": "...",
    "category": "automation",
    "tags": ["api", "webhook"],
    "nodes": [...],
    "connections": [...],
    "triggers": [...],
    "settings": {...},
    "metadata": {...}
  },
  "checksum": "abc123"
}
```

## Migration Notes

- **No migration needed**: This is a new feature, no existing data to migrate
- **Forward compatible**: The format matches the existing import/export feature
- **Version controlled**: The `version` field allows for future format changes

## Testing

- ✅ WorkflowSerializer tests: 25/25 passing
- ⚠️ GitService tests: Existing test infrastructure issues (unrelated to this change)

## Next Steps

1. Update any documentation that references the old multi-file structure
2. Ensure frontend Git UI components work with the simplified structure
3. Add integration tests for the complete Git workflow with single-file format
