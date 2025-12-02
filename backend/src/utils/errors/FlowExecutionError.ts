export interface ExecutionError extends Error {
  // Base interface for execution errors
}

export enum FlowExecutionErrorType {
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  NODE_EXECUTION_FAILED = 'NODE_EXECUTION_FAILED',
  INVALID_FLOW_STATE = 'INVALID_FLOW_STATE',
  CONCURRENT_EXECUTION_CONFLICT = 'CONCURRENT_EXECUTION_CONFLICT'
}

export interface FlowExecutionError extends ExecutionError {
  flowErrorType: FlowExecutionErrorType;
  affectedNodes: string[];
  executionPath: string[];
  dependencyChain?: string[];
  suggestedResolution: string;
}

export class CircularDependencyError extends Error implements FlowExecutionError {
  public readonly flowErrorType = FlowExecutionErrorType.CIRCULAR_DEPENDENCY;
  public readonly affectedNodes: string[];
  public readonly executionPath: string[];
  public readonly dependencyChain: string[];
  public readonly suggestedResolution: string;

  constructor(
    circularNodes: string[],
    dependencyPath: string[],
    executionPath: string[] = []
  ) {
    const message = `Circular dependency detected involving nodes: ${circularNodes.join(' -> ')}`;
    super(message);
    
    this.name = 'CircularDependencyError';
    this.affectedNodes = circularNodes;
    this.executionPath = executionPath;
    this.dependencyChain = dependencyPath;
    this.suggestedResolution = 'Remove one or more connections to break the circular dependency loop. ' +
      `Consider restructuring the workflow to avoid the cycle: ${dependencyPath.join(' -> ')}.`;
  }
}

export class MissingDependencyError extends Error implements FlowExecutionError {
  public readonly flowErrorType = FlowExecutionErrorType.MISSING_DEPENDENCY;
  public readonly affectedNodes: string[];
  public readonly executionPath: string[];
  public readonly dependencyChain: string[];
  public readonly suggestedResolution: string;

  constructor(
    nodeId: string,
    missingDependencies: string[],
    executionPath: string[] = []
  ) {
    const message = `Node ${nodeId} has missing dependencies: ${missingDependencies.join(', ')}`;
    super(message);
    
    this.name = 'MissingDependencyError';
    this.affectedNodes = [nodeId, ...missingDependencies];
    this.executionPath = executionPath;
    this.dependencyChain = missingDependencies;
    this.suggestedResolution = 'Ensure all required upstream nodes are present and properly connected. ' +
      `Add connections from nodes: ${missingDependencies.join(', ')} to node: ${nodeId}.`;
  }
}

export class InvalidFlowStateError extends Error implements FlowExecutionError {
  public readonly flowErrorType = FlowExecutionErrorType.INVALID_FLOW_STATE;
  public readonly affectedNodes: string[];
  public readonly executionPath: string[];
  public readonly suggestedResolution: string;

  constructor(
    message: string,
    affectedNodes: string[] = [],
    executionPath: string[] = []
  ) {
    super(message);
    
    this.name = 'InvalidFlowStateError';
    this.affectedNodes = affectedNodes;
    this.executionPath = executionPath;
    this.suggestedResolution = 'Review the workflow structure and ensure all nodes are properly configured and connected.';
  }
}