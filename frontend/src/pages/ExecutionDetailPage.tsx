import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WorkflowEditor } from '@/components/workflow'
import type { ExecutionDetails } from '@/services/execution'
import { executionService } from '@/services/execution'
import { nodeService } from '@/services/node'
import { workflowService } from '@/services/workflow'
import { useWorkflowStore } from '@/stores'
import type { NodeType } from '@/types'
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    Clock,
    Download,
    Eye,
    Loader2,
    MoreHorizontal,
    RefreshCw,
    Trash2,
    XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'

export function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>()
  const navigate = useNavigate()
  const [execution, setExecution] = useState<ExecutionDetails | null>(null)
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    setWorkflow, 
    setExecutionMode, 
    setNodeExecutionResult,
    clearExecutionState 
  } = useWorkflowStore()

  useEffect(() => {
    if (!executionId) return

    const loadExecutionData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 1. Get execution details
        const executionData = await executionService.getExecutionDetails(executionId)
        setExecution(executionData)

        // 2. Load node types
        const types = await nodeService.getNodeTypes()
        setNodeTypes(types)

        // 3. Load workflow from execution
        const workflow = await workflowService.getWorkflow(executionData.workflowId)

        // 4. Set workflow in store (read-only mode)
        setWorkflow(workflow)
        setExecutionMode(true, executionId)

        // 4. Apply execution states to nodes
        if (executionData.nodeExecutions) {
          executionData.nodeExecutions.forEach((nodeExec) => {
            // Map status to expected type
            let status: 'success' | 'error' | 'skipped' = 'success'
            if (nodeExec.status === 'error') {
              status = 'error'
            } else if (nodeExec.status === 'running') {
              // Treat running as success for historical view
              status = 'success'
            }
            
            // Calculate duration
            const startTime = nodeExec.startedAt ? new Date(nodeExec.startedAt).getTime() : Date.now()
            const endTime = nodeExec.finishedAt ? new Date(nodeExec.finishedAt).getTime() : Date.now()
            
            setNodeExecutionResult(nodeExec.nodeId, {
              nodeId: nodeExec.nodeId,
              nodeName: nodeExec.nodeId, // Could be improved with actual node name
              status,
              data: nodeExec.outputData,
              error: nodeExec.error ? JSON.stringify(nodeExec.error) : undefined,
              startTime,
              endTime,
              duration: endTime - startTime,
            })
          })
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load execution details:', err)
        setError('Failed to load execution details')
        setIsLoading(false)
      }
    }

    loadExecutionData()

    // Cleanup on unmount
    return () => {
      setExecutionMode(false)
      clearExecutionState()
    }
  }, [executionId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDuration = (startedAt?: string, finishedAt?: string) => {
    if (!startedAt) return 'N/A'
    const start = new Date(startedAt).getTime()
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
    const durationMs = end - start

    if (durationMs < 1000) return `${durationMs}ms`
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`
    if (durationMs < 3600000) return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
    return `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'success':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
      case 'cancelled':
        return 'bg-muted text-muted-foreground border-border'
      case 'paused':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      case 'partial':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <XCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'partial':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const handleRetry = async () => {
    // TODO: Implement retry functionality
    console.log('Retry execution:', executionId)
  }

  const handleExport = async () => {
    if (!execution) return
    
    const dataStr = JSON.stringify(execution, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `execution-${executionId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this execution?')) return
    
    try {
      // TODO: Implement delete functionality
      console.log('Delete execution:', executionId)
      navigate(-1)
    } catch (err) {
      console.error('Failed to delete execution:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading execution details...</p>
        </div>
      </div>
    )
  }

  if (error || !execution) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Execution</h2>
          <p className="text-sm text-muted-foreground mb-4">{error || 'Execution not found'}</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const successfulNodes = execution.nodeExecutions?.filter((n) => n.status === 'success').length || 0
  const failedNodes = execution.nodeExecutions?.filter((n) => n.status === 'error').length || 0

  return (
    <TooltipProvider>
      <div className="execution-detail-page h-screen flex flex-col">
        {/* Execution Header */}
        <div className="execution-header border-b bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="border-l pl-4">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg font-semibold">Execution Details</h1>
                  <p className="text-sm text-muted-foreground">
                    ID: {execution.id.slice(0, 12)}... • Started {formatDate(execution.startedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${getStatusColor(execution.status)} capitalize`}>
              <div className="flex items-center gap-1.5">
                {getStatusIcon(execution.status)}
                {execution.status}
              </div>
            </Badge>

            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDuration(execution.startedAt, execution.finishedAt)}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Execution
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Execution Statistics */}
        <div className="flex items-center gap-6 px-6 py-3 bg-muted/50 border-t">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {execution.nodeExecutions?.length || 0} nodes executed
            </span>
          </div>

          {successfulNodes > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">{successfulNodes} successful</span>
            </div>
          )}

          {failedNodes > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm">{failedNodes} failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Execution Mode Banner */}
      <div className="relative">
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Viewing Execution Results</span>
            <span className="text-xs opacity-90">(Read-only mode)</span>
          </div>
        </div>
      </div>

      {/* Workflow Editor */}
      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <WorkflowEditor nodeTypes={nodeTypes} readOnly={true} executionMode={true} />
        </ReactFlowProvider>
      </div>
    </div>
    </TooltipProvider>
  )
}
