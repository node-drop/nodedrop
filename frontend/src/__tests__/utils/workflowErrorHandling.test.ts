/**
 * Unit tests for workflow-specific error handling utilities
 */

import { vi } from 'vitest'
import {
  WorkflowErrorCodes,
  validateWorkflow,
  validateWorkflowNodes,
  validateWorkflowConnections,
  findOrphanedNodes,
  hasCircularDependencies,
  createWorkflowError,
  validateWorkflowForExecution,
  getWorkflowHealthScore
} from '@/utils/workflowErrorHandling'
import { Workflow, WorkflowNode, WorkflowConnection } from '@/types/workflow'

// Mock workflow data
const createMockNode = (id: string, name: string, type = 'test'): WorkflowNode => ({
  id,
  type,
  name,
  parameters: {},
  position: { x: 100, y: 100 },
  disabled: false
})

const createMockConnection = (sourceId: string, targetId: string): WorkflowConnection => ({
  id: `${sourceId}-${targetId}`,
  sourceNodeId: sourceId,
  sourceOutput: 'output',
  targetNodeId: targetId,
  targetInput: 'input'
})

const createMockWorkflow = (
  nodes: WorkflowNode[] = [],
  connections: WorkflowConnection[] = []
): Workflow => ({
  id: 'test-workflow',
  name: 'Test Workflow',
  description: 'Test workflow description',
  userId: 'user-123',
  nodes,
  connections,
  settings: {},
  active: false,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
})

