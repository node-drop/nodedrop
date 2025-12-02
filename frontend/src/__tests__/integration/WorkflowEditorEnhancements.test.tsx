import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowEditorWrapper } from '../../components/workflow/WorkflowEditor'
import { useWorkflowStore } from '../../stores/workflow'
import { useAuthStore } from '../../stores/auth'
import { workflowFileService } from '../../services/workflowFile'
import { Workflow } from '../../types'

// Mock the stores
vi.mock('../../stores/workflow')
vi.mock('../../stores/auth')
vi.mock('../../services/workflowFile')

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

// Mock other components to focus on integration behavior
vi.mock('../../components/workflow/CustomNode', () => ({
  CustomNode: () => <div data-testid="custom-node" />
}))

vi.mock('../../components/workflow/NodePalette', () => ({
  NodePalette: () => <div data-testid="node-palette" />
}))

vi.mock('../../components/workflow/NodeConfigPanel', () => ({
  NodeConfigPanel: () => <div data-testid="node-config-panel" />
}))

// Mock services
vi.mock('../../services', () => ({
  workflowService: {
    executeWorkflow: vi.fn(),
    stopExecution: vi.fn(),
    getExecutionStatus: vi.fn(),
  }
}))

// Mock File API for browser compatibility tests
const mockFile = (name: string, content: string, type: string = 'application/json') => {
  const file = new File([content], name, { type })
  return file
}

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-blob-url'),
})

Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: vi.fn(),
})

// Mock download functionality
const mockDownload = vi.fn()
Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName: string) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click: mockDownload,
        style: { display: '' },
      }
    }
    return document.createElement(tagName)
  }),
})

