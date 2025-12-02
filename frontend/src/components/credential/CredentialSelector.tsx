import { useCredentialStore } from '@/stores'
import { Credential } from '@/types'
import { AlertCircle, ChevronDown, Key, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CredentialModal } from './CredentialModal'

interface CredentialSelectorProps {
  credentialType: string
  value?: string
  onChange: (credentialId: string | undefined) => void
  required?: boolean
  error?: string
  disabled?: boolean
}

export function CredentialSelector({ 
  credentialType, 
  value, 
  onChange, 
  required = false,
  error,
  disabled = false
}: CredentialSelectorProps) {
  const { 
    credentials, 
    credentialTypes, 
    fetchCredentials, 
    fetchCredentialTypes,
    getCredentialsByType 
  } = useCredentialStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  const availableCredentials = getCredentialsByType(credentialType)
  const selectedCredential = credentials.find(c => c.id === value)
  const credentialTypeInfo = credentialTypes.find(ct => ct.name === credentialType)

  useEffect(() => {
    if (credentials.length === 0) {
      fetchCredentials()
    }
    if (credentialTypes.length === 0) {
      fetchCredentialTypes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.length, credentialTypes.length])

  const handleSelect = (credentialId: string | undefined) => {
    onChange(credentialId)
    setIsOpen(false)
  }

  const handleCreateNew = () => {
    setShowModal(true)
    setIsOpen(false)
  }

  const handleCredentialCreated = (credential: Credential) => {
    onChange(credential.id)
    setShowModal(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            error 
              ? 'border-red-300 bg-red-50' 
              : disabled
              ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-gray-400" />
              <span className={selectedCredential ? 'text-gray-900' : 'text-gray-500'}>
                {selectedCredential ? selectedCredential.name : 'Select credential...'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} />
          </div>
        </button>

        {error && (
          <div className="flex items-center space-x-1 mt-1 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {!required && (
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700"
              >
                <span className="text-gray-500">No credential</span>
              </button>
            )}
            
            {availableCredentials.map((credential) => (
              <button
                key={credential.id}
                type="button"
                onClick={() => handleSelect(credential.id)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 ${
                  value === credential.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <Key className="w-4 h-4 text-gray-400" />
                <span>{credential.name}</span>
              </button>
            ))}
            
            <div className="border-t border-gray-100">
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span>Create new credential</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {credentialTypeInfo && (
        <CredentialModal
          open={showModal}
          credentialType={credentialTypeInfo}
          onClose={() => setShowModal(false)}
          onSave={handleCredentialCreated}
        />
      )}
    </div>
  )
}
