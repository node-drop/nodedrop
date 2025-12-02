import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NodePalette } from '@/components/workflow/NodePalette'
import { NodeType } from '@/types'

const mockNodeTypes: NodeType[] = [
  {
    type: 'http-request',
    displayName: 'HTTP Request',
    name: 'httpRequest',
    group: ['Core'],
    version: 1,
    description: 'Make HTTP requests to external APIs',
    defaults: { method: 'GET', url: '' },
    inputs: ['main'],
    outputs: ['main'],
    color: '#4F46E5',
    properties: []
  },
  {
    type: 'json-transform',
    displayName: 'JSON Transform',
    name: 'jsonTransform',
    group: ['Core'],
    version: 1,
    description: 'Transform JSON data using JavaScript expressions',
    defaults: { expression: 'return items;' },
    inputs: ['main'],
    outputs: ['main'],
    color: '#059669',
    properties: []
  },
  {
    type: 'webhook-trigger',
    displayName: 'Webhook Trigger',
    name: 'webhookTrigger',
    group: ['Triggers'],
    version: 1,
    description: 'Trigger workflow via webhook',
    defaults: { path: '/webhook' },
    inputs: [],
    outputs: ['main'],
    color: '#7C3AED',
    properties: []
  }
]

const mockOnNodeDragStart = vi.fn()

describe('NodePalette', () => {
  beforeEach(() => {
    mockOnNodeDragStart.mockClear()
  })

  it('should render node palette with search input', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    expect(screen.getByText('Nodes')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
  })

  it('should group nodes by category', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    expect(screen.getByText('Core')).toBeInTheDocument()
    expect(screen.getByText('Triggers')).toBeInTheDocument()
  })

  it('should show node count for each category', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    // Core category should have 2 nodes
    const coreCategory = screen.getByText('Core').closest('button')
    expect(coreCategory).toBeInTheDocument()
    expect(coreCategory?.textContent).toContain('2')
    
    // Triggers category should have 1 node
    const triggersCategory = screen.getByText('Triggers').closest('button')
    expect(triggersCategory).toBeInTheDocument()
    expect(triggersCategory?.textContent).toContain('1')
  })

  it('should expand/collapse categories when clicked', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    // Core category should be expanded by default
    expect(screen.getByText('HTTP Request')).toBeInTheDocument()
    expect(screen.getByText('JSON Transform')).toBeInTheDocument()
    
    // Triggers category should be collapsed by default
    expect(screen.queryByText('Webhook Trigger')).not.toBeInTheDocument()
    
    // Click to expand Triggers category
    fireEvent.click(screen.getByText('Triggers'))
    expect(screen.getByText('Webhook Trigger')).toBeInTheDocument()
    
    // Click to collapse Core category
    fireEvent.click(screen.getByText('Core'))
    expect(screen.queryByText('HTTP Request')).not.toBeInTheDocument()
    expect(screen.queryByText('JSON Transform')).not.toBeInTheDocument()
  })

  it('should filter nodes based on search term', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    const searchInput = screen.getByPlaceholderText('Search nodes...')
    
    // Search for 'HTTP'
    fireEvent.change(searchInput, { target: { value: 'HTTP' } })
    
    expect(screen.getByText('HTTP Request')).toBeInTheDocument()
    expect(screen.queryByText('JSON Transform')).not.toBeInTheDocument()
    expect(screen.queryByText('Webhook Trigger')).not.toBeInTheDocument()
  })

  it('should filter nodes based on description', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    const searchInput = screen.getByPlaceholderText('Search nodes...')
    
    // Search for 'webhook' (in description)
    fireEvent.change(searchInput, { target: { value: 'webhook' } })
    
    expect(screen.queryByText('HTTP Request')).not.toBeInTheDocument()
    expect(screen.queryByText('JSON Transform')).not.toBeInTheDocument()
    
    // Expand Triggers category to see the webhook trigger
    fireEvent.click(screen.getByText('Triggers'))
    expect(screen.getByText('Webhook Trigger')).toBeInTheDocument()
  })

  it('should show empty state when no nodes match search', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    const searchInput = screen.getByPlaceholderText('Search nodes...')
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    
    expect(screen.getByText('No nodes found')).toBeInTheDocument()
    expect(screen.getByText('Try a different search term')).toBeInTheDocument()
  })

  it('should handle drag start for nodes', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    const httpRequestNode = screen.getByText('HTTP Request').closest('div')
    expect(httpRequestNode).toBeInTheDocument()
    
    // Create a mock drag event using fireEvent.dragStart
    fireEvent.dragStart(httpRequestNode!, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move'
      }
    })
    
    expect(mockOnNodeDragStart).toHaveBeenCalledWith(
      expect.any(Object),
      mockNodeTypes[0]
    )
  })

  it('should display node icons and colors correctly', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    // Check if node icons are rendered with correct colors
    const nodeElements = screen.getAllByText('H') // First letter fallback
    expect(nodeElements.length).toBeGreaterThan(0)
    
    // Check if descriptions are shown
    expect(screen.getByText('Make HTTP requests to external APIs')).toBeInTheDocument()
    expect(screen.getByText('Transform JSON data using JavaScript expressions')).toBeInTheDocument()
  })

  it('should make nodes draggable', () => {
    render(<NodePalette nodeTypes={mockNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    // Find the draggable node container (should be the parent div with draggable attribute)
    const draggableNode = screen.getByText('HTTP Request').closest('[draggable="true"]')
    expect(draggableNode).toBeInTheDocument()
    expect(draggableNode).toHaveAttribute('draggable', 'true')
  })

  it('should sort nodes alphabetically within categories', () => {
    const unsortedNodeTypes = [
      {
        ...mockNodeTypes[1], // JSON Transform
        displayName: 'Z Last Node'
      },
      {
        ...mockNodeTypes[0], // HTTP Request
        displayName: 'A First Node'
      }
    ]
    
    render(<NodePalette nodeTypes={unsortedNodeTypes} onNodeDragStart={mockOnNodeDragStart} />)
    
    const nodeTexts = screen.getAllByText(/^[AZ]/).map(el => el.textContent)
    expect(nodeTexts.indexOf('A First Node')).toBeLessThan(nodeTexts.indexOf('Z Last Node'))
  })
})
