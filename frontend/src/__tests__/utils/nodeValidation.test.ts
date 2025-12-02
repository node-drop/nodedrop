import { describe, it, expect } from 'vitest'
import { NodeValidator } from '@/utils/nodeValidation'
import { WorkflowNode, NodeProperty } from '@/types'

const mockNode: WorkflowNode = {
  id: 'node-1',
  type: 'httpRequest',
  name: 'HTTP Request',
  parameters: {
    method: 'GET',
    url: 'https://api.example.com',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  },
  position: { x: 100, y: 100 },
  credentials: [],
  disabled: false
}

const mockProperties: NodeProperty[] = [
  {
    displayName: 'Method',
    name: 'method',
    type: 'options',
    required: true,
    options: [
      { name: 'GET', value: 'GET' },
      { name: 'POST', value: 'POST' }
    ]
  },
  {
    displayName: 'URL',
    name: 'url',
    type: 'string',
    required: true
  },
  {
    displayName: 'Timeout',
    name: 'timeout',
    type: 'number',
    required: false,
    default: 30000
  },
  {
    displayName: 'Headers',
    name: 'headers',
    type: 'json',
    required: false
  },
  {
    displayName: 'Enable SSL',
    name: 'ssl',
    type: 'boolean',
    required: false
  }
]

