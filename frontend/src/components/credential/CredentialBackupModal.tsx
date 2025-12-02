import { useState, useEffect } from 'react'
import { X, Archive, Plus, Upload, Trash2, Calendar, HardDrive, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { CredentialBackup } from '@/types'
import { useCredentialStore } from '@/stores'

interface CredentialBackupModalProps {
  onClose: () => void
}

export function CredentialBackupModal({ onClose }: CredentialBackupModalProps) {
  const {
    credentials,
    backups,
    fetchCredentials,
    fetchBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    isLoading
  } = useCredentialStore()

  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([])
  const [backupName, setBackupName] = useState('')
  const [backupDescription, setBackupDescription] = useState('')
  const [overwriteOnRestore, setOverwriteOnRestore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchCredentials()
    fetchBackups()
  }, [fetchCredentials, fetchBackups])

  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      setError('Backup name is required')
      return
    }

    if (selectedCredentials.length === 0) {
      setError('Please select at least one credential to backup')
      return
    }

    setError(null)
    try {
      await createBackup(backupName, selectedCredentials, backupDescription)
      setSuccess('Backup created successfully')
      setIsCreating(false)
      setBackupName('')
      setBackupDescription('')
      setSelectedCredentials([])
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create backup')
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to restore this backup? This may overwrite existing credentials.')) {
      return
    }

    setIsRestoring(backupId)
    setError(null)
    try {
      const result = await restoreBackup(backupId, overwriteOnRestore)
      setSuccess(`Successfully restored ${result.restored} credentials`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to restore backup')
    } finally {
      setIsRestoring(null)
    }
  }

  const handleDeleteBackup = async (backup: CredentialBackup) => {
    if (!confirm(`Are you sure you want to delete the backup "${backup.name}"?`)) {
      return
    }

    try {
      await deleteBackup(backup.id)
      setSuccess('Backup deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete backup')
    }
  }

  const handleSelectCredential = (credentialId: string) => {
    setSelectedCredentials(prev =>
      prev.includes(credentialId)
        ? prev.filter(id => id !== credentialId)
        : [...prev, credentialId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCredentials.length === credentials.length) {
      setSelectedCredentials([])
    } else {
      setSelectedCredentials(credentials.map(c => c.id))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Archive className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Backup & Recovery
                </h2>
                <p className="text-sm text-gray-500">
                  Create and manage credential backups for disaster recovery
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

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            </div>
          )}

          {isCreating ? (
            /* Create Backup Form */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Create New Backup</h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup Name *
                  </label>
                  <input
                    type="text"
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                    placeholder="Enter backup name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={backupDescription}
                    onChange={(e) => setBackupDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Credentials to Backup
                  </label>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedCredentials.length === credentials.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {credentials.map((credential) => (
                    <div key={credential.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedCredentials.includes(credential.id)}
                        onChange={() => handleSelectCredential(credential.id)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{credential.name}</p>
                        <p className="text-xs text-gray-500">{credential.type}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-gray-500 mt-2">
                  {selectedCredentials.length} of {credentials.length} credentials selected
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBackup}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Create Backup</span>
                </button>
              </div>
            </div>
          ) : (
            /* Backup List */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Available Backups ({backups.length})
                </h3>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Backup</span>
                </button>
              </div>

              {/* Restore Options */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Restore Options</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="overwrite"
                    checked={overwriteOnRestore}
                    onChange={(e) => setOverwriteOnRestore(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="overwrite" className="text-sm text-blue-700">
                    Overwrite existing credentials with the same name
                  </label>
                </div>
              </div>

              {backups.length === 0 ? (
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Backups Found</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first backup to protect your credentials.
                  </p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Create Backup
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {backups.map((backup) => (
                    <div key={backup.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{backup.name}</h4>
                          {backup.description && (
                            <p className="text-sm text-gray-600 mt-1">{backup.description}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRestoreBackup(backup.id)}
                            disabled={isRestoring === backup.id}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="Restore backup"
                          >
                            {isRestoring === backup.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backup)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete backup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="ml-1 text-gray-900">{formatDate(backup.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Archive className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">Credentials:</span>
                            <span className="ml-1 text-gray-900">{backup.credentials.length}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">Size:</span>
                            <span className="ml-1 text-gray-900">{formatFileSize(backup.size)}</span>
                          </div>
                        </div>
                      </div>

                      {backup.credentials.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-500">Included credentials:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {backup.credentials.slice(0, 5).map((cred, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {cred.name}
                              </span>
                            ))}
                            {backup.credentials.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                +{backup.credentials.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
