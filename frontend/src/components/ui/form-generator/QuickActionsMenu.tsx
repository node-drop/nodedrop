import type { QuickAction } from '@/data/quickActions'
import { quickActions, searchQuickActions } from '@/data/quickActions'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface QuickActionsMenuProps {
  visible: boolean
  query: string // The text after / (e.g., "date", "arr/map")
  position: { top: number; left: number }
  onSelect: (action: QuickAction) => void
  onClose: () => void
  selectedIndex: number
}

export function QuickActionsMenu({
  visible,
  query,
  position,
  onSelect,
  onClose,
  selectedIndex,
}: QuickActionsMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [actions, setActions] = useState<QuickAction[]>([])

  // Search for matching actions
  useEffect(() => {
    if (query) {
      const results = searchQuickActions(query)
      setActions(results.slice(0, 10)) // Limit to 10 results
    } else {
      // Show top-level actions when no query
      setActions(quickActions)
    }
  }, [query])

  // Close on click outside
  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [visible, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (visible && containerRef.current) {
      const selectedElement = containerRef.current.querySelector('[data-selected="true"]')
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [visible, selectedIndex])

  if (!visible || actions.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-full max-w-md max-h-96 overflow-y-auto bg-background border rounded-md shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 border-b bg-muted/50">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <span>⚡</span>
          <span>Quick Actions</span>
          {query && <span className="text-primary">/{query}</span>}
        </div>
      </div>
      
      <div className="py-1">
        {actions.map((action, index) => {
          const hasChildren = action.children && action.children.length > 0
          
          return (
            <button
              key={action.trigger}
              type="button"
              data-selected={index === selectedIndex}
              onClick={() => onSelect(action)}
              className={cn(
                'w-full px-3 py-2.5 text-left flex items-start gap-3 hover:bg-muted transition-colors',
                index === selectedIndex && 'bg-muted'
              )}
            >
              {/* Icon */}
              <div className="text-lg mt-0.5 flex-shrink-0">
                {action.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{action.label}</span>
                  {hasChildren && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {action.description}
                </div>
                
                <code className="text-xs text-primary/80 mt-1 block">
                  {action.trigger}
                </code>
                
                {action.example && (
                  <div className="text-xs text-muted-foreground mt-1 italic">
                    Example: {action.example}
                  </div>
                )}
              </div>
              
              {/* Keyboard hint */}
              {index === selectedIndex && (
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 bg-muted-foreground/10 rounded text-xs">
                    ↵
                  </kbd>
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Footer hint */}
      <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-background rounded">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-background rounded">↵</kbd> Select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-background rounded">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  )
}
