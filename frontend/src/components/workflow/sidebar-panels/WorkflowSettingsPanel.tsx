import { memo, useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Database, Bug, Tag, X, FileText } from 'lucide-react'
import { WorkflowAutocomplete } from '../node-config/custom-fields/WorkflowAutocomplete'
import { useWorkflowStore } from '@/stores'

interface WorkflowSettingsPanelProps {
  readOnly?: boolean
}

export const WorkflowSettingsPanel = memo(function WorkflowSettingsPanel({
  readOnly = false
}: WorkflowSettingsPanelProps) {
  const { workflow, updateWorkflow, setDirty } = useWorkflowStore()

  // Local state for settings
  const [saveExecutionToDatabase, setSaveExecutionToDatabase] = useState(
    workflow?.settings?.saveExecutionToDatabase !== false
  )
  const [errorWorkflowId, setErrorWorkflowId] = useState(
    (workflow?.settings as any)?.errorWorkflowId || ''
  )
  const [title, setTitle] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [tags, setTags] = useState<string[]>(workflow?.tags || [])
  const [newTag, setNewTag] = useState('')

  // Update local state when workflow changes
  useEffect(() => {
    if (workflow) {
      setSaveExecutionToDatabase(workflow.settings?.saveExecutionToDatabase !== false)
      setErrorWorkflowId((workflow.settings as any)?.errorWorkflowId || '')
      setTitle(workflow.name || '')
      setDescription(workflow.description || '')
      setTags(workflow.tags || [])
    }
  }, [workflow])

  const handleSaveExecutionChange = (checked: boolean) => {
    setSaveExecutionToDatabase(checked)
    if (workflow) {
      updateWorkflow({
        settings: {
          ...workflow.settings,
          saveExecutionToDatabase: checked,
        }
      })
      setDirty(true)
    }
  }

  const handleErrorWorkflowChange = (workflowId: string) => {
    setErrorWorkflowId(workflowId)
    if (workflow) {
      updateWorkflow({
        settings: {
          ...workflow.settings,
          errorWorkflowId: workflowId || undefined,
        }
      })
      setDirty(true)
    }
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (workflow) {
      updateWorkflow({
        name: value,
      })
      setDirty(true)
    }
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    if (workflow) {
      updateWorkflow({
        description: value,
      })
      setDirty(true)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()]
      setTags(updatedTags)
      setNewTag('')
      if (workflow) {
        updateWorkflow({
          tags: updatedTags,
        })
        setDirty(true)
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove)
    setTags(updatedTags)
    if (workflow) {
      updateWorkflow({
        tags: updatedTags,
      })
      setDirty(true)
    }
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No workflow loaded
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 overflow-auto">
          <div className="p-4 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Workflow Settings</h3>
              <p className="text-xs text-muted-foreground">
                Configure workflow behavior and metadata
              </p>
            </div>

            {/* Save Execution Setting */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="sidebar-save-execution" className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Database className="w-3.5 h-3.5" />
                    Save Execution History
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Store execution data in database. Disable for high-traffic APIs to improve performance.
                  </p>
                </div>
                <Switch
                  id="sidebar-save-execution"
                  checked={saveExecutionToDatabase}
                  onCheckedChange={handleSaveExecutionChange}
                  disabled={readOnly}
                  className="flex-shrink-0"
                />
              </div>
            </div>

            {/* Error Workflow Setting */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-medium">
                  <Bug className="w-3.5 h-3.5" />
                  Error Workflow
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a workflow to execute when this workflow fails. The error workflow will receive details about the failure.
                </p>
                <WorkflowAutocomplete
                  value={errorWorkflowId}
                  onChange={handleErrorWorkflowChange}
                  disabled={readOnly}
                  refreshable={false}
                />
              </div>
            </div>

            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="sidebar-title" className="text-xs font-medium">
                Workflow Name *
              </Label>
              <Input
                id="sidebar-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter workflow name"
                disabled={readOnly}
                className="text-xs"
              />
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="sidebar-description" className="flex items-center gap-2 text-xs font-medium">
                <FileText className="w-3.5 h-3.5" />
                Description
              </Label>
              <Textarea
                id="sidebar-description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Describe what this workflow does"
                rows={4}
                disabled={readOnly}
                className="text-xs resize-none"
              />
            </div>

            {/* Tags Field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <Tag className="w-3.5 h-3.5" />
                Tags
              </Label>
              
              {/* Tag Input */}
              {!readOnly && (
                <div className="flex space-x-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    placeholder="Add a tag"
                    className="flex-1 h-8 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTag.trim() || tags.includes(newTag.trim())}
                    className="px-3 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Existing Tags */}
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full"
                    >
                      {tag}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No tags added yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
