/**
 * Expression Data Utilities
 * 
 * Utilities for handling node data wrapping/unwrapping and normalization.
 */

/**
 * Extracts the actual data from items that may be wrapped in {json: {...}} format.
 *
 * @param items - Array of items that may be wrapped
 * @returns Array of unwrapped data items
 *
 * @example
 * const wrapped = [{json: {id: 1}}, {json: {id: 2}}];
 * extractJsonData(wrapped); // Returns: [{id: 1}, {id: 2}]
 *
 * const unwrapped = [{id: 1}, {id: 2}];
 * extractJsonData(unwrapped); // Returns: [{id: 1}, {id: 2}]
 */
export function extractJsonData(items: any[]): any[] {
  return items.map((item: any) => {
    if (item && typeof item === "object" && "json" in item) {
      return item.json;
    }
    return item;
  });
}

/**
 * Wraps data items in the standard {json: {...}} format expected by the workflow engine.
 *
 * @param items - Array of data items to wrap
 * @returns Array of wrapped items
 *
 * @example
 * const data = [{id: 1}, {id: 2}];
 * wrapJsonData(data); // Returns: [{json: {id: 1}}, {json: {id: 2}}]
 */
export function wrapJsonData(items: any[]): any[] {
  return items.map((item: any) => ({ json: item }));
}

/**
 * Normalizes input data by unwrapping nested arrays if needed.
 *
 * Sometimes input data comes as [[{json: {...}}]] instead of [{json: {...}}].
 * This function handles that case.
 *
 * @param items - The items array that may be nested
 * @returns Normalized items array
 */
export function normalizeInputItems(items: any[] | any[][]): any[] {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  // If items is wrapped in an extra array layer: [[{json: {...}}]]
  if (items.length === 1 && items[0] && Array.isArray(items[0])) {
    return items[0];
  }

  return items;
}