describe('Workflow Error Handling Utilities', () => {
  describe('validateWorkflow', () => {
    it('should return error for null workflow', () => {
      const errors = validateWorkflow(null)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(WorkflowErrorCodes.WORKFLOW_EMPTY)
    })

    it('should return error for workflow with no nodes', () => {
      const workflow = createMockWorkflow()
      const errors = validateWorkflow(workflow)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(WorkflowErrorCodes.WORKFLOW_NO_NODES)
    })

    it('should validate workflow with single node', () => {
      const node = createMockNode('node1', 'Node 1')
      const workflow = createMockWorkflow([node])
      const errors = validateWorkflow(workflow)
      expect(errors).toHaveLength(0)
    })

    it('should detect orphaned nodes', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3')
      ]
      const connections = [createMockConnection('node1', 'node2')]
      const workflow = createMockWorkflow(nodes, connections)
      
      const errors = validateWorkflow(workflow)
      expect(errors.some(e => e.code === WorkflowErrorCodes.WORKFLOW_ORPHANED_NODES)).toBe(true)
    })

    it('should detect circular dependencies', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3')
      ]
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node2', 'node3'),
        createMockConnection('node3', 'node1') // Creates cycle
      ]
      const workflow = createMockWorkflow(nodes, connections)
      
      const errors = validateWorkflow(workflow)
      expect(errors.some(e => e.code === WorkflowErrorCodes.WORKFLOW_CIRCULAR_DEPENDENCY)).toBe(true)
    })

    it('should validate empty title', () => {
      const node = createMockNode('node1', 'Node 1')
      const workflow = createMockWorkflow([node])
      workflow.name = ''
      
      const errors = validateWorkflow(workflow)
      expect(errors.some(e => e.code === WorkflowErrorCodes.TITLE_EMPTY)).toBe(true)
    })
  })

  describe('validateWorkflowNodes', () => {
    it('should validate nodes with missing required fields', () => {
      const invalidNodes = [
        { ...createMockNode('node1', 'Node 1'), id: '' }, // Missing ID
        { ...createMockNode('node2', 'Node 2'), type: '' }, // Missing type
        { ...createMockNode('node3', 'Node 3'), name: '' }, // Missing name
        { ...createMockNode('node4', 'Node 4'), position: null as any } // Invalid position
      ]

      const errors = validateWorkflowNodes(invalidNodes)
      expect(errors).toHaveLength(4)
      expect(errors.some(e => e.code === WorkflowErrorCodes.NODE_DUPLICATE_ID)).toBe(true)
      expect(errors.some(e => e.code === WorkflowErrorCodes.NODE_INVALID_TYPE)).toBe(true)
      expect(errors.some(e => e.code === WorkflowErrorCodes.NODE_MISSING_REQUIRED_PARAMS)).toBe(true)
      expect(errors.some(e => e.code === WorkflowErrorCodes.NODE_INVALID_POSITION)).toBe(true)
    })

    it('should detect duplicate node IDs', () => {
      const nodes = [
        createMockNode('duplicate', 'Node 1'),
        createMockNode('duplicate', 'Node 2')
      ]

      const errors = validateWorkflowNodes(nodes)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(WorkflowErrorCodes.NODE_DUPLICATE_ID)
    })

    it('should pass valid nodes', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2')
      ]

      const errors = validateWorkflowNodes(nodes)
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateWorkflowConnections', () => {
    const nodes = [
      createMockNode('node1', 'Node 1'),
      createMockNode('node2', 'Node 2')
    ]

    it('should detect invalid source node', () => {
      const connections = [createMockConnection('invalid', 'node2')]
      const errors = validateWorkflowConnections(connections, nodes)
      
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(WorkflowErrorCodes.CONNECTION_INVALID_SOURCE)
    })

    it('should detect invalid target node', () => {
      const connections = [createMockConnection('node1', 'invalid')]
      const errors = validateWorkflowConnections(connections, nodes)
      
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(WorkflowErrorCodes.CONNECTION_INVALID_TARGET)
    })

    it('should detect self-reference', () => {
      const connections = [createMockConnection('node1', 'node1')]
      const errors = validateWorkflowConnections(connections, nodes)
      
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(WorkflowErrorCodes.CONNECTION_SELF_REFERENCE)
    })

    it('should detect duplicate connections', () => {
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node1', 'node2')
      ]
      const errors = validateWorkflowConnections(connections, nodes)
      
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(WorkflowErrorCodes.CONNECTION_DUPLICATE)
    })

    it('should pass valid connections', () => {
      const connections = [createMockConnection('node1', 'node2')]
      const errors = validateWorkflowConnections(connections, nodes)
      
      expect(errors).toHaveLength(0)
    })
  })

  describe('findOrphanedNodes', () => {
    it('should find nodes with no connections', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3')
      ]
      const connections = [createMockConnection('node1', 'node2')]
      
      const orphaned = findOrphanedNodes(nodes, connections)
      expect(orphaned).toHaveLength(1)
      expect(orphaned[0].id).toBe('node3')
    })

    it('should return empty array when all nodes are connected', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2')
      ]
      const connections = [createMockConnection('node1', 'node2')]
      
      const orphaned = findOrphanedNodes(nodes, connections)
      expect(orphaned).toHaveLength(0)
    })
  })

  describe('hasCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2')
      ]
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node2', 'node1')
      ]
      
      const hasCycle = hasCircularDependencies(nodes, connections)
      expect(hasCycle).toBe(true)
    })

    it('should detect complex circular dependency', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3')
      ]
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node2', 'node3'),
        createMockConnection('node3', 'node1')
      ]
      
      const hasCycle = hasCircularDependencies(nodes, connections)
      expect(hasCycle).toBe(true)
    })

    it('should not detect cycle in linear workflow', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3')
      ]
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node2', 'node3')
      ]
      
      const hasCycle = hasCircularDependencies(nodes, connections)
      expect(hasCycle).toBe(false)
    })
  })

  describe('createWorkflowError', () => {
    it('should create workflow error with context', () => {
      const error = createWorkflowError(
        WorkflowErrorCodes.NODE_EXECUTION_FAILED,
        'Node execution failed',
        'workflow-123',
        'node-456',
        'Timeout occurred'
      )

      expect(error.code).toBe(WorkflowErrorCodes.NODE_EXECUTION_FAILED)
      expect(error.message).toBe('Node execution failed')
      expect(error.details).toBe('Timeout occurred')
      expect(error.context).toEqual({
        workflowId: 'workflow-123',
        nodeId: 'node-456'
      })
    })
  })

  describe('validateWorkflowForExecution', () => {
    it('should validate workflow with no start node', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2')
      ]
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node2', 'node1') // Both nodes have incoming connections
      ]
      const workflow = createMockWorkflow(nodes, connections)
      
      const result = validateWorkflowForExecution(workflow)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === WorkflowErrorCodes.WORKFLOW_MISSING_START_NODE)).toBe(true)
    })

    it('should warn about disabled nodes', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        { ...createMockNode('node2', 'Node 2'), disabled: true }
      ]
      const connections = [createMockConnection('node1', 'node2')]
      const workflow = createMockWorkflow(nodes, connections)
      
      const result = validateWorkflowForExecution(workflow)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('disabled')
    })

    it('should pass valid executable workflow', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2')
      ]
      const connections = [createMockConnection('node1', 'node2')]
      const workflow = createMockWorkflow(nodes, connections)
      
      const result = validateWorkflowForExecution(workflow)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('getWorkflowHealthScore', () => {
    it('should return 0 for null workflow', () => {
      const health = getWorkflowHealthScore(null)
      expect(health.score).toBe(0)
      expect(health.issues).toContain('No workflow loaded')
    })

    it('should penalize workflow with no nodes', () => {
      const workflow = createMockWorkflow()
      const health = getWorkflowHealthScore(workflow)
      expect(health.score).toBeLessThan(100)
      expect(health.issues.some(issue => issue.includes('node'))).toBe(true)
    })

    it('should penalize orphaned nodes', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3')
      ]
      const connections = [createMockConnection('node1', 'node2')]
      const workflow = createMockWorkflow(nodes, connections)
      
      const health = getWorkflowHealthScore(workflow)
      expect(health.score).toBeLessThan(100)
      expect(health.suggestions.some(s => s.includes('Connect all nodes'))).toBe(true)
    })

    it('should penalize circular dependencies', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2')
      ]
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node2', 'node1')
      ]
      const workflow = createMockWorkflow(nodes, connections)
      
      const health = getWorkflowHealthScore(workflow)
      expect(health.score).toBeLessThan(100)
      expect(health.suggestions.some(s => s.includes('circular dependencies'))).toBe(true)
    })

    it('should give high score to healthy workflow', () => {
      const nodes = [
        createMockNode('node1', 'Node 1'),
        createMockNode('node2', 'Node 2'),
        createMockNode('node3', 'Node 3')
      ]
      const connections = [
        createMockConnection('node1', 'node2'),
        createMockConnection('node2', 'node3')
      ]
      const workflow = createMockWorkflow(nodes, connections)
      
      const health = getWorkflowHealthScore(workflow)
      expect(health.score).toBeGreaterThan(80)
      expect(health.issues).toHaveLength(0)
    })
  })
})
