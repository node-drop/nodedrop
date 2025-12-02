import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CustomNode } from '@/components/workflow/CustomNode'
import { NodeProps } from '@xyflow/react'

import { vi } from 'vitest'

// Mock React Flow components
vi.mock('reactflow', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom'
  }
}))

const mockNodeProps: NodeProps = {
  id: 'test-node',
  data: {
    label: 'Test Node',
    nodeType: 'http-request',
    parameters: { method: 'GET', url: 'https://api.example.com' },
    disabled: false,
    status: 'idle'
  },
  selected: false,
  type: 'custom',
  dragging: false,
  isConnectable: true,
  zIndex: 1,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0
}

describe('CustomNode', () => {
  it('should render node with label and type', () => {
    render(<CustomNode {...mockNodeProps} />)
    
    expect(screen.getByText('Test Node')).toBeInTheDocument()
    expect(screen.getByText('http-request')).toBeInTheDocument()
  })

  it('should render input and output handles', () => {
    render(<CustomNode {...mockNodeProps} />)
    
    expect(screen.getByTestId('handle-target-left')).toBeInTheDocument()
    expect(screen.getByTestId('handle-source-right')).toBeInTheDocument()
  })

  it('should show selected state', () => {
    const selectedProps = { ...mockNodeProps, selected: true }
    const { container } = render(<CustomNode {...selectedProps} />)
    
    const nodeElement = container.querySelector('.bg-blue-50.border-blue-500')
    expect(nodeElement).toBeInTheDocument()
  })

  it('should show disabled state', () => {
    const disabledProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, disabled: true }
    }
    const { container } = render(<CustomNode {...disabledProps} />)
    
    const nodeElement = container.querySelector('.opacity-60')
    expect(nodeElement).toBeInTheDocument()
    
    // Check for pause icon (two rectangles)
    const pauseIcon = container.querySelector('svg rect')
    expect(pauseIcon).toBeInTheDocument()
  })

  it('should show running status', () => {
    const runningProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, status: 'running' as const }
    }
    const { container } = render(<CustomNode {...runningProps} />)
    
    // Check for play icon (polygon)
    const playIcon = container.querySelector('svg polygon')
    expect(playIcon).toBeInTheDocument()
    const nodeElement = container.querySelector('.bg-blue-50.border-blue-300')
    expect(nodeElement).toBeInTheDocument()
  })

  it('should show success status', () => {
    const successProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, status: 'success' as const }
    }
    const { container } = render(<CustomNode {...successProps} />)
    
    // Check for check-circle icon (has both path and circle elements)
    const checkIcon = container.querySelector('svg path')
    expect(checkIcon).toBeInTheDocument()
    const nodeElement = container.querySelector('.bg-green-50.border-green-300')
    expect(nodeElement).toBeInTheDocument()
  })

  it('should show error status', () => {
    const errorProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, status: 'error' as const }
    }
    const { container } = render(<CustomNode {...errorProps} />)
    
    // Check for alert-circle icon (has circle and line elements)
    const alertIcon = container.querySelector('svg circle')
    expect(alertIcon).toBeInTheDocument()
    const nodeElement = container.querySelector('.bg-red-50.border-red-300')
    expect(nodeElement).toBeInTheDocument()
  })

  it('should use custom color when provided', () => {
    const colorProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, color: '#ff0000' }
    }
    const { container } = render(<CustomNode {...colorProps} />)
    
    const iconElement = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]')
    expect(iconElement).toBeInTheDocument()
  })

  it('should use first letter of nodeType as fallback icon', () => {
    render(<CustomNode {...mockNodeProps} />)
    
    expect(screen.getByText('H')).toBeInTheDocument() // First letter of 'http-request'
  })

  it('should show custom icon when provided', () => {
    const iconProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, icon: 'ðŸŒ' }
    }
    render(<CustomNode {...iconProps} />)
    
    expect(screen.getByText('ðŸŒ')).toBeInTheDocument()
  })
})
