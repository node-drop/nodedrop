/* eslint-disable no-undef, no-console */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { executionService, type ExecutionDetails } from '@/services/execution'
import { apiClient } from '@/services/api'
import { useWorkflowStore } from '@/stores/workflow'
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Circle,
  Database,
  MoreHorizontal,
  MoreVertical,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  StopCircle,
  Trash2,
  XCircle
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

type Execution = ExecutionDetails

interface ExecutionsPanelProps {
  workflowId?: string
}

export function ExecutionsPanel({ workflowId }: ExecutionsPanelProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { workflow, updateWorkflow } = useWorkflowStore()

  const [executions, setExecutions] = useState<Execution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentWorkflowId = workflowId || workflow?.id

  const activeExecutionId = useMemo(() => {
    const pathMatch = location.pathname.match(/\/executions\/([^/]+)$/)
    return pathMatch ? pathMatch[1] : null
  }, [location.pathname])

  const fetchExecutions = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      if (currentWorkflowId && currentWorkflowId !== 'new') {
        const executionsList = await executionService.listExecutions({
          workflowId: currentWorkflowId,
          status: statusFilter || undefined,
          limit: 50,
          page: 1
        })
        setExecutions(executionsList)
      } else {
        setExecutions([])
      }

    } catch (err) {
      console.error('Failed to fetch executions:', err)
      setError('Failed to load executions')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [statusFilter, currentWorkflowId])

  const handleRefresh = () => {
    fetchExecutions(true)
  }

  const handleDeleteAll = () => {
    setShowDeleteDialog(true)
  }

  const confirmDeleteAll = async () => {
    setIsDeleting(true)

    try {
      await Promise.all(
        executions.map(execution =>
          apiClient.delete(`/executions/${execution.id}`)
        )
      )

      await fetchExecutions(true)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete executions:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    fetchExecutions()
  }, [fetchExecutions])

  const filteredExecutions = useMemo(() => {
    if (!searchTerm) return executions

    return executions.filter((execution: Execution) =>
      execution.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      execution.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [executions, searchTerm])

  const handleExecutionClick = (executionId: string) => {
    const execution = filteredExecutions.find(e => e.id === executionId)
    if (execution && currentWorkflowId) {
      navigate(`/workflows/${currentWorkflowId}/executions/${executionId}`)
    }
  }

  const handleExecutionAction = async (action: string, executionId: string, event: React.MouseEvent) => {
    event.stopPropagation()

    try {
      switch (action) {
        case 'cancel':
          await apiClient.post(`/executions/${executionId}/cancel`)
          window.location.reload()
          break
        case 'retry':
          await apiClient.post(`/executions/${executionId}/retry`)
          window.location.reload()
          break
        case 'delete':
          if (window.confirm('Are you sure you want to delete this execution?')) {
            await apiClient.delete(`/executions/${executionId}`)
            setExecutions(prev => prev.filter(exec => exec.id !== executionId))
          }
          break
        default:
          console.log(`${action} execution:`, executionId)
      }
    } catch (err) {
      console.error(`Failed to ${action} execution:`, err)
    }
  }

  const saveExecutionEnabled = workflow?.settings?.saveExecutionToDatabase !== false

  const handleToggleExecutionHistory = async (checked: boolean) => {
    if (workflow) {
      updateWorkflow({
        settings: {
          ...workflow.settings,
          saveExecutionToDatabase: checked,
        },
      })
      setTimeout(() => fetchExecutions(true), 500)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startedAt: string, finishedAt?: string) => {
    const start = new Date(startedAt)
    const end = finishedAt ? new Date(finishedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()

    if (durationMs < 1000) return '<1s'
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`
    if (durationMs < 3600000) return `${Math.round(durationMs / 60000)}m`
    return `${Math.round(durationMs / 3600000)}h`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
      case 'success':
        return <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
      case 'cancelled':
        return <StopCircle className="h-3.5 w-3.5 text-muted-foreground" />
      case 'paused':
        return <Pause className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
      case 'partial':
        return <AlertCircle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
      case 'cancelled':
        return 'bg-muted text-muted-foreground border-border'
      case 'paused':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800'
      case 'partial':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-l-blue-500 dark:border-l-blue-400'
      case 'success':
        return 'border-l-green-500 dark:border-l-green-400'
      case 'error':
        return 'border-l-red-500 dark:border-l-red-400'
      case 'cancelled':
        return 'border-l-muted-foreground'
      case 'paused':
        return 'border-l-yellow-500 dark:border-l-yellow-400'
      case 'partial':
        return 'border-l-orange-500 dark:border-l-orange-400'
      default:
        return 'border-l-muted-foreground'
    }
  }

  const renderExecutionItem = (execution: Execution) => {
    const isActive = activeExecutionId === execution.id
    const statusBorderColor = getStatusBorderColor(execution.status)

    return (
      <div
        key={execution.id}
        className={`
          group cursor-pointer transition-all duration-200 border-b last:border-b-0
          ${isActive
            ? `bg-sidebar-accent/80 border-l-[3px] ${statusBorderColor}`
            : `hover:bg-sidebar-accent/50 border-l-[3px] border-l-transparent hover:${statusBorderColor}`
          }
        `}
        onClick={() => handleExecutionClick(execution.id)}
      >
        <div className="p-3.5">
          <div className="flex items-start gap-2.5 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-foreground">
                  {formatTime(execution.startedAt)}
                </h4>
                <Badge
                  variant="outline"
                  className={`text-[11px] h-5 px-2 capitalize font-medium shrink-0 ${getStatusColor(execution.status)}`}
                >
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(execution.status)}
                    <span>{execution.status}</span>
                  </div>
                </Badge>
              </div>
              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                <span className="truncate">ID: {execution.id.slice(-12)}</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => handleExecutionAction('view', execution.id, e)}
                >
                  View Details
                </DropdownMenuItem>
                {execution.status === 'running' && (
                  <DropdownMenuItem
                    onClick={(e) => handleExecutionAction('cancel', execution.id, e)}
                  >
                    Cancel
                  </DropdownMenuItem>
                )}
                {(execution.status === 'error' || execution.status === 'cancelled') && (
                  <DropdownMenuItem
                    onClick={(e) => handleExecutionAction('retry', execution.id, e)}
                  >
                    Retry
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => handleExecutionAction('delete', execution.id, e)}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground/60 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className="text-[11px]">{formatDate(execution.startedAt)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span className="text-[11px] font-medium">{formatDuration(execution.startedAt, execution.finishedAt)}</span>
              </div>
              {execution.nodeExecutions && execution.nodeExecutions.length > 0 && (
                <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded text-[11px]">
                  <Activity className="h-2.5 w-2.5" />
                  <span>{execution.nodeExecutions.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderBanner = () => {
    if (!workflow || workflow.id !== currentWorkflowId || saveExecutionEnabled) {
      return null
    }

    return (
      <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md">
        <div className="flex items-start gap-3">
          <Database className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              Execution History Disabled
            </p>
            <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-300">
              New executions won't be saved to database
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-3.5">
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b pb-3.5">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-6 w-20 bg-muted rounded"></div>
                  </div>
                  <div className="flex gap-2.5 mb-2.5">
                    <div className="h-4 w-4 bg-muted rounded mt-0.5"></div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className="h-3 bg-muted rounded w-20"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-3 w-12 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30">
              <RefreshCw className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Failed to load executions</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    if (filteredExecutions.length === 0) {
      return (
        <div className="p-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50">
              <Activity className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/80">
                {searchTerm || statusFilter
                  ? 'No executions match your filters'
                  : 'No executions for this workflow'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Run this workflow to see execution history
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-0">
        {filteredExecutions.map((execution) => renderExecutionItem(execution))}
      </div>
    )
  }

  const hasActiveFilters = searchTerm || statusFilter

  const renderHeader = () => {
    return (
      <div className="flex-shrink-0 p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Executions</span>
            <Badge variant="secondary" className="text-xs h-5">
              {executions.length}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {workflow && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch
                        checked={saveExecutionEnabled}
                        onCheckedChange={handleToggleExecutionHistory}
                        className="scale-75 data-[state=checked]:bg-green-600"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {saveExecutionEnabled ? 'Execution History Enabled' : 'Execution History Disabled'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {executions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDeleteAll}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Executions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search executions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3" />
                    <span>All Status</span>
                  </div>
                </SelectItem>
                <SelectItem value="running">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                    <span>Running</span>
                  </div>
                </SelectItem>
                <SelectItem value="success">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-400" />
                    <span>Success</span>
                  </div>
                </SelectItem>
                <SelectItem value="error">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                    <span>Error</span>
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-orange-500 dark:text-orange-400" />
                    <span>Cancelled</span>
                  </div>
                </SelectItem>
                <SelectItem value="paused">
                  <div className="flex items-center gap-2">
                    <Pause className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
                    <span>Paused</span>
                  </div>
                </SelectItem>
                <SelectItem value="partial">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                    <span>Partial</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter(null)
                }}
                className="h-8 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {renderHeader()}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 overflow-auto">
          <div className="p-3">
            {renderBanner()}
            {renderContent()}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Executions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {executions.length} execution{executions.length !== 1 ? 's' : ''} for this workflow.
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
