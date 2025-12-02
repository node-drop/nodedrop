import { NodeDocumentation } from '@/components/node/NodeDocumentation'
import { NodeType } from '@/types'

interface DocsTabProps {
  nodeType: NodeType
}

export function DocsTab({ nodeType }: DocsTabProps) {
  return (
       <div className="h-[calc(100dvh-222px)] overflow-y-auto p-4">
      <NodeDocumentation nodeType={nodeType} />
    </div>
  )
}
