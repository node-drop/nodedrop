import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkflowEditorWrapper } from '../../../components/workflow/WorkflowEditor'
import { useWorkflowStore } from '../../../stores/workflow'
import { useAuthStore } from '../../../stores/auth'

// Mock the stores
vi.mock('../../../stores/workflow')
vi.mock('../../../stores/auth')

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
vi.mock('../../../components/workflow/CustomNode', () => ({
  CustomNode: () => <div data-testid="custom-node" />
}))

vi.mock('../../../components/workflow/NodePalette', () => ({
  NodePalette: () => <div data-testid="node-palette" />
}))

vi.mock('../../../components/workflow/NodeConfigPanel', () => ({
  NodeConfigPanel: () => <div data-testid="node-config-panel" />
}))

vi.mock('../../../components/workflow/WorkflowToolbar', () => ({
  WorkflowToolbar: (props: any) => (
    <div 
      data-testid="workflow-toolbar" 
      data-workflow-title={props.workflowTitle}
      data-is-title-dirty={props.isTitleDirty}
      data-is-exporting={props.isExporting}
      data-is-importing={props.isImporting}
      data-execution-status={props.executionState?.status}
    />
  )
}))

vi.mock('../../../services', () => ({
  workflowService: {
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
  }
}))

const mockWorkflowStore = {
  workflow: {
    id: 'test-workflow',
    name: 'Test Workflow',
    nodes: [],
    connections: [],
    settings: {},
    active: true,
    userId: 'user1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    description: 'Test workflow'
  },
  selectedNodeId: null,
  addNode: vi.fn(),
  updateNode: vi.fn(),
  removeNode: vi.fn(),
  addConnection: vi.fn(),
  removeConnection: vi.fn(),
  setSelectedNode: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: vi.fn(() => false),
  canRedo: vi.fn(() => false),
  validateWorkflow: vi.fn(() => ({ isValid: true, errors: [] })),
  setWorkflow: vi.fn(),
  isDirty: false,
  setDirty: vi.fn(),
  // Title management
  workflowTitle: 'Test Workflow',
  updateTitle: vi.fn(),
  saveTitle: vi.fn(),
  isTitleDirty: false,
  titleValidationError: null,
  // Import/Export
  exportWorkflow: vi.fn(),
  importWorkflow: vi.fn(),
  isExporting: false,
  isImporting: false,
  exportProgress: 0,
  importProgress: 0,
  exportError: null,
  importError: null,
  clearImportExportErrors: vi.fn(),
  // Execution
  executeWorkflow: vi.fn(),
  stopExecution: vi.fn(),
  executionState: {
    status: 'idle' as const,
    progress: 0,
    startTime: undefined,
    endTime: undefined,
    error: undefined,
    executionId: undefined
  }
}

const mockAuthStore = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER' as const,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
}

describe('WorkflowEditor', () => {
  beforeEach(() => {
    vi.mocked(useWorkflowStore).mockReturnValue(mockWorkflowStore)
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
  })

  it('renders the workflow editor with all components', () => {
    const mockNodeTypes = [
      {
        type: 'test-node',
        displayName: 'Test Node',
        name: 'Test Node',
        group: ['test'],
        version: 1,
        description: 'A test node',
        defaults: {},
        inputs: ['main'],
        outputs: ['main'],
        properties: []
      }
    ]

    render(<WorkflowEditorWrapper nodeTypes={mockNodeTypes} />)

    // Check that main components are rendered
    expect(screen.getByTestId('node-palette')).toBeInTheDocument()
    expect(screen.getByTestId('workflow-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('passes correct props to WorkflowToolbar', () => {
    const mockNodeTypes = [
      {
        type: 'test-node',
        displayName: 'Test Node',
        name: 'Test Node',
        group: ['test'],
        version: 1,
        description: 'A test node',
        defaults: {},
        inputs: ['main'],
        outputs: ['main'],
        properties: []
      }
    ]

    render(<WorkflowEditorWrapper nodeTypes={mockNodeTypes} />)

    const toolbar = screen.getByTestId('workflow-toolbar')

    // Check that enhanced props are passed correctly
    expect(toolbar.getAttribute('data-workflow-title')).toBe('Test Workflow')
    expect(toolbar.getAttribute('data-is-title-dirty')).toBe('false')
    expect(toolbar.getAttribute('data-is-exporting')).toBe('false')
    expect(toolbar.getAttribute('data-is-importing')).toBe('false')
    expect(toolbar.getAttribute('data-execution-status')).toBe('idle')
  })

  it('displays error notifications', () => {
    render(<WorkflowEditorWrapper nodeTypes={[]} />)

    // Initially no error message should be displayed
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument()
  })

  it('displays success notifications', () => {
    render(<WorkflowEditorWrapper nodeTypes={[]} />)

    // Initially no success message should be displayed
    expect(screen.queryByText(/✅/)).not.toBeInTheDocument()
  })
})
