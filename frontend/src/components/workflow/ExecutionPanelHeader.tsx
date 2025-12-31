import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWorkflowOperations } from '@/hooks/workflow/useWorkflowOperations'
import { useSelectedNodes } from '@/hooks/workflow'
import { useReactFlowUIStore, useWorkflowStore } from '@/stores'
import { ExecutionState } from '@/types'
import { CheckCircle, ChevronDown, ChevronUp, PackagePlus, PanelRight, Activity, GitBranch, Bot, Pause, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface ExecutionPanelHeaderProps {
  executionState: ExecutionState
  isExpanded: boolean
  onToggle: () => void
}

export function ExecutionPanelHeader({ 
  executionState, 
  isExpanded, 
  onToggle
}: ExecutionPanelHeaderProps) {
  const { validateAndShowResult } = useWorkflowOperations()
  const { showRightSidebar, toggleRightSidebar, openRightSidebar } = useReactFlowUIStore()
  const flowExecutionState = useWorkflowStore(state => state.flowExecutionState)
  
  // Get selected nodes count
  const { selectedNodesCount, hasSelectedNodes } = useSelectedNodes()

  // Get pause info if execution is paused
  const pauseInfo = executionState.status === 'paused' && executionState.executionId
    ? (flowExecutionState.activeExecutions.get(executionState.executionId) as any)?.pauseInfo
    : null
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
      case 'cancelled': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
      case 'paused': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
      case 'running': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
      case 'skipped': return 'text-muted-foreground bg-muted'
      default: return 'text-muted-foreground bg-muted'
    }
  }

  const copyResumeUrl = () => {
    if (pauseInfo?.resumeUrl) {
      navigator.clipboard.writeText(pauseInfo.resumeUrl)
      toast.success('Resume URL copied to clipboard')
    }
  }

  const openResumeUrl = () => {
    if (pauseInfo?.resumeUrl) {
      window.open(pauseInfo.resumeUrl, '_blank')
    }
  }

  return (
    <div className="flex flex-col border-b border-border flex-shrink-0 bg-background">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center space-x-3">
          <h3 className="font-medium text-sm text-foreground">Execution Panel</h3>
          {executionState.executionId && (
            <span className="text-xs text-muted-foreground">ID: {executionState.executionId}</span>
          )}
          <div className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(executionState.status)}`}>
            {executionState.status === 'paused' && <Pause className="h-3 w-3" />}
            {executionState.status.toUpperCase()}
          </div>
          {executionState.progress !== undefined && executionState.status !== 'paused' && (
            <div className="text-xs text-muted-foreground">
              {executionState.progress}%
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => openRightSidebar('executions')}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <Activity className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View execution history</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => openRightSidebar('git')}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <GitBranch className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Git version control</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => openRightSidebar('copilot')}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <Bot className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copilot AI assistant</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={validateAndShowResult}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Validate workflow</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => openRightSidebar('template')}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={!hasSelectedNodes}
              >
                <PackagePlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{hasSelectedNodes ? `Create custom node from ${selectedNodesCount} selected node${selectedNodesCount !== 1 ? 's' : ''}` : 'Select nodes to create custom node'}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleRightSidebar}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showRightSidebar ? 'Hide sidebar' : 'Show sidebar'}</p>
            </TooltipContent>
          </Tooltip>
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            title={isExpanded ? "Minimize execution panel" : "Expand execution panel"}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>
      
      {/* Pause info banner */}
      {pauseInfo && (
        <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-950/30 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <Pause className="h-4 w-4" />
              <span>Waiting for webhook call to resume</span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={copyResumeUrl}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy URL
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy resume webhook URL</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={openResumeUrl}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Resume Now
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open resume URL (triggers webhook)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 font-mono truncate">
            {pauseInfo.resumeUrl}
          </div>
        </div>
      )}
    </div>
  )
}
