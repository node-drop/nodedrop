import { useState, useEffect } from 'react'
import { X, Activity, Calendar, CheckCircle, XCircle, Clock, Filter, Search } from 'lucide-react'
import { Credential } from '@/types'
import { useCredentialStore } from '@/stores'

interface CredentialUsageModalProps {
  credential: Credential
  onClose: () => void
}

export function CredentialUsageModal({ credential, onClose }: CredentialUsageModalProps) {
  const { usageLogs, fetchCredentialUsage, isLoading } = useCredentialStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all')
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all')

  useEffect(() => {
    fetchCredentialUsage(credential.id)
  }, [credential.id, fetchCredentialUsage])

  const filteredLogs = usageLogs.filter(log => {
    const matchesSearch = 
      log.workflowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.nodeName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'success' && log.success) ||
      (statusFilter === 'error' && !log.success)

    const matchesDate = (() => {
      if (dateRange === 'all') return true
      
      const logDate = new Date(log.usedAt)
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

    return matchesSearch && matchesStatus && matchesDate
  })

  const getUsageStats = () => {
    const total = usageLogs.length
    const successful = usageLogs.filter(log => log.success).length
    const failed = usageLogs.filter(log => !log.success).length
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0

    const last24h = usageLogs.filter(log => {
      const logDate = new Date(log.usedAt)
      const now = new Date()
      const diffHours = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60)
      return diffHours <= 24
    }).length

    return { total, successful, failed, successRate, last24h }
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

  const stats = getUsageStats()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Credential Usage
                </h2>
                <p className="text-sm text-gray-500">
                  Usage history for "{credential.name}"
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Uses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
              <div className="text-sm text-gray-500">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.last24h}</div>
              <div className="text-sm text-gray-500">Last 24h</div>
            </div>
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
                  placeholder="Search workflows or nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success Only</option>
                  <option value="error">Errors Only</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Showing {filteredLogs.length} of {usageLogs.length} usage records
            </div>
          </div>
        </div>

        {/* Usage Logs */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading usage data...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {usageLogs.length === 0 ? 'No Usage Data' : 'No Matching Records'}
              </h3>
              <p className="text-gray-500">
                {usageLogs.length === 0 
                  ? 'This credential has not been used yet.'
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-1 rounded-full ${
                          log.success ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {log.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{log.workflowName}</h4>
                          <p className="text-sm text-gray-600">Node: {log.nodeName}</p>
                        </div>
                      </div>

                      {log.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Error:</strong> {log.error}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{formatRelativeTime(log.usedAt)}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(log.usedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
