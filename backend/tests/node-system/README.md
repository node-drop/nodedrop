# Node System Tests

This directory contains test scripts for the custom node system.

## Test Files

### `test-production-nodes.js`
Tests the production node discovery and registration process. Verifies that built-in nodes are properly initialized and registered.

### `test-full-startup.js`
Simulates the complete production startup process including:
- Built-in node initialization
- Custom node loading via NodeLoader
- Credential type registration
- Node execution testing

### `test-nodeloader.js`
Tests the NodeLoader service specifically:
- Custom node directory scanning
- Package validation
- Node and credential loading

### `test-upload-process.js`
Tests the complete custom node upload process:
- ZIP file extraction
- Package structure validation
- Dependency installation
- NodeLoader integration

### `production-mysql-cleanup.js`
Production utility for analyzing and cleaning up MySQL node registrations in the database. Use this on production servers to identify and fix node registration issues.

### `verify-mysql-node.js`
Verifies MySQL node registration and database state. Shows detailed information about how the node is stored and retrieved.

## Usage

Run any test from the backend directory:

```bash
# Test production node discovery
node tests/node-system/test-production-nodes.js

# Test full startup simulation
node tests/node-system/test-full-startup.js

# Test NodeLoader functionality
node tests/node-system/test-nodeloader.js

# Test upload process
node tests/node-system/test-upload-process.js

# Verify MySQL node (production)
node tests/node-system/verify-mysql-node.js

# Production cleanup (run on production server)
node tests/node-system/production-mysql-cleanup.js
```

## Notes

- These tests require a running database connection
- Some tests create temporary files in `temp/` directory
- Production cleanup script is safe to run (read-only analysis by default)