# Single Node Execution

This document details the single node execution process, focusing on isolated node testing and debugging capabilities.

## Overview

Single node execution allows developers and users to execute individual nodes in isolation, providing a powerful tool for testing, debugging, and development without running entire workflows.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SINGLE NODE EXECUTION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    User Action           Input Data           Execution          Result     │
│        ▼                    ▼                    ▼                ▼        │
│   ┌─────────┐         ┌─────────┐         ┌─────────┐         ┌─────────┐  │
│   │Right    │────────►│ Prepare │────────►│Execute  │────────►│Display  │  │
│   │Click    │         │ Data    │         │ Node    │         │Results  │  │
│   │Context  │         │Sources  │         │Logic    │         │& Status │  │
│   │Menu     │         └─────────┘         └─────────┘         └─────────┘  │
│   └─────────┘                                 │                            │
│                                                ▼                            │
│                                         ┌─────────┐                        │
│                                         │Update   │                        │
│                                         │Node UI  │                        │
│                                         │State    │                        │
│                                         └─────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Trigger Mechanisms

### 1. Right-Click Context Menu

#### UI Implementation

```typescript
// NodeContextMenu.tsx
export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  node,
  onExecuteNode,
  position,
  onClose,
}) => {
  const handleExecuteNode = useCallback(() => {
    onExecuteNode(node.id);
    onClose();
  }, [node.id, onExecuteNode, onClose]);

  return (
    <div className="context-menu" style={{ top: position.y, left: position.x }}>
      <div className="context-menu-items">
        <button
          className="context-menu-item"
          onClick={handleExecuteNode}
          disabled={!canExecuteNode(node)}
        >
          <Play className="w-4 h-4" />
          Execute Node
        </button>
        {/* Other context menu items */}
      </div>
    </div>
  );
};
```

#### Node Execution Eligibility

```typescript
const canExecuteNode = (node: WorkflowNode): boolean => {
  // Check if node is properly configured
  if (!node.type || !node.parameters) {
    return false;
  }

  // Check if required parameters are present
  const nodeSchema = getNodeSchema(node.type);
  const requiredParams = nodeSchema.properties.filter((p) => p.required);
  const hasRequiredParams = requiredParams.every(
    (param) => node.parameters[param.name] !== undefined
  );

  // Check credentials if required
  const needsCredentials = nodeSchema.credentialsRequired;
  const hasCredentials = needsCredentials ? !!node.credentialsId : true;

  return hasRequiredParams && hasCredentials;
};
```

### 2. Keyboard Shortcuts

```typescript
// WorkflowEditor.tsx - Keyboard handler
const handleKeyPress = useCallback(
  (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "Enter") {
      const selectedNode = getSelectedNode();
      if (selectedNode) {
        executeNode(selectedNode.id, undefined, "single");
      }
    }
  },
  [executeNode, getSelectedNode]
);
```

### 3. Programmatic Execution

```typescript
// API endpoint for single node execution (unified endpoint)
POST /api/executions
{
  "workflowId": "workflow-uuid",
  "nodeId": "node-uuid",
  "inputData": { /* optional test data */ },
  "parameters": { /* optional parameter overrides */ },
  "mode": "single"
}
```

## Input Data Management

### Data Source Priority

```
1. User-Provided Test Data (Highest Priority)
   ├── Manual input via UI form
   ├── Uploaded test files
   └── API provided data

2. Previous Node Output (Medium Priority)
   ├── Cached execution results
   ├── Static mock data from previous runs
   └── Workflow state data

3. Default/Mock Data (Lowest Priority)
   ├── Node type default values
   ├── Schema-based mock generation
   └── Empty/null fallbacks
```

### Input Data Preparation

