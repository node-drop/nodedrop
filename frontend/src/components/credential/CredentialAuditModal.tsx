import { useState, useEffect } from 'react'
import { X, Shield, Calendar, User, Activity, Filter, Search, Eye, Edit, Trash2, Share, RotateCcw, Plus } from 'lucide-react'
import { Credential, CredentialAuditLog } from '@/types'
import { useCredentialStore } from '@/stores'

interface CredentialAuditModalProps {
  credential: Credential
  onClose: () => void
}

const actionIcons = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  rotated: RotateCcw,
  shared: Share,
  accessed: Eye
}

const actionColors = {
  created: 'text-green-600 bg-green-100',
  updated: 'text-blue-600 bg-blue-100',
  deleted: 'text-red-600 bg-red-100',
  rotated: 'text-yellow-600 bg-yellow-100',
  shared: 'text-purple-600 bg-purple-100',
  accessed: 'text-gray-600 bg-gray-100'
}

export function CredentialAuditModal({ credential, onClose }: CredentialAuditModalProps) {
  const { auditLogs, fetchAuditLogs, isLoading } = useCredentialStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all')
  const [selectedLog, setSelectedLog] = useState<CredentialAuditLog | null>(null)

  useEffect(() => {
    fetchAuditLogs(credential.id)
  }, [credential.id, fetchAuditLogs])

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesAction = actionFilter === 'all' || log.action === actionFilter

    const matchesDate = (() => {
      if (dateRange === 'all') return true
      
      const logDate = new Date(log.timestamp)
      const now = new Date()
      const diffHours = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60)
      
      switch (dateRange) {
        case '24h':
          return diffHours <= 24
        case '7d':
          return diffHours <= 24 * 7
        case '30d':
          return diffHours <= 24 * 30
        default:
          return true
      }
    })()

    return matchesSearch && matchesAction && matchesDate
  })

  const getAuditStats = () => {
    const actionCounts = auditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const uniqueUsers = new Set(auditLogs.map(log => log.userId)).size
    const last24h = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp)
      const now = new Date()
      const diffHours = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60)
      return diffHours <= 24
    }).length

    return { actionCounts, uniqueUsers, last24h, total: auditLogs.length }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const getActionDescription = (log: CredentialAuditLog) => {
    switch (log.action) {
      case 'created':
        return 'Created this credential'
      case 'updated':
        return 'Updated credential settings'
      case 'deleted':
        return 'Deleted this credential'
      case 'rotated':
        return 'Rotated credential values'
      case 'shared':
        return 'Shared credential with users'
      case 'accessed':
        return 'Accessed credential for workflow execution'
      default:
        return `Performed ${log.action} action`
    }
  }

  const stats = getAuditStats()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Audit Trail
                </h2>
                <p className="text-sm text-gray-500">
                  Security audit logs for "{credential.name}"
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.uniqueUsers}</div>
              <div className="text-sm text-gray-500">Unique Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.last24h}</div>
              <div className="text-sm text-gray-500">Last 24h</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(stats.actionCounts).length}
              </div>
              <div className="text-sm text-gray-500">Action Types</div>
            </div>
          </div>

          {/* Action Breakdown */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(stats.actionCounts).map(([action, count]) => (
              <div key={action} className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border">
                <div className={`p-1 rounded-full ${actionColors[action as keyof typeof actionColors] || 'text-gray-600 bg-gray-100'}`}>
                  {(() => {
                    const Icon = actionIcons[action as keyof typeof actionIcons] || Activity
                    return <Icon className="w-3 h-3" />
                  })()}
                </div>
                <span className="text-sm text-gray-700 capitalize">{action}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users, actions, or IP addresses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Actions</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="deleted">Deleted</option>
                  <option value="rotated">Rotated</option>
                  <option value="shared">Shared</option>
                  <option value="accessed">Accessed</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Showing {filteredLogs.length} of {auditLogs.length} audit records
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {auditLogs.length === 0 ? 'No Audit Data' : 'No Matching Records'}
              </h3>
              <p className="text-gray-500">
                {auditLogs.length === 0 
                  ? 'No audit events have been recorded for this credential yet.'
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const Icon = actionIcons[log.action as keyof typeof actionIcons] || Activity
                const colorClass = actionColors[log.action as keyof typeof actionColors] || 'text-gray-600 bg-gray-100'
                
                return (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 capitalize">{log.action}</h4>
                            <span className="text-sm text-gray-500">by</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">{log.userName}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{getActionDescription(log)}</p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(log.timestamp)}</span>
                            </div>
                            {log.ipAddress && (
                              <div className="flex items-center space-x-1">
                                <Activity className="w-3 h-3" />
                                <span>{log.ipAddress}</span>
                              </div>
                            )}
                          </div>

                          {log.details && Object.keys(log.details).length > 0 && (
                            <button
                              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                              className="mt-2 text-xs text-orange-600 hover:text-orange-800"
                            >
                              {selectedLog?.id === log.id ? 'Hide Details' : 'Show Details'}
                            </button>
                          )}

                          {selectedLog?.id === log.id && log.details && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <pre className="whitespace-pre-wrap text-gray-700">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {formatRelativeTime(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
