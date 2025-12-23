/**
 * NodeSelectorNode - A temporary React Flow node that displays the node selector popover
 * 
 * This is a special node type that acts as a placeholder in the workflow canvas,
 * showing the NodeSelectorContent popover for selecting which node to add.
 * 
 * USAGE SCENARIOS:
 * ================
 * 
 * 1. Drag connection to empty space (useReactFlowInteractions.handleConnectEnd)
 *    - User drags from a node's output handle and drops on empty canvas
 *    - Creates NodeSelectorNode at drop position with temporary connection
 * 
 * 2. Click + on node output handle (useNodeActions.handleOutputClick)
 *    - User clicks + button on a node's output handle
 *    - Creates NodeSelectorNode to the right of the source node
 * 
 * 3. Click + on node service input (useNodeActions.handleServiceInputClick)
 *    - User clicks + button on service input handles (model, tool, memory)
 *    - Creates NodeSelectorNode below the target node
 * 
 * 4. Keyboard shortcut Ctrl/Cmd+K (WorkflowEditor.handleAddNode)
 *    - User presses keyboard shortcut
 *    - Creates NodeSelectorNode at viewport center
 * 
 * BEHAVIOR:
 * =========
 * - Renders as a real React Flow node at canvas coordinates
 * - Shows NodeSelectorContent popover for node selection
 * - Maintains connection context (source/target info) via usePlaceholderNodeStore
 * - When node is selected: replaces itself with the chosen node type
 * - When closed/cancelled: removes itself and any temporary connections
 * - Automatically closes on click outside
 * 
 * ADVANTAGES OVER DIALOG:
 * =======================
 * - Positioned in canvas coordinates (stays with workflow zoom/pan)
 * - Visual connection preview with temporary edges
 * - More intuitive spatial relationship to connected nodes
 * - Seamless integration with React Flow's node system
 */

import { memo, useCallback, useEffect, useRef, useMemo } from 'react'
import { Node, NodeProps, Handle } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { usePlaceholderNodeStore } from '@/stores/placeholderNode'
import { useWorkflowStore } from '@/stores'
import { NodeType } from '@/types'
import { createWorkflowNode } from '@/utils/nodeCreation'
import { NodeSelectorContent } from '../NodeSelectorPopover'
import { useNodeSelectorHandles } from '@/hooks/workflow/useNodeSelectorHandles'

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

  // Get handle configurations based on insertion context
  const handles = useNodeSelectorHandles(insertionContext)

  // Determine filter type based on insertion context
  const filterType = useMemo(() => {
    if (!insertionContext) return 'all'

    // Check if connecting TO a target (reverse mode)
    if (insertionContext.targetNodeId && insertionContext.targetInput) {
      const targetInput = insertionContext.targetInput.toLowerCase()
      
      // Service input filters
      if (targetInput.includes('model')) return 'model'
      if (targetInput.includes('memory') || targetInput.includes('memories')) return 'memory'
      if (targetInput.includes('tool')) return 'tool'
      
      // Regular input - show triggers
      if (targetInput === 'main' || !targetInput.includes('service')) {
        return 'trigger'
      }
    }

    // Forward mode - show regular nodes (not triggers, not services)
    if (insertionContext.sourceNodeId) {
      return 'regular'
    }

    return 'all'
  }, [insertionContext])

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

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check if click is outside the node selector
      if (nodeRef.current && !nodeRef.current.contains(target)) {
        // Also check if clicking on canvas or other workflow elements
        const isCanvasClick = target.classList.contains('react-flow__pane') ||
                             target.classList.contains('react-flow__renderer') ||
                             target.closest('.react-flow__pane') !== null
        
        const isOtherNode = target.closest('.react-flow__node') !== null && 
                           !target.closest('.react-flow__node')?.contains(nodeRef.current)
        
        // Close if clicking on canvas or other nodes
        if (isCanvasClick || isOtherNode) {
          handleClose()
        }
      }
    }

    // Also handle pointerdown for better canvas interaction
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      
      if (nodeRef.current && !nodeRef.current.contains(target)) {
        const isCanvasClick = target.classList.contains('react-flow__pane') ||
                             target.classList.contains('react-flow__renderer') ||
                             target.closest('.react-flow__pane') !== null
        
        if (isCanvasClick) {
          handleClose()
        }
      }
    }

    // Delay adding listeners to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true) // Use capture phase
      document.addEventListener('pointerdown', handlePointerDown, true)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [handleClose])

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
        // FORWARD MODE: Source node exists (normal output connection)
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
      } else if (insertionContext?.targetNodeId) {
        // REVERSE MODE: Target node exists (service input connection)
        // The new node will be the SOURCE connecting TO the target
        const newConnection = {
          id: `${newNode.id}-${insertionContext.targetNodeId}-${Date.now()}`,
          sourceNodeId: newNode.id,
          sourceOutput: nodeType.outputs?.[0] || insertionContext.targetInput || 'main',
          targetNodeId: insertionContext.targetNodeId,
          targetInput: insertionContext.targetInput || 'main',
        }
        addConnection(newConnection)
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
        ' relative',
        'rounded-lg border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95'
      )}
    >
      {/* Render handles based on connection context */}
      {handles.map((handle) => (
        <Handle
          key={handle.id}
          type={handle.type}
          position={handle.position}
          id={handle.id}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
          style={handle.style}
        />
      ))}

      <NodeSelectorContent 
        onSelectNode={handleSelectNode} 
        onClose={handleClose}
        filterType={filterType}
      />
    </div>
  )
})
