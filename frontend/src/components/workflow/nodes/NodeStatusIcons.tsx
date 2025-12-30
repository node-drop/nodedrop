import { AlertTriangle, CheckCircle2, XCircle, Check, Pin, LucideIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NodeStatusIconsProps {
  errors?: string[]
  nodeExecutionState: {
    isExecuting: boolean
    hasError: boolean
    hasSuccess: boolean
  }
  hasNodeConfig?: boolean
  hasPinnedData?: boolean
}

type StatusType = 'validation' | 'error' | 'success' | 'pinned'

interface StatusConfig {
  type: StatusType
  bgColor: string
  Icon: LucideIcon
  tooltip?: React.ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right'
}

const BASE_CLASSES = 'absolute flex items-center justify-center w-3 h-3 rounded-full shadow-sm z-10'
const ICON_CLASSES = 'w-1.5 h-1.5'

/**
 * StatusIcon - Renders a single status icon with tooltip
 */
function StatusIcon({ bgColor, Icon, tooltip, position = 'top-right', type }: StatusConfig) {
  const positionClasses = position === 'top-right' 
    ? '-top-1 -right-1' 
    : position === 'bottom-right'
    ? 'bottom-2 right-3'
    : '-top-1 -left-1'
  
  // Pinned icon is just the icon with color, no background
  if (type === 'pinned') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`absolute ${positionClasses} z-10 cursor-help`}>
              <Icon className="w-2.5 h-2.5 text-muted-foreground rotate-45" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${BASE_CLASSES} ${positionClasses} ${bgColor} text-white cursor-help`}>
            <Icon className={ICON_CLASSES} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * NodeStatusIcons - Displays status icons for validation errors, success, error states, and pinned data
 * Priority: Validation errors > Execution errors > Success (top-right)
 * Pinned data icon always shows on top-left when data is pinned
 */
export function NodeStatusIcons({
  errors = [],
  nodeExecutionState,
  hasNodeConfig = false,
  hasPinnedData = false,
}: NodeStatusIconsProps) {
  const hasErrors = errors.length > 0
  const { hasError, hasSuccess, isExecuting } = nodeExecutionState

  // Determine which status to show (only one at a time) - top-right position
  const statusConfig: StatusConfig | null = hasErrors
    ? {
        type: 'validation',
        bgColor: 'bg-orange-500',
        Icon: AlertTriangle,
        tooltip: (
          <div className="space-y-1">
            <p className="font-semibold text-xs">Validation Errors:</p>
            {errors.map((error, index) => (
              <p key={index} className="text-xs">• {error}</p>
            ))}
          </div>
        ),
        position: 'top-right',
      }
    : hasError && !isExecuting
      ? {
          type: 'error',
          bgColor: 'bg-red-500',
          Icon: XCircle,
          tooltip: <p className="text-xs">Execution failed</p>,
          position: 'top-right',
        }
      : hasSuccess && !isExecuting
        ? {
            type: 'success',
            bgColor: 'bg-green-500',
            Icon: hasNodeConfig ? CheckCircle2 : Check,
            tooltip: <p className="text-xs">Execution successful</p>,
            position: 'top-right',
          }
        : null

  // Pinned data config - just icon with color, positioned inside node
  const pinnedConfig: StatusConfig | null = hasPinnedData
    ? {
        type: 'pinned',
        bgColor: '',
        Icon: Pin,
        tooltip: <p className="text-xs">Output data is pinned</p>,
        position: 'bottom-right',
      }
    : null

  return (
    <>
      {pinnedConfig && <StatusIcon {...pinnedConfig} />}
      {statusConfig && <StatusIcon {...statusConfig} />}
    </>
  )
}

NodeStatusIcons.displayName = 'NodeStatusIcons'
