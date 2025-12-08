/**
 * Node Data Utilities
 * 
 * Shared utility functions for processing node output data.
 * These functions ensure consistent data handling across the frontend.
 * 
 * TODO: Consider moving this to a shared @node-drop/utils package
 * that can be used by both frontend and backend to ensure true
 * single source of truth. See also:
 * - backend/src/services/SecureExecutionService.ts (createSecureContext)
 *   which has equivalent logic for runtime expression resolution.
 */

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
