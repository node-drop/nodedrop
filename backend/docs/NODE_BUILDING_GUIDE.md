# Node Building Guide

> **Last Updated:** January 1, 2026

This guide covers everything you need to know when building custom nodes, especially orchestrator nodes that manage nested service nodes.

## Table of Contents
1. [Basic Node Structure](#basic-node-structure)
2. [Node Categories](#node-categories)
3. [Service Node Connections](#service-node-connections)
4. [Real-time UI Visual Indicators](#real-time-ui-visual-indicators)
5. [Logging for Frontend](#logging-for-frontend)
6. [Credential Handling](#credential-handling)
7. [Nested/Deep Service Nodes](#nesteddeep-service-nodes)
8. [Common Pitfalls](#common-pitfalls)

---

## Basic Node Structure

Every node must export an object with these required properties:

```javascript
const MyNode = {
  identifier: 'my-node',           // Unique identifier (kebab-case)
  displayName: 'My Node',          // Display name in UI
  name: 'my-node',                 // Internal name
  group: ['category'],             // Node groups for filtering
  version: 1,                      // Node version
  description: 'What this node does',
  icon: 'lucide:icon-name',        // Icon from lucide
  color: '#HEX',                   // Node color in canvas
  style: { width: '120px' },       // Optional: Custom node styles (default: 150px for regular, 100px for service nodes)
  
  // AI metadata for intelligent node suggestions and documentation
  ai: {
    description: "Detailed description of what this node does for AI assistants",
    useCases: [
      "Use case 1",
      "Use case 2",
    ],
    tags: ["tag1", "tag2", "tag3"],
    rules: [
      "MUST do this",
      "MUST NOT do that",
    ],
    recommendations: {
      connectsAfter: ["trigger-node", "input-node"],  // Nodes that typically come before
      connectsTo: ["output-node"],                     // Nodes that typically come after
      inputs: {
        modelService: ["openai-model", "anthropic-model"],
        toolService: ["http-request-tool", "calculator-tool"],
      },
    },
    complexityScore: 5,  // 1-10, how complex this node is to use
  },
  
  inputs: ['main'],                // Input connection names
  outputs: ['main'],               // Output connection names
  
  properties: [],                  // Node configuration properties
  
  execute: async function(inputData) {
    // Main execution logic
    return [{ main: [{ json: result }] }];
  },
};

module.exports = MyNode;
```

### AI Metadata Structure

The `ai` property helps with intelligent suggestions and documentation:

```javascript
ai: {
  description: "Detailed description of what this node does for AI assistants",
  useCases: [
    "Use case 1",
    "Use case 2",
  ],
  tags: ["tag1", "tag2", "tag3"],
  rules: [
    "MUST do this",
    "MUST NOT do that",
    "CRITICAL: Important constraint",
  ],
  recommendations: {
    connectsAfter: ["trigger-node", "input-node"],  // Nodes that typically come before
    connectsTo: ["output-node"],                     // Nodes that typically come after
    inputs: {
      modelService: ["openai-model", "anthropic-model"],
      toolService: ["http-request-tool", "calculator-tool"],
    },
  },
  complexityScore: 5,  // 1-10, how complex this node is to use
  jsonExample: [       // Example JSON configurations for AI to reference
    '{"mode":"rules","outputsCount":2,"rules":[...]}',
    '{"mode":"expression","outputExpression":"{{json.type}}"}'
  ],
},
```

| Property | Type | Description |
|----------|------|-------------|
| `description` | string | Detailed description for AI assistants |
| `useCases` | string[] | Common use cases for this node |
| `tags` | string[] | Searchable tags |
| `rules` | string[] | Important rules (MUST/MUST NOT/CRITICAL) |
| `recommendations.connectsAfter` | string[] | Nodes that typically precede this one |
| `recommendations.connectsTo` | string[] | Nodes that typically follow this one |
| `recommendations.inputs` | object | Recommended service nodes for each input |
| `complexityScore` | number | 1-10 complexity rating |
| `jsonExample` | string[] | Example JSON configurations for AI reference |

---

## Node Categories

### Regular Nodes
- Have `main` input/output
- Execute in workflow flow
- Default width: 150px (can be customized with `nodeWidth`)
- Examples: HTTP Request, Code, Transform

### Service Nodes
- Set `nodeCategory: 'service'`
- Connect to bottom of orchestrator nodes
- Don't execute directly in flow
- Default width: 100px (can be customized with `nodeWidth`)
- Examples: Model nodes, Tool nodes, Memory nodes

```javascript
const ServiceNode = {
  identifier: 'my-service',
  nodeCategory: 'service',  // <-- Important!
  nodeWidth: '120px',       // Optional: Override default 100px width
  // ...
};
```

### Custom Node Styles

You can customize the visual appearance of any node by adding the `style` property:

```javascript
const MyNode = {
  identifier: 'my-node',
  displayName: 'My Node',
  style: { width: '180px' },  // Custom width - overrides category defaults
  // ...
};
```

**Default Widths:**
- Regular nodes: `150px`
- Service nodes (nodeCategory: 'service'): `100px`

**When to customize:**
- Service nodes with longer labels that need more space
- Compact nodes that should be smaller than default
- Nodes with special visual requirements

**Future extensibility:**
The `style` object can be extended to support other properties like `height`, `minWidth`, etc.

**Important:** After modifying a node definition, you must re-register the nodes for changes to take effect:
```bash
cd backend
bun run nodes:register
```

---

## Service Node Connections

### Input Configuration

```javascript
inputs: ['main', 'modelService', 'memoryService', 'toolService'],
inputsConfig: {
  main: { position: 'left' },
  modelService: { position: 'bottom', displayName: 'Model', required: true },
  memoryService: { position: 'bottom', displayName: 'Memory', required: false },
  toolService: { position: 'bottom', displayName: 'Tools', required: false, multiple: true },
},
```

### Discovering Connected Service Nodes

```javascript
_discoverServiceNode: async function(inputName) {
  const inputData = await this.getInputData?.(inputName);
  
  if (!inputData || !inputData[inputName]) {
    return null;
  }
  
  const serviceNodes = inputData[inputName];
  if (!Array.isArray(serviceNodes) || serviceNodes.length === 0) {
    return null;
  }
  
  const serviceNodeRef = serviceNodes[0];
  const nodeDefinition = await global.nodeService.getNodeDefinition(serviceNodeRef.type);
  
  // Create bound instance
  const boundNode = Object.create(nodeDefinition);
  boundNode._serviceNodeId = serviceNodeRef.nodeId;  // <-- CRITICAL for events!
  boundNode._executionId = this._executionId;
  boundNode._userId = this.userId;
  boundNode.logger = this.logger;
  
  // Setup getNodeParameter
  boundNode.getNodeParameter = (paramName) => {
    return serviceNodeRef.parameters?.[paramName];
  };
  
  // Setup getCredentials
  boundNode.getCredentials = async (credentialType) => {
    // ... credential fetching logic
  };
  
  return boundNode;
},
```

---

## Real-time UI Visual Indicators

**This is the most commonly missed feature!**

For nodes to show Running/Success/Failed states in the UI, you MUST emit events.

### Required Method

```javascript
_emitNodeEvent: function(eventType, nodeConfig, additionalData = {}) {
  if (!global.realtimeExecutionEngine || !nodeConfig?._serviceNodeId) {
    return;
  }

  const eventData = {
    executionId: this._executionId,
    nodeId: nodeConfig._serviceNodeId,
    nodeName: additionalData.nodeName || nodeConfig.displayName || nodeConfig.type,
    identifier: nodeConfig.type,
    timestamp: new Date(),
    ...additionalData,
  };

  global.realtimeExecutionEngine.emit(eventType, eventData);
},
```

### Event Types

| Event | When to Emit |
|-------|--------------|
| `node-started` | Before calling a service |
| `node-completed` | After successful execution |
| `node-failed` | On error (include error details) |

### Usage Pattern

```javascript
// Before service call
this._emitNodeEvent('node-started', serviceNode, { nodeName: 'Model' });

try {
  const result = await serviceNode.doSomething();
  
  // After success
  this._emitNodeEvent('node-completed', serviceNode, { nodeName: 'Model' });
  
  return result;
} catch (error) {
  // On failure
  this._emitNodeEvent('node-failed', serviceNode, { 
    nodeName: 'Model',
    error: { message: error.message },
  });
  throw error;
}
```

---

## Logging for Frontend

The Logs tab in the Output column shows service calls. Use `this.logCall()`:

```javascript
// Log a service call
this.logCall(
  'Model',                    // Service name
  { messageCount: 5 },        // Input (what was sent)
  { response: '...' },        // Output (what was received)
  1234,                       // Duration in ms
  { type: 'service-call' }    // Options
);

// Log a tool call
this.logCall(
  'http-request',
  { url: 'https://...' },
  { status: 200, body: '...' },
  500,
  { type: 'tool-call' }
);

// Log an error
this.logCall(
  'Model',
  { messageCount: 5 },
  null,                       // null output on error
  1234,
  { error: 'Connection failed', type: 'service-call' }
);
```

---

## Credential Handling

### Getting Credential ID

```javascript
_getCredentialId: function(serviceNodeConfig, credentialType) {
  // Strategy 1: Direct type mapping
  if (serviceNodeConfig.credentials?.[credentialType]) {
    return serviceNodeConfig.credentials[credentialType];
  }
  
  // Strategy 2: Find any credential ID
  if (serviceNodeConfig.credentials) {
    for (const value of Object.values(serviceNodeConfig.credentials)) {
      if (typeof value === 'string' && value.startsWith('cred_')) {
        return value;
      }
    }
  }
  
  return null;
},
```

### Fetching Credentials

```javascript
boundNode.getCredentials = async (credentialType) => {
  const credentialId = this._getCredentialId(serviceNodeConfig, credentialType);
  
  if (!credentialId) {
    throw new Error(`No credential of type '${credentialType}' available`);
  }
  
  if (!global.credentialService) {
    throw new Error('Credential service not available');
  }
  
  return await global.credentialService.getCredentialForExecution(
    credentialId,
    this.userId || 'unknown'
  );
};
```

---

## Nested/Deep Service Nodes

When building orchestrator nodes (like Supervisor Agent) that delegate to other orchestrator nodes (like Worker Agent), you need extra handling.

### Architecture Overview

```
Supervisor Agent (orchestrator)
├── Model Node (service - Supervisor's own model)
└── Worker Agent (service - another orchestrator)
    ├── Model Node (service - Worker's own model)
    └── Tool Node (service - Worker's tool)
```

### Backend: Pass Nested Input Data

Worker agents need access to their own service connections. The execution engine collects nested services via `getNestedServiceConnections()` in `RealtimeExecutionEngine.ts`.

```javascript
// In Supervisor when binding Worker Agent
boundWorkerNode._inputData = serviceNodeConfig.inputData || {};

// Worker's getInputData uses this
boundWorkerNode.getInputData = async (inputName) => {
  if (serviceNodeConfig.inputData?.[inputName]) {
    return { [inputName]: serviceNodeConfig.inputData[inputName] };
  }
  return null;
};
```

### Backend: Emit Events at Every Level

Each orchestrator must emit events for its direct service calls:

```
Supervisor Agent
├── Model (Supervisor emits events)      ← Supervisor._emitNodeEvent()
└── Worker Agent (Supervisor emits events) ← Supervisor._emitNodeEvent()
    ├── Model (Worker emits events)      ← Worker._emitNodeEvent()
    └── Tool (Worker emits events)       ← Worker._emitNodeEvent()
```

**Key Point:** The parent orchestrator emits events for its children, and each child orchestrator emits events for its own children.

### Frontend: Execution Path Analyzer

The frontend needs to know which nodes are "affected" by an execution to show visual indicators. This is handled in `frontend/src/utils/executionPathAnalyzer.ts`.

**Important:** The `getAffectedNodes()` function must include:
1. Nodes in the direct execution path (downstream from trigger)
2. Service nodes connected TO those nodes (via reverse adjacency)
3. **Nested service nodes** (services connected to services, recursively)

```typescript
// In executionPathAnalyzer.ts - collectServiceNodes must be recursive
function collectServiceNodes(nodeId: string, visited: Set<string>) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  affectedNodeIds.add(nodeId);
  
  // Get services connected to this node
  const serviceNodeIds = reverseAdjacencyMap.get(nodeId) || [];
  for (const serviceNodeId of serviceNodeIds) {
    // Recursively collect nested services
    collectServiceNodes(serviceNodeId, visited);
  }
}
```

Without recursive collection, deep nested services (Worker's Model) won't be in `affectedNodeIds` and will show as IDLE even when running.

### What Gets Passed Through the Chain

| Property | Purpose | Set By |
|----------|---------|--------|
| `_serviceNodeId` | Original node ID for events | Parent when binding |
| `_executionId` | Links events to execution | Parent when binding |
| `_userId` | For credential fetching | Parent when binding |
| `_inputData` | Nested service connections | Parent when binding |
| `logger` | For debugging | Parent when binding |

---

## Common Pitfalls

### 1. Missing `_serviceNodeId`
**Symptom:** No visual indicators on service nodes
**Fix:** Always set `boundNode._serviceNodeId = serviceNodeRef.nodeId`

### 2. Missing `_executionId`
**Symptom:** Events not associated with execution
**Fix:** Pass `this._executionId` to bound nodes

### 3. Not Emitting Events
**Symptom:** Nodes stuck in idle state during execution
**Fix:** Add `_emitNodeEvent` calls before/after service calls

### 4. Missing `logCall`
**Symptom:** Empty Logs tab in Output column
**Fix:** Call `this.logCall()` for each service/tool call

### 5. Not Passing Nested InputData
**Symptom:** Worker agents can't find their Model/Tools
**Fix:** Set `boundNode._inputData = serviceNodeConfig.inputData`

### 6. Forgetting Error Events
**Symptom:** Failed nodes show as "Running" forever
**Fix:** Always emit `node-failed` in catch blocks

### 7. Credential Service Not Available
**Symptom:** "Credential service not available" error
**Fix:** Check `global.credentialService` exists before using

---

## Checklist for New Orchestrator Nodes

- [ ] Set `_serviceNodeId` on all bound service nodes
- [ ] Set `_executionId` on all bound service nodes
- [ ] Implement `_emitNodeEvent` method
- [ ] Emit `node-started` before each service call
- [ ] Emit `node-completed` after successful calls
- [ ] Emit `node-failed` in all catch blocks
- [ ] Use `this.logCall()` for Logs tab entries
- [ ] Pass `inputData` to nested orchestrator nodes
- [ ] Implement `_getCredentialId` for credential handling
- [ ] Setup `getNodeParameter` on bound nodes
- [ ] Setup `getCredentials` on bound nodes
- [ ] Pass `logger` to bound nodes for debugging

---

## Reference Implementations

- **AIAgent.node.js** - Full orchestrator with Model, Memory, Tools
- **SupervisorAgent.node.js** - Multi-agent orchestration
- **WorkerAgent.node.js** - Nested orchestrator called by Supervisor

---

## Key Files for Deep Nested Nodes

When debugging nested node issues, check these files:

| File | Purpose |
|------|---------|
| `backend/src/services/execution/RealtimeExecutionEngine.ts` | Emits events, collects nested services via `getNestedServiceConnections()` |
| `frontend/src/utils/executionPathAnalyzer.ts` | Determines which nodes are "affected" by execution for UI indicators |
| `frontend/src/stores/workflow.ts` | Manages node status state |
| `backend/custom-nodes/ai-agent/nodes/*.js` | Orchestrator node implementations |
