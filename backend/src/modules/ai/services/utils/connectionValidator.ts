/**
 * Connection Validator Utility
 * 
 * Validates workflow connections for type compatibility.
 * Used by the validate_workflow tool to check connections before finalizing.
 */

import { Connection, Workflow } from '@/types/database';

// Maps node types to their expected service output types
const SERVICE_OUTPUT_TYPES: Record<string, string> = {
  'openai-model': 'modelService',
  'anthropic-model': 'modelService',
  'google-model': 'modelService',
  'buffer-memory': 'memoryService',
  'window-memory': 'memoryService',
  // Tools output toolService
  'http-request-tool': 'toolService',
  'calculator-tool': 'toolService',
  'code-tool': 'toolService',
};

// Maps node types to what service inputs they accept
const SERVICE_INPUT_TYPES: Record<string, { 
  required: string[]; 
  optional: string[] 
}> = {
  'ai-agent': {
    required: ['modelService'],
    optional: ['memoryService', 'toolService']
  },
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Checks if a node type outputs a service type
 */
function getServiceOutputType(nodeType: string): string | null {
  // Direct match
  if (SERVICE_OUTPUT_TYPES[nodeType]) {
    return SERVICE_OUTPUT_TYPES[nodeType];
  }
  // Check if it's a tool node (ends with -tool)
  if (nodeType.endsWith('-tool')) {
    return 'toolService';
  }
  return null;
}

/**
 * Validates all connections in a workflow
 */
export function validateConnections(workflow: Workflow): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!workflow.nodes || !workflow.connections) {
    return { valid: true, errors, warnings };
  }

  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  const connectionsByTarget = new Map<string, Connection[]>();
  
  // Group connections by target
  for (const conn of workflow.connections) {
    const key = `${conn.targetNodeId}:${conn.targetInput}`;
    if (!connectionsByTarget.has(key)) {
      connectionsByTarget.set(key, []);
    }
    connectionsByTarget.get(key)!.push(conn);
  }

  for (const conn of workflow.connections) {
    const sourceNode = nodeMap.get(conn.sourceNodeId);
    const targetNode = nodeMap.get(conn.targetNodeId);
    
    // Check nodes exist
    if (!sourceNode) {
      errors.push(`Connection references missing source node: "${conn.sourceNodeId}"`);
      continue;
    }
    if (!targetNode) {
      errors.push(`Connection references missing target node: "${conn.targetNodeId}"`);
      continue;
    }

    // Validate service connection types
    const expectedOutput = getServiceOutputType(sourceNode.type);
    if (expectedOutput) {
      // This is a service node - verify connection uses correct output/input
      if (conn.sourceOutput !== expectedOutput) {
        errors.push(
          `${sourceNode.type} should use sourceOutput="${expectedOutput}", ` +
          `not "${conn.sourceOutput}"`
        );
      }
      if (conn.targetInput !== expectedOutput) {
        errors.push(
          `Service connection to ${targetNode.type} should use targetInput="${expectedOutput}", ` +
          `not "${conn.targetInput}"`
        );
      }
    }
  }

  // Check required service connections for ai-agent
  for (const node of workflow.nodes) {
    const requirements = SERVICE_INPUT_TYPES[node.type];
    if (requirements) {
      for (const required of requirements.required) {
        const key = `${node.id}:${required}`;
        if (!connectionsByTarget.has(key)) {
          errors.push(
            `${node.type} node "${node.id}" is missing required "${required}" connection`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates that required parameters are set for nodes
 */
export function validateRequiredParameters(
  workflow: Workflow, 
  nodeSchemas: Map<string, any>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!workflow.nodes) {
    return { valid: true, errors, warnings };
  }

  for (const node of workflow.nodes) {
    const schema = nodeSchemas.get(node.type);
    if (!schema?.properties) continue;

    for (const prop of schema.properties) {
      if (prop.required && !node.parameters?.[prop.name]) {
        // Check if there's a default value
        if (prop.default === undefined) {
          errors.push(
            `Node "${node.name || node.id}" is missing required parameter "${prop.name}"`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
