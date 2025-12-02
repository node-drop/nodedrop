import { useState, useEffect } from 'react'
import { X, RotateCcw, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { Credential, CredentialData } from '@/types'
import { useCredentialStore } from '@/stores'

interface CredentialRotationModalProps {
  credential: Credential
  onClose: () => void
  onRotate: () => void
}

export function CredentialRotationModal({ credential, onClose, onRotate }: CredentialRotationModalProps) {
  const { 
    credentialTypes, 
    rotateCredential, 
    fetchCredentialTypes,
    isLoading 
  } = useCredentialStore()

  const [newData, setNewData] = useState<CredentialData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isRotating, setIsRotating] = useState(false)
  const [rotationSuccess, setRotationSuccess] = useState(false)

  const credentialType = credentialTypes.find(ct => ct.name === credential.type)

  useEffect(() => {
    if (credentialTypes.length === 0) {
      fetchCredentialTypes()
    }
  }, [credentialTypes.length, fetchCredentialTypes])

  useEffect(() => {
    // Initialize form data with empty values
    if (credentialType) {
      const initialData: CredentialData = {}
      credentialType.properties.forEach(prop => {
        if (prop.type === 'boolean') {
          initialData[prop.name] = false
        } else {
          initialData[prop.name] = ''
        }
      })
      setNewData(initialData)
    }
  }, [credentialType])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!credentialType) {
      newErrors.general = 'Credential type not found'
      setErrors(newErrors)
      return false
    }

    credentialType.properties.forEach(prop => {
      if (prop.required && !newData[prop.name]) {
        newErrors[prop.name] = `${prop.displayName} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRotate = async () => {
    if (!validateForm()) return

    setIsRotating(true)
    try {
      await rotateCredential(credential.id, newData)
      setRotationSuccess(true)
      setTimeout(() => {
        onRotate()
      }, 2000)
    } catch (error) {
      console.error('Failed to rotate credential:', error)
      setErrors({ general: error instanceof Error ? error.message : 'Failed to rotate credential' })
    } finally {
      setIsRotating(false)
    }
  }

  const handleDataChange = (propertyName: string, value: any) => {
    setNewData(prev => ({ ...prev, [propertyName]: value }))
    // Clear error when user starts typing
    if (errors[propertyName]) {
      setErrors(prev => ({ ...prev, [propertyName]: '' }))
    }
  }

  const renderPropertyInput = (property: any) => {
    const value = newData[property.name] || ''
    const error = errors[property.name]

    switch (property.type) {
      case 'string':
      case 'password':
        return (
          <input
            type={property.type === 'password' ? 'password' : 'text'}
            value={value}
            onChange={(e) => handleDataChange(property.name, e.target.value)}
            placeholder={property.placeholder || property.description}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleDataChange(property.name, parseFloat(e.target.value) || 0)}
            placeholder={property.placeholder || property.description}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        )

      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleDataChange(property.name, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{property.description}</span>
          </label>
        )

      case 'options':
        return (
          <select
            value={value}
            onChange={(e) => handleDataChange(property.name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select an option...</option>
            {property.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleDataChange(property.name, e.target.value)}
            placeholder={property.placeholder || property.description}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        )
    }
  }

  const getExpirationInfo = () => {
    if (!credential.expiresAt) return null
    
    const expiresAt = new Date(credential.expiresAt)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) {
      return {
        status: 'expired',
        message: 'This credential has expired',
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />
      }
    } else if (daysUntilExpiry <= 7) {
      return {
        status: 'expiring',
        message: `This credential expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
        icon: <Clock className="w-5 h-5 text-yellow-500" />
      }
    } else {
      return {
        status: 'valid',
        message: `This credential expires in ${daysUntilExpiry} days`,
        icon: <CheckCircle className="w-5 h-5 text-green-500" />
      }
    }
  }

  const expirationInfo = getExpirationInfo()

  if (rotationSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Credential Rotated Successfully
            </h2>
            <p className="text-gray-600 mb-4">
              The credential "{credential.name}" has been rotated with new values and extended expiration.
            </p>
            <div className="text-sm text-gray-500">
              Closing automatically...
            </div>
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
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <RotateCcw className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Rotate Credential
                </h2>
                <p className="text-sm text-gray-500">
                  Update "{credential.name}" with new values
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
          {/* Expiration Warning */}
          {expirationInfo && (
            <div className={`mb-6 p-4 rounded-lg border ${
              expirationInfo.status === 'expired' 
                ? 'bg-red-50 border-red-200' 
                : expirationInfo.status === 'expiring'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center space-x-3">
                {expirationInfo.icon}
                <div>
                  <p className="font-medium text-gray-900">Credential Status</p>
                  <p className="text-sm text-gray-600">{expirationInfo.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Rotation Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <RotateCcw className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">About Credential Rotation</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Rotating a credential will update it with new values and extend its expiration date by 90 days. 
                  The old values will be immediately invalidated.
                </p>
              </div>
            </div>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          {credentialType ? (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">New Credential Values</h3>
              
              {credentialType.properties.map((property) => (
                <div key={property.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {property.displayName}
                    {property.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderPropertyInput(property)}
                  {errors[property.name] && (
                    <p className="text-sm text-red-600 mt-1">{errors[property.name]}</p>
                  )}
                  {property.description && !errors[property.name] && (
                    <p className="text-xs text-gray-500 mt-1">{property.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Loading credential type...</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={isRotating}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRotate}
            disabled={isRotating || isLoading || !credentialType}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isRotating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span>Rotate Credential</span>
          </button>
        </div>
      </div>
    </div>
  )
}
