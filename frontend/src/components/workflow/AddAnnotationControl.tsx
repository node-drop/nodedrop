import { useWorkflowStore } from '@/stores'
import { WorkflowNode } from '@/types'
import { useReactFlow } from '@xyflow/react'
import { MessageSquare } from 'lucide-react'
import { useCallback } from 'react'
import { WorkflowControlButton } from './WorkflowControls'

export function AddAnnotationControl() {
  const { screenToFlowPosition, setNodes } = useReactFlow()
  const { workflow, updateWorkflow, setDirty, saveToHistory } = useWorkflowStore()

  const addAnnotation = useCallback(() => {
    // Take snapshot for undo/redo
    saveToHistory('Add annotation')

    // Calculate center of viewport
    const viewportCenter = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })

    // Create new annotation node ID
    const annotationId = `annotation_${Date.now()}`

    // Create React Flow node
    const newNode = {
      id: annotationId,
      type: 'annotation',
      position: viewportCenter,
      data: {
        label: 'Add your note here...',
      },
    }

    // Add to React Flow
    setNodes((nodes) => [...nodes, newNode])

    // Add to Zustand workflow store
    if (workflow) {
      const newWorkflowNode: WorkflowNode = {
        id: annotationId,
        type: 'annotation',
        name: 'Annotation',
        parameters: {
          label: 'Add your note here...',
        },
        position: viewportCenter,
        disabled: false,
      }

      updateWorkflow({
        nodes: [...workflow.nodes, newWorkflowNode],
      })
      setDirty(true)
    }
  }, [screenToFlowPosition, setNodes, workflow, updateWorkflow, setDirty, saveToHistory])

  return (
    <WorkflowControlButton
      onClick={addAnnotation}
      title="Add Annotation"
      icon={<MessageSquare className="h-4 w-4" />}
    />
  )
}
