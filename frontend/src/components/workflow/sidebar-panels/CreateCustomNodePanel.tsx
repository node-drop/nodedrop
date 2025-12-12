import { useState, useMemo, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { WorkflowNode, WorkflowConnection } from '@/types'
import { detectVariablesInNodes, detectCredentialsInNodes } from '@/utils/templateVariables'
import { Variable, Key, PackagePlus, X } from 'lucide-react'

interface CreateCustomNodePanelProps {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  onCreateCustomNode: (data: {
    name: string
    displayName: string
    description: string
    icon?: string
    color?: string
    group?: string[]
  }) => Promise<void>
  onClose: () => void
}

export const CreateCustomNodePanel = memo(function CreateCustomNodePanel({
  nodes,
  onCreateCustomNode,
  onClose,
}: CreateCustomNodePanelProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState('#6366f1')
  
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['Custom Nodes'])
  const [newGroup, setNewGroup] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)





  // Detect variables in the selected nodes
  const detectedVariables = useMemo(() => {
    return Array.from(detectVariablesInNodes(nodes))
  }, [nodes])

  // Detect credentials in the selected nodes
  const nodesWithCredentials = useMemo(() => {
    return Array.from(detectCredentialsInNodes(nodes))
  }, [nodes])



  const handleAddGroup = () => {
    if (newGroup.trim() && !selectedGroups.includes(newGroup.trim())) {
      setSelectedGroups([...selectedGroups, newGroup.trim()])
      setNewGroup('')
    }
  }

  const handleRemoveGroup = (group: string) => {
    setSelectedGroups(selectedGroups.filter(g => g !== group))
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!name.trim() || !displayName.trim() || !description.trim()) {
      setError('Please fill in all required fields')
      return
    }
    
    // Validate node name format
    const typeName = name.trim().toLowerCase().replace(/\s+/g, '-')
    if (!/^[a-z0-9-]+$/.test(typeName)) {
      setError('Node name must contain only lowercase letters, numbers, and hyphens')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onCreateCustomNode({
        name: typeName,
        displayName: displayName.trim(),
        description: description.trim(),
        icon: icon || '📦',
        color: color || '#6366f1',
        group: selectedGroups.length > 0 ? selectedGroups : ['Custom Nodes'],
      })
      
      // Close panel on success
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create custom node')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <PackagePlus className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Select nodes to create a custom node
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <PackagePlus className="w-4 h-4" />
            Create Custom Node
          </h3>
          <p className="text-xs text-muted-foreground">
            Create a reusable custom node from {nodes.length} selected node{nodes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-name" className="text-xs font-medium">
              Node Name *
            </Label>
            <Input
              id="node-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., my-custom-node"
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier (lowercase, no spaces)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-display-name" className="text-xs font-medium">
              Display Name *
            </Label>
            <Input
              id="node-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., My Custom Node"
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-description" className="text-xs font-medium">
              Description *
            </Label>
            <Textarea
              id="node-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this custom node does..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="node-icon" className="text-xs font-medium">
                Icon
              </Label>
              <Input
                id="node-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📦"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-color" className="text-xs font-medium">
                Color
              </Label>
              <Input
                id="node-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6366f1"
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Groups</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Organize your template into categories
          </p>
          
          {/* Add Group Input */}
          <div className="flex space-x-2">
            <Input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddGroup()
                }
              }}
              placeholder="Add a group"
              className="flex-1 h-8 text-xs"
            />
            <Button
              type="button"
              onClick={handleAddGroup}
              disabled={!newGroup.trim() || selectedGroups.includes(newGroup.trim())}
              size="sm"
              className="h-8"
            >
              Add
            </Button>
          </div>

          {/* Selected Groups */}
          {selectedGroups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedGroups.map((group) => (
                <span
                  key={group}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full"
                >
                  {group}
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(group)}
                    className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Detected Variables */}
        {detectedVariables.length > 0 && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2 text-xs font-medium">
              <Variable className="w-3.5 h-3.5" />
              Detected Variables ({detectedVariables.length})
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {detectedVariables.map((variable) => (
                <span
                  key={variable}
                  className="inline-flex items-center px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                >
                  {variable}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These variables will be configurable when using the custom node
            </p>
          </div>
        )}

        {/* Detected Credentials */}
        {nodesWithCredentials.length > 0 && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2 text-xs font-medium">
              <Key className="w-3.5 h-3.5" />
              Nodes with Credentials ({nodesWithCredentials.length})
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {nodesWithCredentials.map((nodeName) => (
                <span
                  key={nodeName}
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded"
                >
                  {nodeName}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Credentials will need to be configured when using the custom node
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2">
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Custom Node'}
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
})
