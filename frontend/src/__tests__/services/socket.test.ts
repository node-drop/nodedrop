import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  auth: {}
};

const mockIo = vi.fn(() => mockSocket);

vi.mock('socket.io-client', () => ({
  io: mockIo
}));

// Mock auth store
const mockAuthStore = {
  getState: vi.fn(() => ({
    token: 'test-token'
  }))
};

vi.mock('../../stores/auth', () => ({
  useAuthStore: mockAuthStore
}));

describe('SocketService', () => {
  let SocketService: any;
  let socketService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    
    // Reset environment
    import.meta.env.VITE_API_URL = 'http://localhost:4000';
    
    // Import SocketService after mocks are set up
    const module = await import('../../services/socket');
    SocketService = module.SocketService;
    socketService = new SocketService();
  });

  afterEach(() => {
    if (socketService) {
      socketService.disconnect();
    }
  });

  describe('Connection', () => {
    it('should initialize with auth token', () => {
      expect(mockIo).toHaveBeenCalledWith('http://localhost:4000', {
        auth: { token: 'test-token' },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
    });

    it('should not connect without token', async () => {
      mockAuthStore.getState.mockReturnValue({ token: null });
      
      const service = new SocketService();
      
      // Should warn and not attempt connection
      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should setup event handlers on connection', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('execution-event', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('execution-progress', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('execution-log', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('node-execution-event', expect.any(Function));
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should subscribe to execution', () => {
      const executionId = 'test-execution-id';
      
      socketService.subscribeToExecution(executionId);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-execution', executionId);
    });

    it('should unsubscribe from execution', () => {
      const executionId = 'test-execution-id';
      
      socketService.unsubscribeFromExecution(executionId);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe-execution', executionId);
    });

    it('should subscribe to workflow', () => {
      const workflowId = 'test-workflow-id';
      
      socketService.subscribeToWorkflow(workflowId);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-workflow', workflowId);
    });

    it('should unsubscribe from workflow', () => {
      const workflowId = 'test-workflow-id';
      
      socketService.unsubscribeFromWorkflow(workflowId);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe-workflow', workflowId);
    });

    it('should not emit when socket is disconnected', () => {
      mockSocket.connected = false;
      
      socketService.subscribeToExecution('test-id');
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should add event listeners', () => {
      const handler = vi.fn();
      
      socketService.on('test-event', handler);
      
      // Simulate event emission
      const eventHandlers = (socketService as any).eventHandlers;
      const handlers = eventHandlers.get('test-event');
      
      expect(handlers).toBeDefined();
      expect(handlers.has(handler)).toBe(true);
    });

    it('should remove event listeners', () => {
      const handler = vi.fn();
      
      socketService.on('test-event', handler);
      socketService.off('test-event', handler);
      
      const eventHandlers = (socketService as any).eventHandlers;
      const handlers = eventHandlers.get('test-event');
      
      expect(handlers).toBeUndefined();
    });

    it('should handle execution events', () => {
      const handler = vi.fn();
      socketService.on('execution-event', handler);
      
      // Simulate receiving an execution event
      const eventData = {
        executionId: 'test-id',
        type: 'started',
        timestamp: new Date()
      };
      
      // Get the handler that was registered with the socket
      const socketHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'execution-event'
      )?.[1];
      
      if (socketHandler) {
        socketHandler(eventData);
        expect(handler).toHaveBeenCalledWith(eventData);
      }
    });

    it('should handle execution progress events', () => {
      const handler = vi.fn();
      socketService.on('execution-progress', handler);
      
      const progressData = {
        executionId: 'test-id',
        totalNodes: 5,
        completedNodes: 2,
        failedNodes: 0,
        status: 'running',
        startedAt: new Date()
      };
      
      const socketHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'execution-progress'
      )?.[1];
      
      if (socketHandler) {
        socketHandler(progressData);
        expect(handler).toHaveBeenCalledWith(progressData);
      }
    });
  });

  describe('Connection Status', () => {
    it('should return connection status', () => {
      mockSocket.connected = true;
      
      expect(socketService.isConnected()).toBe(true);
      
      const status = socketService.getConnectionStatus();
      expect(status.connected).toBe(true);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.maxReconnectAttempts).toBe(5);
    });

    it('should handle reconnection', () => {
      socketService.reconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should update authentication', () => {
      const newToken = 'new-token';
      
      socketService.updateAuth(newToken);
      
      expect(mockSocket.auth).toEqual({ token: newToken });
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.connect).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should disconnect and clear handlers', () => {
      const handler = vi.fn();
      socketService.on('test-event', handler);
      
      socketService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
      
      const eventHandlers = (socketService as any).eventHandlers;
      expect(eventHandlers.size).toBe(0);
    });
  });
});
