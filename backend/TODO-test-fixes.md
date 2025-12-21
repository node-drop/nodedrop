# Test Fixes TODO

This document tracks pre-existing test failures discovered during the execution queue system checkpoint that need to be addressed.

## High Priority - Mock Setup Issues

### 1. FlowExecutionEngine.test.ts
**Location:** `backend/src/services/__tests__/FlowExecutionEngine.test.ts`
**Failures:** 12 tests failing
**Issue:** The mock `mockPrisma` is not properly intercepting the `loadWorkflow` method calls. The FlowExecutionEngine is making actual database calls instead of using the mocked data.
**Root Cause:** The test creates a mock object but doesn't properly inject it into the FlowExecutionEngine instance. The engine's `loadWorkflow` method queries the database directly.
**Fix Required:** 
- Either mock the database module at the module level using `jest.mock()`
- Or refactor FlowExecutionEngine to accept a database client via dependency injection

### 2. ExecutionEngine.test.ts
**Location:** `backend/src/__tests__/services/ExecutionEngine.test.ts`
**Failures:** 10 tests failing
**Issue:** Similar to FlowExecutionEngine - mocks are not being applied correctly
**Specific Problems:**
- `prepareNodeInputData` returns a Promise but tests expect synchronous object
- `getExecutionStats` returns real database counts instead of mocked values
- `getExecutionProgress` returns null instead of mocked progress object
**Fix Required:**
- Update tests to await async methods
- Properly mock the database client at module level

## Medium Priority - Module Import Issues

### 3. ExecutionService.test.ts
**Location:** `backend/src/__tests__/services/ExecutionService.test.ts`
**Issue:** Import path `../../services/ExecutionService` doesn't exist
**Status:** FIXED - Changed to `../../services/ExecutionService.factory`
**Note:** May still have mock setup issues similar to above

### 4. execution-system.test.ts (Integration)
**Location:** `backend/src/__tests__/integration/execution-system.test.ts`
**Issue:** Import paths for ExecutionService and WorkflowService were incorrect
**Status:** FIXED - Updated imports to use `.factory` and `.drizzle` suffixes

## Low Priority - Environment/Configuration Issues

### 5. SecureExecutionService.test.ts
**Location:** `backend/src/__tests__/services/SecureExecutionService.test.ts`
**Issue:** Cannot find module `./out/isolated_vm` - native module compatibility issue
**Root Cause:** The `isolated-vm` package is a native Node.js addon that doesn't work well with Jest's module resolution
**Fix Options:**
- Mock the `isolated-vm` module entirely in Jest setup
- Skip these tests in CI and run them separately
- Add `isolated-vm` to Jest's `moduleNameMapper` configuration

### 6. executions.test.ts (API)
**Location:** `backend/src/__tests__/api/executions.test.ts`
**Issue:** ESM import error with `better-auth/adapters/drizzle`
**Root Cause:** Jest is configured for CommonJS but `better-auth` uses ESM exports
**Fix Options:**
- Add `better-auth` to Jest's `transformIgnorePatterns`
- Mock the auth module in tests
- Configure Jest to handle ESM modules

### 7. flowExecution.integration.test.ts
**Location:** `backend/src/__tests__/integration/flowExecution.integration.test.ts`
**Issue:** Same ESM import error with `better-auth`
**Fix:** Same as #6

## Jest Configuration Recommendations

Add to `backend/jest.config.ts`:

```typescript
// Handle ESM modules
transformIgnorePatterns: [
  'node_modules/(?!(better-auth)/)'
],

// Mock native modules
moduleNameMapper: {
  'isolated-vm': '<rootDir>/src/__tests__/__mocks__/isolated-vm.ts'
}
```

## Notes

- These test failures are pre-existing and not related to the execution queue system implementation
- The execution queue system components (ExecutionQueueService, ExecutionStateStore, ExecutionWorker, etc.) don't have dedicated unit tests - the property-based tests were marked as optional in the spec
- Consider adding unit tests for the new execution queue components as a separate task