```typescript
// InputDataManager.ts
export class InputDataManager {
  async prepareInputData(
    nodeId: string,
    userInputData?: any,
    workflow?: Workflow
  ): Promise<NodeInputData> {
    // 1. Check for user-provided data
    if (userInputData) {
      return this.validateAndFormatUserData(userInputData, nodeId);
    }

    // 2. Try to get previous node output
    const previousNodeOutput = await this.getPreviousNodeOutput(
      nodeId,
      workflow
    );
    if (previousNodeOutput) {
      return this.formatPreviousNodeData(previousNodeOutput);
    }

    // 3. Generate mock data based on node schema
    const mockData = await this.generateMockData(nodeId);
    return mockData;
  }

  private async getPreviousNodeOutput(
    nodeId: string,
    workflow?: Workflow
  ): Promise<any> {
    if (!workflow) return null;

    // Find connections leading to this node
    const incomingConnections = workflow.connections.filter(
      (conn) => conn.target.nodeId === nodeId
    );

    if (incomingConnections.length === 0) return null;

    // Get the most recent execution result from previous nodes
    const previousNode = incomingConnections[0].source;
    const executionResult = await this.getLastExecutionResult(
      workflow.id,
      previousNode.nodeId
    );

    return executionResult?.outputData;
  }

  private async generateMockData(nodeId: string): Promise<NodeInputData> {
    const node = await this.nodeService.getNode(nodeId);
    const nodeSchema = await this.getNodeSchema(node.type);

    return this.mockDataGenerator.generateFromSchema(nodeSchema.inputSchema);
  }
}
```

### Mock Data Generation

```typescript
// MockDataGenerator.ts
export class MockDataGenerator {
  generateFromSchema(schema: NodeInputSchema): any {
    const mockData: any = {};

    for (const field of schema.fields) {
      mockData[field.name] = this.generateFieldValue(field);
    }

    return mockData;
  }

  private generateFieldValue(field: SchemaField): any {
    switch (field.type) {
      case "string":
        return field.example || `sample_${field.name}`;

      case "number":
        return field.example || Math.floor(Math.random() * 100);

      case "boolean":
        return field.example !== undefined ? field.example : true;

      case "array":
        return field.example || [this.generateFieldValue(field.items)];

      case "object":
        const obj: any = {};
        if (field.properties) {
          for (const prop of field.properties) {
            obj[prop.name] = this.generateFieldValue(prop);
          }
        }
        return obj;

      default:
        return null;
    }
  }
}
```

## Execution Process

### Core Execution Flow

```typescript
// SingleNodeExecutor.ts
export class SingleNodeExecutor {
  async executeSingleNode(
    nodeId: string,
    inputData?: any,
    parameters?: any
  ): Promise<SingleNodeExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    try {
      // 1. Load node configuration
      const node = await this.nodeService.getNode(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      // 2. Prepare execution context
      const context = await this.prepareExecutionContext(
        node,
        inputData,
        parameters,
        executionId
      );

      // 3. Validate node configuration
      await this.validateNodeForExecution(node, context);

      // 4. Load node implementation
      const nodeImplementation = await this.nodeLoader.loadNode(node.type);

      // 5. Execute node logic
      const result = await this.executeNodeImplementation(
        nodeImplementation,
        context
      );

      // 6. Process and validate output
      const processedResult = await this.processExecutionResult(result, node);

      // 7. Save execution record
      await this.saveExecutionRecord(executionId, node, processedResult);

      // 8. Return result
      return {
        executionId,
        nodeId,
        status: "completed",
        result: processedResult,
        duration: Date.now() - startTime,
        inputData: context.inputData,
        outputData: processedResult.data,
      };
    } catch (error) {
      // Handle execution error
      const errorResult = await this.handleExecutionError(
        executionId,
        nodeId,
        error,
        startTime
      );
      throw errorResult;
    }
  }
}
```

### Execution Context Preparation

