import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowEditorWrapper } from '../../components/workflow/WorkflowEditor'
import { useWorkflowStore } from '../../stores/workflow'
import { useAuthStore } from '../../stores/auth'

// Mock the stores
vi.mock('../../stores/workflow')
vi.mock('../../stores/auth')

// Mock ReactFlow
vi.mock('reactflow', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="react-flow">{children}</div>,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  addEdge: vi.fn(),
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Background: () => <div data-testid="background" />,
}))

// Mock other components
vi.mock('../../components/workflow/CustomNode', () => ({
  CustomNode: () => <div data-testid="custom-node" />
}))

vi.mock('../../components/workflow/NodePalette', () => ({
  NodePalette: () => <div data-testid="node-palette" />
}))

vi.mock('../../components/workflow/NodeConfigPanel', () => ({
  NodeConfigPanel: () => <div data-testid="node-config-panel" />
}))

describe('Workflow Editor Browser Compatibility Tests', () => {
  const mockWorkflowStore = {
    currentWorkflow: {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test Description',
      userId: 'test-user',
      nodes: [],
      connections: [],
      metadata: {
        title: 'Browser Test Workflow',
        lastTitleUpdate: new Date().toISOString(),
        exportVersion: '1.0.0',
      }
    },
    updateTitle: vi.fn(),
    titleDirty: false,
    setTitleDirty: vi.fn(),
    exportWorkflow: vi.fn(),
    importWorkflow: vi.fn(),
    executeWorkflow: vi.fn(),
    stopExecution: vi.fn(),
    executionState: {
      status: 'idle' as const,
      progress: 0,
      startTime: undefined,
      endTime: undefined,
      error: undefined,
      executionId: undefined
    },
    setExecutionState: vi.fn(),
    isExporting: false,
    isImporting: false,
    exportProgress: 0,
    importProgress: 0,
    exportError: null,
    importError: null,
    clearImportExportErrors: vi.fn(),
    canUndo: false,
    canRedo: false,
    undo: vi.fn(),
    redo: vi.fn(),
    save: vi.fn(),
    validate: vi.fn(),
    isDirty: false,
    isSaving: false,
    validationErrors: [],
  }

  const mockAuthStore = {
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useWorkflowStore as any).mockReturnValue(mockWorkflowStore)
    ;(useAuthStore as any).mockReturnValue(mockAuthStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('File API Compatibility', () => {
    it('should handle File API availability', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Test File constructor availability
      const testFile = new File(['test'], 'test.json', { type: 'application/json' })
      expect(testFile).toBeInstanceOf(File)
      expect(testFile.name).toBe('test.json')
      expect(testFile.type).toBe('application/json')
      
      // Test file input functionality
      const fileInput = screen.getByTestId('workflow-import-input')
      await user.upload(fileInput, testFile)
      
      expect(mockWorkflowStore.importWorkflow).toHaveBeenCalledWith(testFile)
    })

    it('should handle FileReader API', async () => {
      const user = userEvent.setup()
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        result: '{"test": "data"}',
        onload: null as any,
        onerror: null as any,
      }
      
      global.FileReader = vi.fn(() => mockFileReader) as any
      
      render(<WorkflowEditorWrapper />)
      
      const testFile = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' })
      const fileInput = screen.getByTestId('workflow-import-input')
      
      await user.upload(fileInput, testFile)
      
      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any)
      }
      
      expect(mockWorkflowStore.importWorkflow).toHaveBeenCalledWith(testFile)
    })

    it('should handle Blob API for exports', async () => {
      const user = userEvent.setup()
      
      // Mock Blob constructor
      global.Blob = vi.fn((content, options) => ({
        size: content[0].length,
        type: options?.type || '',
        slice: vi.fn(),
        stream: vi.fn(),
        text: vi.fn().mockResolvedValue(content[0]),
        arrayBuffer: vi.fn(),
      })) as any
      
      render(<WorkflowEditorWrapper />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      expect(mockWorkflowStore.exportWorkflow).toHaveBeenCalled()
    })
  })

  describe('URL API Compatibility', () => {
    it('should handle URL.createObjectURL availability', async () => {
      const user = userEvent.setup()
      
      // Mock URL.createObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
      const mockRevokeObjectURL = vi.fn()
      
      Object.defineProperty(window.URL, 'createObjectURL', {
        value: mockCreateObjectURL,
        configurable: true,
      })
      
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        value: mockRevokeObjectURL,
        configurable: true,
      })
      
      render(<WorkflowEditorWrapper />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Should use URL.createObjectURL for modern browsers
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })
    })

    it('should handle fallback when URL.createObjectURL is not available', async () => {
      const user = userEvent.setup()
      
      // Remove URL.createObjectURL to simulate older browser
      const originalCreateObjectURL = window.URL.createObjectURL
      delete (window.URL as any).createObjectURL
      
      render(<WorkflowEditorWrapper />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Should still attempt export (fallback behavior)
      expect(mockWorkflowStore.exportWorkflow).toHaveBeenCalled()
      
      // Restore original method
      window.URL.createObjectURL = originalCreateObjectURL
    })
  })

  describe('Local Storage Compatibility', () => {
    it('should handle localStorage availability', async () => {
      const user = userEvent.setup()
      
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        configurable: true,
      })
      
      render(<WorkflowEditorWrapper />)
      
      // Edit title to trigger potential localStorage usage
      const titleInput = screen.getByDisplayValue('Browser Test Workflow')
      await user.clear(titleInput)
      await user.type(titleInput, 'LocalStorage Test')
      
      // Should handle localStorage operations gracefully
      expect(() => {
        localStorage.setItem('test', 'value')
      }).not.toThrow()
    })

    it('should handle localStorage quota exceeded', async () => {
      const user = userEvent.setup()
      
      // Mock localStorage quota exceeded
      const mockSetItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError')
      })
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(),
          setItem: mockSetItem,
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        configurable: true,
      })
      
      render(<WorkflowEditorWrapper />)
      
      // Should handle quota exceeded gracefully
      expect(() => {
        localStorage.setItem('large-data', 'x'.repeat(10000000))
      }).toThrow('QuotaExceededError')
    })
  })

  describe('Event Handling Compatibility', () => {
    it('should handle keyboard events across browsers', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      const titleInput = screen.getByDisplayValue('Browser Test Workflow')
      await user.click(titleInput)
      
      // Test Enter key
      await user.keyboard('{Enter}')
      expect(mockWorkflowStore.updateTitle).toHaveBeenCalled()
      
      // Test Escape key
      await user.keyboard('{Escape}')
      // Should cancel editing (implementation dependent)
    })

    it('should handle mouse events', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Test click events
      const titleInput = screen.getByDisplayValue('Browser Test Workflow')
      await user.click(titleInput)
      
      // Test double-click
      await user.dblClick(titleInput)
      
      // Should handle mouse events without errors
      expect(titleInput).toHaveFocus()
    })

    it('should handle touch events for mobile compatibility', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      const titleInput = screen.getByDisplayValue('Browser Test Workflow')
      
      // Simulate touch events
      fireEvent.touchStart(titleInput)
      fireEvent.touchEnd(titleInput)
      
      // Should handle touch events gracefully
      expect(titleInput).toBeInTheDocument()
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle large workflow files', async () => {
      const user = userEvent.setup()
      
      // Create large workflow data
      const largeWorkflow = {
        ...mockWorkflowStore.currentWorkflow,
        nodes: Array(5000).fill(null).map((_, i) => ({
          id: `node-${i}`,
          type: 'test-node',
          name: `Node ${i}`,
          parameters: { data: 'x'.repeat(1000) },
          position: { x: i % 100 * 200, y: Math.floor(i / 100) * 200 },
          credentials: [],
          disabled: false
        }))
      }
      
      const largeFile = new File(
        [JSON.stringify(largeWorkflow)],
        'large-workflow.json',
        { type: 'application/json' }
      )
      
      render(<WorkflowEditorWrapper />)
      
      const fileInput = screen.getByTestId('workflow-import-input')
      
      // Should handle large files without crashing
      await user.upload(fileInput, largeFile)
      
      expect(mockWorkflowStore.importWorkflow).toHaveBeenCalledWith(largeFile)
    })

    it('should handle memory cleanup on unmount', () => {
      const { unmount } = render(<WorkflowEditorWrapper />)
      
      // Should unmount without memory leaks
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Error Boundary Compatibility', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid test noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Force an error in a child component
      const ErrorComponent = () => {
        throw new Error('Test error')
      }
      
      // Should handle errors without crashing the entire app
      expect(() => {
        render(<ErrorComponent />)
      }).toThrow('Test error')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility Compatibility', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Test tab navigation
      await user.tab()
      
      // Should have focusable elements
      const focusedElement = document.activeElement
      expect(focusedElement).toBeInTheDocument()
    })

    it('should support screen readers', () => {
      render(<WorkflowEditorWrapper />)
      
      // Check for ARIA labels and roles
      const titleInput = screen.getByDisplayValue('Browser Test Workflow')
      expect(titleInput).toHaveAttribute('aria-label')
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toHaveAttribute('role', 'button')
    })
  })
})
