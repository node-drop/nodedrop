import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkflowToolbar } from '@/components/workflow/WorkflowToolbar'

const mockProps = {
  canUndo: true,
  canRedo: true,
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
  
  // New required props
  workflowTitle: 'Test Workflow',
  onTitleChange: vi.fn(),
  onTitleSave: vi.fn(),
  isTitleDirty: false,
  titleValidationError: null,
  
  // Optional new props with defaults
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

describe('WorkflowToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all toolbar buttons', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument()
    expect(screen.getByTitle('Redo (Ctrl+Y)')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Execute')).toBeInTheDocument()
    expect(screen.getByText('Validate')).toBeInTheDocument()
    expect(screen.getByTitle('Import workflow')).toBeInTheDocument()
    expect(screen.getByTitle('Export workflow')).toBeInTheDocument()
    expect(screen.getByTitle('Workflow settings')).toBeInTheDocument()
  })

  it('should call onUndo when undo button is clicked', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    fireEvent.click(screen.getByTitle('Undo (Ctrl+Z)'))
    expect(mockProps.onUndo).toHaveBeenCalledTimes(1)
  })

  it('should call onRedo when redo button is clicked', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    fireEvent.click(screen.getByTitle('Redo (Ctrl+Y)'))
    expect(mockProps.onRedo).toHaveBeenCalledTimes(1)
  })

  it('should call onSave when save button is clicked and there are changes', () => {
    render(<WorkflowToolbar {...mockProps} isDirty={true} />)
    
    fireEvent.click(screen.getByText('Save'))
    expect(mockProps.onSave).toHaveBeenCalledTimes(1)
  })

  it('should call onExecute when execute button is clicked', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    fireEvent.click(screen.getByText('Execute'))
    expect(mockProps.onExecute).toHaveBeenCalledTimes(1)
  })

  it('should call onValidate when validate button is clicked', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    fireEvent.click(screen.getByText('Validate'))
    expect(mockProps.onValidate).toHaveBeenCalledTimes(1)
  })

  it('should disable undo button when canUndo is false', () => {
    render(<WorkflowToolbar {...mockProps} canUndo={false} />)
    
    const undoButton = screen.getByTitle('Undo (Ctrl+Z)')
    expect(undoButton).toBeDisabled()
    expect(undoButton).toHaveClass('cursor-not-allowed')
  })

  it('should disable redo button when canRedo is false', () => {
    render(<WorkflowToolbar {...mockProps} canRedo={false} />)
    
    const redoButton = screen.getByTitle('Redo (Ctrl+Y)')
    expect(redoButton).toBeDisabled()
    expect(redoButton).toHaveClass('cursor-not-allowed')
  })

  it('should show saving state when isSaving is true', () => {
    render(<WorkflowToolbar {...mockProps} isSaving={true} />)
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    const saveButton = screen.getByText('Saving...').closest('button')
    expect(saveButton).toBeDisabled()
  })

  it('should show stop button when execution status is running', () => {
    render(<WorkflowToolbar {...mockProps} executionState={{ ...mockProps.executionState, status: 'running' }} />)
    
    expect(screen.getByText('Stop')).toBeInTheDocument()
    expect(screen.queryByText('Execute')).not.toBeInTheDocument()
  })

  it('should call onStopExecution when stop button is clicked', () => {
    render(<WorkflowToolbar {...mockProps} executionState={{ ...mockProps.executionState, status: 'running' }} />)
    
    fireEvent.click(screen.getByText('Stop'))
    expect(mockProps.onStopExecution).toHaveBeenCalledTimes(1)
  })

  it('should render import button', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    const importButton = screen.getByTitle('Import workflow')
    expect(importButton).toBeInTheDocument()
    expect(importButton).not.toBeDisabled()
  })

  it('should call onExport when export button is clicked', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    fireEvent.click(screen.getByTitle('Export workflow'))
    expect(mockProps.onExport).toHaveBeenCalledTimes(1)
  })

  it('should handle optional props gracefully', () => {
    const minimalProps = {
      canUndo: false,
      canRedo: false,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onSave: vi.fn(),
      onValidate: vi.fn(),
      // Required new props
      workflowTitle: 'Test',
      onTitleChange: vi.fn(),
      onTitleSave: vi.fn(),
      isTitleDirty: false
    }
    
    render(<WorkflowToolbar {...minimalProps} />)
    
    // Should render without optional props
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Validate')).toBeInTheDocument()
  })

  it('should apply correct styling for enabled/disabled states', () => {
    render(<WorkflowToolbar {...mockProps} canUndo={true} canRedo={false} />)
    
    const undoButton = screen.getByTitle('Undo (Ctrl+Z)')
    const redoButton = screen.getByTitle('Redo (Ctrl+Y)')
    
    expect(undoButton).toHaveClass('text-gray-700', 'hover:bg-gray-100')
    expect(redoButton).toHaveClass('text-gray-400', 'cursor-not-allowed')
  })

  it('should show correct button colors', () => {
    render(<WorkflowToolbar {...mockProps} isDirty={true} />)
    
    const saveButton = screen.getByText('Save').closest('button')
    const executeButton = screen.getByText('Execute').closest('button')
    const validateButton = screen.getByText('Validate').closest('button')
    
    expect(saveButton).toHaveClass('bg-blue-600', 'text-white')
    expect(executeButton).toHaveClass('bg-green-600', 'text-white')
    expect(validateButton).toHaveClass('border-gray-300', 'text-gray-700')
  })

  it('should show stop button with correct styling when executing', () => {
    render(<WorkflowToolbar {...mockProps} executionState={{ ...mockProps.executionState, status: 'running' }} />)
    
    const stopButton = screen.getByText('Stop').closest('button')
    expect(stopButton).toHaveClass('bg-red-600', 'text-white')
  })

  it('should render TitleManager component', () => {
    render(<WorkflowToolbar {...mockProps} />)
    
    expect(screen.getByText('Test Workflow')).toBeInTheDocument()
    expect(screen.getByTitle('Click to edit title')).toBeInTheDocument()
  })

  it('should show progress bar when execution is running with progress', () => {
    render(<WorkflowToolbar {...mockProps} executionState={{ 
      ...mockProps.executionState, 
      status: 'running',
      progress: 50
    }} />)
    
    expect(screen.getByText('50%')).toBeInTheDocument()
    const progressBar = document.querySelector('.bg-blue-500')
    expect(progressBar).toHaveStyle({ width: '50%' })
  })

  it('should show loading spinner when importing', () => {
    render(<WorkflowToolbar {...mockProps} isImporting={true} importProgress={25} />)
    
    const importButton = screen.getByTitle('Importing workflow...')
    expect(importButton).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('should show loading spinner when exporting', () => {
    render(<WorkflowToolbar {...mockProps} isExporting={true} exportProgress={75} />)
    
    const exportButton = screen.getByTitle('Exporting workflow...')
    expect(exportButton).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should show error state for import', () => {
    render(<WorkflowToolbar {...mockProps} importError="Invalid file format" />)
    
    const importButton = screen.getByTitle('Import failed: Invalid file format')
    expect(importButton).toBeInTheDocument()
  })

  it('should show error state for export', () => {
    render(<WorkflowToolbar {...mockProps} exportError="Export failed" />)
    
    const exportButton = screen.getByTitle('Export failed: Export failed')
    expect(exportButton).toBeInTheDocument()
  })

  it('should show success execution status', () => {
    render(<WorkflowToolbar {...mockProps} executionState={{ 
      ...mockProps.executionState, 
      status: 'success'
    }} />)
    
    const executeButton = screen.getByTitle('Execute workflow (last execution successful)')
    expect(executeButton).toHaveClass('bg-green-600', 'text-white')
  })

  it('should show error execution status', () => {
    render(<WorkflowToolbar {...mockProps} executionState={{ 
      ...mockProps.executionState, 
      status: 'error'
    }} />)
    
    const executeButton = screen.getByTitle('Execute workflow (last execution failed)')
    expect(executeButton).toHaveClass('bg-red-600', 'text-white')
  })

  it('should enable save button when title is dirty', () => {
    render(<WorkflowToolbar {...mockProps} isTitleDirty={true} />)
    
    const saveButton = screen.getByText('Save').closest('button')
    expect(saveButton).not.toBeDisabled()
    expect(saveButton).toHaveClass('bg-blue-600', 'text-white')
  })

  it('should disable import/export buttons when operations are in progress', () => {
    render(<WorkflowToolbar {...mockProps} isImporting={true} isExporting={true} />)
    
    const importButton = screen.getByTitle('Importing workflow...')
    const exportButton = screen.getByTitle('Exporting workflow...')
    
    expect(importButton).toBeDisabled()
    expect(exportButton).toBeDisabled()
  })
})
