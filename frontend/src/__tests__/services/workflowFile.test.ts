import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorkflowFileService, workflowFileService, WorkflowExportFormat } from '../../services/workflowFile'
import { Workflow } from '../../types'

// Mock DOM APIs
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()

// Mock FileReader
class MockFileReader {
  onload: ((event: any) => void) | null = null
  onerror: (() => void) | null = null
  result: string | null = null

  readAsText(file: File) {
    // Simulate async file reading
    setTimeout(() => {
      if (this.onload) {
        this.result = (file as any).mockContent || '{"test": "content"}'
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  }
}

// Setup global mocks
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
})

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader
})

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      href: '',
      download: '',
      click: mockClick
    })),
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild
    }
  }
})

Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(public content: any[], public options: any) {}
  }
})

describe('WorkflowFileService', () => {
  let service: WorkflowFileService

  const mockWorkflow: Workflow = {
    id: 'test-workflow-id',
    name: 'Test Workflow',
    description: 'A test workflow',
    userId: 'user-123',
    nodes: [
      {
        id: 'node-1',
        type: 'start',
        name: 'Start Node',
        parameters: {},
        position: { x: 100, y: 100 },
        disabled: false
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNodeId: 'node-1',
        sourceOutput: 'output',
        targetNodeId: 'node-2',
        targetInput: 'input'
      }
    ],
    settings: {
      timezone: 'UTC',
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all'
    },
    active: true,
    tags: ['test', 'example'],
    category: 'automation',
    isTemplate: false,
    isPublic: false,
    sharedWith: [],
    metadata: {
      title: 'My Test Workflow',
      lastTitleUpdate: '2024-01-01T00:00:00.000Z',
      exportVersion: '1.0.0',
      schemaVersion: '1.0.0',
      version: 1,
      tags: [],
      customProperties: {}
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }

  beforeEach(() => {
    service = new WorkflowFileService()
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('exportWorkflow', () => {
    it('should export workflow successfully', async () => {
      await service.exportWorkflow(mockWorkflow)

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Object))
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should handle export errors', async () => {
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('Blob creation failed')
      })

      await expect(service.exportWorkflow(mockWorkflow)).rejects.toThrow(
        'Failed to export workflow: Blob creation failed'
      )
    })
  })

  describe('importWorkflow', () => {
    const createMockFile = (content: string, name = 'test.json', size = 1000): File => {
      const file = new File([content], name, { type: 'application/json' })
      Object.defineProperty(file, 'size', { value: size })
      ;(file as any).mockContent = content
      return file
    }

    const validExportData: WorkflowExportFormat = {
      version: '1.0.0',
      exportedAt: '2024-01-01T00:00:00.000Z',
      exportedBy: 'workflow-editor',
      workflow: {
        title: 'Imported Workflow',
        name: 'imported-workflow',
        description: 'An imported workflow',
        nodes: mockWorkflow.nodes,
        connections: mockWorkflow.connections,
        settings: mockWorkflow.settings,
        metadata: mockWorkflow.metadata,
        tags: ['imported'],
        category: 'test'
      },
      checksum: 'abc123'
    }

    it('should import valid workflow file', async () => {
      const file = createMockFile(JSON.stringify(validExportData))
      
      const result = await service.importWorkflow(file)

      expect(result.name).toBe('imported-workflow')
      expect(result.nodes).toEqual(mockWorkflow.nodes)
      expect(result.connections).toEqual(mockWorkflow.connections)
      expect(result.active).toBe(false) // Imported workflows start inactive
      expect(result.metadata?.importSource).toContain('Imported from file')
    })

    it('should reject invalid JSON', async () => {
      const file = createMockFile('invalid json')
      
      await expect(service.importWorkflow(file)).rejects.toThrow(
        'Failed to import workflow: Invalid workflow file: Invalid JSON format'
      )
    })

    it('should reject files that fail validation', async () => {
      const invalidData = { ...validExportData, workflow: undefined }
      const file = createMockFile(JSON.stringify(invalidData))
      
      await expect(service.importWorkflow(file)).rejects.toThrow(
        'Invalid workflow file'
      )
    })
  })

  describe('validateWorkflowFile', () => {
    const createMockFile = (content: string, name = 'test.json', size = 1000): File => {
      const file = new File([content], name, { type: 'application/json' })
      Object.defineProperty(file, 'size', { value: size })
      ;(file as any).mockContent = content
      return file
    }

    it('should validate correct workflow file', async () => {
      const validData: WorkflowExportFormat = {
        version: '1.0.0',
        exportedAt: '2024-01-01T00:00:00.000Z',
        exportedBy: 'test',
        workflow: {
          title: 'Test',
          name: 'test',
          nodes: [
            {
              id: 'node-1',
              type: 'test',
              name: 'Test Node',
              parameters: {},
              position: { x: 0, y: 0 },
              disabled: false
            }
          ],
          connections: [
            {
              id: 'conn-1',
              sourceNodeId: 'node-1',
              sourceOutput: 'out',
              targetNodeId: 'node-2',
              targetInput: 'in'
            }
          ],
          settings: {}
        },
        checksum: 'test'
      }

      const file = createMockFile(JSON.stringify(validData))
      const result = await service.validateWorkflowFile(file)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject files that are too large', async () => {
      const file = createMockFile('{}', 'large.json', 100 * 1024 * 1024) // 100MB
      
      const result = await service.validateWorkflowFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('exceeds maximum allowed size')
    })

    it('should reject unsupported file extensions', async () => {
      const file = createMockFile('{}', 'test.txt')
      
      const result = await service.validateWorkflowFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Unsupported file extension')
    })

    it('should reject invalid JSON', async () => {
      const file = createMockFile('invalid json')
      
      const result = await service.validateWorkflowFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid JSON format')
    })

    it('should validate workflow structure', async () => {
      const invalidData = {
        version: '1.0.0',
        workflow: {
          // Missing required fields
          nodes: 'not an array',
          connections: []
        }
      }

      const file = createMockFile(JSON.stringify(invalidData))
      const result = await service.validateWorkflowFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing workflow name')
      expect(result.errors).toContain('Invalid or missing nodes array')
    })

    it('should validate node structure', async () => {
      const invalidData = {
        version: '1.0.0',
        workflow: {
          name: 'test',
          nodes: [
            { /* missing required fields */ },
            { id: 'node-2', type: 'test' /* missing position */ }
          ],
          connections: []
        }
      }

      const file = createMockFile(JSON.stringify(invalidData))
      const result = await service.validateWorkflowFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Node at index 0 missing id')
      expect(result.errors).toContain('Node at index 0 missing type')
      expect(result.errors).toContain('Node at index 1 has invalid position')
    })

    it('should validate connection structure', async () => {
      const invalidData = {
        version: '1.0.0',
        workflow: {
          name: 'test',
          nodes: [],
          connections: [
            { /* missing required fields */ },
            { id: 'conn-2' /* missing source/target */ }
          ]
        }
      }

      const file = createMockFile(JSON.stringify(invalidData))
      const result = await service.validateWorkflowFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Connection at index 0 missing id')
      expect(result.errors).toContain('Connection at index 1 missing source or target node id')
    })

    it('should warn about unsupported versions', async () => {
      const data = {
        version: '2.0.0', // Unsupported version
        workflow: {
          name: 'test',
          nodes: [],
          connections: [],
          settings: {}
        }
      }

      const file = createMockFile(JSON.stringify(data))
      const result = await service.validateWorkflowFile(file)

      expect(result.warnings[0]).toContain('Unsupported version: 2.0.0')
    })
  })

  describe('generateFileName', () => {
    it('should generate filename from workflow title', () => {
      const filename = service.generateFileName(mockWorkflow)
      
      expect(filename).toMatch(/^my_test_workflow_\d{8}T\d{6}\.json$/)
    })

    it('should generate filename from workflow name when title is missing', () => {
      const workflowWithoutTitle = { ...mockWorkflow, metadata: undefined }
      const filename = service.generateFileName(workflowWithoutTitle)
      
      expect(filename).toMatch(/^test_workflow_\d{8}T\d{6}\.json$/)
    })

    it('should handle workflows without name or title', () => {
      const workflowWithoutName = { 
        ...mockWorkflow, 
        name: '', 
        metadata: undefined 
      }
      const filename = service.generateFileName(workflowWithoutName)
      
      expect(filename).toMatch(/^untitled_workflow_\d{8}T\d{6}\.json$/)
    })

    it('should sanitize invalid filename characters', () => {
      const workflowWithInvalidChars = {
        ...mockWorkflow,
        metadata: {
          ...mockWorkflow.metadata!,
          title: 'Test<>:"/\\|?*Workflow   With   Spaces'
        }
      }
      
      const filename = service.generateFileName(workflowWithInvalidChars)
      
      expect(filename).toMatch(/^test_workflow_with_spaces_\d{8}T\d{6}\.json$/)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle FileReader errors during import', async () => {
      const file = new File(['content'], 'test.json')
      
      // Create a service instance with mocked FileReader behavior
      const mockService = new WorkflowFileService()
      
      // Mock the private readFileContent method to throw an error
      vi.spyOn(mockService as any, 'readFileContent').mockRejectedValue(
        new Error('File reading failed')
      )

      await expect(mockService.importWorkflow(file)).rejects.toThrow(
        'Failed to import workflow: Invalid workflow file: File validation failed: File reading failed'
      )
    })

    it('should handle FileReader with no result', async () => {
      const file = new File(['content'], 'test.json')
      
      const mockService = new WorkflowFileService()
      
      // Mock the private readFileContent method to throw specific error
      vi.spyOn(mockService as any, 'readFileContent').mockRejectedValue(
        new Error('Failed to read file content')
      )

      await expect(mockService.importWorkflow(file)).rejects.toThrow(
        'Failed to import workflow: Invalid workflow file: File validation failed: Failed to read file content'
      )
    })

    it('should handle validation errors during file reading', async () => {
      const file = new File(['content'], 'test.json')
      
      const mockService = new WorkflowFileService()
      
      // Mock the private readFileContent method to throw error during validation
      vi.spyOn(mockService as any, 'readFileContent').mockRejectedValue(
        new Error('FileReader error')
      )

      const result = await mockService.validateWorkflowFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('File validation failed')
    })
  })
})
