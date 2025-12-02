import { NodeTester } from '@/components/node/NodeTester'
import { useNodeConfigDialogStore } from '@/stores'
import { NodeType, WorkflowNode } from '@/types'

interface TestTabProps {
  node: WorkflowNode
  nodeType: NodeType
}

export function TestTab({ node, nodeType }: TestTabProps) {
  const { nodeName, parameters, credentials } = useNodeConfigDialogStore()

  return (
    <div className="h-full p-4">
      <NodeTester 
        node={{ 
          ...node, 
          name: nodeName, 
          parameters, 
          credentials: Object.values(credentials) 
        }} 
        nodeType={nodeType} 
      />
    </div>
  )
}