describe('NodeValidator', () => {
  describe('validateNode', () => {
    it('should validate a valid node successfully', () => {
      const result = NodeValidator.validateNode(mockNode, mockProperties)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation when node name is empty', () => {
      const nodeWithoutName = { ...mockNode, name: '' }
      const result = NodeValidator.validateNode(nodeWithoutName, mockProperties)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('name')
      expect(result.errors[0].message).toBe('Node name is required')
      expect(result.errors[0].type).toBe('required')
    })

    it('should fail validation when required property is missing', () => {
      const nodeWithoutUrl = {
        ...mockNode,
        parameters: { ...mockNode.parameters, url: undefined }
      }
      const result = NodeValidator.validateNode(nodeWithoutUrl, mockProperties)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'url' && e.type === 'required')).toBe(true)
    })

    it('should fail validation when required property is empty string', () => {
      const nodeWithEmptyUrl = {
        ...mockNode,
        parameters: { ...mockNode.parameters, url: '' }
      }
      const result = NodeValidator.validateNode(nodeWithEmptyUrl, mockProperties)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'url' && e.type === 'required')).toBe(true)
    })
  })

  describe('validateProperty', () => {
    it('should validate string property correctly', () => {
      const property: NodeProperty = {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        required: true
      }

      const validErrors = NodeValidator.validateProperty(property, 'https://api.example.com')
      expect(validErrors).toHaveLength(0)

      const invalidErrors = NodeValidator.validateProperty(property, 123)
      expect(invalidErrors).toHaveLength(1)
      expect(invalidErrors[0].type).toBe('invalid')
    })

    it('should validate number property correctly', () => {
      const property: NodeProperty = {
        displayName: 'Timeout',
        name: 'timeout',
        type: 'number',
        required: true
      }

      const validErrors = NodeValidator.validateProperty(property, 30000)
      expect(validErrors).toHaveLength(0)

      const invalidErrors = NodeValidator.validateProperty(property, 'not-a-number')
      expect(invalidErrors).toHaveLength(1)
      expect(invalidErrors[0].type).toBe('invalid')

      const nanErrors = NodeValidator.validateProperty(property, NaN)
      expect(nanErrors).toHaveLength(1)
      expect(nanErrors[0].type).toBe('invalid')
    })

    it('should validate boolean property correctly', () => {
      const property: NodeProperty = {
        displayName: 'Enable SSL',
        name: 'ssl',
        type: 'boolean',
        required: true
      }

      const validErrors = NodeValidator.validateProperty(property, true)
      expect(validErrors).toHaveLength(0)

      const invalidErrors = NodeValidator.validateProperty(property, 'true')
      expect(invalidErrors).toHaveLength(1)
      expect(invalidErrors[0].type).toBe('invalid')
    })

    it('should validate options property correctly', () => {
      const property: NodeProperty = {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        required: true,
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' }
        ]
      }

      const validErrors = NodeValidator.validateProperty(property, 'GET')
      expect(validErrors).toHaveLength(0)

      const invalidErrors = NodeValidator.validateProperty(property, 'DELETE')
      expect(invalidErrors).toHaveLength(1)
      expect(invalidErrors[0].type).toBe('invalid')
      expect(invalidErrors[0].message).toContain('GET, POST')
    })

    it('should validate multiOptions property correctly', () => {
      const property: NodeProperty = {
        displayName: 'Methods',
        name: 'methods',
        type: 'multiOptions',
        required: true,
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' }
        ]
      }

      const validErrors = NodeValidator.validateProperty(property, ['GET', 'POST'])
      expect(validErrors).toHaveLength(0)

      const notArrayErrors = NodeValidator.validateProperty(property, 'GET')
      expect(notArrayErrors).toHaveLength(1)
      expect(notArrayErrors[0].type).toBe('invalid')

      const invalidValueErrors = NodeValidator.validateProperty(property, ['GET', 'DELETE'])
      expect(invalidValueErrors).toHaveLength(1)
      expect(invalidValueErrors[0].type).toBe('invalid')
      expect(invalidValueErrors[0].message).toContain('DELETE')
    })

    it('should validate JSON property correctly', () => {
      const property: NodeProperty = {
        displayName: 'Headers',
        name: 'headers',
        type: 'json',
        required: false
      }

      const validErrors = NodeValidator.validateProperty(property, '{"key": "value"}')
      expect(validErrors).toHaveLength(0)

      const invalidErrors = NodeValidator.validateProperty(property, '{invalid json}')
      expect(invalidErrors).toHaveLength(1)
      expect(invalidErrors[0].type).toBe('format')
    })

    it('should validate dateTime property correctly', () => {
      const property: NodeProperty = {
        displayName: 'Schedule',
        name: 'schedule',
        type: 'dateTime',
        required: false
      }

      const validErrors = NodeValidator.validateProperty(property, '2023-12-01T10:00:00')
      expect(validErrors).toHaveLength(0)

      const invalidErrors = NodeValidator.validateProperty(property, 'not-a-date')
      expect(invalidErrors).toHaveLength(1)
      expect(invalidErrors[0].type).toBe('format')
    })

    it('should skip validation for optional empty properties', () => {
      const property: NodeProperty = {
        displayName: 'Optional Field',
        name: 'optional',
        type: 'string',
        required: false
      }

      const emptyStringErrors = NodeValidator.validateProperty(property, '')
      expect(emptyStringErrors).toHaveLength(0)

      const nullErrors = NodeValidator.validateProperty(property, null)
      expect(nullErrors).toHaveLength(0)

      const undefinedErrors = NodeValidator.validateProperty(property, undefined)
      expect(undefinedErrors).toHaveLength(0)
    })
  })

  describe('utility methods', () => {
    it('should get field error correctly', () => {
      const errors = [
        { field: 'url', message: 'URL is required', type: 'required' as const },
        { field: 'method', message: 'Invalid method', type: 'invalid' as const }
      ]

      expect(NodeValidator.getFieldError(errors, 'url')).toBe('URL is required')
      expect(NodeValidator.getFieldError(errors, 'method')).toBe('Invalid method')
      expect(NodeValidator.getFieldError(errors, 'nonexistent')).toBeUndefined()
    })

    it('should check if field has error correctly', () => {
      const errors = [
        { field: 'url', message: 'URL is required', type: 'required' as const }
      ]

      expect(NodeValidator.hasFieldError(errors, 'url')).toBe(true)
      expect(NodeValidator.hasFieldError(errors, 'method')).toBe(false)
    })

    it('should group errors by type correctly', () => {
      const errors = [
        { field: 'url', message: 'URL is required', type: 'required' as const },
        { field: 'method', message: 'Invalid method', type: 'invalid' as const },
        { field: 'name', message: 'Name is required', type: 'required' as const }
      ]

      const grouped = NodeValidator.groupErrorsByType(errors)

      expect(grouped.required).toHaveLength(2)
      expect(grouped.invalid).toHaveLength(1)
      expect(grouped.required[0].field).toBe('url')
      expect(grouped.required[1].field).toBe('name')
      expect(grouped.invalid[0].field).toBe('method')
    })
  })
})