```typescript
interface SingleNodeExecutionContext {
  executionId: string;
  nodeId: string;
  node: WorkflowNode;
  inputData: any;
  parameters: Record<string, any>;
  credentials?: NodeCredentials;
  mode: "single";
  timestamp: string;
  userId?: string;
  workflowId?: string;
}

const prepareExecutionContext = async (
  node: WorkflowNode,
  inputData?: any,
  parameters?: any,
  executionId: string
): Promise<SingleNodeExecutionContext> => {
  // Merge parameters (user overrides + node defaults)
  const mergedParameters = {
    ...node.parameters,
    ...parameters,
  };

  // Load credentials if required
  let credentials: NodeCredentials | undefined;
  if (node.credentialsId) {
    credentials = await credentialService.getCredentials(node.credentialsId);
  }

  // Prepare input data
  const preparedInputData = await inputDataManager.prepareInputData(
    node.id,
    inputData,
    node.workflowId
  );

  return {
    executionId,
    nodeId: node.id,
    node,
    inputData: preparedInputData,
    parameters: mergedParameters,
    credentials,
    mode: "single",
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId(),
    workflowId: node.workflowId,
  };
};
```

## Node Implementation Execution

### Loading Node Implementation

```typescript
// NodeLoader.ts
export class NodeLoader {
  async loadNode(nodeType: string): Promise<INodeExecutor> {
    // Check if node is already loaded
    if (this.nodeCache.has(nodeType)) {
      return this.nodeCache.get(nodeType)!;
    }

    try {
      // Load from built-in nodes
      const builtInNode = await this.loadBuiltInNode(nodeType);
      if (builtInNode) {
        this.nodeCache.set(nodeType, builtInNode);
        return builtInNode;
      }

      // Load from custom nodes
      const customNode = await this.loadCustomNode(nodeType);
      if (customNode) {
        this.nodeCache.set(nodeType, customNode);
        return customNode;
      }

      throw new Error(`Node type ${nodeType} not found`);
    } catch (error) {
      throw new Error(`Failed to load node ${nodeType}: ${error.message}`);
    }
  }

  private async loadBuiltInNode(
    nodeType: string
  ): Promise<INodeExecutor | null> {
    const nodeMap = {
      "http-request": () => import("../nodes/HttpRequestNode"),
      "data-transform": () => import("../nodes/DataTransformNode"),
      webhook: () => import("../nodes/WebhookNode"),
      // ... other built-in nodes
    };

    const loader = nodeMap[nodeType];
    if (!loader) return null;

    const nodeModule = await loader();
    return new nodeModule.default();
  }

  private async loadCustomNode(
    nodeType: string
  ): Promise<INodeExecutor | null> {
    // Load from custom nodes directory
    const customNodePath = path.join(CUSTOM_NODES_DIR, nodeType);

    if (!fs.existsSync(customNodePath)) {
      return null;
    }

    const nodeModule = await import(customNodePath);
    return new nodeModule.default();
  }
}
```

### Node Execution Interface

```typescript
// INodeExecutor.ts
export interface INodeExecutor {
  execute(context: NodeExecutionContext): Promise<NodeExecutionResult>;
  validate?(context: NodeExecutionContext): Promise<ValidationResult>;
  getSchema(): NodeSchema;
}

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    apiCalls?: number;
    memoryUsage?: number;
    [key: string]: any;
  };
}

// Example node implementation
export class HttpRequestNode implements INodeExecutor {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { parameters, inputData, credentials } = context;

    try {
      // Prepare HTTP request
      const requestConfig = this.buildRequestConfig(
        parameters,
        inputData,
        credentials
      );

      // Execute HTTP request
      const response = await this.httpClient.request(requestConfig);

      // Process response
      const processedData = this.processResponse(response);

      return {
        success: true,
        data: processedData,
        metadata: {
          statusCode: response.status,
          responseTime: response.duration,
          contentType: response.headers["content-type"],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metadata: {
          errorType: error.name,
          statusCode: error.response?.status,
        },
      };
    }
  }
}
```

## Result Processing and UI Updates

### Result Processing Pipeline

