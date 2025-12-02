/**
 * Handle positioning utilities for calculating handle positions on nodes
 */

/**
 * Calculate the position of a single handle
 * @param index - The index of the handle (0-based)
 * @param total - The total number of handles
 * @returns CSS position string (e.g., "50%" or "25%")
 */
export function calculateHandlePosition(index: number, total: number): string {
  if (total === 1) {
    return "50%";
  }
  return `${((index + 1) / (total + 1)) * 100}%`;
}

/**
 * Generate an array of positions for all handles
 * @param count - The number of handles
 * @returns Array of position strings
 */
export function generateHandlePositions(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    calculateHandlePosition(i, count)
  );
}
