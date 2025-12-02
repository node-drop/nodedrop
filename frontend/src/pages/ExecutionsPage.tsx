import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { executionService } from '@/services/execution'
import type { ExecutionDetails } from '@/services/execution'
import { Activity, AlertCircle, CheckCircle, Clock, Filter, Loader2, Monitor, Search } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ExecutionMonitor } from '../components/execution/ExecutionMonitor'
import { ExecutionStatusIndicator } from '../components/execution/ExecutionStatusIndicator'
import { useExecutionMonitoring } from '../hooks/useExecutionMonitoring'

export const ExecutionsPage: React.FC = () => {
  const navigate = useNavigate()
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [showMonitor, setShowMonitor] = useState(false)
  const { isConnected } = useExecutionMonitoring()
  const [executions, setExecutions] = useState<ExecutionDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageLimit = 10

  useEffect(() => {
    loadExecutions()
  }, [currentPage, statusFilter])

  const loadExecutions = async () => {
    try {
      setIsLoading(true)
      const result = await executionService.listExecutions({
        page: currentPage,
        limit: pageLimit,
        status: statusFilter || undefined,
      })
      setExecutions(result)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load executions')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />
      case 'paused':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300`
      case 'error':
        return `${baseClasses} bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300`
      case 'running':
        return `${baseClasses} bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300`
      case 'cancelled':
        return `${baseClasses} bg-muted text-muted-foreground`
      case 'paused':
        return `${baseClasses} bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300`
      default:
        return `${baseClasses} bg-muted text-muted-foreground`
    }
  }

  const formatDuration = (startedAt: string, finishedAt?: string) => {
    const start = new Date(startedAt).getTime()
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
    const duration = (end - start) / 1000

    if (duration < 60) {
      return `${duration.toFixed(1)}s`
    } else if (duration < 3600) {
      return `${(duration / 60).toFixed(1)}m`
    } else {
      return `${(duration / 3600).toFixed(1)}h`
    }
  }

  const handleViewExecution = (executionId: string, workflowId: string) => {
    navigate(`/workflows/${workflowId}/executions/${executionId}`)
  }

  const handleRetry = async (executionId: string) => {
    try {
      await executionService.executeWorkflow({
        workflowId: executions.find((e) => e.id === executionId)?.workflowId || '',
      })
      toast.success('Workflow execution started')
      loadExecutions()
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry execution')
    }
  }

  const filteredExecutions = executions.filter((execution) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        execution.id.toLowerCase().includes(query) ||
        execution.workflowId.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Executions</h1>
          <p className="text-muted-foreground">Monitor your workflow execution history</p>
          <div className="flex items-center space-x-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              Real-time monitoring {isConnected ? 'connected' : 'disconnected'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowMonitor(!showMonitor)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${showMonitor
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
        >
          <Monitor className="w-4 h-4" />
          <span>{showMonitor ? 'Hide Monitor' : 'Show Monitor'}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search executions by ID or workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-input"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="running">Running</option>
            <option value="cancelled">Cancelled</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Real-time Monitor */}
      {showMonitor && (
        <div className="mb-6">
          <ExecutionMonitor executionId={selectedExecutionId} className="w-full" />
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading executions...</span>
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">No executions found</h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter
              ? 'Try adjusting your search or filters'
              : 'Run a workflow to see execution history'}
          </p>
        </div>
      ) : (
        <>
          {/* Executions Table */}
          <div className="bg-card shadow-sm rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Workflow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredExecutions.map((execution) => (
                    <tr
                      key={execution.id}
                      className={`hover:bg-accent cursor-pointer ${selectedExecutionId === execution.id ? 'bg-accent border-l-4 border-primary' : ''
                        }`}
                      onClick={() => setSelectedExecutionId(execution.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isConnected && execution.status === 'running' ? (
                          <ExecutionStatusIndicator
                            executionId={execution.id}
                            showProgress={true}
                            showNodeCount={true}
                          />
                        ) : (
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(execution.status)}
                            <span className={getStatusBadge(execution.status)}>
                              {execution.status}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-card-foreground">
                          {execution.workflowId}
                        </div>
                        <div className="text-xs text-muted-foreground">ID: {execution.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(execution.startedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDuration(execution.startedAt, execution.finishedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewExecution(execution.id, execution.workflowId)
                            }}
                          >
                            View Details
                          </Button>
                          {execution.status === 'error' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRetry(execution.id)
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              Retry
                            </Button>
                          )}
                          {execution.status === 'running' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedExecutionId(execution.id)
                                setShowMonitor(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Monitor
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {filteredExecutions.length} execution{filteredExecutions.length !== 1 ? 's' : ''}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-foreground">Page {currentPage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={executions.length < pageLimit || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
