import { useDetachNodes } from '@/hooks/workflow'
import { Ungroup } from 'lucide-react'
import { memo } from 'react'

interface UngroupToolbarButtonProps {
  nodeId: string
}

export const UngroupToolbarButton = memo(function UngroupToolbarButton({
  nodeId,
}: UngroupToolbarButtonProps) {
  const detachNodes = useDetachNodes()

  const handleUngroup = () => {
    detachNodes([nodeId], undefined) // Don't remove parent, just detach this node
  }

  return (
    <button
      onClick={handleUngroup}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors nodrag"
      title="Remove from group"
      aria-label={`Remove node ${nodeId} from group`}
    >
      <Ungroup className="h-3.5 w-3.5" />
      <span>Ungroup</span>
    </button>
  )
})

UngroupToolbarButton.displayName = 'UngroupToolbarButton'
