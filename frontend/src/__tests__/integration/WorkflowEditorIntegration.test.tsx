import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowToolbar } from '../../components/workflow/WorkflowToolbar'
import { TitleManager } from '../../components/workflow/TitleManager'

// Mock the confirm dialog hook
vi.mock('../../components/ui/ConfirmDialog', () => ({
  useConfirmDialog: () => ({
    showConfirmDialog: vi.fn(),
    ConfirmDialogComponent: () => null
  })
}))

// Mock error handling utilities
vi.mock('../../utils/errorHandling', () => ({
  validateImportFile: vi.fn(() => ({ isValid: true, error: null })),
  getUserFriendlyErrorMessage: vi.fn((error) => error.message || 'Unknown error')
}))

describe('Workflow Editor Integration Tests', () => {
  describe('Title Management Integration', () => {
    it('should integrate TitleManager with WorkflowToolbar', async () => {
      const user = userEvent.setup()
      const mockTitleChange = vi.fn()
      const mockTitleSave = vi.fn()
      
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        onExecute: vi.fn(),
        onStop: vi.fn(),
        onExport: vi.fn(),
        onImport: vi.fn(),
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        workflowTitle: 'Integration Test Workflow',
        onTitleChange: mockTitleChange,
        onTitleSave: mockTitleSave,
        isTitleDirty: false,
        titleValidationError: null,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Verify title is displayed
      const titleInput = screen.getByDisplayValue('Integration Test Workflow')
      expect(titleInput).toBeInTheDocument()
      
      // Test title editing
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')
      
      // Verify title change callback
      expect(mockTitleChange).toHaveBeenCalledWith('Updated Title')
      
      // Test save on Enter
      await user.keyboard('{Enter}')
      expect(mockTitleSave).toHaveBeenCalledWith('Updated Title')
    })

    it('should handle title validation errors', () => {
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        workflowTitle: '',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: true,
        titleValidationError: 'Title cannot be empty',
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Verify error message is displayed
      expect(screen.getByText('Title cannot be empty')).toBeInTheDocument()
    })
  })

  describe('Import/Export Integration', () => {
    it('should handle export functionality', async () => {
      const user = userEvent.setup()
      const mockExport = vi.fn()
      
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        onExport: mockExport,
        workflowTitle: 'Export Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Find and click export button
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      // Verify export was called
      expect(mockExport).toHaveBeenCalled()
    })

    it('should handle import functionality', async () => {
      const user = userEvent.setup()
      const mockImport = vi.fn()
      
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        onImport: mockImport,
        workflowTitle: 'Import Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Create a test file
      const testFile = new File(['{"workflow": {}}'], 'test.json', { type: 'application/json' })
      
      // Find file input
      const fileInput = screen.getByTestId('workflow-import-input')
      
      // Upload file
      await user.upload(fileInput, testFile)
      
      // Verify import was called
      expect(mockImport).toHaveBeenCalledWith(testFile)
    })

    it('should show export progress', () => {
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        workflowTitle: 'Progress Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: true,
        isImporting: false,
        exportProgress: 75,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Verify progress is shown
      expect(screen.getByText('75%')).toBeInTheDocument()
      
      // Verify export button is disabled during export
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeDisabled()
    })

    it('should handle import/export errors', () => {
      const mockClearErrors = vi.fn()
      
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        workflowTitle: 'Error Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: 'Export failed: Network error',
        importError: 'Import failed: Invalid file format',
        onClearImportExportErrors: mockClearErrors,
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Verify error messages are displayed
      expect(screen.getByText(/export failed/i)).toBeInTheDocument()
      expect(screen.getByText(/import failed/i)).toBeInTheDocument()
    })
  })

  describe('Execution Integration', () => {
    it('should handle execution states', async () => {
      const user = userEvent.setup()
      const mockExecute = vi.fn()
      const mockStop = vi.fn()
      
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        onExecute: mockExecute,
        onStop: mockStop,
        workflowTitle: 'Execution Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Find and click execute button
      const executeButton = screen.getByRole('button', { name: /execute/i })
      await user.click(executeButton)
      
      // Verify execute was called
      expect(mockExecute).toHaveBeenCalled()
    })

    it('should show execution progress and allow stopping', async () => {
      const user = userEvent.setup()
      const mockStop = vi.fn()
      
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        onStop: mockStop,
        workflowTitle: 'Execution Progress Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: true,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'running' as const,
          progress: 60,
          startTime: Date.now() - 5000,
          endTime: undefined,
          error: undefined,
          executionId: 'exec-123'
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Verify execution progress is shown
      expect(screen.getByText('60%')).toBeInTheDocument()
      
      // Verify execute button is disabled during execution
      const executeButton = screen.getByRole('button', { name: /execute/i })
      expect(executeButton).toBeDisabled()
      
      // Find and click stop button
      const stopButton = screen.getByRole('button', { name: /stop/i })
      await user.click(stopButton)
      
      // Verify stop was called
      expect(mockStop).toHaveBeenCalled()
    })

    it('should handle execution errors', () => {
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        workflowTitle: 'Execution Error Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'error' as const,
          progress: 0,
          startTime: Date.now() - 10000,
          endTime: Date.now(),
          error: 'Execution failed: Node validation error',
          executionId: 'exec-error'
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Verify error is displayed
      expect(screen.getByText(/execution failed/i)).toBeInTheDocument()
      expect(screen.getByText(/node validation error/i)).toBeInTheDocument()
      
      // Verify execute button is re-enabled after error
      const executeButton = screen.getByRole('button', { name: /execute/i })
      expect(executeButton).not.toBeDisabled()
    })
  })

  describe('TitleManager Component Integration', () => {
    it('should handle title editing workflow', async () => {
      const user = userEvent.setup()
      const mockChange = vi.fn()
      const mockSave = vi.fn()
      
      const props = {
        title: 'Test Title',
        onChange: mockChange,
        onSave: mockSave,
        isDirty: false,
        isEditing: false,
        placeholder: 'Enter title...'
      }
      
      render(<TitleManager {...props} />)
      
      // Find title input
      const titleInput = screen.getByDisplayValue('Test Title')
      
      // Click to start editing
      await user.click(titleInput)
      
      // Clear and type new title
      await user.clear(titleInput)
      await user.type(titleInput, 'New Title')
      
      // Verify onChange was called
      expect(mockChange).toHaveBeenCalledWith('New Title')
      
      // Press Enter to save
      await user.keyboard('{Enter}')
      
      // Verify onSave was called
      expect(mockSave).toHaveBeenCalledWith('New Title')
    })

    it('should handle escape key to cancel editing', async () => {
      const user = userEvent.setup()
      const mockChange = vi.fn()
      const mockSave = vi.fn()
      
      const props = {
        title: 'Original Title',
        onChange: mockChange,
        onSave: mockSave,
        isDirty: true,
        isEditing: true,
        placeholder: 'Enter title...'
      }
      
      render(<TitleManager {...props} />)
      
      const titleInput = screen.getByDisplayValue('Original Title')
      
      // Start editing
      await user.click(titleInput)
      await user.clear(titleInput)
      await user.type(titleInput, 'Modified Title')
      
      // Press Escape to cancel
      await user.keyboard('{Escape}')
      
      // Should not save the changes
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('should show validation errors', () => {
      const props = {
        title: '',
        onChange: vi.fn(),
        onSave: vi.fn(),
        isDirty: true,
        isEditing: false,
        placeholder: 'Enter title...',
        validationError: 'Title is required'
      }
      
      render(<TitleManager {...props} />)
      
      // Verify error message is displayed
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
  })

  describe('Browser Compatibility Integration', () => {
    it('should handle file operations across browsers', async () => {
      const user = userEvent.setup()
      const mockImport = vi.fn()
      
      // Mock File API
      const testFile = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' })
      
      const props = {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onValidate: vi.fn(),
        onImport: mockImport,
        workflowTitle: 'Browser Test',
        onTitleChange: vi.fn(),
        onTitleSave: vi.fn(),
        isTitleDirty: false,
        titleValidationError: null,
        isExecuting: false,
        isSaving: false,
        isDirty: false,
        isExporting: false,
        isImporting: false,
        exportProgress: 0,
        importProgress: 0,
        exportError: null,
        importError: null,
        onClearImportExportErrors: vi.fn(),
        executionState: {
          status: 'idle' as const,
          progress: 0,
          startTime: undefined,
          endTime: undefined,
          error: undefined,
          executionId: undefined
        },
        onStopExecution: vi.fn(),
        onShowError: vi.fn(),
        onShowSuccess: vi.fn()
      }
      
      render(<WorkflowToolbar {...props} />)
      
      // Test file input functionality
      const fileInput = screen.getByTestId('workflow-import-input')
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', '.json')
      
      // Upload file
      await user.upload(fileInput, testFile)
      
      // Verify import was called with correct file
      expect(mockImport).toHaveBeenCalledWith(testFile)
    })
  })
})
