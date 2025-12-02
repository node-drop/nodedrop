import { useReactFlow } from '@xyflow/react'
import { AlignLeft, Palette, Type } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

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
import { useWorkflowStore } from '@/stores'

interface GroupEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
}

// Predefined color palette for groups - each preset includes background and border
const GROUP_COLOR_PRESETS = [
  { name: 'Blue', background: '#dbeafe', border: '#3b82f6' },
  { name: 'Green', background: '#d1fae5', border: '#10b981' },
  { name: 'Purple', background: '#ede9fe', border: '#8b5cf6' },
  { name: 'Pink', background: '#fce7f3', border: '#ec4899' },
  { name: 'Orange', background: '#ffedd5', border: '#f97316' },
  { name: 'Red', background: '#fee2e2', border: '#ef4444' },
  { name: 'Yellow', background: '#fef9c3', border: '#eab308' },
  { name: 'Teal', background: '#ccfbf1', border: '#14b8a6' },
  { name: 'Indigo', background: '#e0e7ff', border: '#6366f1' },
  { name: 'Gray', background: '#f3f4f6', border: '#6b7280' },
]

export function GroupEditDialog({ open, onOpenChange, groupId }: GroupEditDialogProps) {
  const { getNode } = useReactFlow()
  const { updateNode, workflow, saveToHistory, setDirty } = useWorkflowStore()
  
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customBackgroundColor, setCustomBackgroundColor] = useState('')
  const [customBorderColor, setCustomBorderColor] = useState('')

  // Load current group data when dialog opens
  useEffect(() => {
    if (open && groupId) {
      const node = getNode(groupId)
      const workflowNode = workflow?.nodes.find(n => n.id === groupId)
      
      if (workflowNode) {
        setGroupName(workflowNode.name || '')
        setGroupDescription(workflowNode.description || '')
        
        const bgColor = node?.style?.backgroundColor || workflowNode.style?.backgroundColor
        const borderColor = node?.style?.borderColor || workflowNode.style?.borderColor
        
        // Check if colors match a preset
        if (bgColor && borderColor) {
          const matchedPreset = GROUP_COLOR_PRESETS.find(
            p => p.background === bgColor && p.border === borderColor
          )
          if (matchedPreset) {
            setSelectedPreset(matchedPreset.name)
            setCustomBackgroundColor('')
            setCustomBorderColor('')
          } else {
            // Custom colors
            setSelectedPreset(null)
            setCustomBackgroundColor(bgColor)
            setCustomBorderColor(borderColor)
          }
        } else {
          // Only one or no colors set
          setSelectedPreset(null)
          setCustomBackgroundColor(bgColor || '')
          setCustomBorderColor(borderColor || '')
        }
      }
    }
  }, [open, groupId, getNode, workflow])

  const handleSave = useCallback(() => {
    if (!groupId) return

    // Take snapshot for undo/redo
    saveToHistory('Edit group properties')

    const workflowNode = workflow?.nodes.find(n => n.id === groupId)
    if (!workflowNode) return

    // Determine colors based on preset or custom
    let backgroundColor: string | undefined
    let borderColor: string | undefined

    if (selectedPreset) {
      // Use preset colors
      const preset = GROUP_COLOR_PRESETS.find(p => p.name === selectedPreset)
      if (preset) {
        backgroundColor = preset.background
        borderColor = preset.border
      }
    } else {
      // Use custom colors
      backgroundColor = customBackgroundColor || undefined
      borderColor = customBorderColor || undefined
    }

    // Update the node with new properties
    const updates = {
      name: groupName,
      description: groupDescription || undefined,
      style: {
        ...workflowNode.style,
        backgroundColor,
        borderColor,
      },
    };
    
    console.log('📝 GroupEditDialog - Updating node:', groupId);
    console.log('📝 GroupEditDialog - Name:', groupName);
    console.log('📝 GroupEditDialog - Description:', groupDescription);
    console.log('📝 GroupEditDialog - Updates object:', updates);
    
    updateNode(groupId, updates)

    setDirty(true)
    onOpenChange(false)
  }, [groupId, groupName, groupDescription, selectedPreset, customBackgroundColor, customBorderColor, workflow, updateNode, saveToHistory, setDirty, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>
            Customize the group's name and appearance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Group Name
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>

          {/* Group Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description" className="flex items-center gap-2">
              <AlignLeft className="h-4 w-4" />
              Description
            </Label>
            <Textarea
              id="group-description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Add a description for this group (optional)"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Describe the purpose or contents of this group
            </p>
          </div>

          {/* Color Presets */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color Presets
            </Label>
            <p className="text-xs text-muted-foreground">
              Choose a preset with matching background and border colors
            </p>
            
            {/* Predefined Presets - show background with border */}
            <div className="grid grid-cols-5 gap-2">
              {GROUP_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.name)
                    setCustomBackgroundColor('')
                    setCustomBorderColor('')
                  }}
                  className={`
                    h-8 rounded border-2 transition-all relative
                    ${selectedPreset === preset.name 
                      ? 'ring-2 ring-primary ring-offset-1' 
                      : 'hover:ring-1 hover:ring-gray-300'
                    }
                  `}
                  style={{ 
                    backgroundColor: preset.background,
                    borderColor: preset.border
                  }}
                  title={preset.name}
                >
                  <span className="sr-only">{preset.name}</span>
                  {selectedPreset === preset.name && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Clear Preset Button */}
            {selectedPreset && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedPreset(null)}
                className="w-full"
              >
                Clear Preset
              </Button>
            )}
          </div>

          {/* Custom Colors Section */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Custom Colors
            </Label>
            <p className="text-xs text-muted-foreground">
              Or set custom background and border colors individually
            </p>

            {/* Custom Background Color */}
            <div className="space-y-2">
              <Label htmlFor="custom-bg-color" className="text-sm font-normal">
                Background Color
              </Label>
              <div className="flex gap-2">
                <Input
                  id="custom-bg-color"
                  type="text"
                  value={customBackgroundColor}
                  onChange={(e) => {
                    setCustomBackgroundColor(e.target.value)
                    setSelectedPreset(null)
                  }}
                  placeholder="#hexcode or rgb()"
                  className="font-mono text-sm"
                />
                <input
                  type="color"
                  value={customBackgroundColor || '#dbeafe'}
                  onChange={(e) => {
                    setCustomBackgroundColor(e.target.value)
                    setSelectedPreset(null)
                  }}
                  className="w-12 h-10 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Custom Border Color */}
            <div className="space-y-2">
              <Label htmlFor="custom-border-color" className="text-sm font-normal">
                Border Color
              </Label>
              <div className="flex gap-2">
                <Input
                  id="custom-border-color"
                  type="text"
                  value={customBorderColor}
                  onChange={(e) => {
                    setCustomBorderColor(e.target.value)
                    setSelectedPreset(null)
                  }}
                  placeholder="#hexcode or rgb()"
                  className="font-mono text-sm"
                />
                <input
                  type="color"
                  value={customBorderColor || '#3b82f6'}
                  onChange={(e) => {
                    setCustomBorderColor(e.target.value)
                    setSelectedPreset(null)
                  }}
                  className="w-12 h-10 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Clear Custom Colors Button */}
            {(customBackgroundColor || customBorderColor) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomBackgroundColor('')
                  setCustomBorderColor('')
                }}
                className="w-full"
              >
                Clear Custom Colors
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
