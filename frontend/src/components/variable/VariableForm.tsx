import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { variableService } from '@/services'
import { CreateVariableRequest, UpdateVariableRequest, Variable } from '@/types'
import { AlertCircle, Eye, EyeOff, Save, X } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface VariableFormProps {
  variable?: Variable // If provided, we're editing; otherwise, we're creating
  onSuccess: () => void
  onCancel: () => void
  workflowId?: string // For creating local variables
  defaultScope?: 'GLOBAL' | 'LOCAL' // Optional, will use smart default if not provided
}

export function VariableForm({ 
  variable, 
  onSuccess, 
  onCancel, 
  workflowId,
  defaultScope
}: VariableFormProps) {
  // Smart default: use LOCAL if we have workflowId, otherwise GLOBAL
  const smartDefaultScope = defaultScope || (workflowId ? 'LOCAL' : 'GLOBAL')
  
  const [formData, setFormData] = useState({
    key: variable?.key || '',
    value: variable?.value || '',
    description: variable?.description || '',
    scope: variable?.scope || smartDefaultScope,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showValue, setShowValue] = useState(false)

  const isEditing = !!variable

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validate key
    if (!formData.key.trim()) {
      newErrors.key = 'Variable key is required'
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(formData.key)) {
      newErrors.key = 'Key must start with a letter or underscore and contain only letters, numbers, underscores, and dots'
    } else if (formData.key.length > 100) {
      newErrors.key = 'Key must be 100 characters or less'
    }

    // Validate value
    if (formData.value.length > 10000) {
      newErrors.value = 'Value must be 10,000 characters or less'
    }

    // Validate description
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      if (isEditing) {
        const updateData: UpdateVariableRequest = {
          key: formData.key !== variable.key ? formData.key : undefined,
          value: formData.value !== variable.value ? formData.value : undefined,
          description: formData.description !== (variable.description || '') ? 
            (formData.description || null) : undefined,
        }

        // Only send fields that actually changed
        const hasChanges = Object.values(updateData).some(value => value !== undefined)
        if (!hasChanges) {
          toast.info('No changes to save')
          onCancel()
          return
        }

        await variableService.updateVariable(variable.id, updateData)
        toast.success('Variable updated successfully')
      } else {
        const createData: CreateVariableRequest = {
          key: formData.key,
          value: formData.value,
          description: formData.description || undefined,
          scope: formData.scope,
          workflowId: formData.scope === 'LOCAL' ? workflowId : undefined,
        }

        await variableService.createVariable(createData)
        toast.success('Variable created successfully')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving variable:', error)
      
      // Handle specific API errors
      if (error.message.includes('already exists')) {
        setErrors({ key: 'A variable with this key already exists' })
      } else {
        toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} variable`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const getVariablePreview = () => {
    if (!formData.key.trim()) return ''
    const prefix = formData.scope === 'LOCAL' ? '$local' : '$vars'
    return `${prefix}.${formData.key}`
  }

  return (
    <div className="p-4 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Variable Key */}
        <div className="space-y-2">
          <Label htmlFor="key" className="text-sm font-medium">
            Variable Key <span className="text-red-500">*</span>
          </Label>
          <Input
            id="key"
            value={formData.key}
            onChange={(e) => handleInputChange('key', e.target.value)}
            placeholder="e.g., api_endpoint, user_id, config.timeout"
            className={errors.key ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.key && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {errors.key}
            </div>
          )}
          {formData.key && !errors.key && (
            <div className="text-xs text-muted-foreground">
              Reference in workflows: <code className="bg-muted px-1 py-0.5 rounded">
                {getVariablePreview()}
              </code>
            </div>
          )}
        </div>

        {/* Variable Scope */}
        <div className="space-y-2">
          <Label htmlFor="scope" className="text-sm font-medium">
            Variable Scope <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.scope}
            onValueChange={(value: 'GLOBAL' | 'LOCAL') => handleInputChange('scope', value)}
            disabled={isEditing || isLoading} // Cannot change scope after creation
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GLOBAL">
                <div className="flex flex-col">
                  <span className="font-medium">Global Variable</span>
                  <span className="text-xs text-muted-foreground">Available across all workflows</span>
                </div>
              </SelectItem>
              <SelectItem value="LOCAL" disabled={!workflowId && !isEditing}>
                <div className="flex flex-col">
                  <span className="font-medium">Local Variable</span>
                  <span className="text-xs text-muted-foreground">
                    {workflowId || isEditing ? 'Available only in this workflow' : 'Requires workflow context'}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {isEditing && (
            <div className="text-xs text-muted-foreground">
              Variable scope cannot be changed after creation
            </div>
          )}
        </div>

        {/* Variable Value */}
        <div className="space-y-2">
          <Label htmlFor="value" className="text-sm font-medium">
            Variable Value <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            {!showValue ? (
              <Input
                id="value"
                type="password"
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Enter the variable value..."
                className={`pr-10 ${errors.value ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            ) : (
              <Textarea
                id="value"
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Enter the variable value..."
                className={`min-h-[80px] pr-10 ${errors.value ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              onClick={() => setShowValue(!showValue)}
              disabled={isLoading}
            >
              {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
          {errors.value && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {errors.value}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {formData.value.length}/10,000 characters
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description (optional)
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe what this variable is used for..."
            className={`min-h-[60px] ${errors.description ? 'border-red-500' : ''}`}
            disabled={isLoading}
          />
          {errors.description && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {formData.description.length}/500 characters
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">💡 Variable Usage Tips:</div>
            <ul className="text-xs space-y-1 text-blue-700">
              <li>• Variables are immutable and cannot be modified within workflows</li>
              <li>• <strong>Global variables:</strong> Use <code className="bg-blue-100 px-1 rounded">$vars.keyName</code> - available across all workflows</li>
              <li>• <strong>Local variables:</strong> Use <code className="bg-blue-100 px-1 rounded">$local.keyName</code> - specific to one workflow</li>
              <li>• Keys can contain letters, numbers, underscores, and dots</li>
              <li>• Local variables override global ones with the same key in workflow context</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button
            type="submit"
            disabled={isLoading || !formData.key.trim() || !formData.value.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Variable' : 'Create Variable'}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
