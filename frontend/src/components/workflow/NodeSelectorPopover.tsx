/**
 * NodeSelectorPopover - A reusable popover component for selecting and adding nodes to the workflow
 * 
 * This component provides a searchable, categorized list of available node types that can be
 * added to the workflow. It's used throughout the application for various node insertion scenarios.
 * 
 * USAGE LOCATIONS:
 * ================
 * 
 * 1. EdgeButton (frontend/src/components/workflow/edges/EdgeButton.tsx)
 *    - Triggered by: Clicking the + button on edge connections
 *    - Purpose: Insert a node between two connected nodes
 *    - Behavior: Removes existing connection, creates two new connections through the new node
 * 
 * 2. NodeSelectorNode (frontend/src/components/workflow/nodes/NodeSelectorNode.tsx)
 *    - Triggered by: Multiple scenarios that create a temporary selector node:
 *      a) Dragging a connection to empty canvas space
 *      b) Clicking + button on a node's output handle
 *      c) Clicking + button on a node's service input handle (model, tool, memory)
 *      d) Keyboard shortcut (Ctrl/Cmd+K)
 *    - Purpose: Show node selector at a specific canvas position with connection context
 *    - Behavior: Replaces the temporary selector node with the selected node type
 * 
 * 3. useNodeActions hook (frontend/src/components/workflow/hooks/useNodeActions.ts)
 *    - Creates NodeSelectorNode instances for:
 *      - handleOutputClick: Adding nodes after a node's output
 *      - handleServiceInputClick: Adding service provider nodes (models, tools, memory)
 * 
 * 4. useReactFlowInteractions hook (frontend/src/hooks/workflow/useReactFlowInteractions.ts)
 *    - handleConnectEnd: Creates NodeSelectorNode when dragging connection to empty space
 * 
 * 5. WorkflowEditor (frontend/src/components/workflow/WorkflowEditor.tsx)
 *    - handleAddNode: Creates NodeSelectorNode at viewport center via keyboard shortcut
 * 
 * COMPONENTS:
 * ===========
 * 
 * - NodeSelectorContent: Shared content component with search and node list
 *   Used by both NodeSelectorNode (canvas-positioned) and NodeSelectorPopover (UI-positioned)
 * 
 * - NodeSelectorPopover: Wrapper component for toolbar/UI-triggered node selection
 *   Currently not actively used but available for future toolbar integration
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNodeTypes } from '@/stores'
import { NodeType } from '@/types'
import { NodeIcon } from './components/NodeIcon'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface NodeSelectorContentProps {
  onSelectNode: (nodeType: NodeType) => void
  onClose: () => void
  inputRef?: React.RefObject<HTMLInputElement>
  /** Whether to use fixed width (for connection context) or full width (for popover) */
  fixedWidth?: boolean
  /** Filter nodes based on connection context */
  filterType?: 'trigger' | 'model' | 'memory' | 'tool' | 'regular' | 'all'
}

/**
 * Shared content component for node selection - used by both NodeSelectorNode and NodeSelectorPopover
 */
