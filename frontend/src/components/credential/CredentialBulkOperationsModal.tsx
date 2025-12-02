import { useState } from 'react'
import { X, Download, Upload, RotateCcw, Trash2, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { useCredentialStore } from '@/stores'
import { CredentialImportData } from '@/types'

interface CredentialBulkOperationsModalProps {
  selectedCredentials: string[]
  onClose: () => void
  onComplete: () => void
}

type BulkOperation = 'export' | 'import' | 'rotate' | 'delete'

export function CredentialBulkOperationsModal({ 
  selectedCredentials, 
  onClose, 
  onComplete 
}: CredentialBulkOperationsModalProps) {
  const {
    credentials,
    bulkExportCredentials,
    bulkImportCredentials,
    bulkRotateCredentials,
    bulkDeleteCredentials,
    isLoading
  } = useCredentialStore()

  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)
  const [importData, setImportData] = useState<string>('')
  const [overwriteExisting, setOverwriteExisting] = useState(false)

  const selectedCredentialNames = credentials
    .filter(c => selectedCredentials.includes(c.id))
    .map(c => c.name)

  const handleExport = async () => {
    setIsProcessing(true)
    try {
      const exportData = await bulkExportCredentials(selectedCredentials)
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `credentials-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setResults({
        success: true,
        message: `Successfully exported ${selectedCredentials.length} credentials`,
        details: { exported: selectedCredentials.length }
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Export failed'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      setResults({
        success: false,
        message: 'Please provide import data'
      })
      return
    }

    setIsProcessing(true)
    try {
      const parsedData: CredentialImportData = JSON.parse(importData)
      const result = await bulkImportCredentials({
        ...parsedData,
        overwriteExisting
      })

      setResults({
        success: true,
        message: `Successfully imported ${result.imported} credentials`,
        details: result
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRotate = async () => {
    setIsProcessing(true)
    try {
      const result = await bulkRotateCredentials(selectedCredentials)
      setResults({
        success: true,
        message: `Successfully rotated ${result.rotated} credentials`,
        details: result
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Rotation failed'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCredentials.length} credentials? This action cannot be undone.`)) {
      return
    }

    setIsProcessing(true)
    try {
      const result = await bulkDeleteCredentials(selectedCredentials)
      setResults({
        success: true,
        message: `Successfully deleted ${result.deleted} credentials`,
        details: result
      })
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Deletion failed'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOperationSelect = (operation: BulkOperation) => {
    setSelectedOperation(operation)
    setResults(null)
  }

  const handleExecute = () => {
    switch (selectedOperation) {
      case 'export':
        handleExport()
        break
      case 'import':
        handleImport()
        break
      case 'rotate':
        handleRotate()
        break
      case 'delete':
        handleDelete()
        break
    }
  }

  const renderOperationContent = () => {
    switch (selectedOperation) {
      case 'export':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Export Credentials</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Export {selectedCredentials.length} selected credentials to a JSON file. 
                    Sensitive data will be encrypted in the export.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Credentials:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {selectedCredentialNames.map((name, index) => (
                  <li key={index}>• {name}</li>
                ))}
              </ul>
            </div>
          </div>
        )

      case 'import':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Upload className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-green-900">Import Credentials</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Import credentials from a JSON file. Paste the JSON content below.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Data (JSON)
              </label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste your credential export JSON here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="overwrite"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="overwrite" className="text-sm text-gray-700">
                Overwrite existing credentials with the same name
              </label>
            </div>
          </div>
        )

      case 'rotate':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <RotateCcw className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900">Rotate Credentials</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Rotate {selectedCredentials.length} selected credentials. This will generate new values 
                    and extend expiration dates. Old values will be immediately invalidated.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Credentials to Rotate:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {selectedCredentialNames.map((name, index) => (
                  <li key={index}>• {name}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                <p className="text-sm text-orange-700">
                  <strong>Warning:</strong> Bulk rotation will require you to update all workflows 
                  and integrations using these credentials.
                </p>
              </div>
            </div>
          </div>
        )

      case 'delete':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Delete Credentials</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete {selectedCredentials.length} selected credentials. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Credentials to Delete:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {selectedCredentialNames.map((name, index) => (
                  <li key={index}>• {name}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> Deleting these credentials will break any workflows 
                  or integrations that depend on them.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getOperationButtonText = () => {
    switch (selectedOperation) {
      case 'export':
        return 'Export Credentials'
      case 'import':
        return 'Import Credentials'
      case 'rotate':
        return 'Rotate Credentials'
      case 'delete':
        return 'Delete Credentials'
      default:
        return 'Execute'
    }
  }

  const getOperationButtonColor = () => {
    switch (selectedOperation) {
      case 'export':
        return 'bg-blue-600 hover:bg-blue-700'
      case 'import':
        return 'bg-green-600 hover:bg-green-700'
      case 'rotate':
        return 'bg-yellow-600 hover:bg-yellow-700'
      case 'delete':
        return 'bg-red-600 hover:bg-red-700'
      default:
        return 'bg-gray-600 hover:bg-gray-700'
    }
  }

  if (results) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            {results.success ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {results.success ? 'Operation Completed' : 'Operation Failed'}
            </h2>
            
            <p className="text-gray-600 mb-4">{results.message}</p>
            
            {results.details && results.details.errors && results.details.errors.length > 0 && (
              <div className="text-left mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Errors:</h3>
                <ul className="text-sm text-red-600 space-y-1">
                  {results.details.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              onClick={() => {
                if (results.success) {
                  onComplete()
                } else {
                  setResults(null)
                  setSelectedOperation(null)
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {results.success ? 'Close' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Bulk Operations
              </h2>
              <p className="text-sm text-gray-500">
                Perform operations on {selectedCredentials.length} selected credentials
              </p>
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
          {!selectedOperation ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Select an operation:</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleOperationSelect('export')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Export</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Download selected credentials as JSON
                  </p>
                </button>

                <button
                  onClick={() => handleOperationSelect('import')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Upload className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Import</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Import credentials from JSON file
                  </p>
                </button>

                <button
                  onClick={() => handleOperationSelect('rotate')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <RotateCcw className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-gray-900">Rotate</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Generate new values for credentials
                  </p>
                </button>

                <button
                  onClick={() => handleOperationSelect('delete')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-gray-900">Delete</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Permanently remove credentials
                  </p>
                </button>
              </div>
            </div>
          ) : (
            renderOperationContent()
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => {
              if (selectedOperation) {
                setSelectedOperation(null)
              } else {
                onClose()
              }
            }}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {selectedOperation ? 'Back' : 'Cancel'}
          </button>

          {selectedOperation && (
            <button
              onClick={handleExecute}
              disabled={isProcessing || isLoading}
              className={`px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${getOperationButtonColor()}`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{getOperationButtonText()}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