```typescript
// ResultProcessor.ts
export class ResultProcessor {
  async processExecutionResult(
    result: NodeExecutionResult,
    node: WorkflowNode
  ): Promise<ProcessedExecutionResult> {
    // 1. Validate result structure
    const validationResult = this.validateResult(result);
    if (!validationResult.isValid) {
      throw new Error(
        `Invalid result structure: ${validationResult.errors.join(", ")}`
      );
    }

    // 2. Apply result transformations
    const transformedResult = await this.applyResultTransformations(
      result,
      node
    );

    // 3. Format for display
    const displayResult = this.formatForDisplay(transformedResult);

    // 4. Generate result summary
    const summary = this.generateResultSummary(transformedResult, node);

    return {
      raw: result,
      transformed: transformedResult,
      display: displayResult,
      summary,
    };
  }

  private formatForDisplay(result: NodeExecutionResult): DisplayResult {
    return {
      status: result.success ? "success" : "error",
      data: this.formatDataForDisplay(result.data),
      error: result.error,
      metadata: result.metadata,
      timestamp: new Date().toISOString(),
    };
  }

  private formatDataForDisplay(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    // Handle large objects/arrays
    if (this.isLargeData(data)) {
      return this.truncateData(data);
    }

    // Handle binary data
    if (this.isBinaryData(data)) {
      return this.formatBinaryData(data);
    }

    return data;
  }
}
```

### UI State Updates

```typescript
// workflow.ts store
const updateNodeExecutionResult = (
  nodeId: string,
  result: ProcessedExecutionResult
) => {
  set((state) => {
    // Update node visual state
    const nodeIndex = state.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex !== -1) {
      state.nodes[nodeIndex] = {
        ...state.nodes[nodeIndex],
        executionStatus: result.summary.status,
        lastExecutionTime: result.summary.timestamp,
        executionResult: result.display,
      };
    }

    // Update execution history
    state.executionHistory.unshift({
      id: uuidv4(),
      nodeId,
      workflowId: state.workflow.id,
      executionType: "single",
      status: result.summary.status,
      startTime: result.summary.timestamp,
      duration: result.summary.duration,
      result: result.display,
    });

    // Trigger UI updates
    state.selectedExecutionResult = result.display;
  });
};
```

### Real-time UI Updates

```typescript
// NodeExecutionIndicator.tsx
export const NodeExecutionIndicator: React.FC<{
  node: WorkflowNode;
  executionStatus?: NodeExecutionStatus;
}> = ({ node, executionStatus }) => {
  const getStatusIcon = () => {
    switch (executionStatus?.status) {
      case "running":
        return <Spinner className="w-4 h-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (executionStatus?.status) {
      case "running":
        return "border-blue-300 bg-blue-50";
      case "completed":
        return "border-green-300 bg-green-50";
      case "failed":
        return "border-red-300 bg-red-50";
      default:
        return "border-gray-300 bg-white";
    }
  };

  return (
    <div className={`node-execution-indicator ${getStatusColor()}`}>
      {getStatusIcon()}
      {executionStatus?.duration && (
        <span className="text-xs text-gray-500">
          {executionStatus.duration}ms
        </span>
      )}
    </div>
  );
};
```

## Error Handling and Debugging

### Error Classification

```typescript
enum SingleNodeErrorType {
  CONFIGURATION_ERROR = "configuration_error",
  VALIDATION_ERROR = "validation_error",
  EXECUTION_ERROR = "execution_error",
  TIMEOUT_ERROR = "timeout_error",
  CREDENTIAL_ERROR = "credential_error",
  NETWORK_ERROR = "network_error",
  DATA_ERROR = "data_error",
}

interface SingleNodeError {
  type: SingleNodeErrorType;
  message: string;
  details?: any;
  suggestion?: string;
  recoverable: boolean;
  retryable: boolean;
}
```

### Error Handling Strategy

