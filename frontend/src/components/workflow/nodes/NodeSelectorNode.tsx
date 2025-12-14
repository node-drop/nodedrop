import { memo, useCallback, useEffect, useRef } from 'react'
import { Node, NodeProps, Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { usePlaceholderNodeStore } from '@/stores/placeholderNode'
import { useWorkflowStore } from '@/stores'
import { NodeType } from '@/types'
import { createWorkflowNode } from '@/utils/nodeCreation'
import { NodeSelectorContent } from '../NodeSelectorPopover'

interface NodeSelectorNodeData extends Record<string, unknown> {
  label?: string
}

type NodeSelectorNodeType = Node<NodeSelectorNodeData>

/**
 * A special node type that shows a popover for selecting which node to add.
 * This is used when dragging a connection to empty space or clicking + on an edge.
 * Being a real React Flow node means it stays in canvas coordinates and
 * connections work naturally.
 */
export const NodeSelectorNode = memo(function NodeSelectorNode({
  id,
}: NodeProps<NodeSelectorNodeType>) {
  const { insertionContext, hidePlaceholder } = usePlaceholderNodeStore()
  const { addNode, addConnection, workflow, updateWorkflow } = useWorkflowStore()
  const removeConnection = useWorkflowStore(state => state.removeConnection)
  const nodeRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target as HTMLElement)) {
        handleClose()
      }
    }

    // Delay adding listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Remove this selector node and its temporary connection from the workflow
  const removeSelectorNode = useCallback(() => {
    if (workflow) {
      updateWorkflow(
        {
          nodes: workflow.nodes.filter(n => n.id !== id),
          // Also remove any temporary connections to/from this selector node
          connections: workflow.connections.filter(
            conn => conn.targetNodeId !== id && conn.sourceNodeId !== id
          ),
        },
        true
      ) // Skip history
    }
  }, [id, workflow, updateWorkflow])

  // Handle close - remove selector node
  const handleClose = useCallback(() => {
    removeSelectorNode()
    hidePlaceholder()
  }, [removeSelectorNode, hidePlaceholder])

  // Handle node selection
  const handleSelectNode = useCallback(
    (nodeType: NodeType) => {
      // Get the selector node's position
      const selectorNode = workflow?.nodes.find(n => n.id === id)
      if (!selectorNode) return

      // Create the new node at selector position
      const newNode = createWorkflowNode(nodeType, selectorNode.position)

      // Remove selector node first
      removeSelectorNode()

      // Add the real node
      addNode(newNode)

      // Handle connections based on insertion context
      if (insertionContext?.sourceNodeId) {
        // Check if this is an "insert between" case (both source and target exist)
        if (insertionContext.targetNodeId) {
          // Find and remove the existing connection between source and target
          const existingConnection = workflow?.connections.find(
            conn =>
              conn.sourceNodeId === insertionContext.sourceNodeId &&
              conn.targetNodeId === insertionContext.targetNodeId &&
              (conn.sourceOutput === insertionContext.sourceOutput ||
                (!conn.sourceOutput && !insertionContext.sourceOutput)) &&
              (conn.targetInput === insertionContext.targetInput ||
                (!conn.targetInput && !insertionContext.targetInput))
          )
          if (existingConnection) {
            removeConnection(existingConnection.id)
          }

          // Create connection from source to new node
          const sourceToNewConnection = {
            id: `${insertionContext.sourceNodeId}-${newNode.id}-${Date.now()}`,
            sourceNodeId: insertionContext.sourceNodeId,
            sourceOutput: insertionContext.sourceOutput || 'main',
            targetNodeId: newNode.id,
            targetInput: nodeType.inputs?.[0] || 'main',
          }
          addConnection(sourceToNewConnection)

          // Create connection from new node to target
          const newToTargetConnection = {
            id: `${newNode.id}-${insertionContext.targetNodeId}-${Date.now() + 1}`,
            sourceNodeId: newNode.id,
            sourceOutput: nodeType.outputs?.[0] || 'main',
            targetNodeId: insertionContext.targetNodeId,
            targetInput: insertionContext.targetInput || 'main',
          }
          addConnection(newToTargetConnection)
        } else {
          // Simple case: just connecting from source to new node (drag to empty space)
          const newConnection = {
            id: `${insertionContext.sourceNodeId}-${newNode.id}-${Date.now()}`,
            sourceNodeId: insertionContext.sourceNodeId,
            sourceOutput: insertionContext.sourceOutput || 'main',
            targetNodeId: newNode.id,
            targetInput: nodeType.inputs?.[0] || 'main',
          }
          addConnection(newConnection)
        }
      }

      // Clean up
      hidePlaceholder()
    },
    [
      id,
      workflow,
      insertionContext,
      addNode,
      addConnection,
      removeConnection,
      hidePlaceholder,
      removeSelectorNode,
    ]
  )

  return (
    <div
      ref={nodeRef}
      className={cn(
        'nodrag relative',
        'rounded-lg border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95'
      )}
    >
      {/* Input handle - positioned at top left, offset to align with edge */}
      <Handle
        type="target"
        position={Position.Left}
        id="main"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background !top-[28px]"
        style={{ top: '20px' }}
      />

      <NodeSelectorContent onSelectNode={handleSelectNode} onClose={handleClose} />
    </div>
  )
})
