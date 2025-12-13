# NodeDrop Package Extraction Plan

## Overview

This document outlines the plan to modularize the NodeDrop codebase into reusable packages. The goal is to reduce code duplication, improve maintainability, and enable better code sharing between frontend, backend, CLI, and future applications.

## Current State

### Existing Package Structure
```
packages/
├── execution-engine/   # Mostly empty (just types folder)
├── node-helpers/       # Empty
└── shared-types/       # Empty
```

### Identified Issues
- Significant type duplication between `frontend/src/types/` and `backend/src/types/`
- Utility functions duplicated (errorHandling, validation, triggerUtils)
- No shared SDK for custom node development
- UI components tightly coupled to frontend app
- API client logic not reusable by CLI

---

## Phase 1: Foundation (Week 1-2)

### Package: `@nodedrop/types`
**Priority:** Critical  
**Effort:** Medium  
**Impact:** High

#### Purpose
Single source of truth for all shared TypeScript types between frontend and backend.

#### Types to Extract

**Workflow Types:**
- `WorkflowNode`
- `WorkflowConnection`
- `WorkflowSettings`
- `WorkflowMetadata`
- `Workflow`
- `WorkflowShare`
- `WorkflowAnalytics`
- `WorkflowTemplate`
- `WorkflowFilters`

**Node Types:**
- `NodeType` / `NodeDefinition`
- `NodeProperty`
- `NodePropertyOption`
- `CredentialDefinition`
- `CredentialSelectorConfig`
- `NodeSetting`
- `NodeSettingsConfig`
- `TemplateVariable`

**Execution Types:**
- `NodeExecutionStatus` (enum)
- `NodeExecutionState`
- `NodeVisualState`
- `ExecutionProgress`
- `ExecutionFlowStatus`
- `ExecutionError`
- `ExecutionRequest`
- `ExecutionResponse`
- `ExecutionDetails`
- `ExecutionEvent`
- `ExecutionMetrics`

**API Types:**
- Request/Response interfaces
- Error types
- Pagination types

#### Structure
```
packages/types/
├── src/
│   ├── index.ts
│   ├── workflow.ts
│   ├── node.ts
│   ├── execution.ts
│   ├── credential.ts
│   ├── api.ts
│   └── common.ts
├── package.json
└── tsconfig.json
```

#### Migration Steps
1. Create package structure with build configuration
2. Extract and consolidate types from both frontend and backend
3. Resolve type conflicts (choose most complete version)
4. Update frontend imports to use `@nodedrop/types`
5. Update backend imports to use `@nodedrop/types`
6. Remove duplicate type files
7. Add to workspace in root `package.json`

---

### Package: `@nodedrop/utils`
**Priority:** Critical  
**Effort:** Medium  
**Impact:** High

#### Purpose
Shared utility functions used by both frontend and backend.

#### Utilities to Extract

**Error Handling:**
- `frontend/src/utils/errorHandling.ts`
- `backend/src/utils/errorHandling.ts`
- `backend/src/utils/errors.ts`

**Validation:**
- `frontend/src/utils/workflowValidation.ts`
- `backend/src/utils/validation.ts`
- `backend/src/utils/workflowValidator.ts`

**Trigger Utilities:**
- `frontend/src/utils/triggerUtils.ts`
- `backend/src/utils/triggerUtils.ts`

**Cron/Schedule:**
- `backend/src/utils/cronUtils.ts`
- `backend/src/utils/scheduleUtils.ts`

**General:**
- JSON helpers
- String manipulation
- Date/time utilities

#### Structure
```
packages/utils/
├── src/
│   ├── index.ts
│   ├── errors.ts
│   ├── validation.ts
│   ├── triggers.ts
│   ├── cron.ts
│   └── helpers.ts
├── package.json
└── tsconfig.json
```

#### Migration Steps
1. Create package structure
2. Identify common utility functions
3. Extract and merge implementations
4. Write unit tests for utilities
5. Update imports in frontend and backend
6. Remove duplicate utility files

