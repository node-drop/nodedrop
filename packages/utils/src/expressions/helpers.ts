/**
 * Node Helper Functions
 * 
 * Helper functions for expression evaluation that check node execution state.
 */

/**
 * Create helper functions for expression evaluation
 * Usage: isExecuted("Node Name"), hasData("Node Name"), etc.
 */
export function createNodeHelperFunctions(nodeData: Record<string, any>) {
  return {
    /**
     * Check if a node has executed (has data)
     * Usage: isExecuted("HTTP Request")
     */
    isExecuted: (nodeName: string): boolean => {
      return nodeData[nodeName] !== undefined && nodeData[nodeName] !== null;
    },

    /**
     * Check if a node has non-empty data
     * Usage: hasData("HTTP Request")
     */
    hasData: (nodeName: string): boolean => {
      const data = nodeData[nodeName];
      if (data === undefined || data === null) return false;
      if (Array.isArray(data)) return data.length > 0;
      if (typeof data === "object") return Object.keys(data).length > 0;
      return true;
    },

    /**
     * Get node data or return default value
     * Usage: getNodeData("HTTP Request", { fallback: true })
     */
    getNodeData: (nodeName: string, defaultValue: any = null): any => {
      const data = nodeData[nodeName];
      return data !== undefined && data !== null ? data : defaultValue;
    },

    /**
     * Get the first executed node's data from a list
     * Usage: firstExecuted(["Path A", "Path B", "Path C"])
     */
    firstExecuted: (nodeNames: string[]): any => {
      for (const name of nodeNames) {
        if (nodeData[name] !== undefined && nodeData[name] !== null) {
          return nodeData[name];
        }
      }
      return null;
    },
  };
}
