import { Position } from '@xyflow/react'
import { useMemo } from 'react'

interface InsertionContext {
  sourceNodeId: string
  targetNodeId: string
  sourceOutput?: string
  targetInput?: string
}

interface HandleConfig {
  position: Position
  type: 'source' | 'target'
  id: string
  style: React.CSSProperties
}

/**
 * Hook to determine which handles to show on NodeSelectorNode based on connection context
 * 
 * @param insertionContext - The context of where the node is being inserted
 * @returns Array of handle configurations to render
 */
export function useNodeSelectorHandles(insertionContext: InsertionContext | null): HandleConfig[] {
  return useMemo(() => {
    if (!insertionContext) return []

    // FORWARD MODE: Connecting FROM a source node's output
    if (insertionContext.sourceNodeId) {
      return [
        {
          position: Position.Left,
          type: 'target' as const,
          id: 'main',
          style: { top: '20px' },
        },
      ]
    }

    // REVERSE MODE: Connecting TO a target node's input
    if (insertionContext.targetNodeId) {
      // Determine if this is a service input based on the target input name
      const isServiceInput =
        insertionContext.targetInput &&
        insertionContext.targetInput !== 'main' &&
        (insertionContext.targetInput.toLowerCase().includes('model') ||
          insertionContext.targetInput.toLowerCase().includes('tool') ||
          insertionContext.targetInput.toLowerCase().includes('memory') ||
          insertionContext.targetInput.toLowerCase().includes('service'))

      if (isServiceInput) {
        // Service input: Show handle on TOP (service inputs are typically on bottom)
        return [
          {
            position: Position.Top,
            type: 'source' as const,
            id: 'main',
            style: { left: '50%', transform: 'translateX(-50%)' },
          },
        ]
      } else {
        // Normal input: Show handle on RIGHT (normal inputs are typically on left)
        return [
          {
            position: Position.Right,
            type: 'source' as const,
            id: 'main',
            style: { top: '20px' },
          },
        ]
      }
    }

    return []
  }, [insertionContext])
}
