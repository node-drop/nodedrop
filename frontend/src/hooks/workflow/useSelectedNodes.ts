import { useReactFlowUIStore } from '@/stores'
import { useMemo } from 'react'

/**
 * Hook to get selected nodes information from ReactFlow
 * Works both inside and outside ReactFlow context by using the stored selection state
 * Selection is tracked in ReactFlowUI store via onSelectionChange handler
 * @returns Object containing selected nodes array, count, and helper functions
 */
export function useSelectedNodes() {
  const { reactFlowInstance, selectedNodeIds } = useReactFlowUIStore()

  // Get full node objects for selected IDs
  const selectedNodes = useMemo(() => {
    if (!reactFlowInstance || selectedNodeIds.length === 0) return []
    const allNodes = reactFlowInstance.getNodes()
    return allNodes.filter(node => selectedNodeIds.includes(node.id))
  }, [reactFlowInstance, selectedNodeIds])

  const selectedNodesCount = selectedNodeIds.length
  const hasSelectedNodes = selectedNodesCount > 0

  return {
    selectedNodes,
    selectedNodesCount,
    hasSelectedNodes,
  }
}
