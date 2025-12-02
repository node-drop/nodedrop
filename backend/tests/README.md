# Test Files

This directory contains various test files for the node-drop backend functionality.

## Environment Setup

Make sure you have the environment variables set up in the backend `.env` file, including:

- `ADMIN_BEARER_TOKEN` - Required for API authentication in tests
- `DATABASE_URL` - Database connection string
- Other backend environment variables

## Test Categories

### Workflow Tests

- `test-workflow-execution.js` - Tests basic workflow execution with IF nodes
- `test-original-workflow.js` - Tests the original workflow from the issue report
- `test-manual-execution.js` - Tests manual workflow execution

### Node Tests

- `test-if-node.js` - Tests IF node functionality in detail
- `test-node-loading.js` - Tests custom node loading
- `test-manual-registration.js` - Tests manual node registration

### Service Tests

- `test-zip-generation.js` - Tests ZIP file generation for nodes
- `test-zip-functionality.js` - Tests ZIP functionality
- `test-upload-response.js` - Tests file upload responses
- `test-http-execution.js` - Tests HTTP node execution
- `test-import.js` - Tests import functionality
- `test-db.js` - Tests database operations
- `test-data-structure.js` - Tests data structure validation

### Execution Tests

- `test-rupa-execution.js` - Tests specific node execution scenarios
- `test-simple-loader.js` - Tests simple node loading

## Running Tests

From the `backend/tests` directory, run individual tests with:

```bash
node test-workflow-execution.js
node test-if-node.js
# etc.
```

Or from the backend directory:

```bash
node tests/test-workflow-execution.js
```

## Notes

- Tests assume the backend server is running on `http://localhost:4000`
- Some tests require database access and specific test data
- Environment variables are loaded from `../.env` (backend's .env file)
