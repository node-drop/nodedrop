import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowEditorWrapper } from '../../components/workflow/WorkflowEditor'
import { useWorkflowStore } from '../../stores/workflow'
import { useAuthStore } from '../../stores/auth'
import { workflowFileService } from '../../services/workflowFile'

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

describe('Workflow Editor Error Recovery Integration Tests', () => {
  const baseWorkflowStore = {
    currentWorkflow: {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test Description',
      userId: 'test-user',
      nodes: [],
      connections: [],
      metadata: {
        title: 'Error Recovery Test',
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
    ;(useWorkflowStore as any).mockReturnValue(baseWorkflowStore)
    ;(useAuthStore as any).mockReturnValue(mockAuthStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Title Management Error Recovery', () => {
    it('should recover from title validation errors', async () => {
      const user = userEvent.setup()
      
      const storeWithTitleError = {
        ...baseWorkflowStore,
        titleValidationError: 'Title must be between 1 and 100 characters'
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithTitleError)
      
      render(<WorkflowEditorWrapper />)
      
      // Verify error is displayed
      expect(screen.getByText(/Title must be between 1 and 100 characters/i)).toBeInTheDocument()
      
      // Try to fix the title
      const titleInput = screen.getByDisplayValue('Error Recovery Test')
      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title')
      
      // Simulate error clearing after valid input
      const storeWithoutError = {
        ...baseWorkflowStore,
        titleValidationError: null
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithoutError)
      
      // Re-render to simulate store update
      const { rerender } = render(<WorkflowEditorWrapper />)
      rerender(<WorkflowEditorWrapper />)
      
      // Error should be cleared
      expect(screen.queryByText(/Title must be between 1 and 100 characters/i)).not.toBeInTheDocument()
      
      // Should be able to save now
      await user.keyboard('{Enter}')
      expect(baseWorkflowStore.updateTitle).toHaveBeenCalledWith('Valid Title')
    })

    it('should handle title save failures with retry', async () => {
      const user = userEvent.setup()
      
      // Mock title update to fail first time, succeed second time
      let callCount = 0
      const mockUpdateTitle = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network error')
        }
        return Promise.resolve()
      })
      
      const storeWithFailingUpdate = {
        ...baseWorkflowStore,
        updateTitle: mockUpdateTitle
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithFailingUpdate)
      
      render(<WorkflowEditorWrapper />)
      
      const titleInput = screen.getByDisplayValue('Error Recovery Test')
      await user.clear(titleInput)
      await user.type(titleInput, 'Retry Test Title')
      await user.keyboard('{Enter}')
      
      // First attempt should fail
      expect(mockUpdateTitle).toHaveBeenCalledTimes(1)
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
      
      // Try again
      await user.keyboard('{Enter}')
      
      // Second attempt should succeed
      expect(mockUpdateTitle).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent title edits', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      const titleInput = screen.getByDisplayValue('Error Recovery Test')
      
      // Start editing
      await user.click(titleInput)
      await user.clear(titleInput)
      await user.type(titleInput, 'Concurrent Edit 1')
      
      // Simulate another user updating the title
      const storeWithUpdatedTitle = {
        ...baseWorkflowStore,
        currentWorkflow: {
          ...baseWorkflowStore.currentWorkflow,
          metadata: {
            ...baseWorkflowStore.currentWorkflow.metadata!,
            title: 'Concurrent Edit 2 (from another user)'
          }
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithUpdatedTitle)
      
      // Re-render to simulate external update
      const { rerender } = render(<WorkflowEditorWrapper />)
      rerender(<WorkflowEditorWrapper />)
      
      // Should show conflict resolution dialog
      expect(screen.getByText(/conflict/i)).toBeInTheDocument()
      expect(screen.getByText(/another user/i)).toBeInTheDocument()
      
      // User can choose to keep their changes or accept the other user's changes
      const keepChangesButton = screen.getByRole('button', { name: /keep my changes/i })
      await user.click(keepChangesButton)
      
      expect(baseWorkflowStore.updateTitle).toHaveBeenCalledWith('Concurrent Edit 1')
    })
  })

  describe('Import/Export Error Recovery', () => {
    it('should recover from export failures', async () => {
      const user = userEvent.setup()
      
      // Mock export to fail first time
      let exportCallCount = 0
      ;(workflowFileService.exportWorkflow as any).mockImplementation(() => {
        exportCallCount++
        if (exportCallCount === 1) {
          throw new Error('Disk full')
        }
        return Promise.resolve()
      })
      
      render(<WorkflowEditorWrapper />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/disk full/i)).toBeInTheDocument()
      })
      
      // Try export again
      await user.click(exportButton)
      
      // Second attempt should succeed
      expect(workflowFileService.exportWorkflow).toHaveBeenCalledTimes(2)
    })

    it('should handle corrupted import files', async () => {
      const user = userEvent.setup()
      
      // Mock import to fail with corrupted file error
      ;(workflowFileService.importWorkflow as any).mockRejectedValue(
        new Error('Invalid JSON format')
      )
      
      render(<WorkflowEditorWrapper />)
      
      const corruptedFile = new File(['invalid json {'], 'corrupted.json', { type: 'application/json' })
      const fileInput = screen.getByTestId('workflow-import-input')
      
      await user.upload(fileInput, corruptedFile)
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid json format/i)).toBeInTheDocument()
      })
      
      // Should allow user to try again with a different file
      const validFile = new File(['{"workflow": {}}'], 'valid.json', { type: 'application/json' })
      ;(workflowFileService.importWorkflow as any).mockResolvedValue(baseWorkflowStore.currentWorkflow)
      
      await user.upload(fileInput, validFile)
      
      // Should succeed with valid file
      expect(workflowFileService.importWorkflow).toHaveBeenCalledWith(validFile)
    })

    it('should handle import file size limits', async () => {
      const user = userEvent.setup()
      
      render(<WorkflowEditorWrapper />)
      
      // Create oversized file (simulate 100MB file)
      const oversizedContent = 'x'.repeat(100 * 1024 * 1024)
      const oversizedFile = new File([oversizedContent], 'huge.json', { type: 'application/json' })
      
      const fileInput = screen.getByTestId('workflow-import-input')
      await user.upload(fileInput, oversizedFile)
      
      // Should show file size error
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument()
      })
      
      // Should suggest alternatives
      expect(screen.getByText(/maximum file size/i)).toBeInTheDocument()
    })

    it('should handle network interruptions during import/export', async () => {
      const user = userEvent.setup()
      
      // Mock network interruption
      ;(workflowFileService.exportWorkflow as any).mockRejectedValue(
        new Error('Network request failed')
      )
      
      render(<WorkflowEditorWrapper />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/network request failed/i)).toBeInTheDocument()
      })
      
      // Should offer retry option
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
      
      // Mock successful retry
      ;(workflowFileService.exportWorkflow as any).mockResolvedValue(undefined)
      
      await user.click(retryButton)
      
      // Should retry the operation
      expect(workflowFileService.exportWorkflow).toHaveBeenCalledTimes(2)
    })
  })

  describe('Execution Error Recovery', () => {
    it('should recover from execution failures', async () => {
      const user = userEvent.setup()
      
      const storeWithExecutionError = {
        ...baseWorkflowStore,
        executionState: {
          status: 'error' as const,
          progress: 0,
          startTime: Date.now() - 5000,
          endTime: Date.now(),
          error: 'Node validation failed: Missing required parameter',
          executionId: 'exec-123'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithExecutionError)
      
      render(<WorkflowEditorWrapper />)
      
      // Should show execution error
      expect(screen.getByText(/node validation failed/i)).toBeInTheDocument()
      expect(screen.getByText(/missing required parameter/i)).toBeInTheDocument()
      
      // Should show actionable error message
      expect(screen.getByText(/fix the workflow/i)).toBeInTheDocument()
      
      // Should allow retry after fixing
      const retryButton = screen.getByRole('button', { name: /retry execution/i })
      expect(retryButton).toBeInTheDocument()
      
      await user.click(retryButton)
      
      expect(baseWorkflowStore.executeWorkflow).toHaveBeenCalled()
    })

    it('should handle execution timeout recovery', async () => {
      const user = userEvent.setup()
      
      const storeWithTimeout = {
        ...baseWorkflowStore,
        executionState: {
          status: 'error' as const,
          progress: 50,
          startTime: Date.now() - 300000, // 5 minutes ago
          endTime: Date.now(),
          error: 'Execution timeout after 5 minutes',
          executionId: 'exec-timeout'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithTimeout)
      
      render(<WorkflowEditorWrapper />)
      
      // Should show timeout error
      expect(screen.getByText(/execution timeout/i)).toBeInTheDocument()
      
      // Should suggest optimization
      expect(screen.getByText(/optimize your workflow/i)).toBeInTheDocument()
      
      // Should allow retry with different settings
      const retryWithSettingsButton = screen.getByRole('button', { name: /retry with settings/i })
      await user.click(retryWithSettingsButton)
      
      // Should open execution settings dialog
      expect(screen.getByText(/execution settings/i)).toBeInTheDocument()
      expect(screen.getByText(/timeout duration/i)).toBeInTheDocument()
    })

    it('should handle partial execution recovery', async () => {
      const user = userEvent.setup()
      
      const storeWithPartialExecution = {
        ...baseWorkflowStore,
        executionState: {
          status: 'error' as const,
          progress: 75,
          startTime: Date.now() - 10000,
          endTime: Date.now(),
          error: 'Node 4 failed: HTTP 500 error',
          executionId: 'exec-partial'
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithPartialExecution)
      
      render(<WorkflowEditorWrapper />)
      
      // Should show partial execution error
      expect(screen.getByText(/node 4 failed/i)).toBeInTheDocument()
      expect(screen.getByText(/75%/)).toBeInTheDocument()
      
      // Should offer to resume from failed node
      const resumeButton = screen.getByRole('button', { name: /resume from node 4/i })
      expect(resumeButton).toBeInTheDocument()
      
      await user.click(resumeButton)
      
      // Should resume execution from the failed node
      expect(baseWorkflowStore.executeWorkflow).toHaveBeenCalledWith({ resumeFromNode: 'node-4' })
    })
  })

  describe('State Consistency Recovery', () => {
    it('should recover from inconsistent state', async () => {
      const user = userEvent.setup()
      
      // Simulate inconsistent state (title dirty but no changes)
      const inconsistentStore = {
        ...baseWorkflowStore,
        titleDirty: true,
        currentWorkflow: {
          ...baseWorkflowStore.currentWorkflow,
          metadata: {
            ...baseWorkflowStore.currentWorkflow.metadata!,
            title: 'Error Recovery Test' // Same as original
          }
        }
      }
      
      ;(useWorkflowStore as any).mockReturnValue(inconsistentStore)
      
      render(<WorkflowEditorWrapper />)
      
      // Should detect and fix inconsistent state
      expect(baseWorkflowStore.setTitleDirty).toHaveBeenCalledWith(false)
    })

    it('should handle store hydration errors', async () => {
      const user = userEvent.setup()
      
      // Mock store with missing required data
      const incompleteStore = {
        ...baseWorkflowStore,
        currentWorkflow: null
      }
      
      ;(useWorkflowStore as any).mockReturnValue(incompleteStore)
      
      render(<WorkflowEditorWrapper />)
      
      // Should show loading state or error boundary
      expect(screen.getByText(/loading/i) || screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  describe('User Feedback and Recovery Guidance', () => {
    it('should provide clear error messages with recovery steps', async () => {
      const user = userEvent.setup()
      
      const storeWithDetailedError = {
        ...baseWorkflowStore,
        importError: 'Import failed: Workflow version 2.0 is not supported. Please export from a compatible version or contact support.'
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithDetailedError)
      
      render(<WorkflowEditorWrapper />)
      
      // Should show detailed error message
      expect(screen.getByText(/workflow version 2.0 is not supported/i)).toBeInTheDocument()
      expect(screen.getByText(/export from a compatible version/i)).toBeInTheDocument()
      expect(screen.getByText(/contact support/i)).toBeInTheDocument()
      
      // Should provide actionable buttons
      expect(screen.getByRole('button', { name: /contact support/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try different file/i })).toBeInTheDocument()
    })

    it('should show progress during recovery operations', async () => {
      const user = userEvent.setup()
      
      const storeWithRecoveryProgress = {
        ...baseWorkflowStore,
        isImporting: true,
        importProgress: 60,
        importError: null
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithRecoveryProgress)
      
      render(<WorkflowEditorWrapper />)
      
      // Should show recovery progress
      expect(screen.getByText(/60%/)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText(/importing/i)).toBeInTheDocument()
    })

    it('should provide undo functionality for failed operations', async () => {
      const user = userEvent.setup()
      
      const storeWithUndoCapability = {
        ...baseWorkflowStore,
        canUndo: true,
        importError: 'Import partially completed but some nodes failed to load'
      }
      
      ;(useWorkflowStore as any).mockReturnValue(storeWithUndoCapability)
      
      render(<WorkflowEditorWrapper />)
      
      // Should show undo option
      expect(screen.getByText(/partially completed/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /undo import/i })).toBeInTheDocument()
      
      const undoButton = screen.getByRole('button', { name: /undo import/i })
      await user.click(undoButton)
      
      expect(baseWorkflowStore.undo).toHaveBeenCalled()
    })
  })
})
