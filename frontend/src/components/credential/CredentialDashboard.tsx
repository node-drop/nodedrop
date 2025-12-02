import { useState, useEffect } from 'react'
import { 
  Key, 
  Clock, 
  Users, 
  Shield, 
  RotateCcw, 
  Trash2, 
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Archive,
  Settings
} from 'lucide-react'
import { useCredentialStore } from '@/stores'
import { Credential } from '@/types'
import { CredentialRotationModal } from './CredentialRotationModal'
import { CredentialSharingModal } from './CredentialSharingModal'
import { CredentialBulkOperationsModal } from './CredentialBulkOperationsModal'
import { CredentialSecurityPoliciesModal } from './CredentialSecurityPoliciesModal'
import { CredentialBackupModal } from './CredentialBackupModal'
import { CredentialUsageModal } from './CredentialUsageModal'
import { CredentialAuditModal } from './CredentialAuditModal'

interface CredentialDashboardProps {
  onCreateCredential: () => void
  onEditCredential: (credential: Credential) => void
}

export function CredentialDashboard({ onCreateCredential, onEditCredential }: CredentialDashboardProps) {
  const {
    credentials,
    expiringCredentials,
    sharedCredentials,
    isLoading,
    error,
    fetchCredentials,
    fetchExpiringCredentials,
    fetchSharedCredentials,
    deleteCredential,
    clearError
  } = useCredentialStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'expiring' | 'shared' | 'mine'>('all')
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([])
  const [showRotationModal, setShowRotationModal] = useState<Credential | null>(null)
  const [showSharingModal, setShowSharingModal] = useState<Credential | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState<Credential | null>(null)
  const [showAuditModal, setShowAuditModal] = useState<Credential | null>(null)

  useEffect(() => {
    fetchCredentials()
    fetchExpiringCredentials()
    fetchSharedCredentials()
  }, [fetchCredentials, fetchExpiringCredentials, fetchSharedCredentials])

  const filteredCredentials = credentials.filter(credential => {
    const matchesSearch = credential.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credential.type.toLowerCase().includes(searchTerm.toLowerCase())
    
    switch (filterType) {
      case 'expiring':
        return matchesSearch && expiringCredentials.some(ec => ec.id === credential.id)
      case 'shared':
        return matchesSearch && credential.isShared
      case 'mine':
        return matchesSearch && !credential.isShared
      default:
        return matchesSearch
    }
  })

  const handleSelectCredential = (credentialId: string) => {
    setSelectedCredentials(prev => 
      prev.includes(credentialId)
        ? prev.filter(id => id !== credentialId)
        : [...prev, credentialId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCredentials.length === filteredCredentials.length) {
      setSelectedCredentials([])
    } else {
      setSelectedCredentials(filteredCredentials.map(c => c.id))
    }
  }

  const handleDeleteCredential = async (credential: Credential) => {
    if (confirm(`Are you sure you want to delete "${credential.name}"?`)) {
      try {
        await deleteCredential(credential.id)
      } catch (error) {
        console.error('Failed to delete credential:', error)
      }
    }
  }

  const getCredentialStatusIcon = (credential: Credential) => {
    const isExpiring = expiringCredentials.some(ec => ec.id === credential.id)
    const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date()
    
    if (isExpired) {
      return <XCircle className="w-4 h-4 text-red-500" />
    } else if (isExpiring) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    } else {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }

  const getCredentialStatusText = (credential: Credential) => {
    const isExpiring = expiringCredentials.some(ec => ec.id === credential.id)
    const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date()
    
    if (isExpired) {
      return 'Expired'
    } else if (isExpiring) {
      return 'Expiring Soon'
    } else {
      return 'Active'
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credential Management</h1>
          <p className="text-gray-600">Manage your credentials, security policies, and access controls</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSecurityModal(true)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>Security Policies</span>
          </button>
          <button
            onClick={() => setShowBackupModal(true)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Archive className="w-4 h-4" />
            <span>Backup & Recovery</span>
          </button>
          <button
            onClick={onCreateCredential}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credential</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Credentials</p>
              <p className="text-2xl font-bold text-gray-900">{credentials.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{expiringCredentials.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Shared</p>
              <p className="text-2xl font-bold text-gray-900">{sharedCredentials.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Secure</p>
              <p className="text-2xl font-bold text-gray-900">
                {credentials.filter(c => !expiringCredentials.some(ec => ec.id === c.id)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search credentials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Credentials</option>
                <option value="mine">My Credentials</option>
                <option value="shared">Shared with Me</option>
                <option value="expiring">Expiring Soon</option>
              </select>
            </div>
          </div>

          {selectedCredentials.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedCredentials.length} selected
              </span>
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Bulk Actions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Credentials Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCredentials.length === filteredCredentials.length && filteredCredentials.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credential
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading credentials...
                  </td>
                </tr>
              ) : filteredCredentials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No credentials found
                  </td>
                </tr>
              ) : (
                filteredCredentials.map((credential) => (
                  <tr key={credential.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCredentials.includes(credential.id)}
                        onChange={() => handleSelectCredential(credential.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Key className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {credential.name}
                          </div>
                          {credential.isShared && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Users className="w-3 h-3 text-blue-500" />
                              <span className="text-xs text-blue-600">Shared</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {credential.type}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getCredentialStatusIcon(credential)}
                        <span className="text-sm text-gray-900">
                          {getCredentialStatusText(credential)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(credential.expiresAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(credential.lastUsedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {credential.usageCount || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditCredential(credential)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowRotationModal(credential)}
                          className="text-green-600 hover:text-green-800 text-sm"
                          title="Rotate credential"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowSharingModal(credential)}
                          className="text-purple-600 hover:text-purple-800 text-sm"
                          title="Share credential"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowUsageModal(credential)}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                          title="View usage"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowAuditModal(credential)}
                          className="text-orange-600 hover:text-orange-800 text-sm"
                          title="View audit logs"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCredential(credential)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title="Delete credential"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showRotationModal && (
        <CredentialRotationModal
          credential={showRotationModal}
          onClose={() => setShowRotationModal(null)}
          onRotate={() => {
            setShowRotationModal(null)
            fetchCredentials()
          }}
        />
      )}

      {showSharingModal && (
        <CredentialSharingModal
          credential={showSharingModal}
          onClose={() => setShowSharingModal(null)}
          onShare={() => {
            setShowSharingModal(null)
            fetchCredentials()
          }}
        />
      )}

      {showBulkModal && (
        <CredentialBulkOperationsModal
          selectedCredentials={selectedCredentials}
          onClose={() => {
            setShowBulkModal(false)
            setSelectedCredentials([])
          }}
          onComplete={() => {
            setShowBulkModal(false)
            setSelectedCredentials([])
            fetchCredentials()
          }}
        />
      )}

      {showSecurityModal && (
        <CredentialSecurityPoliciesModal
          onClose={() => setShowSecurityModal(false)}
        />
      )}

      {showBackupModal && (
        <CredentialBackupModal
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {showUsageModal && (
        <CredentialUsageModal
          credential={showUsageModal}
          onClose={() => setShowUsageModal(null)}
        />
      )}

      {showAuditModal && (
        <CredentialAuditModal
          credential={showAuditModal}
          onClose={() => setShowAuditModal(null)}
        />
      )}
    </div>
  )
}