---

## Phase 2: Node Development (Week 3-4)

### Package: `@nodedrop/node-sdk`
**Priority:** High  
**Effort:** High  
**Impact:** High

#### Purpose
SDK for developing custom nodes, including base classes, helpers, and type definitions.

#### Components to Extract

**From `backend/src/nodes/`:**
- Node definition interfaces
- Base node patterns
- Node execution context
- Node helpers

**From `backend/src/utils/`:**
- `nodeHelpers.ts`
- `NodeDiscovery.ts`

**From `packages/node-helpers/`:**
- Consolidate existing (empty) package

#### Structure
```
packages/node-sdk/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── definition.ts
│   │   ├── execution.ts
│   │   └── properties.ts
│   ├── base/
│   │   ├── BaseNode.ts
│   │   ├── TriggerNode.ts
│   │   └── ActionNode.ts
│   ├── context/
│   │   ├── ExecutionContext.ts
│   │   └── helpers.ts
│   ├── utils/
│   │   ├── request.ts
│   │   ├── data.ts
│   │   └── validation.ts
│   └── testing/
│       └── MockContext.ts
├── package.json
├── tsconfig.json
└── README.md
```

#### Features
- Type-safe node definition
- Built-in request helpers with auth
- Data transformation utilities
- Testing utilities for node development
- Documentation and examples

#### Migration Steps
1. Design SDK API surface
2. Create base classes and interfaces
3. Extract helpers from backend
4. Create testing utilities
5. Migrate existing nodes to use SDK
6. Document SDK usage
7. Remove `packages/node-helpers/` (merge into this)

---

## Phase 3: Frontend Packages (Week 5-6)

### Package: `@nodedrop/ui`
**Priority:** Medium  
**Effort:** High  
**Impact:** Medium

#### Purpose
Reusable UI component library based on shadcn/ui components.

#### Components to Extract

**From `frontend/src/components/ui/`:**
- All 40+ base UI components
- Expression editor
- Form generator
- JSON editor

