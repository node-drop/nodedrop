import { useState, useEffect } from 'react'
import { X, Shield, Plus, Edit, Trash2, Save, AlertTriangle } from 'lucide-react'
import { CredentialSecurityPolicy } from '@/types'
import { useCredentialStore } from '@/stores'

interface CredentialSecurityPoliciesModalProps {
    onClose: () => void
}

export function CredentialSecurityPoliciesModal({ onClose }: CredentialSecurityPoliciesModalProps) {
    const {
        securityPolicies,
        fetchSecurityPolicies,
        createSecurityPolicy,
        updateSecurityPolicy,
        deleteSecurityPolicy,
        isLoading
    } = useCredentialStore()

    const [editingPolicy, setEditingPolicy] = useState<CredentialSecurityPolicy | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        rules: {
            maxAge: 90,
            requireRotation: true,
            rotationInterval: 90,
            allowSharing: true,
            requireMFA: false,
            allowedIpRanges: [] as string[],
            encryptionLevel: 'standard' as 'standard' | 'high'
        }
    })
    const [ipRange, setIpRange] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchSecurityPolicies()
    }, [fetchSecurityPolicies])

    const handleEdit = (policy: CredentialSecurityPolicy) => {
        setEditingPolicy(policy)
        setFormData({
            name: policy.name,
            description: policy.description,
            rules: { ...policy.rules } as any
        })
        setIsCreating(false)
    }

    const handleCreate = () => {
        setEditingPolicy(null)
        setFormData({
            name: '',
            description: '',
            rules: {
                maxAge: 90,
                requireRotation: true,
                rotationInterval: 90,
                allowSharing: true,
                requireMFA: false,
                allowedIpRanges: [],
                encryptionLevel: 'standard'
            }
        })
        setIsCreating(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setError('Policy name is required')
            return
        }

        setError(null)
        try {
            if (editingPolicy) {
                await updateSecurityPolicy(editingPolicy.id, formData)
            } else {
                await createSecurityPolicy(formData)
            }
            setEditingPolicy(null)
            setIsCreating(false)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to save policy')
        }
    }

    const handleDelete = async (policy: CredentialSecurityPolicy) => {
        if (confirm(`Are you sure you want to delete the policy "${policy.name}"?`)) {
            try {
                await deleteSecurityPolicy(policy.id)
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to delete policy')
            }
        }
    }

    const handleCancel = () => {
        setEditingPolicy(null)
        setIsCreating(false)
        setError(null)
    }

    const addIpRange = () => {
        if (ipRange.trim() && !formData.rules.allowedIpRanges.includes(ipRange.trim())) {
            setFormData(prev => ({
                ...prev,
                rules: {
                    ...prev.rules,
                    allowedIpRanges: [...prev.rules.allowedIpRanges, ipRange.trim()]
                }
            }))
            setIpRange('')
        }
    }

    const removeIpRange = (range: string) => {
        setFormData(prev => ({
            ...prev,
            rules: {
                ...prev.rules,
                allowedIpRanges: prev.rules.allowedIpRanges.filter(r => r !== range)
            }
        }))
    }

    const renderPolicyForm = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Name *
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter policy name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter policy description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Security Rules</h4>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Age (days)
                        </label>
                        <input
                            type="number"
                            value={formData.rules.maxAge || ''}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rules: { ...prev.rules, maxAge: parseInt(e.target.value) || 0 }
                            }))}
                            placeholder="90"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rotation Interval (days)
                        </label>
                        <input
                            type="number"
                            value={formData.rules.rotationInterval || ''}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rules: { ...prev.rules, rotationInterval: parseInt(e.target.value) || 0 }
                            }))}
                            placeholder="90"
                            disabled={!formData.rules.requireRotation}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="requireRotation"
                            checked={formData.rules.requireRotation}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rules: { ...prev.rules, requireRotation: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="requireRotation" className="text-sm text-gray-700">
                            Require periodic rotation
                        </label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="allowSharing"
                            checked={formData.rules.allowSharing}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rules: { ...prev.rules, allowSharing: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="allowSharing" className="text-sm text-gray-700">
                            Allow credential sharing
                        </label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="requireMFA"
                            checked={formData.rules.requireMFA}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rules: { ...prev.rules, requireMFA: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="requireMFA" className="text-sm text-gray-700">
                            Require multi-factor authentication
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Encryption Level
                    </label>
                    <select
                        value={formData.rules.encryptionLevel}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            rules: { ...prev.rules, encryptionLevel: e.target.value as 'standard' | 'high' }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="standard">Standard (AES-256)</option>
                        <option value="high">High (AES-256 + HSM)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed IP Ranges
                    </label>
                    <div className="flex space-x-2 mb-2">
                        <input
                            type="text"
                            value={ipRange}
                            onChange={(e) => setIpRange(e.target.value)}
                            placeholder="192.168.1.0/24 or 10.0.0.1"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            onClick={addIpRange}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                    {formData.rules.allowedIpRanges.length > 0 && (
                        <div className="space-y-1">
                            {formData.rules.allowedIpRanges.map((range, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                                    <span className="text-sm text-gray-700">{range}</span>
                                    <button
                                        onClick={() => removeIpRange(range)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Shield className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Security Policies
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Manage credential security policies and compliance rules
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
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-700">{error}</span>
                            </div>
                        </div>
                    )}

                    {(isCreating || editingPolicy) ? (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                            </h3>
                            {renderPolicyForm()}
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Security Policies ({securityPolicies.length})
                                </h3>
                                <button
                                    onClick={handleCreate}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create Policy</span>
                                </button>
                            </div>

                            {securityPolicies.length === 0 ? (
                                <div className="text-center py-8">
                                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Policies</h3>
                                    <p className="text-gray-500 mb-4">
                                        Create security policies to enforce compliance rules for your credentials.
                                    </p>
                                    <button
                                        onClick={handleCreate}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Create Your First Policy
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {securityPolicies.map((policy) => (
                                        <div key={policy.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{policy.name}</h4>
                                                    <p className="text-sm text-gray-600">{policy.description}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(policy)}
                                                        className="p-1 text-blue-600 hover:text-blue-800"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(policy)}
                                                        className="p-1 text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Max Age:</span>
                                                    <span className="ml-1 text-gray-900">
                                                        {policy.rules.maxAge ? `${policy.rules.maxAge} days` : 'No limit'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Rotation:</span>
                                                    <span className="ml-1 text-gray-900">
                                                        {policy.rules.requireRotation ? 'Required' : 'Optional'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Sharing:</span>
                                                    <span className="ml-1 text-gray-900">
                                                        {policy.rules.allowSharing ? 'Allowed' : 'Disabled'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Encryption:</span>
                                                    <span className="ml-1 text-gray-900 capitalize">
                                                        {policy.rules.encryptionLevel}
                                                    </span>
                                                </div>
                                            </div>

                                            {policy.rules.allowedIpRanges && policy.rules.allowedIpRanges.length > 0 && (
                                                <div className="mt-3">
                                                    <span className="text-sm text-gray-500">Allowed IP Ranges:</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {policy.rules.allowedIpRanges.map((range, index) => (
                                                            <span
                                                                key={index}
                                                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                                            >
                                                                {range}
                                                            </span>
                                                        ))}
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
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
                    {(isCreating || editingPolicy) ? (
                        <>
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                            >
                                <Save className="w-4 h-4" />
                                <span>{editingPolicy ? 'Update' : 'Create'} Policy</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
