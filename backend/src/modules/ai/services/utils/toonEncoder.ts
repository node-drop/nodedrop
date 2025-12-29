/**
 * TOON Encoder Utility
 * 
 * Converts node context from JSON to TOON format for token efficiency.
 * TOON (Token-Oriented Object Notation) reduces token usage by ~40% for
 * uniform arrays of objects while maintaining LLM comprehension.
 */

import { encode } from '@toon-format/toon';

/**
 * Encode node schemas to TOON format
 * @param nodes Array of node schema objects
 * @returns TOON-formatted string
 */
export function encodeNodesToToon(nodes: any[]): string {
  try {
    // Wrap in an object with nodes array for proper TOON formatting
    const data = { nodes };
    
    // Use tab delimiter for maximum token efficiency
    const toonString = encode(data, {
      delimiter: '\t', // Tab delimiter saves more tokens than comma
    });
    
    return toonString;
  } catch (error) {
    // Fallback to JSON if TOON encoding fails
    console.error('TOON encoding failed, falling back to JSON:', error);
    return JSON.stringify(nodes);
  }
}

/**
 * Check if TOON encoding would be beneficial for the given data
 * TOON works best with uniform arrays of objects
 */
export function shouldUseToon(nodes: any[]): boolean {
  if (!nodes || nodes.length === 0) return false;
  
  // TOON is beneficial when we have multiple nodes with similar structure
  if (nodes.length < 3) return false;
  
  // Check if nodes have uniform structure (all have similar keys)
  const firstNodeKeys = Object.keys(nodes[0] || {}).sort();
  const uniformStructure = nodes.every(node => {
    const nodeKeys = Object.keys(node).sort();
    return nodeKeys.length === firstNodeKeys.length &&
           nodeKeys.every((key, idx) => key === firstNodeKeys[idx]);
  });
  
  return uniformStructure;
}
