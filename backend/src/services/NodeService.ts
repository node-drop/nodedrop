import { eq, and, or, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { nodeTypes } from '../db/schema/nodes';
import {
  NodeDefinition,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeInputData,
  NodeOutputData,
  NodeProperty,
  NodeRegistrationResult,
  NodeSchema,
  NodeTypeInfo,
  NodeValidationError,
  NodeValidationResult,
  StandardizedNodeOutput,
} from '../types/node.types';
import { NodeSettingsConfig } from '../types/settings.types';
import { logger } from '../utils/logger';
import {
  extractJsonData,
  normalizeInputItems,
  resolvePath,
  resolveValue,
  wrapJsonData,
} from '@nodedrop/utils';
import {
  SecureExecutionOptions,
  SecureExecutionService,
} from './SecureExecutionService';

/**
 * Options for workspace-scoped queries
 */
interface WorkspaceQueryOptions {
  workspaceId?: string;
}

export class NodeService {
  private nodeRegistry = new Map<string, NodeDefinition>();
  private secureExecutionService: SecureExecutionService;
  private initializationPromise: Promise<void>;

  constructor() {
    this.secureExecutionService = new SecureExecutionService();
    this.initializationPromise = this.initializeBuiltInNodes();
  }

  /**
   * Wait for built-in nodes to be initialized
   */
  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Helper to resolve properties - handles both static arrays and dynamic functions
   */
  private resolveProperties(
    properties: NodeProperty[] | (() => NodeProperty[])
  ): NodeProperty[] {
    if (typeof properties === 'function') {
      return properties();
    }
    return properties;
  }

  /**
   * Standardize node output data format for consistent frontend handling
   * All nodes should return data in this format for uniform processing
   */
  private standardizeNodeOutput(
    identifier: string,
    outputs: NodeOutputData[],
    nodeDefinition?: NodeDefinition
  ): StandardizedNodeOutput {
    // Check if this is a multi-output node with positional outputs (like Loop)
    // These nodes return [{ main: [...] }, { main: [...] }] where position maps to output name
    const hasMultipleOutputs = nodeDefinition && nodeDefinition.outputs.length > 1;
    const allOutputsUseMain = outputs.every(output => 
      Object.keys(output).length === 1 && 'main' in output
    );
    
    if (hasMultipleOutputs && allOutputsUseMain && nodeDefinition) {
      // Positional outputs: map array index to output name
      const branches: Record<string, any[]> = {};
      let mainOutput: any[] = [];

      outputs.forEach((output, index) => {
        const outputName = nodeDefinition.outputs[index] || `output${index}`;
        const outputData = output.main || [];
        branches[outputName] = outputData;
        
        // Add to main output for backward compatibility
        mainOutput = mainOutput.concat(outputData);
      });

      return {
        main: mainOutput,
        branches,
        metadata: {
          nodeType: identifier,
          outputCount: outputs.length,
          hasMultipleBranches: true,
        },
      };
    }

    // Detect if this is a branching node by checking if outputs have named branches (not just "main")
    const hasMultipleBranches = outputs.some((output) => {
      const keys = Object.keys(output);
      return keys.some((key) => key !== 'main');
    });

    // Handle branching nodes (IF, IfElse, Switch, Loop, or any future branch-type nodes)
    if (hasMultipleBranches) {
      const branches: Record<string, any[]> = {};
      let mainOutput: any[] = [];

      // Extract branch data from node format: [{branchName1: [...]}, {branchName2: [...]}]
      outputs.forEach((output) => {
        Object.keys(output).forEach((branchName) => {
          // Initialize branch if it doesn't exist
          if (!branches[branchName]) {
            branches[branchName] = [];
          }
          // Concatenate data (don't overwrite!)
          const branchData = output[branchName] || [];
          branches[branchName] = branches[branchName].concat(branchData);
          
          // Also add to main output for backward compatibility
          mainOutput = mainOutput.concat(branchData);
        });
      });

      return {
        main: mainOutput,
        branches,
        metadata: {
          nodeType: identifier,
          outputCount: outputs.length,
          hasMultipleBranches: true,
        },
      };
    }

    // Handle standard nodes with main output: [{main: [{json: data}]}]
    const mainOutput: any[] = [];
    outputs.forEach((output) => {
      if (output.main) {
        mainOutput.push(...output.main);
      }
    });

    return {
      main: mainOutput,
      metadata: {
        nodeType: identifier,
        outputCount: outputs.length,
        hasMultipleBranches: false,
      },
    };
  }

  /**
   * Pre-validate node definition before database operations
   */
  private preValidateNodeDefinition(nodeDefinition: NodeDefinition): { valid: boolean; error?: string } {
    // Check required fields exist and are correct type
    if (!nodeDefinition.identifier || typeof nodeDefinition.identifier !== 'string') {
      return { valid: false, error: 'Node identifier is required and must be a string' };
    }

    if (!nodeDefinition.displayName || typeof nodeDefinition.displayName !== 'string') {
      return { valid: false, error: 'Node displayName is required and must be a string' };
    }

    if (!nodeDefinition.name || typeof nodeDefinition.name !== 'string') {
      return { valid: false, error: 'Node name is required and must be a string' };
    }

    if (!nodeDefinition.description || typeof nodeDefinition.description !== 'string') {
      return { valid: false, error: 'Node description is required and must be a string' };
    }

    // Validate array fields
    if (!Array.isArray(nodeDefinition.group)) {
      return { valid: false, error: 'Node group must be an array' };
    }

    if (!Array.isArray(nodeDefinition.inputs)) {
      return { valid: false, error: 'Node inputs must be an array' };
    }

    if (!Array.isArray(nodeDefinition.outputs)) {
      return { valid: false, error: 'Node outputs must be an array' };
    }

    // Validate properties is array or function
    if (nodeDefinition.properties && 
        !Array.isArray(nodeDefinition.properties) && 
        typeof nodeDefinition.properties !== 'function') {
      return { valid: false, error: 'Node properties must be an array or function' };
    }

    return { valid: true };
  }

  /**
   * Register a new node type
   */
  async registerNode(
    nodeDefinition: NodeDefinition,
    isCore: boolean = false,
    options?: WorkspaceQueryOptions
  ): Promise<NodeRegistrationResult> {
    const nodeIdentifier = nodeDefinition?.identifier || 'unknown';
    const nodeDisplayName = nodeDefinition?.displayName || 'unknown';
    
    try {
      // Pre-validate node definition before database operations
      const preValidation = this.preValidateNodeDefinition(nodeDefinition);
      if (!preValidation.valid) {
        const errorMsg = preValidation.error || 'Node definition validation failed';
        logger.error('Node definition pre-validation failed', {
          identifier: nodeIdentifier,
          displayName: nodeDisplayName,
          error: errorMsg,
          service: 'node-drop-backend',
        });
        return {
          success: false,
          errors: [errorMsg],
        };
      }

      // Validate node definition
      const validation = this.validateNodeDefinition(nodeDefinition);
      if (!validation.valid) {
        const validationErrors = validation.errors.map((e) => e.message);
        logger.error('Node definition validation failed', {
          identifier: nodeIdentifier,
          displayName: nodeDisplayName,
          errors: validationErrors,
          service: 'node-drop-backend',
        });
        return {
          success: false,
          errors: validationErrors,
        };
      }

      // Resolve properties before saving to database
      let resolvedProperties: NodeProperty[] = [];
      try {
        resolvedProperties = this.resolveProperties(nodeDefinition.properties);
      } catch (propError) {
        const errorMsg = propError instanceof Error ? propError.message : 'Failed to resolve properties';
        logger.error('Failed to resolve node properties', {
          identifier: nodeIdentifier,
          displayName: nodeDisplayName,
          error: errorMsg,
          service: 'node-drop-backend',
        });
        return {
          success: false,
          errors: [`Failed to resolve properties: ${errorMsg}`],
        };
      }

      // Check if node already exists
      let existingNode;
      try {
        existingNode = await db.query.nodeTypes.findFirst({
          where: eq(nodeTypes.identifier, nodeDefinition.identifier),
        });
      } catch (dbError) {
        const errorMsg = dbError instanceof Error ? dbError.message : 'Database query failed';
        logger.error('Failed to query existing node', {
          identifier: nodeIdentifier,
          displayName: nodeDisplayName,
          error: errorMsg,
          service: 'node-drop-backend',
        });
        return {
          success: false,
          errors: [`Database error: ${errorMsg}`],
        };
      }

      try {
        if (existingNode) {
          // Update existing node
          await db
            .update(nodeTypes)
            .set({
              displayName: nodeDefinition.displayName,
              name: nodeDefinition.name,
              group: nodeDefinition.group,
              version: nodeDefinition.version,
              description: nodeDefinition.description,
              defaults: nodeDefinition.defaults as any,
              inputs: nodeDefinition.inputs,
              outputs: nodeDefinition.outputs,
              inputsConfig: (nodeDefinition as any).inputsConfig as any,
              properties: resolvedProperties as any,
              credentials: (nodeDefinition.credentials as any) || null,
              credentialSelector: (nodeDefinition.credentialSelector as any) || null,
              icon: nodeDefinition.icon || null,
              color: nodeDefinition.color || null,
              outputComponent: nodeDefinition.outputComponent || null,
              nodeCategory: nodeDefinition.nodeCategory || null,
              updatedAt: new Date(),
              // Don't update active status on update - preserve user's choice
              // Don't update workspaceId on update - preserve original workspace
            })
            .where(eq(nodeTypes.identifier, nodeDefinition.identifier));
        } else {
          // Create new node
          await db.insert(nodeTypes).values({
            identifier: nodeDefinition.identifier,
            displayName: nodeDefinition.displayName,
            name: nodeDefinition.name,
            group: nodeDefinition.group,
            version: nodeDefinition.version,
            description: nodeDefinition.description,
            defaults: nodeDefinition.defaults as any,
            inputs: nodeDefinition.inputs,
            outputs: nodeDefinition.outputs,
            inputsConfig: (nodeDefinition as any).inputsConfig as any,
            properties: resolvedProperties as any,
            credentials: (nodeDefinition.credentials as any) || null,
            credentialSelector: (nodeDefinition.credentialSelector as any) || null,
            icon: nodeDefinition.icon || null,
            color: nodeDefinition.color || null,
            outputComponent: nodeDefinition.outputComponent || null,
            nodeCategory: nodeDefinition.nodeCategory || null,
            isCore: isCore,
            active: true,
            workspaceId: options?.workspaceId || null,
          });
        }
      } catch (dbWriteError) {
        const errorMessage = dbWriteError instanceof Error ? dbWriteError.message : String(dbWriteError);
        const errorCode = (dbWriteError as any)?.code;
        const errorDetail = (dbWriteError as any)?.detail;
        
        // Provide more specific error messages for common database errors
        let userFriendlyError = errorMessage;
        if (errorCode === '23505') {
          // Unique constraint violation
          userFriendlyError = `Node with identifier '${nodeIdentifier}' already exists`;
        } else if (errorCode === '23502') {
          // Not null constraint violation
          userFriendlyError = `Missing required field: ${errorDetail || 'unknown'}`;
        } else if (errorCode === '23503') {
          // Foreign key constraint violation
          userFriendlyError = `Invalid reference: ${errorDetail || 'unknown'}`;
        }
        
        logger.error('Failed to write node to database', {
          identifier: nodeIdentifier,
          displayName: nodeDisplayName,
          errorMessage,
          errorCode,
          errorDetail,
          userFriendlyError,
          service: 'node-drop-backend',
        });
        
        return {
          success: false,
          errors: [`Database error: ${userFriendlyError}`],
        };
      }

      // Store in memory registry
      this.nodeRegistry.set(nodeDefinition.identifier, nodeDefinition);

      return {
        success: true,
        identifier: nodeDefinition.identifier,
      };
    } catch (error) {
      // Catch-all for unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : typeof error;
      
      logger.error('Unexpected error during node registration', {
        identifier: nodeIdentifier,
        displayName: nodeDisplayName,
        errorMessage,
        errorName,
        errorStack,
        service: 'node-drop-backend',
      });
      
      return {
        success: false,
        errors: [
          `Unexpected error: ${errorMessage}`,
        ],
      };
    }
  }

  /**
   * Unregister a node type (sets inactive in database)
   */
  async unregisterNode(nodeType: string): Promise<void> {
    try {
      await db
        .update(nodeTypes)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(nodeTypes.identifier, nodeType));

      this.nodeRegistry.delete(nodeType);
      logger.info(`Node type unregistered: ${nodeType}`);
    } catch (error) {
      logger.error('Failed to unregister node', { error, nodeType });
      throw new Error(
        `Failed to unregister node: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Unload a node type from memory only (for package deletion)
   */
  async unloadNodeFromMemory(nodeType: string): Promise<void> {
    try {
      this.nodeRegistry.delete(nodeType);
      logger.info(`Node type unloaded from memory: ${nodeType}`);
    } catch (error) {
      logger.error('Failed to unload node from memory', { error, nodeType });
      throw new Error(
        `Failed to unload node from memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all available node types from in-memory registry (live definitions)
   */
  async getNodeTypes(options?: WorkspaceQueryOptions): Promise<NodeTypeInfo[]> {
    try {
      const nodeTypesFromRegistry: NodeTypeInfo[] = [];

      // First, get live node definitions from in-memory registry
      for (const [identifier, nodeDefinition] of this.nodeRegistry.entries()) {
        nodeTypesFromRegistry.push({
          identifier: nodeDefinition.identifier,
          displayName: nodeDefinition.displayName,
          name: nodeDefinition.name,
          description: nodeDefinition.description,
          group: nodeDefinition.group,
          version: nodeDefinition.version,
          defaults: nodeDefinition.defaults || {},
          inputs: nodeDefinition.inputs,
          outputs: nodeDefinition.outputs,
          inputNames: nodeDefinition.inputNames,
          outputNames: nodeDefinition.outputNames,
          serviceInputs: nodeDefinition.serviceInputs,
          inputsConfig: nodeDefinition.inputsConfig,
          properties: this.resolveProperties(nodeDefinition.properties || []),
          credentials: nodeDefinition.credentials,
          credentialSelector: nodeDefinition.credentialSelector,
          icon: nodeDefinition.icon,
          color: nodeDefinition.color,
          nodeCategory: nodeDefinition.nodeCategory,
          triggerType: nodeDefinition.triggerType,
          executionCapability:
            nodeDefinition.executionCapability ||
            this.getExecutionCapability(nodeDefinition),
          canExecuteIndividually:
            nodeDefinition.canExecuteIndividually ??
            this.canExecuteIndividually(nodeDefinition),
          canBeDisabled: nodeDefinition.canBeDisabled ?? true,
        });
      }

      // If registry is empty, fallback to database
      if (nodeTypesFromRegistry.length === 0) {
        logger.warn('Node registry is empty, falling back to database');
        
        const whereConditions = [eq(nodeTypes.active, true)];
        
        // Include workspace-specific custom nodes if workspaceId provided
        let dbNodeTypes;
        if (options?.workspaceId) {
          dbNodeTypes = await db.query.nodeTypes.findMany({
            where: and(
              eq(nodeTypes.active, true),
              or(
                isNull(nodeTypes.workspaceId),
                eq(nodeTypes.workspaceId, options.workspaceId)
              )
            ),
            orderBy: (t) => t.displayName,
          });
        } else {
          dbNodeTypes = await db.query.nodeTypes.findMany({
            where: and(eq(nodeTypes.active, true), isNull(nodeTypes.workspaceId)),
            orderBy: (t) => t.displayName,
          });
        }

        return dbNodeTypes.map((node) => ({
          identifier: node.identifier,
          displayName: node.displayName,
          name: node.name,
          description: node.description,
          group: (node.group as string[]) || [],
          version: (node.version as number) || 1,
          defaults: typeof node.defaults === 'object' && node.defaults !== null
            ? (node.defaults as Record<string, any>)
            : {},
          inputs: (node.inputs as string[]) || ['main'],
          outputs: (node.outputs as string[]) || ['main'],
          properties: Array.isArray(node.properties)
            ? (node.properties as unknown as NodeProperty[])
            : [],
          icon: node.icon || undefined,
          color: node.color || undefined,
        }));
      }

      // Sort by display name
      nodeTypesFromRegistry.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      return nodeTypesFromRegistry;
    } catch (error) {
      logger.error('Failed to get node types', { error });
      throw new Error(
        `Failed to get node types: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get raw node definition by type from in-memory registry (synchronous)
   */
  getNodeDefinitionSync(nodeType: string): NodeDefinition | null {
    try {
      const nodeDefinition = this.nodeRegistry.get(nodeType);
      return nodeDefinition || null;
    } catch (error) {
      logger.error(`Failed to get node definition for ${nodeType}`, { error });
      return null;
    }
  }

  /**
   * Get raw node definition by type from in-memory registry (async version)
   */
  async getNodeDefinition(nodeType: string): Promise<NodeDefinition | null> {
    try {
      await this.waitForInitialization();
      const nodeDefinition = this.nodeRegistry.get(nodeType);
      if (nodeDefinition) {
        return nodeDefinition;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get node definition for ${nodeType}`, { error });
      return null;
    }
  }

  /**
   * Get node schema by type from in-memory registry (live definition)
   */
  async getNodeSchema(nodeType: string): Promise<NodeSchema | null> {
    try {
      await this.waitForInitialization();

      const nodeDefinition = this.nodeRegistry.get(nodeType);

      if (nodeDefinition) {
        return {
          identifier: nodeDefinition.identifier,
          displayName: nodeDefinition.displayName,
          name: nodeDefinition.name,
          group: nodeDefinition.group,
          version: nodeDefinition.version,
          description: nodeDefinition.description,
          defaults: nodeDefinition.defaults || {},
          inputs: nodeDefinition.inputs,
          outputs: nodeDefinition.outputs,
          properties: this.resolveProperties(nodeDefinition.properties || []),
          credentials: nodeDefinition.credentials,
          credentialSelector: nodeDefinition.credentialSelector,
          icon: nodeDefinition.icon,
          color: nodeDefinition.color,
          nodeCategory: nodeDefinition.nodeCategory,
          inputsConfig: nodeDefinition.inputsConfig,
        };
      }

      // Fallback to database if not found in registry
      logger.warn(
        `Node type ${nodeType} not found in registry, checking database`
      );
      const node = await db.query.nodeTypes.findFirst({
        where: and(
          eq(nodeTypes.identifier, nodeType),
          eq(nodeTypes.active, true)
        ),
      });

      if (!node) {
        return null;
      }

      return {
        identifier: node.identifier,
        displayName: node.displayName,
        name: node.name,
        group: node.group || [],
        version: node.version || 1,
        description: node.description,
        defaults: node.defaults as Record<string, any>,
        inputs: node.inputs || ['main'],
        outputs: node.outputs || ['main'],
        properties: node.properties as unknown as NodeProperty[],
        icon: node.icon || undefined,
        color: node.color || undefined,
      };
    } catch (error) {
      logger.error('Failed to get node schema', { error, nodeType });
      throw new Error(
        `Failed to get node schema: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a node securely
   */
  async executeNode(
    nodeType: string,
    parameters: Record<string, any>,
    inputData: NodeInputData,
    credentials?: Record<string, any>,
    executionId?: string,
    userId?: string,
    options?: SecureExecutionOptions,
    workflowId?: string,
    settings?: NodeSettingsConfig,
    nodeOutputs?: Map<string, any>,
    nodeIdToName?: Map<string, string>
  ): Promise<NodeExecutionResult> {
    const execId =
      executionId ||
      `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const executingUserId = userId || 'system';

    try {
      await this.waitForInitialization();

      const nodeDefinition = this.nodeRegistry.get(nodeType);
      if (!nodeDefinition) {
        throw new Error(`Node type not found: ${nodeType}`);
      }

      const inputValidation =
        this.secureExecutionService.validateInputData(inputData);
      if (!inputValidation.valid) {
        throw new Error(
          `Invalid input data: ${inputValidation.errors.join(', ')}`
        );
      }

      const baseContext = await this.secureExecutionService.createSecureContext(
        parameters,
        inputValidation.sanitizedData!,
        credentials || {},
        executingUserId,
        execId,
        options,
        workflowId,
        settings,
        options?.nodeId,
        nodeOutputs,
        nodeIdToName
      );

      const context = Object.create(nodeDefinition);
      Object.assign(context, baseContext);

      context._executionId = execId;
      context._nodeId = options?.nodeId;
      context._serviceNodeId = options?.nodeId;

      try {
        const { injectLoggingMethods } = require('../../custom-nodes/utils/serviceLogger');
        injectLoggingMethods(context);
      } catch (error) {
        logger.warn('Failed to inject logging methods into node context', {
          error: error instanceof Error ? error.message : 'Unknown error',
          nodeType,
        });
      }

      const result = await nodeDefinition.execute.call(
        context,
        inputValidation.sanitizedData!
      );

      const outputValidation =
        this.secureExecutionService.validateOutputData(result);
      if (!outputValidation.valid) {
        throw new Error(
          `Invalid output data: ${outputValidation.errors.join(', ')}`
        );
      }

      const standardizedOutput = this.standardizeNodeOutput(
        nodeType,
        outputValidation.sanitizedData as NodeOutputData[],
        nodeDefinition
      );

      await this.secureExecutionService.cleanupExecution(execId);

      return {
        success: true,
        data: standardizedOutput,
      };
    } catch (error) {
      logger.error('Secure node execution failed', {
        error: {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        },
        nodeType,
        parameters,
        executionId: execId,
      });

      await this.secureExecutionService.cleanupExecution(execId);

      const continueOnFail = settings?.continueOnFail === true;
      const alwaysOutputData = settings?.alwaysOutputData === true;

      if (continueOnFail && alwaysOutputData) {
        logger.info('Node failed but continueOnFail is enabled - returning error data', {
          nodeType,
          executionId: execId,
        });

        const errorOutput: StandardizedNodeOutput = {
          main: [{
            json: {
              error: error instanceof Error ? error.message : 'Unknown execution error',
              errorDetails: {
                message: error instanceof Error ? error.message : String(error),
                name: error instanceof Error ? error.name : typeof error,
                stack: error instanceof Error ? error.stack : undefined,
              },
            },
          }],
          metadata: {
            nodeType,
            outputCount: 1,
            hasMultipleBranches: false,
          },
        };

        return {
          success: false,
          data: errorOutput,
          error: {
            message:
              error instanceof Error ? error.message : 'Unknown execution error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        };
      }

      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown execution error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  /**
   * Validate node definition
   */
  validateNodeDefinition(definition: NodeDefinition): NodeValidationResult {
    const errors: NodeValidationError[] = [];

    if (!definition.identifier || typeof definition.identifier !== 'string') {
      errors.push({
        property: 'type',
        message: 'Node type is required and must be a string',
      });
    }

    if (!definition.displayName || typeof definition.displayName !== 'string') {
      errors.push({
        property: 'displayName',
        message: 'Display name is required and must be a string',
      });
    }

    if (!definition.name || typeof definition.name !== 'string') {
      errors.push({
        property: 'name',
        message: 'Name is required and must be a string',
      });
    }

    if (!Array.isArray(definition.group) || definition.group.length === 0) {
      errors.push({
        property: 'group',
        message: 'Group is required and must be a non-empty array',
      });
    }

    if (typeof definition.version !== 'number' || definition.version < 1) {
      errors.push({
        property: 'version',
        message: 'Version is required and must be a positive number',
      });
    }

    if (!definition.description || typeof definition.description !== 'string') {
      errors.push({
        property: 'description',
        message: 'Description is required and must be a string',
      });
    }

    if (!Array.isArray(definition.inputs)) {
      errors.push({ property: 'inputs', message: 'Inputs must be an array' });
    }

    if (!Array.isArray(definition.outputs)) {
      errors.push({ property: 'outputs', message: 'Outputs must be an array' });
    }

    if (
      !definition.properties ||
      (!Array.isArray(definition.properties) &&
        typeof definition.properties !== 'function')
    ) {
      errors.push({
        property: 'properties',
        message:
          'Properties must be an array or a function that returns an array',
      });
    }

    if (typeof definition.execute !== 'function') {
      errors.push({
        property: 'execute',
        message: 'Execute function is required',
      });
    }

    const resolvedProperties = this.resolveProperties(definition.properties);
    if (Array.isArray(resolvedProperties)) {
      resolvedProperties.forEach((prop, index) => {
        const validation = this.validateNodeProperty(prop);
        if (!validation.valid) {
          validation.errors.forEach((error) => {
            errors.push({
              property: `properties[${index}].${error.property}`,
              message: error.message,
              value: error.value,
            });
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate node property
   */
  private validateNodeProperty(property: NodeProperty): NodeValidationResult {
    const errors: NodeValidationError[] = [];

    if (!property.displayName || typeof property.displayName !== 'string') {
      errors.push({
        property: 'displayName',
        message: 'Property display name is required',
      });
    }

    if (!property.name || typeof property.name !== 'string') {
      errors.push({ property: 'name', message: 'Property name is required' });
    }

    const validTypes = [
      'string',
      'number',
      'boolean',
      'options',
      'multiOptions',
      'json',
      'dateTime',
      'collection',
      'autocomplete',
      'credential',
      'custom',
      'conditionRow',
      'columnsMap',
      'expression',
    ];
    if (!validTypes.includes(property.type)) {
      errors.push({
        property: 'type',
        message: `Property type must be one of: ${validTypes.join(', ')}`,
        value: property.type,
      });
    }

    if (
      (property.type === 'options' || property.type === 'multiOptions') &&
      !Array.isArray(property.options)
    ) {
      errors.push({
        property: 'options',
        message: 'Options are required for options/multiOptions type',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Initialize built-in nodes
   */
  private async initializeBuiltInNodes(): Promise<void> {
    try {
      await this.registerBuiltInNodes();
    } catch (error) {
      logger.error('Failed to initialize built-in nodes', { error });
    }
  }

  /**
   * Register all built-in nodes using auto-discovery
   */
  private async registerBuiltInNodes(): Promise<void> {
    const { nodeDiscovery } = await import('../utils/NodeDiscovery');

    try {
      const builtInNodeInfos = await nodeDiscovery.loadAllNodes();
      const customNodeInfos = await nodeDiscovery.loadCustomNodes();

      let successCount = 0;
      let failureCount = 0;
      const failedNodes: Array<{ identifier: string; displayName: string; error: string }> = [];

      for (const nodeInfo of builtInNodeInfos) {
        try {
          const result = await this.registerNode(nodeInfo.definition, true);
          if (!result.success) {
            failureCount++;
            const errorMsg = result.errors?.join('; ') || 'Unknown error';
            failedNodes.push({
              identifier: nodeInfo.definition.identifier,
              displayName: nodeInfo.definition.displayName,
              error: errorMsg,
            });
            logger.error(`Error registering built-in node ${nodeInfo.definition.displayName}:`, {
              errors: result.errors,
              identifier: nodeInfo.definition.identifier,
              service: 'node-drop-backend',
            });
          } else {
            successCount++;
          }
        } catch (error) {
          failureCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          failedNodes.push({
            identifier: nodeInfo.definition.identifier,
            displayName: nodeInfo.definition.displayName,
            error: errorMsg,
          });
          logger.error(`Exception registering built-in node ${nodeInfo.definition.displayName}:`, {
            error: {
              message: errorMsg,
              name: error instanceof Error ? error.name : typeof error,
              stack: error instanceof Error ? error.stack : undefined,
            },
            identifier: nodeInfo.definition.identifier,
            service: 'node-drop-backend',
          });
        }
      }

      for (const nodeInfo of customNodeInfos) {
        try {
          const result = await this.registerNode(nodeInfo.definition, false);
          if (!result.success) {
            failureCount++;
            const errorMsg = result.errors?.join('; ') || 'Unknown error';
            failedNodes.push({
              identifier: nodeInfo.definition.identifier,
              displayName: nodeInfo.definition.displayName,
              error: errorMsg,
            });
            logger.error(`Error registering custom node ${nodeInfo.definition.displayName}:`, {
              errors: result.errors,
              identifier: nodeInfo.definition.identifier,
              service: 'node-drop-backend',
            });
          } else {
            successCount++;
          }
        } catch (error) {
          failureCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          failedNodes.push({
            identifier: nodeInfo.definition.identifier,
            displayName: nodeInfo.definition.displayName,
            error: errorMsg,
          });
          logger.error(`Exception registering custom node ${nodeInfo.definition.displayName}:`, {
            error: {
              message: errorMsg,
              name: error instanceof Error ? error.name : typeof error,
              stack: error instanceof Error ? error.stack : undefined,
            },
            identifier: nodeInfo.definition.identifier,
            service: 'node-drop-backend',
          });
        }
      }

      // Log summary
      if (failureCount > 0) {
        logger.warn('Node registration summary', {
          successCount,
          failureCount,
          totalAttempted: successCount + failureCount,
          failedNodes: failedNodes.map(n => ({
            identifier: n.identifier,
            displayName: n.displayName,
            error: n.error,
          })),
          service: 'node-drop-backend',
        });
      }
    } catch (error) {
      logger.error('Error during node discovery and registration:', {
        error: {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        },
        service: 'node-drop-backend',
      });
      throw error;
    }
  }

  /**
   * Register all discovered nodes from the nodes directory
   * This is an alias for registerBuiltInNodes for backward compatibility
   */
  async registerDiscoveredNodes(): Promise<void> {
    await this.registerBuiltInNodes();
  }

  /**
   * Activate a node type
   */
  async activateNode(
    nodeType: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const existingNode = await db.query.nodeTypes.findFirst({
        where: eq(nodeTypes.identifier, nodeType),
      });

      if (!existingNode) {
        return {
          success: false,
          message: `Node type '${nodeType}' not found`,
        };
      }

      if (existingNode.active) {
        return {
          success: true,
          message: `Node type '${nodeType}' is already active`,
        };
      }

      await db
        .update(nodeTypes)
        .set({ active: true, updatedAt: new Date() })
        .where(eq(nodeTypes.identifier, nodeType));

      logger.info('Node type activated', { nodeType });
      return {
        success: true,
        message: `Node type '${nodeType}' activated successfully`,
      };
    } catch (error) {
      logger.error('Failed to activate node type', { error, nodeType });
      return {
        success: false,
        message: `Failed to activate node type: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Deactivate a node type
   */
  async deactivateNode(
    nodeType: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const existingNode = await db.query.nodeTypes.findFirst({
        where: eq(nodeTypes.identifier, nodeType),
      });

      if (!existingNode) {
        return {
          success: false,
          message: `Node type '${nodeType}' not found`,
        };
      }

      if (!existingNode.active) {
        return {
          success: true,
          message: `Node type '${nodeType}' is already inactive`,
        };
      }

      await db
        .update(nodeTypes)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(nodeTypes.identifier, nodeType));

      logger.info('Node type deactivated', { nodeType });
      return {
        success: true,
        message: `Node type '${nodeType}' deactivated successfully`,
      };
    } catch (error) {
      logger.error('Failed to deactivate node type', { error, nodeType });
      return {
        success: false,
        message: `Failed to deactivate node type: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get all active node types
   */
  async getActiveNodes(): Promise<
    Array<{
      identifier: string;
      displayName: string;
      group: string[];
      description: string;
    }>
  > {
    try {
      const nodes = await db.query.nodeTypes.findMany({
        where: eq(nodeTypes.active, true),
        columns: {
          identifier: true,
          displayName: true,
          group: true,
          description: true,
        },
        orderBy: (t) => t.displayName,
      });

      return nodes.map((node) => ({
        identifier: node.identifier,
        displayName: node.displayName,
        group: (node.group as string[]) || [],
        description: node.description,
      }));
    } catch (error) {
      logger.error('Failed to get active nodes', { error });
      return [];
    }
  }

  /**
   * Get all node types with their activation status
   */
  async getNodesWithStatus(): Promise<
    Array<{
      identifier: string;
      displayName: string;
      active: boolean;
      group: string[];
      description: string;
    }>
  > {
    try {
      const nodes = await db.query.nodeTypes.findMany({
        columns: {
          identifier: true,
          displayName: true,
          active: true,
          group: true,
          description: true,
        },
        orderBy: (t) => [t.active, t.displayName],
      });

      return nodes.map((node) => ({
        identifier: node.identifier,
        displayName: node.displayName,
        active: (node.active as boolean) || false,
        group: (node.group as string[]) || [],
        description: node.description,
      }));
    } catch (error) {
      logger.error('Failed to get nodes with status', { error });
      return [];
    }
  }

  /**
   * Bulk activate/deactivate nodes
   */
  async bulkUpdateNodeStatus(
    nodeTypeIds: string[],
    active: boolean
  ): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      const result = await db
        .update(nodeTypes)
        .set({
          active,
          updatedAt: new Date(),
        })
        .where(inArray(nodeTypes.identifier, nodeTypeIds));

      const action = active ? 'activated' : 'deactivated';
      const updatedCount = result.rowCount || 0;
      logger.info(`Bulk ${action} node types`, {
        nodeTypeIds,
        count: updatedCount,
      });

      return {
        success: true,
        message: `Successfully ${action} ${updatedCount} node(s)`,
        updated: updatedCount,
      };
    } catch (error) {
      logger.error('Failed to bulk update node status', {
        error,
        nodeTypeIds,
        active,
      });
      return {
        success: false,
        message: `Failed to update node status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updated: 0,
      };
    }
  }

  /**
   * Determine execution capability based on nodeCategory
   */
  private getExecutionCapability(
    nodeDefinition: NodeDefinition
  ): 'trigger' | 'action' | 'transform' | 'condition' {
    if (nodeDefinition.nodeCategory) {
      switch (nodeDefinition.nodeCategory) {
        case 'trigger':
          return 'trigger';
        case 'condition':
          return 'condition';
        case 'transform':
          return 'transform';
        case 'action':
        case 'service':
        case 'tool':
        default:
          return 'action';
      }
    }

    const group = nodeDefinition.group;
    if (group.includes('trigger')) {
      return 'trigger';
    } else if (group.includes('condition')) {
      return 'condition';
    } else if (group.includes('transform')) {
      return 'transform';
    } else {
      return 'action';
    }
  }

  /**
   * Determine if node can execute individually
   */
  private canExecuteIndividually(nodeDefinition: NodeDefinition): boolean {
    if (nodeDefinition.nodeCategory) {
      return nodeDefinition.nodeCategory === 'trigger';
    }
    
    return nodeDefinition.group.includes('trigger');
  }

  /**
   * Refresh and register custom nodes from the custom-nodes directory
   */
  async refreshCustomNodes(): Promise<{ success: boolean; message: string; registered: number }> {
    try {
      const { nodeDiscovery } = await import('../utils/NodeDiscovery');
      const customNodeInfos = await nodeDiscovery.loadCustomNodes();
      
      let registered = 0;
      const errors: string[] = [];
      
      for (const nodeInfo of customNodeInfos) {
        try {
          const result = await this.registerNode(nodeInfo.definition);
          if (result.success) {
            registered++;
            logger.info('Registered custom node', {
              nodeType: nodeInfo.definition.identifier,
              displayName: nodeInfo.definition.displayName,
              path: nodeInfo.path,
            });
          } else {
            errors.push(`Failed to register ${nodeInfo.definition.identifier}: ${result.errors?.join(', ')}`);
          }
        } catch (error) {
          const errorMsg = `Failed to register ${nodeInfo.definition.identifier}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.warn(errorMsg, { error });
        }
      }
      
      const message = registered > 0 
        ? `Successfully registered ${registered} custom node(s)${errors.length > 0 ? ` (${errors.length} errors)` : ''}`
        : `No custom nodes registered${errors.length > 0 ? ` (${errors.length} errors)` : ''}`;
      
      logger.info('Custom nodes refresh completed', {
        registered,
        errors: errors.length,
        totalFound: customNodeInfos.length,
      });
      
      return {
        success: registered > 0 || errors.length === 0,
        message,
        registered,
      };
    } catch (error) {
      const errorMsg = `Failed to refresh custom nodes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMsg, { error });
      return {
        success: false,
        message: errorMsg,
        registered: 0,
      };
    }
  }

  /**
   * Load dynamic options for a node field
   */
  async loadNodeOptions(
    nodeType: string,
    method: string,
    parameters: Record<string, any> = {},
    credentials: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    data?: Array<{ name: string; value: any; description?: string }>;
    error?: { message: string };
  }> {
    try {
      const nodeDefinition = this.nodeRegistry.get(nodeType);

      if (!nodeDefinition) {
        return {
          success: false,
          error: { message: `Node type '${nodeType}' not found` },
        };
      }

      if (
        !nodeDefinition.loadOptions ||
        typeof nodeDefinition.loadOptions !== 'object'
      ) {
        return {
          success: false,
          error: {
            message: `Node '${nodeType}' does not support dynamic options loading`,
          },
        };
      }

      const loadOptionsMethod = (nodeDefinition.loadOptions as any)[method];
      if (typeof loadOptionsMethod !== 'function') {
        return {
          success: false,
          error: {
            message: `Load options method '${method}' not found for node '${nodeType}'`,
          },
        };
      }

      const credentialTypeMap: Record<string, string> = {};
      if (nodeDefinition.properties) {
        const properties =
          typeof nodeDefinition.properties === 'function'
            ? nodeDefinition.properties()
            : nodeDefinition.properties;

        for (const property of properties) {
          if (
            property.type === 'credential' &&
            property.allowedTypes &&
            property.allowedTypes.length > 0
          ) {
            credentialTypeMap[property.name] = property.allowedTypes[0];
          }
        }
      }

      const context: any = {
        getNodeParameter: (paramName: string) => {
          return parameters[paramName];
        },
        getCredentials: async (credentialType: string) => {
          const credentialService = global.credentialService;
          if (!credentialService) {
            throw new Error('Credential service not initialized');
          }

          let credentialId = credentials[credentialType];

          if (!credentialId) {
            for (const [fieldName, mappedType] of Object.entries(
              credentialTypeMap
            )) {
              if (mappedType === credentialType && credentials[fieldName]) {
                credentialId = credentials[fieldName];
                break;
              }
            }
          }

          if (!credentialId) {
            for (const [fieldName, value] of Object.entries(credentials)) {
              if (value && (typeof value === 'string' || typeof value === 'number')) {
                try {
                  const credential = await credentialService.getCredentialById(String(value));
                  if (credential && credential.type === credentialType) {
                    credentialId = value;
                    break;
                  }
                } catch (error) {
                  // Continue checking other fields
                }
              }
            }
          }

          if (credentialId) {
            if (
              typeof credentialId === 'string' ||
              typeof credentialId === 'number'
            ) {
              const credential = await credentialService.getCredentialById(
                String(credentialId)
              );
              if (credential) {
                return credential.data;
              }
            }
            return credentialId;
          }

          return null;
        },
        logger: {
          info: (message: string, data?: any) => logger.info(message, data),
          error: (message: string, data?: any) => logger.error(message, data),
          warn: (message: string, data?: any) => logger.warn(message, data),
          debug: (message: string, data?: any) => logger.debug(message, data),
        },
      };

      const options = await loadOptionsMethod.call(context);

      if (!Array.isArray(options)) {
        return {
          success: false,
          error: {
            message: `Load options method '${method}' did not return an array`,
          },
        };
      }

      return {
        success: true,
        data: options,
      };
    } catch (error) {
      logger.error(
        `Failed to load options for node '${nodeType}', method '${method}'`,
        { error }
      );
      return {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error loading options',
        },
      };
    }
  }
}