describe('Workflow Editor Enhancements Integration Tests', () => {
  const mockWorkflowStore = {
    currentWorkflow: {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test Description',
      userId: 'test-user',
      nodes: [],
      connections: [],
      metadata: {
        title: 'Test Workflow Title',
        lastTitleUpdate: new Date().toISOString(),
        exportVersion: '1.0.0',
      }
    } as Workflow,
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
    // Other required store methods
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
    ;(workflowFileService.exportWorkflow as any).mockResolvedValue(undefined)
    ;(workflowFileService.importWorkflow as any).mockResolvedValue(mockWorkflowStore.currentWorkflow)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Title Save/Load Workflow Integration', () => {
    it('should handle complete title save workflow', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Find the title input (should be rendered by TitleManager in WorkflowToolbar)
      const titleInput = screen.getByDisplayValue('Test Workflow Title')
      expect(titleInput).toBeInTheDocument()
      
      // Click to edit title
      await user.click(titleInput)
      
      // Clear and type new title
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Workflow Title')
      
      // Verify title dirty state is set
      expect(mockWorkflowStore.setTitleDirty).toHaveBeenCalledWith(true)
      
      // Press Enter to save
      await user.keyboard('{Enter}')
      
      // Verify title update was called
      expect(mockWorkflowStore.updateTitle).toHaveBeenCalledWith('Updated Workflow Title')
    })

    it('should handle title load on workflow change', async () => {
      const { rerender } = render(<WorkflowEditorWrapper />)
      
      // Verify initial title is displayed
      expect(screen.getByDisplayValue('Test Workflow Title')).toBeInTheDocument()
      
      // Update the workflow with new title
      const updatedWorkflow = {
        ...mockWorkflowStore.currentWorkflow,
        metadata: {
          ...mockWorkflowStore.currentWorkflow.metadata!,
          title: 'New Loaded Title'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue({
        ...mockWorkflowStore,
        currentWorkflow: updatedWorkflow
      })
      
      // Re-render to simulate workflow change
      rerender(<WorkflowEditorWrapper />)
      
      // Verify new title is displayed
      expect(screen.getByDisplayValue('New Loaded Title')).toBeInTheDocument()
    })

    it('should show default placeholder when no title is set', async () => {
      const workflowWithoutTitle = {
        ...mockWorkflowStore.currentWorkflow,
        metadata: {
          ...mockWorkflowStore.currentWorkflow.metadata!,
          title: ''
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue({
        ...mockWorkflowStore,
        currentWorkflow: workflowWithoutTitle
      })
      
      render(<WorkflowEditorWrapper />)
      
      // Should show placeholder
      const titleInput = screen.getByPlaceholderText('Untitled Workflow')
      expect(titleInput).toBeInTheDocument()
    })
  })

  describe('Import/Export Round-trip Integration', () => {
    it('should handle complete export workflow', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Find and click export button
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Verify export was called
      expect(mockWorkflowStore.exportWorkflow).toHaveBeenCalled()
      
      // Verify file service was called
      await waitFor(() => {
        expect(workflowFileService.exportWorkflow).toHaveBeenCalledWith(
          mockWorkflowStore.currentWorkflow
        )
      })
    })

    it('should handle complete import workflow', async () => {
      const user = userEvent.setup()
      const mockWorkflowFile = mockFile(
        'test-workflow.json',
        JSON.stringify({
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'test-user',
          workflow: mockWorkflowStore.currentWorkflow,
          checksum: 'mock-checksum'
        })
      )
      
      render(<WorkflowEditorWrapper />)
      
      // Find file input (should be hidden but accessible)
      const fileInput = screen.getByTestId('workflow-import-input')
      
      // Simulate file selection
      await user.upload(fileInput, mockWorkflowFile)
      
      // Verify import was called
      expect(mockWorkflowStore.importWorkflow).toHaveBeenCalledWith(mockWorkflowFile)
      
      // Verify file service was called
      await waitFor(() => {
        expect(workflowFileService.importWorkflow).toHaveBeenCalledWith(mockWorkflowFile)
      })
    })

    it('should handle import/export round-trip', async () => {
      const user = userEvent.setup()
      
      // Mock export to return workflow data
      const exportedData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: 'test-user',
        workflow: mockWorkflowStore.currentWorkflow,
        checksum: 'mock-checksum'
      }
      
      ;(workflowFileService.exportWorkflow as any).mockResolvedValue(exportedData)
      
      render(<WorkflowEditorWrapper />)
      
      // Export workflow
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(workflowFileService.exportWorkflow).toHaveBeenCalled()
      })
      
      // Create file from exported data
      const exportedFile = mockFile(
        'exported-workflow.json',
        JSON.stringify(exportedData)
      )
      
      // Import the exported file
      const fileInput = screen.getByTestId('workflow-import-input')
      await user.upload(fileInput, exportedFile)
      
      // Verify round-trip completed
      await waitFor(() => {
        expect(workflowFileService.importWorkflow).toHaveBeenCalledWith(exportedFile)
      })
    })
  }) 
 describe('Execution Workflow Integration', () => {
    it('should handle complete execution workflow', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Find and click execute button
      const executeButton = screen.getByRole('button', { name: /execute/i })
      await user.click(executeButton)
      
      // Verify execution was started
      expect(mockWorkflowStore.executeWorkflow).toHaveBeenCalled()
      
      // Simulate execution progress
      const executingStore = {
        ...mockWorkflowStore,
        executionState: {
          status: 'running' as const,
          progress: 50,
          startTime: Date.now(),
          endTime: undefined,
          error: undefined,
          executionId: 'exec-123'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(executingStore)
      
      // Re-render to show execution state
      const { rerender } = render(<WorkflowEditorWrapper />)
      rerender(<WorkflowEditorWrapper />)
      
      // Verify execute button is disabled during execution
      const disabledExecuteButton = screen.getByRole('button', { name: /execute/i })
      expect(disabledExecuteButton).toBeDisabled()
      
      // Verify progress is shown
      expect(screen.getByText(/running/i)).toBeInTheDocument()
    })

    it('should handle execution stop functionality', async () => {
      const user = userEvent.setup()
      
      // Start with executing state
      const executingStore = {
        ...mockWorkflowStore,
        executionState: {
          status: 'running' as const,
          progress: 30,
          startTime: Date.now(),
          endTime: undefined,
          error: undefined,
          executionId: 'exec-123'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(executingStore)
      
      render(<WorkflowEditorWrapper />)
      
      // Find and click stop button
      const stopButton = screen.getByRole('button', { name: /stop/i })
      await user.click(stopButton)
      
      // Verify stop execution was called
      expect(mockWorkflowStore.stopExecution).toHaveBeenCalled()
    })

    it('should handle execution success state', async () => {
      const successStore = {
        ...mockWorkflowStore,
        executionState: {
          status: 'success' as const,
          progress: 100,
          startTime: Date.now() - 5000,
          endTime: Date.now(),
          error: undefined,
          executionId: 'exec-123'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(successStore)
      
      render(<WorkflowEditorWrapper />)
      
      // Verify success state is displayed
      expect(screen.getByText(/success/i)).toBeInTheDocument()
      
      // Verify execute button is re-enabled
      const executeButton = screen.getByRole('button', { name: /execute/i })
      expect(executeButton).not.toBeDisabled()
    })

    it('should handle execution error state', async () => {
      const errorStore = {
        ...mockWorkflowStore,
        executionState: {
          status: 'error' as const,
          progress: 0,
          startTime: Date.now() - 2000,
          endTime: Date.now(),
          error: 'Execution failed: Network timeout',
          executionId: 'exec-123'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(errorStore)
      
      render(<WorkflowEditorWrapper />)
      
      // Verify error state is displayed
      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByText(/Network timeout/i)).toBeInTheDocument()
      
      // Verify execute button is re-enabled
      const executeButton = screen.getByRole('button', { name: /execute/i })
      expect(executeButton).not.toBeDisabled()
    })
  })

  describe('Error Recovery and User Feedback Integration', () => {
    it('should handle title validation errors', async () => {
      const user = userEvent.setup()
      
      const storeWithTitleError = {
        ...mockWorkflowStore,
        titleValidationError: 'Title cannot be empty'
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithTitleError)
      
      render(<WorkflowEditorWrapper />)
      
      // Verify error message is displayed
      expect(screen.getByText('Title cannot be empty')).toBeInTheDocument()
      
      // Try to save with invalid title
      const titleInput = screen.getByDisplayValue('Test Workflow Title')
      await user.clear(titleInput)
      await user.keyboard('{Enter}')
      
      // Verify title update was not called due to validation error
      expect(mockWorkflowStore.updateTitle).not.toHaveBeenCalled()
    })

    it('should handle export errors with user feedback', async () => {
      const user = userEvent.setup()
      
      const storeWithExportError = {
        ...mockWorkflowStore,
        exportError: 'Failed to export workflow: File system error'
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithExportError)
      
      render(<WorkflowEditorWrapper />)
      
      // Verify export error is displayed
      expect(screen.getByText(/Failed to export workflow/i)).toBeInTheDocument()
      
      // Find and click clear error button
      const clearErrorButton = screen.getByRole('button', { name: /clear error/i })
      await user.click(clearErrorButton)
      
      // Verify clear errors was called
      expect(mockWorkflowStore.clearImportExportErrors).toHaveBeenCalled()
    })

    it('should handle import errors with user feedback', async () => {
      const user = userEvent.setup()
      
      const storeWithImportError = {
        ...mockWorkflowStore,
        importError: 'Invalid workflow file format'
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithImportError)
      
      render(<WorkflowEditorWrapper />)
      
      // Verify import error is displayed
      expect(screen.getByText(/Invalid workflow file format/i)).toBeInTheDocument()
      
      // Find and click clear error button
      const clearErrorButton = screen.getByRole('button', { name: /clear error/i })
      await user.click(clearErrorButton)
      
      // Verify clear errors was called
      expect(mockWorkflowStore.clearImportExportErrors).toHaveBeenCalled()
    })

    it('should handle import confirmation dialog', async () => {
      const user = userEvent.setup()
      
      const storeWithDirtyWorkflow = {
        ...mockWorkflowStore,
        isDirty: true
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithDirtyWorkflow)
      
      render(<WorkflowEditorWrapper />)
      
      // Try to import a file
      const mockWorkflowFile = mockFile('test.json', '{"workflow": {}}')
      const fileInput = screen.getByTestId('workflow-import-input')
      
      await user.upload(fileInput, mockWorkflowFile)
      
      // Should show confirmation dialog for unsaved changes
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      
      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)
      
      // Verify import proceeded
      expect(mockWorkflowStore.importWorkflow).toHaveBeenCalledWith(mockWorkflowFile)
    })

    it('should handle progress indicators during operations', async () => {
      const user = userEvent.setup()
      
      const storeWithProgress = {
        ...mockWorkflowStore,
        isExporting: true,
        exportProgress: 75
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithProgress)
      
      render(<WorkflowEditorWrapper />)
      
      // Verify progress indicator is shown
      expect(screen.getByText(/75%/)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Verify export button is disabled during export
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeDisabled()
    })
  })

  describe('Browser Compatibility Tests for File Operations', () => {
    it('should handle file download in modern browsers', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Click export button
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Verify URL.createObjectURL was called (modern browser behavior)
      await waitFor(() => {
        expect(window.URL.createObjectURL).toHaveBeenCalled()
      })
      
      // Verify download was triggered
      expect(mockDownload).toHaveBeenCalled()
    })

    it('should handle file input in all browsers', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Verify file input exists and is accessible
      const fileInput = screen.getByTestId('workflow-import-input')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', '.json')
      
      // Test file selection
      const mockFile = new File(['{}'], 'test.json', { type: 'application/json' })
      await user.upload(fileInput, mockFile)
      
      // Verify file was processed
      expect(mockWorkflowStore.importWorkflow).toHaveBeenCalledWith(mockFile)
    })

    it('should handle large file operations', async () => {
      const user = userEvent.setup()
      
      // Create a large mock file (simulate large workflow)
      const largeWorkflowData = {
        workflow: {
          ...mockWorkflowStore.currentWorkflow,
          nodes: Array(1000).fill(null).map((_, i) => ({
            id: `node-${i}`,
            type: 'test-node',
            name: `Test Node ${i}`,
            parameters: {},
            position: { x: i * 100, y: i * 100 },
            credentials: [],
            disabled: false
          }))
        }
      }
      
      const largeFile = mockFile(
        'large-workflow.json',
        JSON.stringify(largeWorkflowData),
        'application/json'
      )
      
      render(<WorkflowEditorWrapper />)
      
      // Test import of large file
      const fileInput = screen.getByTestId('workflow-import-input')
      await user.upload(fileInput, largeFile)
      
      // Verify large file was handled
      expect(mockWorkflowStore.importWorkflow).toHaveBeenCalledWith(largeFile)
    })

    it('should handle file type validation', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Try to upload invalid file type
      const invalidFile = mockFile('test.txt', 'invalid content', 'text/plain')
      const fileInput = screen.getByTestId('workflow-import-input')
      
      await user.upload(fileInput, invalidFile)
      
      // Should show error for invalid file type
      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during file operations', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      ;(workflowFileService.exportWorkflow as any).mockRejectedValue(
        new Error('Network error')
      )
      
      render(<WorkflowEditorWrapper />)
      
      // Try to export
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Should handle network error gracefully
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Complete Workflow Integration Scenarios', () => {
    it('should handle complete workflow lifecycle', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // 1. Edit title
      const titleInput = screen.getByDisplayValue('Test Workflow Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Complete Test Workflow')
      await user.keyboard('{Enter}')
      
      expect(mockWorkflowStore.updateTitle).toHaveBeenCalledWith('Complete Test Workflow')
      
      // 2. Export workflow
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      expect(mockWorkflowStore.exportWorkflow).toHaveBeenCalled()
      
      // 3. Execute workflow
      const executeButton = screen.getByRole('button', { name: /execute/i })
      await user.click(executeButton)
      
      expect(mockWorkflowStore.executeWorkflow).toHaveBeenCalled()
      
      // Verify all operations completed successfully
      expect(mockWorkflowStore.updateTitle).toHaveBeenCalledTimes(1)
      expect(mockWorkflowStore.exportWorkflow).toHaveBeenCalledTimes(1)
      expect(mockWorkflowStore.executeWorkflow).toHaveBeenCalledTimes(1)
    })

    it('should maintain state consistency across operations', async () => {
      const user = userEvent.setup()
      
      let currentStore = { ...mockWorkflowStore }
      
      // Mock store updates
      ;(useWorkflowStore as any).mockImplementation(() => currentStore)
      
      render(<WorkflowEditorWrapper />)
      
      // Update title and verify state change
      const titleInput = screen.getByDisplayValue('Test Workflow Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'State Test Workflow')
      
      // Simulate store state change
      currentStore = {
        ...currentStore,
        titleDirty: true,
        currentWorkflow: {
          ...currentStore.currentWorkflow,
          metadata: {
            ...currentStore.currentWorkflow.metadata!,
            title: 'State Test Workflow'
          }
        }
      }
      
      await user.keyboard('{Enter}')
      
      // Verify state consistency
      expect(mockWorkflowStore.updateTitle).toHaveBeenCalledWith('State Test Workflow')
    })
  })
})
