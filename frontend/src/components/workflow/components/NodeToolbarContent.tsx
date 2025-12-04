import { canNodeExecuteIndividually, shouldShowExecuteButton } from '@/utils/nodeTypeClassification'
import { NodeToolbar, Position, useStore } from '@xyflow/react'
import { memo, useMemo } from 'react'
import { ExecuteToolbarButton } from '../ExecuteToolbarButton'
import { ConfigToolbarButton } from '../ConfigToolbarButton'
import type { NodeExecutionError } from '../types'
import { useNodeTypes } from '@/stores'

interface NodeToolbarContentProps {
  nodeId: string
  nodeType: string
  nodeLabel: string
  disabled: boolean
  isExecuting: boolean
  hasError: boolean
  hasSuccess: boolean
  executionError?: NodeExecutionError
  workflowExecutionStatus: string
  onExecute: (nodeId: string, nodeType: string) => void
  onRetry: (nodeId: string, nodeType: string) => void
  isReadOnly?: boolean
}

export const NodeToolbarContent = memo(function NodeToolbarContent({
  nodeId,
  nodeType,
  nodeLabel,
  disabled,
  isExecuting,
  hasError,
  hasSuccess,
  executionError,
  workflowExecutionStatus,
  onExecute,
  onRetry,
  isReadOnly = false
}: NodeToolbarContentProps) {
  const { nodeTypes } = useNodeTypes()
  
  // Get node type definition for config button
  const nodeTypeDefinition = useMemo(
    () => nodeTypes.find((nt) => nt.identifier === nodeType),
    [nodeTypes, nodeType]
  )

  // Check if this node is selected using ReactFlow's store
  const isNodeSelected = useStore((state) => {
    const node = state.nodes.find(n => n.id === nodeId)
    return node?.selected || false
  })

  // Determine if we should show any buttons
  // Hide execute button in readonly mode (execution routes)
  const showExecuteButton = !isReadOnly && shouldShowExecuteButton(nodeType)
  const showConfigButton = nodeTypeDefinition && isNodeSelected
  const hasAnyButtons = showExecuteButton || showConfigButton

  // Don't render toolbar if there are no buttons to show
  if (!hasAnyButtons) {
    return null
  }

  return (
    <NodeToolbar
      isVisible={true}
      position={Position.Top}
      offset={10}
      align="center"
    >
      <div 
        className="flex items-center gap-0.5 node-toolbar-container bg-background/95 backdrop-blur-sm rounded-md shadow-sm border p-1" 
        role="toolbar" 
        aria-label={`Controls for ${nodeLabel}`}
        aria-orientation="horizontal"
      >
        {/* Execute button */}
        {showExecuteButton && (
          <ExecuteToolbarButton
            nodeId={nodeId}
            nodeType={nodeType}
            isExecuting={isExecuting}
            canExecute={
              canNodeExecuteIndividually(nodeType) && 
              !disabled && 
              workflowExecutionStatus !== 'running'
            }
            hasError={hasError}
            hasSuccess={hasSuccess}
            executionError={executionError}
            onExecute={() => onExecute(nodeId, nodeType)}
            onRetry={() => onRetry(nodeId, nodeType)}
          />
        )}
        
        {/* Config button - visible when selected */}
        {showConfigButton && (
          <ConfigToolbarButton
            nodeId={nodeId}
            nodeType={nodeTypeDefinition}
            disabled={disabled}
          />
        )}
      </div>
    </NodeToolbar>
  )
})

NodeToolbarContent.displayName = 'NodeToolbarContent'