export const NodeSelectorContent = memo(function NodeSelectorContent({
  onSelectNode,
  onClose,
  inputRef: externalInputRef,
  fixedWidth = true,
  filterType = 'all',
}: NodeSelectorContentProps) {
  const { activeNodeTypes, fetchNodeTypes, isLoading, hasFetched } = useNodeTypes()
  const [searchQuery, setSearchQuery] = useState('')
  const internalInputRef = useRef<HTMLInputElement>(null)
  const inputRef = externalInputRef || internalInputRef

  // Fetch node types if not loaded
  useEffect(() => {
    if (activeNodeTypes.length === 0 && !isLoading && !hasFetched) {
      fetchNodeTypes()
    }
  }, [activeNodeTypes.length, isLoading, hasFetched, fetchNodeTypes])

  // Focus input when mounted
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [inputRef])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Filter nodes based on type and search query
  const filteredNodes = useMemo(() => {
    let nodes = activeNodeTypes

    // Apply type filter
    if (filterType !== 'all') {
      nodes = nodes.filter(node => {
        switch (filterType) {
          case 'trigger':
            // Show only trigger nodes
            return node.nodeCategory === 'trigger'
          
          case 'model':
            // Show only model service nodes
            // Check if outputs contain 'model' or if it's in the model group
            return node.outputs?.some(o => o.toLowerCase().includes('model')) || 
                   node.group.some(g => g.toLowerCase() === 'models' || g.toLowerCase() === 'model')
          
          case 'memory':
            // Show only memory service nodes
            return node.outputs?.some(o => o.toLowerCase().includes('memory')) || 
                   node.group.some(g => g.toLowerCase() === 'memories' || g.toLowerCase() === 'memory')
          
          case 'tool':
            // Show only tool service nodes
            return node.outputs?.some(o => o.toLowerCase().includes('tool')) || 
                   node.group.some(g => g.toLowerCase() === 'tools' || g.toLowerCase() === 'tool')
          
          case 'regular':
            // Show regular nodes (exclude triggers and services)
            const hasServiceOutput = node.outputs?.some(o => {
              const lower = o.toLowerCase()
              return lower.includes('model') || lower.includes('memory') || lower.includes('tool') || lower.includes('service')
            })
            return node.nodeCategory !== 'trigger' && !hasServiceOutput
          
          default:
            return true
        }
      })
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      nodes = nodes.filter(
        node =>
          node.displayName.toLowerCase().includes(query) ||
          node.description?.toLowerCase().includes(query) ||
          node.group.some(g => g.toLowerCase().includes(query))
      )
    }

    return nodes.slice(0, 50)
  }, [activeNodeTypes, searchQuery, filterType])

  // Group nodes by category
  const groupedNodes = useMemo(() => {
    const groups: Record<string, NodeType[]> = {}

    filteredNodes.forEach(node => {
      const groupName = node.group[0] || 'Other'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(node)
    })

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredNodes])

  return (
    <div className={cn("flex flex-col", fixedWidth && "w-[320px]")}>
      {/* Search input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Node list */}
      <ScrollArea className="h-[300px] nodrag">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-muted-foreground">
            Loading nodes...
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-muted-foreground">
            No nodes found
          </div>
        ) : (
          <div className="p-2">
            {groupedNodes.map(([groupName, nodes]) => (
              <div key={groupName} className="mb-3">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {groupName}
                </div>
                {nodes.map(node => (
                  <button
                    key={node.identifier}
                    onClick={() => onSelectNode(node)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-md',
                      'hover:bg-accent transition-colors',
                      'text-left'
                    )}
                  >
                    <NodeIcon
                      config={{
                        icon: node.icon,
                        nodeType: node.identifier,
                        nodeGroup: node.group,
                        displayName: node.displayName,
                        color: node.color || '#6b7280',
                        isTrigger: node.nodeCategory === 'trigger',
                      }}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{node.displayName}</div>
                      {node.description && (
                        <div
                          className="text-xs text-muted-foreground"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            hyphens: 'auto'
                          }}
                        >
                          {node.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
})

interface NodeSelectorPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectNode: (nodeType: NodeType, position: { x: number; y: number }) => void
  trigger: React.ReactNode
  /** Position to place the new node (viewport center) */
  getPosition: () => { x: number; y: number }
}

/**
 * Popover version of node selector - used by toolbar button
 */
export function NodeSelectorPopover({
  open,
  onOpenChange,
  onSelectNode,
  trigger,
  getPosition,
}: NodeSelectorPopoverProps) {
  const handleSelectNode = useCallback(
    (nodeType: NodeType) => {
      const position = getPosition()
      onSelectNode(nodeType, position)
      onOpenChange(false)
    },
    [onSelectNode, onOpenChange, getPosition]
  )

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent 
        className="w-[360px] p-0" 
        align="center" 
        side="top"
        sideOffset={8}
      >
        <NodeSelectorContent onSelectNode={handleSelectNode} onClose={handleClose} fixedWidth={false} />
      </PopoverContent>
    </Popover>
  )
}
