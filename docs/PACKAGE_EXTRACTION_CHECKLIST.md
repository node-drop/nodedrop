# NodeDrop Package Extraction Checklist

## Phase 1: Foundation

### @nodedrop/types

#### Setup
- [ ] Create `packages/types/` directory structure
- [ ] Create `package.json` with proper configuration
- [ ] Create `tsconfig.json`
- [ ] Add to root workspace in `package.json`

#### Type Extraction
- [ ] Extract workflow types (`Workflow`, `WorkflowNode`, `WorkflowConnection`, etc.)
- [ ] Extract node types (`NodeType`, `NodeProperty`, `NodeDefinition`, etc.)
- [ ] Extract execution types (`ExecutionProgress`, `NodeExecutionState`, etc.)
- [ ] Extract credential types (`CredentialDefinition`, `CredentialSelectorConfig`)
- [ ] Extract API types (request/response interfaces)
- [ ] Extract common types (enums, utility types)
- [ ] Resolve conflicts between frontend/backend versions
- [ ] Create barrel export (`index.ts`)

#### Migration
- [ ] Update frontend imports to use `@nodedrop/types`
- [ ] Update backend imports to use `@nodedrop/types`
- [ ] Remove `frontend/src/types/workflow.ts`
- [ ] Remove `frontend/src/types/execution.ts`
- [ ] Remove `backend/src/types/node.types.ts`
- [ ] Remove `backend/src/types/execution.types.ts`
- [ ] Verify no type errors in frontend
- [ ] Verify no type errors in backend
- [ ] Run all tests

---

### @nodedrop/utils

#### Setup
- [ ] Create `packages/utils/` directory structure
- [ ] Create `package.json` with proper configuration
- [ ] Create `tsconfig.json`
- [ ] Add dependency on `@nodedrop/types`

#### Utility Extraction
- [ ] Extract error handling utilities
- [ ] Extract validation utilities
- [ ] Extract trigger utilities
- [ ] Extract cron/schedule utilities
- [ ] Extract common helpers (JSON, string, date)
- [ ] Write unit tests for all utilities
- [ ] Create barrel export (`index.ts`)

#### Migration
- [ ] Update frontend imports to use `@nodedrop/utils`
- [ ] Update backend imports to use `@nodedrop/utils`
- [ ] Remove duplicate utility files from frontend
- [ ] Remove duplicate utility files from backend
- [ ] Verify no runtime errors
- [ ] Run all tests

---

## Phase 2: Node Development

### @nodedrop/node-sdk

#### Setup
- [ ] Create `packages/node-sdk/` directory structure
- [ ] Create `package.json` with proper configuration
- [ ] Create `tsconfig.json`
- [ ] Add dependencies on `@nodedrop/types` and `@nodedrop/utils`
- [ ] Remove empty `packages/node-helpers/`

#### SDK Development
- [ ] Design SDK API surface
- [ ] Create `BaseNode` abstract class
- [ ] Create `TriggerNode` base class
- [ ] Create `ActionNode` base class
- [ ] Extract `ExecutionContext` interface
- [ ] Extract node helper functions
- [ ] Create request helpers with auth support
- [ ] Create data transformation utilities
- [ ] Create testing utilities (`MockContext`)
- [ ] Write unit tests
- [ ] Create barrel export (`index.ts`)
- [ ] Write SDK documentation (README)

#### Migration
- [ ] Update `ManualTrigger` node to use SDK
- [ ] Update `WebhookTrigger` node to use SDK
- [ ] Update `ScheduleTrigger` node to use SDK
- [ ] Update `HttpRequest` node to use SDK
- [ ] Update `Code` node to use SDK
- [ ] Update `Set` node to use SDK
- [ ] Update `IfElse` node to use SDK
- [ ] Update `Loop` node to use SDK
- [ ] Update `OpenAI` node to use SDK
- [ ] Update `Anthropic` node to use SDK
- [ ] Update remaining nodes to use SDK
- [ ] Remove old node helper files from backend
- [ ] Run all node tests

---

## Phase 3: Frontend Packages

### @nodedrop/ui

#### Setup
- [ ] Create `packages/ui/` directory structure
- [ ] Create `package.json` with peer dependencies (React, Tailwind)
- [ ] Create `tsconfig.json`
- [ ] Create `tailwind.config.js`
- [ ] Set up build process for CSS

