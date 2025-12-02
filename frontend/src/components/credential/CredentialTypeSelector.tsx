import { useCredentialStore } from '@/stores'
import { CredentialType } from '@/types'
import { Key, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CredentialTypeSelectorProps {
  onSelect: (credentialType: CredentialType) => void
  onClose: () => void
}

export function CredentialTypeSelector({ onSelect, onClose }: CredentialTypeSelectorProps) {
  console.log('CredentialTypeSelector mounted')
  const { credentialTypes, fetchCredentialTypes, isLoading } = useCredentialStore()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    console.log('CredentialTypeSelector effect, credentialTypes:', credentialTypes.length)
    if (credentialTypes.length === 0) {
      console.log('Fetching credential types...')
      fetchCredentialTypes()
    }
  }, [credentialTypes.length, fetchCredentialTypes])

  const filteredTypes = credentialTypes.filter(type =>
    type.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Choose Credential Type
              </h2>
              <p className="text-sm text-gray-500">
                Select the type of credential you want to create
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

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search credential types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading credential types...</p>
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {credentialTypes.length === 0 ? 'No Credential Types' : 'No Matching Types'}
              </h3>
              <p className="text-gray-500">
                {credentialTypes.length === 0 
                  ? 'No credential types are available.'
                  : 'Try adjusting your search terms.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTypes.map((type) => (
                <button
                  key={type.name}
                  onClick={() => onSelect(type)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
                >
                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: type.color || '#666' }}
                    >
                      {type.icon || <Key className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-900">
                        {type.displayName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </button>
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
