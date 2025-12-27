/**
 * Validate Workflow Tool Handler
 * 
 * Allows the AI to validate a workflow before finalizing.
 * Non-final handler - returns validation errors to AI for self-correction.
 */

import { validateConnections, validateRequiredParameters } from '@/modules/ai/services/utils/connectionValidator';
import { NodeService } from '@/services/nodes/NodeService';
import { logger } from '@/utils/logger';
import { ToolContext, ToolHandler } from './types';

// NodeService instance for schema lookups
let nodeServiceInstance: NodeService | null = null;

export function setValidationNodeService(ns: NodeService): void {
  nodeServiceInstance = ns;
}

interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export const validateWorkflowHandler: ToolHandler = {
  name: 'validate_workflow',
  isFinal: false, // Returns to AI for correction

  async execute(args: any, context: ToolContext): Promise<{ data: ValidationResponse }> {
    const { workflow } = args;
    
    if (!workflow) {
      return {
        data: {
          valid: false,
          errors: ['No workflow provided to validate'],
          warnings: [],
          suggestions: []
        }
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 1. Basic structure validation
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have a "nodes" array');
    }
    if (!workflow.connections || !Array.isArray(workflow.connections)) {
      errors.push('Workflow must have a "connections" array');
    }

    if (errors.length > 0) {
      return { data: { valid: false, errors, warnings, suggestions } };
    }

    // 2. Check for trigger node
    const hasTrigger = workflow.nodes.some((n: any) => 
      n.type?.includes('trigger') || n.type === 'cron' || n.type === 'webhook'
    );
    if (!hasTrigger) {
      errors.push('Workflow must have a trigger node (e.g., manual-trigger, schedule, webhook)');
    }

    // 3. Validate connections
    const connectionResult = validateConnections(workflow);
    errors.push(...connectionResult.errors);
    warnings.push(...connectionResult.warnings);

    // 4. Check for orphan nodes (no connections)
    const connectedNodeIds = new Set<string>();
    for (const conn of workflow.connections) {
      connectedNodeIds.add(conn.sourceNodeId);
      connectedNodeIds.add(conn.targetNodeId);
    }
    for (const node of workflow.nodes) {
      // Trigger nodes don't need incoming connections
      if (!node.type?.includes('trigger') && !connectedNodeIds.has(node.id)) {
        warnings.push(`Node "${node.name || node.id}" has no connections`);
      }
    }

    // 5. Validate required parameters if we have node schemas
    if (nodeServiceInstance) {
      try {
        const nodeTypes = await nodeServiceInstance.getNodeTypes();
        const schemaMap = new Map(nodeTypes.map(n => [n.identifier, n]));
        const paramResult = validateRequiredParameters(workflow, schemaMap);
        errors.push(...paramResult.errors);
        warnings.push(...paramResult.warnings);
      } catch (e) {
        logger.warn('Could not validate parameters', { error: e });
      }
    }

    // 6. Add suggestions based on findings
    if (errors.length > 0) {
      suggestions.push('Fix the errors above and call validate_workflow again');
    } else if (warnings.length > 0) {
      suggestions.push('Consider addressing the warnings, then call build_workflow to finalize');
    } else {
      suggestions.push('Workflow looks valid! Call build_workflow to finalize');
    }

    logger.info('validate_workflow executed', { 
      errors: errors.length, 
      warnings: warnings.length 
    });

    return {
      data: {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }
    };
  }
};