```typescript
// ErrorHandler.ts
export class SingleNodeErrorHandler {
  async handleExecutionError(
    nodeId: string,
    error: Error,
    context: SingleNodeExecutionContext
  ): Promise<SingleNodeError> {
    const classifiedError = this.classifyError(error);

    // Log error for debugging
    logger.error("Single node execution failed", {
      nodeId,
      errorType: classifiedError.type,
      error: error.message,
      context: {
        nodeType: context.node.type,
        executionId: context.executionId,
      },
    });

    // Generate user-friendly error message
    const userFriendlyError = this.generateUserFriendlyError(
      classifiedError,
      context
    );

    // Determine if error is recoverable
    const recoveryOptions = this.getRecoveryOptions(classifiedError, context);

    return {
      ...userFriendlyError,
      recoveryOptions,
    };
  }

  private classifyError(error: Error): SingleNodeError {
    // Network errors
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("timeout")
    ) {
      return {
        type: SingleNodeErrorType.NETWORK_ERROR,
        message: error.message,
        recoverable: true,
        retryable: true,
        suggestion: "Check network connectivity and try again",
      };
    }

    // Credential errors
    if (
      error.message.includes("401") ||
      error.message.includes("authentication")
    ) {
      return {
        type: SingleNodeErrorType.CREDENTIAL_ERROR,
        message: "Authentication failed",
        recoverable: true,
        retryable: false,
        suggestion: "Check and update your credentials",
      };
    }

    // Configuration errors
    if (
      error.message.includes("required parameter") ||
      error.message.includes("validation")
    ) {
      return {
        type: SingleNodeErrorType.CONFIGURATION_ERROR,
        message: error.message,
        recoverable: true,
        retryable: false,
        suggestion: "Review and fix node configuration",
      };
    }

    // Default to execution error
    return {
      type: SingleNodeErrorType.EXECUTION_ERROR,
      message: error.message,
      recoverable: false,
      retryable: false,
      suggestion: "Check node implementation and try again",
    };
  }
}
```

### Debug Information Collection

```typescript
interface DebugInformation {
  nodeConfiguration: {
    type: string;
    parameters: Record<string, any>;
    credentialsConfigured: boolean;
  };
  executionContext: {
    inputData: any;
    executionId: string;
    timestamp: string;
  };
  environment: {
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
    platform: string;
  };
  logs: LogEntry[];
  stackTrace?: string;
}

const collectDebugInformation = (
  node: WorkflowNode,
  context: SingleNodeExecutionContext,
  error?: Error
): DebugInformation => {
  return {
    nodeConfiguration: {
      type: node.type,
      parameters: sanitizeParameters(node.parameters),
      credentialsConfigured: !!node.credentialsId,
    },
    executionContext: {
      inputData: sanitizeInputData(context.inputData),
      executionId: context.executionId,
      timestamp: context.timestamp,
    },
    environment: {
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      platform: process.platform,
    },
    logs: getRecentLogs(context.executionId),
    stackTrace: error?.stack,
  };
};
```

## Performance Optimization

### Caching Strategies

```typescript
// ResultCache.ts
export class SingleNodeResultCache {
  private cache = new Map<string, CachedResult>();
  private TTL = 5 * 60 * 1000; // 5 minutes

  async getCachedResult(
    nodeId: string,
    inputDataHash: string,
    parametersHash: string
  ): Promise<CachedResult | null> {
    const cacheKey = this.generateCacheKey(
      nodeId,
      inputDataHash,
      parametersHash
    );
    const cached = this.cache.get(cacheKey);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Check if result is still valid
    if (!(await this.isResultValid(cached))) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  setCachedResult(
    nodeId: string,
    inputDataHash: string,
    parametersHash: string,
    result: NodeExecutionResult
  ): void {
    const cacheKey = this.generateCacheKey(
      nodeId,
      inputDataHash,
      parametersHash
    );

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      nodeId,
      inputDataHash,
      parametersHash,
    });

    // Clean up old entries
    this.cleanupExpiredEntries();
  }
}
```

