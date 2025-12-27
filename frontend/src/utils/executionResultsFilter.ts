import { NodeExecutionResult } from '@/types';
import { WorkflowNode } from '@nodedrop/types';

/**
 * Filters execution results to only include nodes that currently exist in the workflow.
 * This prevents showing deleted nodes in execution results UI.
 * 
 * @param results - Array of node execution results
 * @param workflowNodes - Current workflow nodes
 * @returns Filtered array containing only results for existing nodes
 */
export function filterExistingNodeResults(
  results: NodeExecutionResult[],
  workflowNodes: WorkflowNode[] | undefined
): NodeExecutionResult[] {
  if (!workflowNodes || workflowNodes.length === 0) {
    return results;
  }
  
  const existingNodeIds = new Set(workflowNodes.map(n => n.id));
  return results.filter(result => existingNodeIds.has(result.nodeId));
}

/**
 * Filters a Map of real-time execution results to only include nodes that exist in the workflow.
 * 
 * @param resultsMap - Map of nodeId to execution result
 * @param workflowNodes - Current workflow nodes
 * @returns Filtered Map containing only results for existing nodes
 */
export function filterExistingNodeResultsMap(
  resultsMap: Map<string, NodeExecutionResult>,
  workflowNodes: WorkflowNode[] | undefined
): Map<string, NodeExecutionResult> {
  if (!workflowNodes || workflowNodes.length === 0) {
    return resultsMap;
  }
  
  const existingNodeIds = new Set(workflowNodes.map(n => n.id));
  const filtered = new Map<string, NodeExecutionResult>();
  
  resultsMap.forEach((result, nodeId) => {
    if (existingNodeIds.has(nodeId)) {
      filtered.set(nodeId, result);
    }
  });
  
  return filtered;
}
