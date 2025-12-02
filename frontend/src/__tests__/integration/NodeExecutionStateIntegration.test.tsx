import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExecutionStateManager } from '@/services/ExecutionStateManager'
import { NodeExecutionStatus } from '@/types/execution'

// Mock the ExecutionWebSocket
vi.mock('@/services/ExecutionWebSocket', () => ({
  ExecutionWebSocket: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    subscribeToExecution: vi.fn().mockResolvedValue(undefined),
    unsubscribeFromExecution: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn().mockReturnValue(() => {}),
    isConnected: vi.fn().mockReturnValue(true)
  }))
}))

describe('NodeExecutionState Integration', () => {
  let executionStateManager: ExecutionStateManager

  beforeEach(async () => {
    executionStateManager = new ExecutionStateManager()
    await executionStateManager.initialize()
  })

  it('should manage complete execution flow with real-time updates', async () => {
    const executionId = 'integration-test-execution'
    const nodeIds = ['trigger-node', 'process-node', 'output-node']
    const dependencies = new Map([
      ['trigger-node', []],
      ['process-node', ['trigger-node']],
      ['output-node', ['process-node']]
    ])

    // Start tracking execution
    await executionStateManager.startExecution(executionId, nodeIds, dependencies)

    // Verify initial state
    const initialState = executionStateManager.getFlowExecutionState()
    expect(initialState.activeExecutions.size).toBe(1)
    expect(initialState.nodeVisualStates.size).toBe(3)
    expect(initialState.realTimeUpdates).toBe(true)

    // Simulate execution flow
    const stateUpdates: any[] = []
    const unsubscribe = executionStateManager.subscribe((state) => {
      stateUpdates.push(state)
    })

    // Start trigger node
    executionStateManager.updateNodeStatus(
      executionId,
      'trigger-node',
      NodeExecutionStatus.RUNNING,
      { startTime: Date.now() }
    )

    // Complete trigger node
    executionStateManager.updateNodeStatus(
      executionId,
      'trigger-node',
      NodeExecutionStatus.COMPLETED,
      { 
        endTime: Date.now(),
        outputData: { triggerId: 'test-trigger' }
      }
    )

    // Start process node
    executionStateManager.updateNodeStatus(
      executionId,
      'process-node',
      NodeExecutionStatus.RUNNING,
      { 
        startTime: Date.now(),
        inputData: { triggerId: 'test-trigger' }
      }
    )

    // Complete process node
    executionStateManager.updateNodeStatus(
      executionId,
      'process-node',
      NodeExecutionStatus.COMPLETED,
      { 
        endTime: Date.now(),
        outputData: { processedData: 'result' }
      }
    )

    // Start output node
    executionStateManager.updateNodeStatus(
      executionId,
      'output-node',
      NodeExecutionStatus.RUNNING,
      { 
        startTime: Date.now(),
        inputData: { processedData: 'result' }
      }
    )

    // Complete output node
    executionStateManager.updateNodeStatus(
      executionId,
      'output-node',
      NodeExecutionStatus.COMPLETED,
      { 
        endTime: Date.now(),
        outputData: { success: true }
      }
    )

    // Verify final state
    const finalState = executionStateManager.getFlowExecutionState()
    const execution = finalState.activeExecutions.get(executionId)
    
    expect(execution).toBeDefined()
    expect(execution?.overallStatus).toBe('completed')
    expect(execution?.progress).toBe(100)
    expect(execution?.completedNodes).toHaveLength(3)
    expect(execution?.failedNodes).toHaveLength(0)

    // Verify node visual states
    const triggerVisualState = executionStateManager.getNodeVisualState('trigger-node', executionId)
    expect(triggerVisualState.status).toBe(NodeExecutionStatus.COMPLETED)
    expect(triggerVisualState.animationState).toBe('success')

    const processVisualState = executionStateManager.getNodeVisualState('process-node', executionId)
    expect(processVisualState.status).toBe(NodeExecutionStatus.COMPLETED)
    expect(processVisualState.animationState).toBe('success')

    const outputVisualState = executionStateManager.getNodeVisualState('output-node', executionId)
    expect(outputVisualState.status).toBe(NodeExecutionStatus.COMPLETED)
    expect(outputVisualState.animationState).toBe('success')

    // Verify state updates were triggered
    expect(stateUpdates.length).toBeGreaterThan(0)

    // Clean up
    unsubscribe()
    await executionStateManager.stopExecution(executionId)
  })

  it('should handle execution failures correctly', async () => {
    const executionId = 'failure-test-execution'
    const nodeIds = ['node1', 'node2']
    const dependencies = new Map([
      ['node1', []],
      ['node2', ['node1']]
    ])

    await executionStateManager.startExecution(executionId, nodeIds, dependencies)

    // Start and fail first node
    executionStateManager.updateNodeStatus(
      executionId,
      'node1',
      NodeExecutionStatus.RUNNING,
      { startTime: Date.now() }
    )

    executionStateManager.updateNodeStatus(
      executionId,
      'node1',
      NodeExecutionStatus.FAILED,
      { 
        endTime: Date.now(),
        error: { message: 'Test error', code: 'TEST_ERROR' }
      }
    )

    // Verify failure state
    const state = executionStateManager.getFlowExecutionState()
    const execution = state.activeExecutions.get(executionId)
    
    expect(execution?.overallStatus).toBe('failed')
    expect(execution?.failedNodes).toContain('node1')
    expect(execution?.completedNodes).toHaveLength(0)

    const visualState = executionStateManager.getNodeVisualState('node1', executionId)
    expect(visualState.status).toBe(NodeExecutionStatus.FAILED)
    expect(visualState.animationState).toBe('error')
    expect(visualState.errorMessage).toBe('Test error')

    await executionStateManager.stopExecution(executionId)
  })

  it('should handle multiple concurrent executions', async () => {
    const execution1Id = 'concurrent-execution-1'
    const execution2Id = 'concurrent-execution-2'
    const nodeIds = ['node1', 'node2']
    const dependencies = new Map([
      ['node1', []],
      ['node2', ['node1']]
    ])

    // Start both executions
    await executionStateManager.startExecution(execution1Id, nodeIds, dependencies)
    await executionStateManager.startExecution(execution2Id, nodeIds, dependencies)

    // Verify both are tracked
    const state = executionStateManager.getFlowExecutionState()
    expect(state.activeExecutions.size).toBe(2)
    expect(state.activeExecutions.has(execution1Id)).toBe(true)
    expect(state.activeExecutions.has(execution2Id)).toBe(true)

    // Update different nodes in each execution
    executionStateManager.updateNodeStatus(
      execution1Id,
      'node1',
      NodeExecutionStatus.COMPLETED
    )

    executionStateManager.updateNodeStatus(
      execution2Id,
      'node2',
      NodeExecutionStatus.RUNNING
    )

    // Get updated state after changes
    const updatedState = executionStateManager.getFlowExecutionState()
    const execution1 = updatedState.activeExecutions.get(execution1Id)
    const execution2 = updatedState.activeExecutions.get(execution2Id)

    expect(execution1?.completedNodes).toContain('node1')
    expect(execution1?.currentlyExecuting).not.toContain('node2')

    expect(execution2?.currentlyExecuting).toContain('node2')
    expect(execution2?.completedNodes).not.toContain('node1')

    // Clean up
    await executionStateManager.stopExecution(execution1Id)
    await executionStateManager.stopExecution(execution2Id)
  })

  it('should calculate execution metrics correctly', async () => {
    const executionId = 'metrics-test-execution'
    const nodeIds = ['fast-node', 'slow-node', 'failed-node']
    const dependencies = new Map([
      ['fast-node', []],
      ['slow-node', []],
      ['failed-node', []]
    ])

    await executionStateManager.startExecution(executionId, nodeIds, dependencies)

    const now = Date.now()

    // Fast node (100ms)
    executionStateManager.updateNodeStatus(
      executionId,
      'fast-node',
      NodeExecutionStatus.RUNNING,
      { startTime: now }
    )
    executionStateManager.updateNodeStatus(
      executionId,
      'fast-node',
      NodeExecutionStatus.COMPLETED,
      { endTime: now + 100 }
    )

    // Slow node (1000ms)
    executionStateManager.updateNodeStatus(
      executionId,
      'slow-node',
      NodeExecutionStatus.RUNNING,
      { startTime: now }
    )
    executionStateManager.updateNodeStatus(
      executionId,
      'slow-node',
      NodeExecutionStatus.COMPLETED,
      { endTime: now + 1000 }
    )

    // Failed node (500ms)
    executionStateManager.updateNodeStatus(
      executionId,
      'failed-node',
      NodeExecutionStatus.RUNNING,
      { startTime: now }
    )
    executionStateManager.updateNodeStatus(
      executionId,
      'failed-node',
      NodeExecutionStatus.FAILED,
      { endTime: now + 500 }
    )

    // Get metrics through ProgressTracker
    const progressTracker = (executionStateManager as any).progressTrackers.get(executionId)
    const metrics = progressTracker.getExecutionMetrics(executionId)

    expect(metrics.totalNodes).toBe(3)
    expect(metrics.completedNodes).toBe(2)
    expect(metrics.failedNodes).toBe(1)
    expect(Math.round(metrics.averageNodeDuration)).toBe(533) // (100 + 1000 + 500) / 3

    await executionStateManager.stopExecution(executionId)
  })
})
