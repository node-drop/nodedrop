/**
 * Node Data Utilities
 * 
 * Shared utility functions for processing node output data.
 * These functions ensure consistent data handling across the frontend.
 * 
 * Types are imported from @nodedrop/types for consistency with backend.
 * See also:
 * - backend/src/services/SecureExecutionService.ts (createSecureContext)
 *   which has equivalent logic for runtime expression resolution.
 */

import type { 
  ExpressionContext, 
  VariableCategory, 
  VariableCategoryItem 
} from '@nodedrop/types';

// Re-export types for backward compatibility
export type { VariableCategory, VariableCategoryItem };

/**
 * Merge all items from a node's output array into a single object.
 * 
 * This is critical for merge nodes that output multiple items with different properties.
 * For example: [{json: {x: 10}}, {json: {y: 9}}] -> {x: 10, y: 9}
 * 
 * Keeps the first non-null value for each key when there are conflicts.
 * 
 * @param items - Array of items from node output (e.g., sourceData.main)
 * @returns Merged object containing all unique properties from all items
 */
export function mergeNodeOutputItems(items: any[]): Record<string, any> {
  const merged: Record<string, any> = {};
  
  for (const item of items) {
    const json = item?.json || item;
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      for (const [key, value] of Object.entries(json)) {
        if (!(key in merged) || merged[key] === null || merged[key] === undefined) {
          merged[key] = value;
        }
      }
    }
  }
  
  return merged;
}

/**
 * Extract the node output data for $node expressions.
 * 
 * For single items: returns the item's json data directly
 * For multiple items: merges all items into a single object
 * 
 * @param sourceData - Array of items from node execution result (data.main)
 * @returns The extracted/merged data for $node expression resolution
 */
export function extractNodeOutputData(sourceData: any[]): any {
  if (!sourceData || !Array.isArray(sourceData) || sourceData.length === 0) {
    return undefined;
  }
  
  if (sourceData.length === 1) {
    // Single item - return its json directly
    return sourceData[0]?.json || sourceData[0];
  }
  
  // Multiple items - merge all unique properties
  const merged = mergeNodeOutputItems(sourceData);
  
  // Fallback to first item if merge produced nothing
  if (Object.keys(merged).length === 0) {
    return sourceData[0]?.json || sourceData[0];
  }
  
  return merged;
}

/**
 * Format a value into a human-readable preview string.
 * Used for displaying field values in autocomplete dropdowns and tooltips.
 * 
 * @param val - Any value to format
 * @returns A human-readable string representation
 */
export function formatValuePreview(val: unknown): string {
  if (val === null) {
    return 'null';
  }
  if (Array.isArray(val)) {
    return `array[${val.length}]`;
  }
  if (typeof val === 'object') {
    const objKeys = Object.keys(val as object).slice(0, 3).join(', ');
    const keyCount = Object.keys(val as object).length;
    return `{ ${objKeys}${keyCount > 3 ? ', ...' : ''} }`;
  }
  if (typeof val === 'string') {
    return `"${val.substring(0, 40)}${val.length > 40 ? '...' : ''}"`;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  return String(val).substring(0, 40);
}

/**
 * Default mock data structure used by expression inputs.
 * Provides the base context for expression evaluation.
 * Conforms to ExpressionContext type from @nodedrop/types.
 */
export const DEFAULT_MOCK_DATA: ExpressionContext = {
  $json: {},
  $node: {},
  $workflow: { id: 'workflow-id', name: 'Workflow Name', active: true },
  $execution: { id: 'execution-id', mode: 'manual' },
  $vars: {},
  $itemIndex: 0,
  $now: new Date().toISOString(),
  $today: new Date().toISOString().split('T')[0],
};

/**
 * Create a fallback variable category for nodes with no/empty data.
 * Used when a connected node hasn't been executed or has no output.
 * 
 * @param categoryName - Display name for the category (typically node name)
 * @param basePath - Base expression path (e.g., $node["NodeName"])
 * @param message - Description message explaining the fallback state
 * @returns A VariableCategory with a single fallback item
 */
export function createFallbackCategory(
  categoryName: string,
  basePath: string,
  message: string
): VariableCategory {
  return {
    name: categoryName,
    icon: 'input',
    items: [
      {
        label: basePath,
        type: 'variable' as const,
        description: message,
        insertText: basePath,
      },
    ],
  };
}

/**
 * Build the "Workflow Info" variable category with workflow and execution metadata.
 * 
 * @param workflowData - Workflow metadata (id, name, active)
 * @param executionData - Execution metadata (id, mode)
 * @returns A VariableCategory containing workflow and execution variables
 */
export function buildWorkflowInfoCategory(
  workflowData?: Record<string, unknown>,
  executionData?: Record<string, unknown>
): VariableCategory {
  return {
    name: 'Workflow Info',
    icon: 'workflow',
    items: [
      {
        label: '$workflow.id',
        type: 'property',
        description: workflowData?.id ? String(workflowData.id) : 'Workflow ID',
        insertText: '$workflow.id',
      },
      {
        label: '$workflow.name',
        type: 'property',
        description: workflowData?.name ? String(workflowData.name) : 'Workflow name',
        insertText: '$workflow.name',
      },
      {
        label: '$workflow.active',
        type: 'property',
        description: workflowData?.active !== undefined ? String(workflowData.active) : 'Is active',
        insertText: '$workflow.active',
      },
      {
        label: '$execution.id',
        type: 'property',
        description: executionData?.id ? String(executionData.id) : 'Execution ID',
        insertText: '$execution.id',
      },
      {
        label: '$execution.mode',
        type: 'property',
        description: executionData?.mode ? String(executionData.mode) : 'Execution mode',
        insertText: '$execution.mode',
      },
    ],
  };
}
