import { AlertTriangle, CheckCircle2, XCircle, Check, LucideIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NodeStatusIconsProps {
  errors?: string[]
  nodeExecutionState: {
    isExecuting: boolean
    hasError: boolean
    hasSuccess: boolean
  }
  hasNodeConfig?: boolean
}

type StatusType = 'validation' | 'error' | 'success'

interface StatusConfig {
  type: StatusType
  bgColor: string
  Icon: LucideIcon
  tooltip?: React.ReactNode
}

const BASE_CLASSES = 'absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full shadow-md z-10'
const ICON_CLASSES = 'w-2.5 h-2.5'

/**
 * StatusIcon - Renders a single status icon with tooltip
 */
function StatusIcon({ bgColor, Icon, tooltip }: Omit<StatusConfig, 'type'>) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${BASE_CLASSES} ${bgColor} text-white cursor-help`}>
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
 * NodeStatusIcons - Displays status icons for validation errors, success, and error states
 * Priority: Validation errors > Execution errors > Success
 */
export function NodeStatusIcons({
  errors = [],
  nodeExecutionState,
  hasNodeConfig = false,
}: NodeStatusIconsProps) {
  const hasErrors = errors.length > 0
  const { hasError, hasSuccess, isExecuting } = nodeExecutionState

  // Determine which status to show (only one at a time)
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
      }
    : hasError && !isExecuting
      ? {
          type: 'error',
          bgColor: 'bg-red-500',
          Icon: XCircle,
          tooltip: <p className="text-xs">Execution failed</p>,
        }
      : hasSuccess && !isExecuting
        ? {
            type: 'success',
            bgColor: 'bg-green-500',
            Icon: hasNodeConfig ? CheckCircle2 : Check,
            tooltip: <p className="text-xs">Execution successful</p>,
          }
        : null

  return statusConfig ? <StatusIcon {...statusConfig} /> : null
}

NodeStatusIcons.displayName = 'NodeStatusIcons'
