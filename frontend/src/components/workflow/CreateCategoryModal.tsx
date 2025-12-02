import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useGlobalToast } from '@/hooks/useToast'
import { workflowService } from '@/services/workflow'
import { FolderOpen } from 'lucide-react'
import React, { useState } from 'react'

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCategoryCreated: (categoryName: string) => void
}

const colorOptions = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Gray', value: '#6B7280' },
]

const iconOptions = ['📁', '⚡', '🔗', '📊', '💬', '🎯', '⚙️', '🚀', '🔥', '✨']

export function CreateCategoryModal({ 
  isOpen, 
  onClose, 
  onCategoryCreated 
}: CreateCategoryModalProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState('#6B7280')
  const [selectedIcon, setSelectedIcon] = useState('📁')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showSuccess, showError } = useGlobalToast()

  const handleCreate = async () => {
    if (!name.trim() || !displayName.trim()) return

    try {
      setIsCreating(true)
      setError(null)
      
      const categoryData = {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        icon: selectedIcon,
      }

      await workflowService.createCategory(categoryData)
      onCategoryCreated(categoryData.name)
      
      // Show success toast
      showSuccess('Category created successfully', {
        message: `"${categoryData.displayName}" category has been created.`
      })
      
      handleClose()
    } catch (error: any) {
      console.error('Failed to create category:', error)
      const errorMessage = error.response?.data?.error?.message || 'Failed to create category'
      setError(errorMessage)
      
      // Show error toast
      showError('Failed to create category', {
        message: errorMessage,
        duration: 8000
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDisplayName('')
    setDescription('')
    setSelectedColor('#6B7280')
    setSelectedIcon('📁')
    setError(null)
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && displayName.trim()) {
      handleCreate()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
          <DialogDescription>
            Create a new category to organize your workflows.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              Category Name *
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))
              }}
              onKeyPress={handleKeyPress}
              placeholder="Enter category name"
              autoFocus
            />
          </div>

          {/* Technical Name (auto-generated) */}
          <div className="space-y-2">
            <Label htmlFor="technicalName">
              Technical Name (auto-generated)
            </Label>
            <Input
              id="technicalName"
              value={name}
              readOnly
              className="bg-muted"
              placeholder="technical-name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe this category (optional)"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value 
                      ? 'border-ring scale-110' 
                      : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-8 h-8 rounded-md border transition-all flex items-center justify-center ${
                    selectedIcon === icon 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/50'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
              <span className="text-lg">{selectedIcon}</span>
              <span 
                className="px-2 py-1 rounded text-white text-sm font-medium"
                style={{ backgroundColor: selectedColor }}
              >
                {displayName || 'Category Name'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !displayName.trim()}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <FolderOpen className="w-4 h-4 mr-2" />
                Create Category
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
