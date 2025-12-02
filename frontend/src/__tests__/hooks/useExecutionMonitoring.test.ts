import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionMonitoring, useExecutionMonitor } from '../../hooks/useExecutionMonitoring';

// Mock socket service
const mockSocketService = {
  isConnected: vi.fn(() => true),
  getConnectionStatus: vi.fn(() => ({
    connected: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  })),
  subscribeToExecution: vi.fn(),
  unsubscribeFromExecution: vi.fn(),
  subscribeToWorkflow: vi.fn(),
  unsubscribeFromWorkflow: vi.fn(),
  reconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('../../services/socket', () => ({
  socketService: mockSocketService
}));

describe('useExecutionMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.currentExecution).toBe(null);
    expect(result.current.executionEvents).toEqual([]);
    expect(result.current.executionProgress).toBe(null);
    expect(result.current.executionLogs).toEqual([]);
    expect(result.current.nodeEvents).toEqual([]);
  });

  it('should setup event listeners on mount', () => {
    renderHook(() => useExecutionMonitoring());

    expect(mockSocketService.on).toHaveBeenCalledWith('socket-connected', expect.any(Function));
    expect(mockSocketService.on).toHaveBeenCalledWith('socket-disconnected', expect.any(Function));
    expect(mockSocketService.on).toHaveBeenCalledWith('socket-error', expect.any(Function));
    expect(mockSocketService.on).toHaveBeenCalledWith('execution-event', expect.any(Function));
    expect(mockSocketService.on).toHaveBeenCalledWith('execution-progress', expect.any(Function));
    expect(mockSocketService.on).toHaveBeenCalledWith('execution-log', expect.any(Function));
    expect(mockSocketService.on).toHaveBeenCalledWith('node-execution-event', expect.any(Function));
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useExecutionMonitoring());

    unmount();

    expect(mockSocketService.off).toHaveBeenCalledWith('socket-connected', expect.any(Function));
    expect(mockSocketService.off).toHaveBeenCalledWith('socket-disconnected', expect.any(Function));
    expect(mockSocketService.off).toHaveBeenCalledWith('socket-error', expect.any(Function));
    expect(mockSocketService.off).toHaveBeenCalledWith('execution-event', expect.any(Function));
    expect(mockSocketService.off).toHaveBeenCalledWith('execution-progress', expect.any(Function));
    expect(mockSocketService.off).toHaveBeenCalledWith('execution-log', expect.any(Function));
    expect(mockSocketService.off).toHaveBeenCalledWith('node-execution-event', expect.any(Function));
  });

  it('should subscribe to execution', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    act(() => {
      result.current.subscribeToExecution('test-execution-id');
    });

    expect(result.current.currentExecution).toBe('test-execution-id');
    expect(mockSocketService.subscribeToExecution).toHaveBeenCalledWith('test-execution-id');
  });

  it('should unsubscribe from execution', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    act(() => {
      result.current.subscribeToExecution('test-execution-id');
    });

    act(() => {
      result.current.unsubscribeFromExecution('test-execution-id');
    });

    expect(result.current.currentExecution).toBe(null);
    expect(mockSocketService.unsubscribeFromExecution).toHaveBeenCalledWith('test-execution-id');
  });

  it('should subscribe to workflow', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    act(() => {
      result.current.subscribeToWorkflow('test-workflow-id');
    });

    expect(mockSocketService.subscribeToWorkflow).toHaveBeenCalledWith('test-workflow-id');
  });

  it('should clear execution data', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    // First add some data
    act(() => {
      const executionEventHandler = mockSocketService.on.mock.calls.find(
        call => call[0] === 'execution-event'
      )?.[1];
      
      if (executionEventHandler) {
        executionEventHandler({
          executionId: 'test-id',
          type: 'started',
          timestamp: new Date()
        });
      }
    });

    // Then clear it
    act(() => {
      result.current.clearExecutionData();
    });

    expect(result.current.executionEvents).toEqual([]);
    expect(result.current.executionProgress).toBe(null);
    expect(result.current.executionLogs).toEqual([]);
    expect(result.current.nodeEvents).toEqual([]);
  });

  it('should handle execution events', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    const eventData = {
      executionId: 'test-id',
      type: 'started' as const,
      timestamp: new Date()
    };

    act(() => {
      const executionEventHandler = mockSocketService.on.mock.calls.find(
        call => call[0] === 'execution-event'
      )?.[1];
      
      if (executionEventHandler) {
        executionEventHandler(eventData);
      }
    });

    expect(result.current.executionEvents).toHaveLength(1);
    expect(result.current.executionEvents[0]).toEqual(eventData);
  });

  it('should handle execution progress', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    const progressData = {
      executionId: 'test-id',
      totalNodes: 5,
      completedNodes: 2,
      failedNodes: 0,
      status: 'running' as const,
      startedAt: new Date()
    };

    act(() => {
      const progressHandler = mockSocketService.on.mock.calls.find(
        call => call[0] === 'execution-progress'
      )?.[1];
      
      if (progressHandler) {
        progressHandler(progressData);
      }
    });

    expect(result.current.executionProgress).toEqual(progressData);
  });

  it('should limit stored events to prevent memory issues', () => {
    const { result } = renderHook(() => useExecutionMonitoring());

    // Add more than 100 events
    act(() => {
      const executionEventHandler = mockSocketService.on.mock.calls.find(
        call => call[0] === 'execution-event'
      )?.[1];
      
      if (executionEventHandler) {
        for (let i = 0; i < 150; i++) {
          executionEventHandler({
            executionId: 'test-id',
            type: 'started',
            timestamp: new Date()
          });
        }
      }
    });

    // Should only keep last 100 events
    expect(result.current.executionEvents).toHaveLength(100);
  });
});

describe('useExecutionMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to execution when connected', () => {
    const executionId = 'test-execution-id';
    
    renderHook(() => useExecutionMonitor(executionId));

    expect(mockSocketService.subscribeToExecution).toHaveBeenCalledWith(executionId);
  });

  it('should unsubscribe on unmount', () => {
    const executionId = 'test-execution-id';
    
    const { unmount } = renderHook(() => useExecutionMonitor(executionId));
    
    unmount();

    expect(mockSocketService.unsubscribeFromExecution).toHaveBeenCalledWith(executionId);
  });

  it('should not subscribe when execution ID is null', () => {
    renderHook(() => useExecutionMonitor(null));

    expect(mockSocketService.subscribeToExecution).not.toHaveBeenCalled();
  });

  it('should not subscribe when socket is disconnected', () => {
    mockSocketService.isConnected.mockReturnValue(false);
    mockSocketService.getConnectionStatus.mockReturnValue({
      connected: false,
      reconnectAttempts: 1,
      maxReconnectAttempts: 5
    });

    const executionId = 'test-execution-id';
    
    renderHook(() => useExecutionMonitor(executionId));

    expect(mockSocketService.subscribeToExecution).not.toHaveBeenCalled();
  });

  it('should indicate monitoring status', () => {
    const executionId = 'test-execution-id';
    
    const { result } = renderHook(() => useExecutionMonitor(executionId));

    // Should indicate monitoring after subscription
    expect(result.current.isMonitoring).toBe(true);
  });
});
