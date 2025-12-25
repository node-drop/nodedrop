# Rename node_types Table to nodes

## Overview
This document describes the changes made to rename the `node_types` table to `nodes` throughout the codebase.

## Changes Made

### 1. Database Schema
- **File**: `backend/src/db/schema/nodes.ts`
  - Changed table name from `'node_types'` to `'nodes'`
  - Updated index names:
    - `node_types_identifier_unique` → `nodes_identifier_unique`
    - `node_types_workspace_id_idx` → `nodes_workspace_id_idx`
    - `node_types_is_core_idx` → `nodes_is_core_idx`

### 2. Migration
- **File**: `backend/src/db/migrations/0002_rename_node_types_to_nodes.sql`
  - Created new migration to rename the table
  - Renames all associated indexes and constraints
  - Safe to run on existing databases

### 3. SQL Scripts
- **File**: `backend/apply-iscore-migration.sql`
  - Updated references from `node_types` to `nodes`

### 4. Documentation
- **File**: `backend/MIGRATION_VERIFICATION.md`
  - Updated all references from `node_types` to `nodes`

## Migration Instructions

To apply this change to an existing database:

```bash
# Run the migration
cd backend
npm run db:migrate
```

Or manually execute the migration SQL:

```sql
-- Rename node_types table to nodes
ALTER TABLE "node_types" RENAME TO "nodes";

-- Rename indexes
ALTER INDEX "node_types_identifier_unique" RENAME TO "nodes_identifier_unique";
ALTER INDEX "node_types_workspace_id_idx" RENAME TO "nodes_workspace_id_idx";
ALTER INDEX "node_types_is_core_idx" RENAME TO "nodes_is_core_idx";

-- Rename constraint
ALTER TABLE "nodes" RENAME CONSTRAINT "node_types_identifier_unique" TO "nodes_identifier_unique";
```

## Backward Compatibility

- The exported constant name `nodeTypes` remains unchanged in the code
- All TypeScript code continues to work without changes
- Only the database table name has changed
- Historical migration files (0000, 0001) remain unchanged to preserve migration history

## Verification

After running the migration, verify the changes:

```sql
-- Check table exists
SELECT * FROM information_schema.tables WHERE table_name = 'nodes';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'nodes';

-- Check constraints
SELECT conname FROM pg_constraint WHERE conrelid = 'nodes'::regclass;
```

## Notes

- The variable name `nodeTypes` in the schema file remains unchanged for code consistency
- This is a pure rename operation with no data loss
- All foreign key relationships are automatically updated by PostgreSQL