#### Component Extraction
- [ ] Extract base components (Button, Input, Label, etc.)
- [ ] Extract form components (Form, Checkbox, Radio, Select, etc.)
- [ ] Extract overlay components (Dialog, Popover, Dropdown, etc.)
- [ ] Extract feedback components (Alert, Toast, Skeleton, etc.)
- [ ] Extract layout components (Card, Separator, Tabs, etc.)
- [ ] Extract navigation components (Sidebar, Breadcrumb, etc.)
- [ ] Extract expression editor
- [ ] Extract form generator
- [ ] Extract JSON editor
- [ ] Ensure theme support (dark/light)
- [ ] Verify accessibility compliance
- [ ] Create barrel export (`index.ts`)

#### Migration
- [ ] Update frontend imports to use `@nodedrop/ui`
- [ ] Update widgets to use `@nodedrop/ui`
- [ ] Remove `frontend/src/components/ui/` directory
- [ ] Verify all UI renders correctly
- [ ] Run frontend tests

---

### @nodedrop/api-client

#### Setup
- [ ] Create `packages/api-client/` directory structure
- [ ] Create `package.json`
- [ ] Create `tsconfig.json`
- [ ] Add dependency on `@nodedrop/types`

#### Client Development
- [ ] Create base API client with configuration
- [ ] Extract workflow service
- [ ] Extract execution service
- [ ] Extract credential service
- [ ] Extract node service
- [ ] Extract team service
- [ ] Extract workspace service
- [ ] Extract variable service
- [ ] Extract environment service
- [ ] Create WebSocket client
- [ ] Create execution WebSocket handler
- [ ] Add error handling and retry logic
- [ ] Ensure works in browser and Node.js
- [ ] Write unit tests
- [ ] Create barrel export (`index.ts`)

#### Migration
- [ ] Update frontend to use `@nodedrop/api-client`
- [ ] Update CLI to use `@nodedrop/api-client`
- [ ] Remove `frontend/src/services/` directory
- [ ] Verify all API calls work
- [ ] Run integration tests

---

## Phase 4: Advanced Packages

### @nodedrop/workflow-core

#### Setup
- [ ] Create `packages/workflow-core/` directory structure
- [ ] Create `package.json`
- [ ] Create `tsconfig.json`
- [ ] Add dependency on `@nodedrop/types`

#### Core Logic Extraction
- [ ] Extract workflow validation logic
- [ ] Extract connection validation logic
- [ ] Extract node validation logic
- [ ] Extract execution path analyzer
- [ ] Extract dependency resolver
- [ ] Extract topological sort algorithm
- [ ] Extract cycle detection
- [ ] Write unit tests
- [ ] Create barrel export (`index.ts`)

#### Migration
- [ ] Update frontend to use `@nodedrop/workflow-core`
- [ ] Update backend to use `@nodedrop/workflow-core`
- [ ] Remove duplicate validation files
- [ ] Run all tests

---

### @nodedrop/execution-engine

#### Setup
- [ ] Create `packages/execution-engine/` directory structure (or update existing)
- [ ] Create `package.json`
- [ ] Create `tsconfig.json`
- [ ] Add dependencies on other packages

#### Engine Development
- [ ] Evaluate what can be extracted from backend
- [ ] Extract core execution logic (if feasible)
- [ ] Extract execution context management
- [ ] Extract node execution orchestration
- [ ] Write unit tests
- [ ] Create barrel export (`index.ts`)

#### Migration
- [ ] Update backend to use `@nodedrop/execution-engine`
- [ ] Remove duplicate execution files
- [ ] Run all execution tests

---

## Final Steps

### Documentation
- [ ] Update main README with package information
- [ ] Create individual README for each package
- [ ] Document import conventions
- [ ] Document contribution guidelines for packages

### CI/CD
- [ ] Update build scripts for monorepo
- [ ] Add package build to CI pipeline
- [ ] Add package tests to CI pipeline
- [ ] Set up package versioning strategy

### Cleanup
- [ ] Remove all duplicate code
- [ ] Remove empty/unused packages
- [ ] Audit dependencies for unused packages
- [ ] Final code review

### Verification
- [ ] Full test suite passes
- [ ] Frontend builds successfully
- [ ] Backend builds successfully
- [ ] CLI builds successfully
- [ ] Docker builds work
- [ ] Manual smoke testing