### Resource Management

```typescript
interface ResourceLimits {
  maxExecutionTime: number; // milliseconds
  maxMemoryUsage: number; // bytes
  maxOutputSize: number; // bytes
  maxApiCalls: number; // count
}

const DEFAULT_LIMITS: ResourceLimits = {
  maxExecutionTime: 30000, // 30 seconds
  maxMemoryUsage: 256 * 1024 * 1024, // 256 MB
  maxOutputSize: 10 * 1024 * 1024, // 10 MB
  maxApiCalls: 100,
};

const enforceResourceLimits = async (
  execution: Promise<NodeExecutionResult>,
  limits: ResourceLimits = DEFAULT_LIMITS
): Promise<NodeExecutionResult> => {
  return Promise.race([
    execution,
    createTimeoutPromise(limits.maxExecutionTime),
  ]);
};
```

## Integration with Development Tools

### Test Data Management

```typescript
// TestDataManager.ts
export class TestDataManager {
  async saveTestData(
    nodeId: string,
    testData: any,
    name: string
  ): Promise<void> {
    const testDataEntry = {
      id: uuidv4(),
      nodeId,
      name,
      data: testData,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    await this.storage.save("test-data", testDataEntry);
  }

  async loadTestData(nodeId: string): Promise<TestDataEntry[]> {
    return await this.storage.find("test-data", { nodeId });
  }

  async getPopularTestData(nodeType: string): Promise<TestDataEntry[]> {
    // Return commonly used test data for this node type
    return await this.storage.find("test-data", {
      nodeType,
      orderBy: "usage_count",
      limit: 10,
    });
  }
}
```

### Development Workflow Integration

```typescript
// DevelopmentTools.ts
export class DevelopmentTools {
  async generateNodeTests(
    nodeId: string,
    executionResults: NodeExecutionResult[]
  ): Promise<string> {
    // Generate Jest test cases based on execution results
    const testTemplate = `
describe('${nodeId} Node Tests', () => {
  ${executionResults
    .map(
      (result, index) => `
  test('Execution ${index + 1}', async () => {
    const result = await executeNode('${nodeId}', ${JSON.stringify(
        result.inputData
      )});
    expect(result.success).toBe(${result.success});
    ${
      result.success
        ? `expect(result.data).toEqual(${JSON.stringify(result.data)});`
        : `expect(result.error).toBe('${result.error}');`
    }
  });`
    )
    .join("\n")}
});`;

    return testTemplate;
  }

  async exportExecutionTrace(
    nodeId: string,
    executionId: string
  ): Promise<ExecutionTrace> {
    // Export detailed execution trace for debugging
    return {
      nodeId,
      executionId,
      timeline: await this.getExecutionTimeline(executionId),
      memoryUsage: await this.getMemoryUsage(executionId),
      networkCalls: await this.getNetworkCalls(executionId),
      logs: await this.getExecutionLogs(executionId),
    };
  }
}
```

## Best Practices and Guidelines

### Testing Guidelines

1. **Use Realistic Test Data**: Mirror production data structure and volume
2. **Test Edge Cases**: Empty inputs, null values, malformed data
3. **Validate Error Handling**: Ensure graceful error responses
4. **Performance Testing**: Monitor execution time and resource usage
5. **Credential Testing**: Test with various credential scenarios

### Development Workflow

1. **Iterative Development**: Use single node execution for rapid iteration
2. **Configuration Validation**: Test parameter combinations thoroughly
3. **Documentation**: Document expected inputs and outputs
4. **Version Control**: Track test data and execution results
5. **Collaboration**: Share test cases with team members

### Performance Considerations

1. **Resource Limits**: Always set appropriate execution limits
2. **Caching**: Cache results for identical inputs
3. **Cleanup**: Properly dispose of resources after execution
4. **Monitoring**: Track performance metrics and trends
5. **Optimization**: Profile and optimize slow-running nodes
