-- Verification script for node_types to nodes table rename
-- Run this after applying the migration to verify everything is correct

-- 1. Check that the 'nodes' table exists
SELECT 
    'Table exists: nodes' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'nodes'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 2. Check that the old 'node_types' table does NOT exist
SELECT 
    'Old table removed: node_types' as check_name,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'node_types'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 3. Check that all expected indexes exist on 'nodes' table
SELECT 
    'Index: nodes_identifier_unique' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'nodes' AND indexname = 'nodes_identifier_unique'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status
UNION ALL
SELECT 
    'Index: nodes_workspace_id_idx' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'nodes' AND indexname = 'nodes_workspace_id_idx'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status
UNION ALL
SELECT 
    'Index: nodes_is_core_idx' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'nodes' AND indexname = 'nodes_is_core_idx'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 4. Check that old indexes do NOT exist
SELECT 
    'Old index removed: node_types_identifier_unique' as check_name,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'node_types_identifier_unique'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status
UNION ALL
SELECT 
    'Old index removed: node_types_workspace_id_idx' as check_name,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'node_types_workspace_id_idx'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status
UNION ALL
SELECT 
    'Old index removed: node_types_is_core_idx' as check_name,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'node_types_is_core_idx'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 5. Check constraint
SELECT 
    'Constraint: nodes_identifier_unique' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'nodes_identifier_unique' AND conrelid = 'nodes'::regclass
    ) THEN '✓ PASS' ELSE '✗ FAIL' END as status;

-- 6. Count records to ensure no data loss
SELECT 
    'Record count' as check_name,
    COUNT(*)::text || ' records' as status
FROM nodes;

-- 7. Show sample data
SELECT 
    'Sample data (first 5 records)' as info;
SELECT id, identifier, display_name, is_core, workspace_id 
FROM nodes 
ORDER BY created_at 
LIMIT 5;
