import { cn } from '@/lib/utils'
import { Code2, Database, Variable } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface AutocompleteItem {
  type: 'variable' | 'function' | 'property'
  label: string
  value: string
  description?: string
  example?: string // Example usage
  icon?: React.ReactNode
  category?: string // Optional category for grouping
}

interface ExpressionAutocompleteProps {
  visible: boolean
  items: AutocompleteItem[]
  position: { top: number; left: number }
  onSelect: (item: AutocompleteItem) => void
  onClose: () => void
  selectedIndex: number
}

export function ExpressionAutocomplete({
  visible,
  items,
  position,
  onSelect,
  onClose,
  selectedIndex,
}: ExpressionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredItem, setHoveredItem] = useState<AutocompleteItem | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

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

  if (!visible || items.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'variable':
        return <Variable className="h-4 w-4 text-blue-500" />
      case 'function':
        return <Code2 className="h-4 w-4 text-purple-500" />
      case 'property':
        return <Database className="h-4 w-4 text-green-500" />
      default:
        return <Code2 className="h-4 w-4 text-gray-500" />
    }
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, AutocompleteItem[]>)

  // Define category order for consistent display
  // Dynamic input node categories will appear first, followed by standard categories
  const standardCategories = [
    'Variables',
    'Variables (Global)',
    'Variables (Local)',
    'JSON Data',
    'Item Data',
    'Node Data',
    'Workflow Data',
    'Date & Time',
    'String Functions',
    'Array Functions',
    'Math Functions',
    'Utility Functions',
    'Other',
  ]

  // Sort categories: input nodes first (those ending with "(input)"), then standard ones
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const aIsInputNode = a.endsWith('(input)')
    const bIsInputNode = b.endsWith('(input)')
    
    // Both are input nodes: alphabetical order
    if (aIsInputNode && bIsInputNode) return a.localeCompare(b)
    
    // Only a is input node: a comes first
    if (aIsInputNode) return -1
    
    // Only b is input node: b comes first
    if (bIsInputNode) return 1
    
    // Both are standard categories: use predefined order
    const indexA = standardCategories.indexOf(a)
    const indexB = standardCategories.indexOf(b)
    
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Calculate flat index for keyboard navigation
  let flatIndex = 0

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-full max-h-96 overflow-y-auto bg-background border rounded-md shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="py-1">
        {sortedCategories.map((category) => (
          <div key={category} className="mb-2 last:mb-0">
            {/* Category Header */}
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 sticky top-0 z-10">
              {category}
            </div>
            
            {/* Category Items */}
            {groupedItems[category].map((item) => {
              const currentIndex = flatIndex++
              const isHovered = hoveredItem === item
              
              return (
                <div key={`${item.type}-${item.value}-${currentIndex}`} className="relative">
                  <button
                    type="button"
                    data-selected={currentIndex === selectedIndex}
                    onClick={() => onSelect(item)}
                    onMouseEnter={(e) => {
                      setHoveredItem(item)
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltipPosition({ top: rect.top, left: rect.right + 8 })
                    }}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      'w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-muted transition-colors',
                      currentIndex === selectedIndex && 'bg-muted'
                    )}
                  >
                    <div className="mt-0.5">{item.icon || getIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                      )}
                      <code className="text-xs text-blue-600 dark:text-blue-400">{item.value}</code>
                    </div>
                  </button>
                  
                  {/* Enhanced tooltip on hover */}
                  {isHovered && item.example && (
                    <div
                      className="fixed z-[60] bg-popover border rounded-md shadow-lg p-3 max-w-xs"
                      style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
                    >
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase">Example</div>
                          <code className="text-xs text-foreground block mt-1 p-2 bg-muted rounded">
                            {item.example}
                          </code>
                        </div>
                        {item.description && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase">Description</div>
                            <p className="text-xs text-foreground mt-1">{item.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Common expression variables and functions
export const defaultAutocompleteItems: AutocompleteItem[] = [
  // JSON data access
  {
    type: 'variable',
    label: 'JSON Data',
    value: 'json',
    description: 'Access all input data',
    example: '{{json}} → { "name": "John", "age": 30 }',
    category: 'JSON Data',
  },
  {
    type: 'property',
    label: 'Field from JSON',
    value: 'json.fieldName',
    description: 'Access a specific field',
    example: '{{json.email}} → "john@example.com"',
    category: 'JSON Data',
  },
  {
    type: 'property',
    label: 'Nested Field',
    value: 'json.parent.child',
    description: 'Access nested properties',
    example: '{{json.user.address.city}} → "New York"',
    category: 'JSON Data',
  },
  {
    type: 'property',
    label: 'Array Item',
    value: 'json.items[0]',
    description: 'Access array elements',
    example: '{{json.items[0].name}} → "First Item"',
    category: 'JSON Data',
  },
  
  // Item data
  {
    type: 'variable',
    label: 'Item Index',
    value: '$item.index',
    description: 'Current item index',
    example: '{{$item.index}} → 0, 1, 2...',
    category: 'Item Data',
  },
  {
    type: 'variable',
    label: 'Item Binary',
    value: '$item.binary',
    description: 'Binary data of current item',
    example: '{{$item.binary.data}}',
    category: 'Item Data',
  },
  
  // Node data
  {
    type: 'variable',
    label: 'Node Name',
    value: '$node.name',
    description: 'Current node name',
    category: 'Node Data',
  },
  {
    type: 'variable',
    label: 'Node Type',
    value: '$node.type',
    description: 'Current node type',
    category: 'Node Data',
  },
  
  // Parameters
  {
    type: 'variable',
    label: 'Parameters',
    value: '$parameter',
    description: 'Access node parameters',
    category: 'Node Data',
  },
  
  // Workflow data
  {
    type: 'variable',
    label: 'Workflow ID',
    value: '$workflow.id',
    description: 'Current workflow ID',
    category: 'Workflow Data',
  },
  {
    type: 'variable',
    label: 'Workflow Name',
    value: '$workflow.name',
    description: 'Current workflow name',
    category: 'Workflow Data',
  },
  
  // Date & Time functions
  {
    type: 'function',
    label: 'Current Date',
    value: '$now',
    description: 'Current date and time',
    example: '{{$now}} → "2025-10-13T12:30:45.000Z"',
    category: 'Date & Time',
  },
  {
    type: 'function',
    label: 'Today',
    value: '$today',
    description: "Today's date",
    example: '{{$today}} → "2025-10-13"',
    category: 'Date & Time',
  },
  
  // Utility functions
  {
    type: 'function',
    label: 'Random Number',
    value: '$randomInt(min, max)',
    description: 'Random integer',
    example: '{{$randomInt(1, 100)}} → 42',
    category: 'Utility Functions',
  },
  {
    type: 'function',
    label: 'UUID',
    value: '$uuid()',
    description: 'Generate a UUID',
    example: '{{$uuid()}} → "a1b2c3d4-..."',
    category: 'Utility Functions',
  },
  
  // String functions
  {
    type: 'function',
    label: 'Uppercase',
    value: 'json.field.toUpperCase()',
    description: 'Convert to uppercase',
    category: 'String Functions',
  },
  {
    type: 'function',
    label: 'Lowercase',
    value: 'json.field.toLowerCase()',
    description: 'Convert to lowercase',
    category: 'String Functions',
  },
  {
    type: 'function',
    label: 'Trim',
    value: 'json.field.trim()',
    description: 'Remove whitespace',
    category: 'String Functions',
  },
  {
    type: 'function',
    label: 'Split',
    value: 'json.field.split(",")',
    description: 'Split string',
    category: 'String Functions',
  },
  
  // Array functions
  {
    type: 'function',
    label: 'Array Length',
    value: 'json.array.length',
    description: 'Get array length',
    category: 'Array Functions',
  },
  {
    type: 'function',
    label: 'Join Array',
    value: 'json.array.join(",")',
    description: 'Join array elements',
    category: 'Array Functions',
  },
  {
    type: 'function',
    label: 'First Item',
    value: 'json.array[0]',
    description: 'Get first item',
    category: 'Array Functions',
  },
  {
    type: 'function',
    label: 'Last Item',
    value: 'json.array[json.array.length - 1]',
    description: 'Get last item',
    category: 'Array Functions',
  },
  
  // Math functions
  {
    type: 'function',
    label: 'Math Round',
    value: 'Math.round(json.value)',
    description: 'Round number',
    category: 'Math Functions',
  },
  {
    type: 'function',
    label: 'Math Floor',
    value: 'Math.floor(json.value)',
    description: 'Round down',
    category: 'Math Functions',
  },
  {
    type: 'function',
    label: 'Math Ceil',
    value: 'Math.ceil(json.value)',
    description: 'Round up',
    category: 'Math Functions',
  },
]