#### Structure
```
packages/ui/
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ... (40+ components)
│   ├── editors/
│   │   ├── expression-editor/
│   │   ├── json-editor.tsx
│   │   └── form-generator/
│   └── styles/
│       └── globals.css
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

#### Considerations
- Peer dependencies: React, Tailwind CSS
- Theme support (dark/light mode)
- Accessibility compliance
- Tree-shaking support

#### Migration Steps
1. Set up package with Tailwind and React
2. Extract base components
3. Extract complex editors
4. Set up Storybook for documentation
5. Update frontend imports
6. Test with widgets

---

### Package: `@nodedrop/api-client`
**Priority:** Medium  
**Effort:** Medium  
**Impact:** Medium

#### Purpose
Type-safe API client for NodeDrop backend, usable by frontend, CLI, and external integrations.

#### Components to Extract

**From `frontend/src/services/`:**
- `api.ts` (base client)
- All service modules (workflow, execution, credential, etc.)
- WebSocket client (`socket.ts`, `ExecutionWebSocket.ts`)

#### Structure
```
packages/api-client/
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── services/
│   │   ├── workflow.ts
│   │   ├── execution.ts
│   │   ├── credential.ts
│   │   ├── node.ts
│   │   ├── team.ts
│   │   └── workspace.ts
│   ├── websocket/
│   │   ├── client.ts
│   │   └── execution.ts
│   └── types.ts
├── package.json
└── tsconfig.json
```

#### Features
- Type-safe API calls using `@nodedrop/types`
- Configurable base URL and auth
- WebSocket support for real-time updates
- Error handling and retry logic
- Works in browser and Node.js

#### Migration Steps
1. Create package structure
2. Extract and generalize API client
3. Extract service modules
4. Extract WebSocket client
5. Update frontend to use package
6. Update CLI to use package

---

## Phase 4: Advanced Packages (Week 7-8)

### Package: `@nodedrop/workflow-core`
**Priority:** Low  
**Effort:** High  
**Impact:** Medium

#### Purpose
Core workflow logic that can run in both frontend and backend.

#### Components to Extract

**Workflow Validation:**
- Connection validation
- Node configuration validation
- Cycle detection

**Execution Planning:**
- Execution path analysis
- Dependency resolution
- Topological sorting

**From Frontend:**
- `frontend/src/utils/workflow/`
- `frontend/src/utils/executionPathAnalyzer.ts`
- `frontend/src/utils/nodeValidation.ts`

**From Backend:**
- `backend/src/services/DependencyResolver.ts`
- `backend/src/utils/workflowValidator.ts`

#### Structure
```
packages/workflow-core/
├── src/
│   ├── index.ts
│   ├── validation/
│   │   ├── workflow.ts
│   │   ├── connections.ts
│   │   └── nodes.ts
│   ├── execution/
│   │   ├── pathAnalyzer.ts
│   │   ├── dependencyResolver.ts
│   │   └── topologicalSort.ts
│   └── utils/
│       └── graph.ts
├── package.json
└── tsconfig.json
```

---

### Package: `@nodedrop/execution-engine`
**Priority:** Low  
**Effort:** Very High  
**Impact:** High

#### Purpose
Consolidate the existing `packages/execution-engine/` with actual implementation.

#### Components to Extract

**From `backend/src/services/`:**
- `ExecutionEngine.ts`
- `FlowExecutionEngine.ts`
- `RealtimeExecutionEngine.ts`
- `ExecutionService.ts`
- `SecureExecutionService.ts`
- `TriggerExecutionContext.ts`

#### Considerations
- This is complex and tightly coupled to backend
- May need to remain backend-only
- Consider extracting only the core execution logic

---

## Implementation Guidelines

### Package Configuration

**Standard `package.json`:**
```json
{
  "name": "@nodedrop/package-name",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "peerDependencies": {},
  "devDependencies": {
    "typescript": "^5.2.2"
  }
}
```

**Standard `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Workspace Configuration

Update root `package.json`:
```json
{
  "workspaces": [
    "frontend",
    "backend",
    "cli",
    "installer",
    "packages/*"
  ]
}
```

### Import Conventions

```typescript
// Types
import { Workflow, NodeType } from '@nodedrop/types';

// Utilities
import { validateWorkflow, formatError } from '@nodedrop/utils';

// Node SDK
import { BaseNode, ExecutionContext } from '@nodedrop/node-sdk';

// UI Components
import { Button, Dialog, Input } from '@nodedrop/ui';

// API Client
import { NodeDropClient } from '@nodedrop/api-client';
```

---

## Timeline Summary

| Phase | Packages | Duration | Dependencies |
|-------|----------|----------|--------------|
| 1 | `@nodedrop/types`, `@nodedrop/utils` | 2 weeks | None |
| 2 | `@nodedrop/node-sdk` | 2 weeks | Phase 1 |
| 3 | `@nodedrop/ui`, `@nodedrop/api-client` | 2 weeks | Phase 1 |
| 4 | `@nodedrop/workflow-core`, `@nodedrop/execution-engine` | 2 weeks | Phase 1-3 |

**Total Estimated Time:** 8 weeks

---

## Success Metrics

1. **Code Reduction:** 30%+ reduction in duplicate code
2. **Build Time:** No significant increase in build time
3. **Type Safety:** Zero type mismatches between frontend/backend
4. **Developer Experience:** Clear import paths, good IDE support
5. **Test Coverage:** 80%+ coverage on shared packages

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes during migration | High | Incremental migration, feature flags |
| Circular dependencies | Medium | Careful dependency graph planning |
| Build complexity | Medium | Clear build scripts, CI/CD updates |
| Version management | Low | Semantic versioning, changelogs |

---

## Next Steps

1. Review and approve this plan
2. Set up package infrastructure (Phase 1)
3. Begin with `@nodedrop/types` extraction
4. Iterate based on learnings
