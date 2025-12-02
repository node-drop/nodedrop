import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NodeDocumentation } from '@/components/node/NodeDocumentation'

const mockNodeType = {
  type: 'httpRequest',
  displayName: 'HTTP Request',
  name: 'httpRequest',
  group: ['http', 'api'],
  version: 2,
  description: 'Make HTTP requests to any URL',
  defaults: { method: 'GET', timeout: 30000 },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Method',
      name: 'method',
      type: 'options' as const,
      required: true,
      default: 'GET',
      description: 'HTTP method to use',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' }
      ]
    },
    {
      displayName: 'URL',
      name: 'url',
      type: 'string' as const,
      required: true,
      description: 'The URL to make the request to'
    },
    {
      displayName: 'Headers',
      name: 'headers',
      type: 'json' as const,
      required: false,
      default: {},
      description: 'Headers to send with the request'
    }
  ],
  credentials: [
    {
      name: 'httpBasicAuth',
      displayName: 'HTTP Basic Auth',
      description: 'Basic authentication credentials',
      required: false
    }
  ]
}

describe('NodeDocumentation', () => {
  it('should render node documentation with overview expanded by default', () => {
    render(<NodeDocumentation nodeType={mockNodeType} />)

    expect(screen.getByText('Node Documentation')).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Make HTTP requests to any URL')).toBeInTheDocument()
    expect(screen.getByText('Version:')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Group:')).toBeInTheDocument()
    expect(screen.getByText('http, api')).toBeInTheDocument()
  })

  it('should show inputs and outputs in overview', () => {
    render(<NodeDocumentation nodeType={mockNodeType} />)

    expect(screen.getByText('Inputs:')).toBeInTheDocument()
    expect(screen.getAllByText('main')).toHaveLength(2) // One for inputs, one for outputs
    expect(screen.getByText('Outputs:')).toBeInTheDocument()
  })

  it('should expand and collapse sections when clicked', () => {
    render(<NodeDocumentation nodeType={mockNodeType} />)

    // Properties section should be collapsed initially
    expect(screen.queryByText('Method')).not.toBeInTheDocument()

    // Click to expand properties
    fireEvent.click(screen.getByText('Properties'))

    expect(screen.getByText('Method')).toBeInTheDocument()
    expect(screen.getByText('URL')).toBeInTheDocument()
    expect(screen.getByText('Headers')).toBeInTheDocument()

    // Click to collapse properties
    fireEvent.click(screen.getByText('Properties'))

    expect(screen.queryByText('Method')).not.toBeInTheDocument()
  })

  it('should display property details correctly', () => {
    render(<NodeDocumentation nodeType={mockNodeType} />)

    // Expand properties section
    fireEvent.click(screen.getByText('Properties'))

    // Check Method property
    expect(screen.getByText('Method')).toBeInTheDocument()
    expect(screen.getByText('HTTP method to use')).toBeInTheDocument()
    expect(screen.getByText('options: GET | POST | PUT')).toBeInTheDocument()
    expect(screen.getAllByText('Parameter name:')).toHaveLength(3) // One for each property
    expect(screen.getAllByText('method')).toHaveLength(1)

    // Check required indicator
    const requiredIndicators = screen.getAllByText('*')
    expect(requiredIndicators.length).toBeGreaterThan(0)

    // Check default value (appears for properties that have defaults)
    expect(screen.getAllByText('Default value:').length).toBeGreaterThan(0)
    expect(screen.getByText('"GET"')).toBeInTheDocument()

    // Check available options
    expect(screen.getAllByText('Available options:').length).toBeGreaterThan(0)
    expect(screen.getAllByText('GET').length).toBeGreaterThan(0)
    expect(screen.getAllByText('POST').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PUT').length).toBeGreaterThan(0)
  })

  it('should display credentials section', () => {
    render(<NodeDocumentation nodeType={mockNodeType} />)

    // Expand credentials section
    fireEvent.click(screen.getByText('Credentials'))

    expect(screen.getByText('HTTP Basic Auth')).toBeInTheDocument()
    expect(screen.getByText('Basic authentication credentials')).toBeInTheDocument()
    expect(screen.getByText('Type:')).toBeInTheDocument()
    expect(screen.getByText('httpBasicAuth')).toBeInTheDocument()
  })

  it('should show message when no credentials are required', () => {
    const nodeTypeWithoutCredentials = {
      ...mockNodeType,
      credentials: []
    }

    render(<NodeDocumentation nodeType={nodeTypeWithoutCredentials} />)

    // Expand credentials section
    fireEvent.click(screen.getByText('Credentials'))

    expect(screen.getByText('This node does not require credentials.')).toBeInTheDocument()
  })

  it('should show message when no properties exist', () => {
    const nodeTypeWithoutProperties = {
      ...mockNodeType,
      properties: []
    }

    render(<NodeDocumentation nodeType={nodeTypeWithoutProperties} />)

    // Expand properties section
    fireEvent.click(screen.getByText('Properties'))

    expect(screen.getByText('This node has no configurable properties.')).toBeInTheDocument()
  })

  it('should display examples section with basic configuration', () => {
    render(<NodeDocumentation nodeType={mockNodeType} />)

    // Expand examples section
    fireEvent.click(screen.getByText('Examples'))

    expect(screen.getByText('Basic Configuration')).toBeInTheDocument()
    expect(screen.getByText('Example Parameters')).toBeInTheDocument()

    // Check that JSON examples are displayed
    const codeBlocks = screen.getAllByRole('generic')
    const hasJsonContent = codeBlocks.some(block => 
      block.textContent?.includes('"type": "httpRequest"') ||
      block.textContent?.includes('"method": "GET"')
    )
    expect(hasJsonContent).toBe(true)
  })

  it('should handle different property types correctly', () => {
    render(<NodeDocumentation nodeType={mockNodeType} />)

    // Expand properties section
    fireEvent.click(screen.getByText('Properties'))

    // Check string type
    expect(screen.getByText('string')).toBeInTheDocument()

    // Check options type
    expect(screen.getByText('options: GET | POST | PUT')).toBeInTheDocument()

    // Check json type
    expect(screen.getByText('json')).toBeInTheDocument()
  })
})
