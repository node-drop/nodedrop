import { describe, it, expect, beforeEach } from 'vitest'
import { ProgressTracker } from '../ProgressTracker'
import { NodeExecutionStatus } from '@/types/execution'

describe('ProgressTracker', () => {
  let progressTracker: ProgressTracker

  beforeEach(() => {
    progressTracker = new ProgressTracker()
  })

  it('should initialize with empty state', () => {
    const status = progressTracker.getExecutionFlowStatus('test-execution')
    expect(status.nodeStates.size).toBe(0)
    expect(status.progress).toBe(0)
    expect(status.overallStatus).toBe('running')
  })

  it('should initialize node states correctly', () => {
    const nodeIds = ['node1', 'node2', 'node3']
    const dependencies = new Map([
      ['node1', []],
      ['node2', ['node1']],
      ['node3', ['node1', 'node2']]
    ])

    progressTracker.initializeNodeStates(nodeIds, dependencies)

    const status = progressTracker.getExecutionFlowStatus('test-execution')
    expect(status.nodeStates.size).toBe(3)
    
    const node2State = status.nodeStates.get('node2')
    expect(node2State?.dependencies).toEqual(['node1'])
    
    const node1State = status.nodeStates.get('node1')
    expect(node1State?.dependents).toContain('node2')
    expect(node1State?.dependents).toContain('node3')
  })

  it('should update node status correctly', () => {
    const nodeIds = ['node1']
    const dependencies = new Map([['node1', []]])
    
    progressTracker.initializeNodeStates(nodeIds, dependencies)
    progressTracker.updateNodeStatus('test-execution', 'node1', NodeExecutionStatus.RUNNING, {
      startTime: Date.now()
    })

    const visualState = progressTracker.getNodeVisualState('node1')
    expect(visualState.status).toBe(NodeExecutionStatus.RUNNING)
    expect(visualState.animationState).toBe('pulsing')
  })

  it('should calculate progress correctly', () => {
    const nodeIds = ['node1', 'node2', 'node3']
    const dependencies = new Map([
      ['node1', []],
      ['node2', []],
      ['node3', []]
    ])
    
    progressTracker.initializeNodeStates(nodeIds, dependencies)
    
    // Complete one node
    progressTracker.updateNodeStatus('test-execution', 'node1', NodeExecutionStatus.COMPLETED)
    
    let status = progressTracker.getExecutionFlowStatus('test-execution')
    expect(status.progress).toBe(33) // 1/3 * 100, rounded
    
    // Complete second node
    progressTracker.updateNodeStatus('test-execution', 'node2', NodeExecutionStatus.COMPLETED)
    
    status = progressTracker.getExecutionFlowStatus('test-execution')
    expect(status.progress).toBe(67) // 2/3 * 100, rounded
    
    // Complete third node
    progressTracker.updateNodeStatus('test-execution', 'node3', NodeExecutionStatus.COMPLETED)
    
    status = progressTracker.getExecutionFlowStatus('test-execution')
    expect(status.progress).toBe(100)
    expect(status.overallStatus).toBe('completed')
  })

  it('should handle node failures correctly', () => {
    const nodeIds = ['node1']
    const dependencies = new Map([['node1', []]])
    
    progressTracker.initializeNodeStates(nodeIds, dependencies)
    progressTracker.updateNodeStatus('test-execution', 'node1', NodeExecutionStatus.FAILED, {
      error: { message: 'Test error', timestamp: Date.now() }
    })

    const status = progressTracker.getExecutionFlowStatus('test-execution')
    expect(status.failedNodes).toContain('node1')
    expect(status.overallStatus).toBe('failed')
    
    const visualState = progressTracker.getNodeVisualState('node1')
    expect(visualState.status).toBe(NodeExecutionStatus.FAILED)
    expect(visualState.animationState).toBe('error')
    expect(visualState.errorMessage).toBe('Test error')
  })

  it('should calculate execution metrics correctly', () => {
    const nodeIds = ['node1', 'node2']
    const dependencies = new Map([
      ['node1', []],
      ['node2', []]
    ])
    
    progressTracker.initializeNodeStates(nodeIds, dependencies)
    
    // Start nodes first, then complete them with different durations
    const now = Date.now()
    
    // Start node1
    progressTracker.updateNodeStatus('test-execution', 'node1', NodeExecutionStatus.RUNNING, {
      startTime: now
    })
    // Complete node1
    progressTracker.updateNodeStatus('test-execution', 'node1', NodeExecutionStatus.COMPLETED, {
      endTime: now + 1000
    })
    
    // Start node2
    progressTracker.updateNodeStatus('test-execution', 'node2', NodeExecutionStatus.RUNNING, {
      startTime: now
    })
    // Fail node2
    progressTracker.updateNodeStatus('test-execution', 'node2', NodeExecutionStatus.FAILED, {
      endTime: now + 2000
    })

    const metrics = progressTracker.getExecutionMetrics('test-execution')
    expect(metrics.totalNodes).toBe(2)
    expect(metrics.completedNodes).toBe(1)
    expect(metrics.failedNodes).toBe(1)
    expect(metrics.averageNodeDuration).toBe(1500) // (1000 + 2000) / 2
  })

  it('should reset state correctly', () => {
    const nodeIds = ['node1']
    const dependencies = new Map([['node1', []]])
    
    progressTracker.initializeNodeStates(nodeIds, dependencies)
    progressTracker.updateNodeStatus('test-execution', 'node1', NodeExecutionStatus.RUNNING)
    
    progressTracker.reset()
    
    const status = progressTracker.getExecutionFlowStatus('test-execution')
    expect(status.nodeStates.size).toBe(0)
    expect(status.progress).toBe(0)
  })
})
