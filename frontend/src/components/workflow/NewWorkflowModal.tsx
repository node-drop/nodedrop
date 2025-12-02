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
import { CreateWorkflowRequest } from '@/services/workflow'
import { Plus, Tag, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { CategorySelect } from './CategorySelect'

interface NewWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateWorkflow: (data: CreateWorkflowRequest) => void
}

export function NewWorkflowModal({ 
  isOpen, 
  onClose, 
  onCreateWorkflow 
}: NewWorkflowModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setCategory('')
      setTags([])
      setNewTag('')
    }
  }, [isOpen])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleCreate = async () => {
    if (!name.trim()) return

    try {
      setIsCreating(true)
      const workflowData: CreateWorkflowRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        tags
      }
      await onCreateWorkflow(workflowData)
      onClose()
    } catch (error) {
      console.error('Failed to create workflow:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.currentTarget === document.activeElement && (e.target as HTMLElement).tagName === 'INPUT') {
        const input = e.target as HTMLInputElement
        if (input.placeholder === 'Add a tag') {
          handleAddTag()
        }
      }
    }
  }

  if (!isOpen) return null

  return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Set up your new workflow with a name, description, and organize it with categories and tags.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="workflowName">
              Workflow Name *
            </Label>
            <Input
              id="workflowName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workflow name"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="workflowDescription">
              Description
            </Label>
            <Textarea
              id="workflowDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this workflow will do"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect
              value={category}
              onValueChange={setCategory}
              placeholder="Select a category (optional)"
              allowCreate={true}
              showDeleteOption={true}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            
            {/* Tag Input */}
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a tag"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim() || tags.includes(newTag.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>

            {/* Existing Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </>
            )}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}
