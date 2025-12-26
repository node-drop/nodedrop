import { Server as HTTPServer } from "http";
import { Socket, Server as SocketIOServer } from "socket.io";
import {
  ExecutionEventData,
  ExecutionProgress,
  NodeExecutionStatus,
} from "../types/execution.types";
import { logger } from "../utils/logger";
import { db } from "../db/client";
import { sessions } from "../db/schema/auth";
import { workflows } from "../db/schema/workflows";
import { eq } from "drizzle-orm";
import { EventBufferService } from "./EventBufferService";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: {
    id: string;
    email: string;
  };
}

export interface SocketAuthPayload {
  id: string;
  email: string;
}

export interface ExecutionLogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  nodeId?: string;
  data?: any;
  timestamp: Date;
}

export interface SocketServiceConfig {
  redisUrl?: string;
  redisPassword?: string;
  enableRedisAdapter?: boolean;
  bufferRetentionMs?: number;
  maxBufferedExecutions?: number;
  maxEventsPerExecution?: number;
}

export interface AdapterStatus {
  enabled: boolean;
  connected: boolean;
  error?: string;
}

export class SocketService {
  private io: SocketIOServer;

  // Event buffering for late subscribers (deprecated - will be removed)
  private executionEventBuffer: Map<string, ExecutionEventData[]> = new Map();
  private bufferRetentionMs = 60000; // Keep events for 60 seconds (increased for production latency)
  private bufferCleanupInterval: NodeJS.Timeout;
  
  // Memory leak prevention limits
  private MAX_BUFFERED_EXECUTIONS: number;
  private MAX_EVENTS_PER_EXECUTION: number;

  // Redis adapter for horizontal scaling
  private redisAdapter?: any;
  private redisPubClient?: any;
  private redisSubClient?: any;
  private adapterEnabled: boolean = false;
  private adapterError?: string;
  private eventBufferService?: EventBufferService;

  constructor(httpServer: HTTPServer, config?: SocketServiceConfig) {
    // Read configuration from environment variables or config parameter
    const redisUrl = config?.redisUrl || process.env.REDIS_URL || "redis://localhost:6379";
    const enableAdapter = config?.enableRedisAdapter ?? 
      (process.env.ENABLE_SOCKET_REDIS_ADAPTER === "true");
    const bufferRetentionMs = config?.bufferRetentionMs ?? 
      parseInt(process.env.SOCKET_BUFFER_RETENTION_MS || "60000", 10);
    const maxBufferedExecutions = config?.maxBufferedExecutions ?? 
      parseInt(process.env.SOCKET_MAX_BUFFERED_EXECUTIONS || "100", 10);
    const maxEventsPerExecution = config?.maxEventsPerExecution ?? 
      parseInt(process.env.SOCKET_MAX_EVENTS_PER_EXECUTION || "20", 10);

    this.bufferRetentionMs = bufferRetentionMs;
    this.MAX_BUFFERED_EXECUTIONS = maxBufferedExecutions;
    this.MAX_EVENTS_PER_EXECUTION = maxEventsPerExecution;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      },
      transports: ["websocket", "polling"],
      // Production-ready timeout configuration
      pingTimeout: 60000,        // 60 seconds - how long to wait for pong before considering connection dead
      pingInterval: 25000,       // 25 seconds - how often to send ping packets
      connectTimeout: 45000,     // 45 seconds - connection timeout
      upgradeTimeout: 30000,     // 30 seconds - upgrade timeout
      maxHttpBufferSize: 1e6,    // 1MB - max buffer size
    });

    // Initialize Redis adapter if enabled
    if (enableAdapter) {
      this.initializeRedisAdapter(redisUrl, config?.redisPassword).catch((error) => {
        logger.warn(
          "Redis adapter unavailable, running in single-server mode",
          error
        );
        // Continue without adapter - graceful degradation
      });
    }

    // Initialize EventBufferService
    this.eventBufferService = new EventBufferService({
      bufferRetentionMs,
      maxBufferedExecutions,
      maxEventsPerExecution,
    });

    this.setupAuthentication();
    this.setupConnectionHandlers();

    // Start cleanup interval for event buffer
    this.bufferCleanupInterval = setInterval(() => {
      this.cleanupEventBuffer();
    }, 5000); // Clean up every 5 seconds
  }

  /**
   * Initialize Redis adapter for Socket.IO
   * Enables horizontal scaling across multiple server instances
   */
  private async initializeRedisAdapter(
    redisUrl: string,
    redisPassword?: string
  ): Promise<void> {
    try {
      logger.info("Initializing Socket.IO Redis adapter...", { redisUrl });

      // Create separate Redis clients for pub and sub
      // Socket.IO adapter requires separate clients for publishing and subscribing
      this.redisPubClient = createClient({
        url: redisUrl,
        password: redisPassword,
      });

      this.redisSubClient = this.redisPubClient.duplicate();

      // Set up error handlers before connecting
      this.redisPubClient.on("error", (err: Error) => {
        logger.error("Redis pub client error:", err);
        this.adapterError = err.message;
      });

      this.redisSubClient.on("error", (err: Error) => {
        logger.error("Redis sub client error:", err);
        this.adapterError = err.message;
      });

      // Connect both clients
      await Promise.all([
        this.redisPubClient.connect(),
        this.redisSubClient.connect(),
      ]);

      // Create and attach the adapter
      this.redisAdapter = createAdapter(this.redisPubClient, this.redisSubClient);
      this.io.adapter(this.redisAdapter);

      this.adapterEnabled = true;
      this.adapterError = undefined;

      logger.info("Socket.IO Redis adapter initialized successfully");
    } catch (error: any) {
      logger.error("Failed to initialize Redis adapter:", error);
      this.adapterError = error.message;
      this.adapterEnabled = false;
      
      // Clean up clients if initialization failed
      if (this.redisPubClient) {
        try {
          await this.redisPubClient.quit();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.redisPubClient = undefined;
      }
      
      if (this.redisSubClient) {
        try {
          await this.redisSubClient.quit();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.redisSubClient = undefined;
      }
      
      // Re-throw to be caught by graceful degradation handler
      throw error;
    }
  }

  /**
   * Setup Socket.io authentication middleware
   * Uses better-auth session tokens (stored in database) instead of JWT
   */
  private setupAuthentication(): void {
    this.io.use(async (socket: any, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          logger.warn("Socket connection attempted without token");
          return next(new Error("Authentication token required"));
        }

        // Validate session token from database (better-auth uses session tokens, not JWT)
        const session = await db.query.sessions.findFirst({
          where: eq(sessions.token, token),
          with: {
            user: true
          }
        });

        if (!session) {
          logger.warn("Socket connection with invalid session token");
          return next(new Error("Invalid authentication token"));
        }

        // Check if session is expired
        if (session.expiresAt < new Date()) {
          logger.warn("Socket connection with expired session token");
          return next(new Error("Session expired"));
        }

        // Check if user is active
        if (!session.user.active) {
          logger.warn("Socket connection from deactivated user");
          return next(new Error("User account is deactivated"));
        }

        socket.userId = session.user.id;
        socket.user = {
          id: session.user.id,
          email: session.user.email,
        };

        // Socket authenticated silently
        next();
      } catch (error) {
        logger.error("Socket authentication failed:", error);
        next(new Error("Invalid authentication token"));
      }
    });
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      // User connected silently

      // Join user-specific room for targeted broadcasts
      socket.join(`user:${authSocket.userId}`);

      // Handle execution subscription
      socket.on(
        "subscribe-execution",
        (executionId: string, callback?: Function) => {
          this.handleExecutionSubscription(authSocket, executionId, callback);
        }
      );

      // Handle execution unsubscription
      socket.on(
        "unsubscribe-execution",
        (executionId: string, callback?: Function) => {
          this.handleExecutionUnsubscription(authSocket, executionId, callback);
        }
      );

      // Handle workflow subscription (for all executions of a workflow)
      socket.on("subscribe-workflow", (workflowId: string) => {
        this.handleWorkflowSubscription(authSocket, workflowId);
      });

      // Handle workflow unsubscription
      socket.on("unsubscribe-workflow", (workflowId: string) => {
        this.handleWorkflowUnsubscription(authSocket, workflowId);
      });

      // Handle workflow execution start (NEW)
      socket.on(
        "start-workflow-execution",
        async (data: any, callback?: Function) => {
          await this.handleStartWorkflowExecution(authSocket, data, callback);
        }
      );

      // Handle disconnect
      socket.on("disconnect", () => {
        // User disconnected silently
        logger.info(`User ${authSocket.userId} disconnected from Socket.io`);
      });

      // Send connection confirmation
      socket.emit("connected", {
        message: "Successfully connected to real-time updates",
        userId: authSocket.userId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle execution subscription
   */
  private async handleExecutionSubscription(
    socket: AuthenticatedSocket,
    executionId: string,
    callback?: Function
  ): Promise<void> {
    logger.debug(
      `User ${socket.userId} subscribing to execution ${executionId}`
    );

    try {
      // Join execution-specific room
      socket.join(`execution:${executionId}`);

      // Send any buffered events for this execution to the new subscriber
      if (this.eventBufferService) {
        const bufferedEvents = await this.eventBufferService.getBufferedEvents(executionId);
        if (bufferedEvents.length > 0) {
          logger.info(
            `Sending ${bufferedEvents.length} buffered events for execution ${executionId} to late subscriber`
          );
          bufferedEvents.forEach((eventData) => {
            socket.emit("execution-event", eventData);
          });
        }
      }

      // Confirm subscription with callback if provided
      if (callback) {
        callback({ success: true, executionId });
      }

      // Also emit the traditional event for compatibility
      socket.emit("execution-subscribed", {
        executionId,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        `User ${socket.userId} successfully subscribed to execution ${executionId}`
      );
    } catch (error) {
      logger.error(
        `Failed to subscribe user ${socket.userId} to execution ${executionId}:`,
        error
      );

      if (callback) {
        callback({ success: false, error: "Subscription failed" });
      }
    }
  }

  /**
   * Handle execution unsubscription
   */
  private handleExecutionUnsubscription(
    socket: AuthenticatedSocket,
    executionId: string,
    callback?: Function
  ): void {
    logger.debug(
      `User ${socket.userId} unsubscribing from execution ${executionId}`
    );

    try {
      // Leave execution-specific room
      socket.leave(`execution:${executionId}`);

      // Confirm unsubscription with callback if provided
      if (callback) {
        callback({ success: true, executionId });
      }

      // Also emit the traditional event for compatibility
      socket.emit("execution-unsubscribed", {
        executionId,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        `User ${socket.userId} successfully unsubscribed from execution ${executionId}`
      );
    } catch (error) {
      logger.error(
        `Failed to unsubscribe user ${socket.userId} from execution ${executionId}:`,
        error
      );

      if (callback) {
        callback({ success: false, error: "Unsubscription failed" });
      }
    }
  }

  /**
   * Handle workflow subscription
   */
  private handleWorkflowSubscription(
    socket: AuthenticatedSocket,
    workflowId: string
  ): void {
    // Join workflow-specific room
    socket.join(`workflow:${workflowId}`);

    // Confirm subscription
    socket.emit("workflow-subscribed", {
      workflowId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle workflow unsubscription
   */
  private handleWorkflowUnsubscription(
    socket: AuthenticatedSocket,
    workflowId: string
  ): void {
    console.log(`📡 User ${socket.userId} UNSUBSCRIBING from workflow:${workflowId}`);
    logger.debug(
      `User ${socket.userId} unsubscribing from workflow ${workflowId}`
    );

    // Leave workflow-specific room
    socket.leave(`workflow:${workflowId}`);

    // Confirm unsubscription
    socket.emit("workflow-unsubscribed", {
      workflowId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast execution event to subscribers
   */
  public broadcastExecutionEvent(
    executionId: string,
    eventData: ExecutionEventData,
    workflowId?: string // Optional workflow ID to also broadcast to workflow room
  ): void {
    logger.info(
      `Broadcasting execution event for ${executionId}:`,
      {
        type: eventData.type,
        nodeId: eventData.nodeId,
        room: `execution:${executionId}`,
      }
    );

    // Add timestamp if not present
    const eventWithTimestamp = {
      ...eventData,
      executionId,
      timestamp: eventData.timestamp || new Date(),
    };

    // Buffer the event for late subscribers
    this.bufferExecutionEvent(executionId, eventWithTimestamp);

    // Emit to execution-specific room
    this.io
      .to(`execution:${executionId}`)
      .emit("execution-event", eventWithTimestamp);
    
    logger.info(`Emitted execution-event to room execution:${executionId}`, {
      type: eventData.type,
      nodeId: eventData.nodeId,
    });

    // ALSO emit to workflow room if workflowId provided
    // This allows users viewing the workflow to see webhook executions in real-time
    if (workflowId) {
      logger.debug(
        `Also broadcasting execution event to workflow room: workflow:${workflowId}`
      );
      this.io
        .to(`workflow:${workflowId}`)
        .emit("execution-event", eventWithTimestamp);
    }
  }

  /**
   * Broadcast execution progress update
   */
  public broadcastExecutionProgress(
    executionId: string,
    progress: ExecutionProgress
  ): void {
    logger.debug(`Broadcasting execution progress for ${executionId}:`, {
      completedNodes: progress.completedNodes,
      totalNodes: progress.totalNodes,
      status: progress.status,
    });

    this.io.to(`execution:${executionId}`).emit("execution-progress", {
      ...progress,
      executionId,
    });
  }

  /**
   * Broadcast execution log entry
   */
  public broadcastExecutionLog(
    executionId: string,
    logEntry: ExecutionLogEntry
  ): void {
    logger.debug(`Broadcasting execution log for ${executionId}`);

    this.io.to(`execution:${executionId}`).emit("execution-log", {
      executionId,
      ...logEntry,
    });
  }

  /**
   * Broadcast node execution event
   */
  public broadcastNodeExecutionEvent(
    executionId: string,
    nodeId: string,
    eventType: "started" | "completed" | "failed",
    data?: any
  ): void {
    logger.debug(
      `Broadcasting node execution event for ${executionId}:${nodeId}:`,
      eventType
    );

    this.io.to(`execution:${executionId}`).emit("node-execution-event", {
      executionId,
      nodeId,
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast node execution state update
   */
  public broadcastNodeStateUpdate(
    executionId: string,
    nodeId: string,
    status: NodeExecutionStatus,
    data?: {
      progress?: number;
      error?: any;
      inputData?: any;
      outputData?: any;
      startTime?: number;
      endTime?: number;
      duration?: number;
    }
  ): void {
    logger.debug(
      `Broadcasting node state update for ${executionId}:${nodeId}:`,
      status
    );

    const eventData: ExecutionEventData = {
      executionId,
      type: "node-status-update",
      nodeId,
      status,
      progress: data?.progress,
      data: data
        ? {
            inputData: data.inputData,
            outputData: data.outputData,
            startTime: data.startTime,
            endTime: data.endTime,
            duration: data.duration,
          }
        : undefined,
      error: data?.error,
      timestamp: new Date(),
    };

    this.io.to(`execution:${executionId}`).emit("execution-event", eventData);
  }

  /**
   * Broadcast execution flow status update
   */
  public broadcastExecutionFlowStatus(
    executionId: string,
    flowStatus: {
      overallStatus: "running" | "completed" | "failed" | "cancelled";
      progress: number;
      currentlyExecuting: string[];
      completedNodes: string[];
      failedNodes: string[];
      queuedNodes: string[];
      executionPath: string[];
      estimatedTimeRemaining?: number;
    }
  ): void {
    logger.debug(
      `Broadcasting execution flow status for ${executionId}:`,
      flowStatus.overallStatus
    );

    const eventData: ExecutionEventData = {
      executionId,
      type: "execution-progress",
      progress: flowStatus.progress,
      data: flowStatus,
      timestamp: new Date(),
    };

    this.io.to(`execution:${executionId}`).emit("execution-event", eventData);
  }

  /**
   * Send execution status to specific user
   */
  public sendExecutionStatusToUser(
    userId: string,
    executionId: string,
    status: any
  ): void {
    this.io.to(`user:${userId}`).emit("execution-status", {
      executionId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event to a specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get connected users for a specific execution
   */
  public getExecutionSubscribersCount(executionId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`execution:${executionId}`);
    return room ? room.size : 0;
  }

  /**
   * Cleanup execution room to prevent memory leaks
   */
  public async cleanupExecutionRoom(executionId: string): Promise<void> {
    const room = `execution:${executionId}`;
    
    // Get all sockets in the room
    const socketsInRoom = this.io.sockets.adapter.rooms.get(room);
    
    if (socketsInRoom) {
      // Make all sockets leave the room
      socketsInRoom.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(room);
        }
      });
      
      logger.debug(`Cleaned up room: ${room}, removed ${socketsInRoom.size} sockets`);
    }
    
    // Also cleanup the event buffer for this execution
    if (this.eventBufferService) {
      await this.eventBufferService.deleteBuffer(executionId);
      logger.debug(`Cleaned up event buffer for execution: ${executionId}`);
    }
  }

  /**
   * Disconnect all sockets for a user (useful for logout)
   */
  public disconnectUser(userId: string): void {
    this.io.to(`user:${userId}`).disconnectSockets();
  }

  /**
   * Get Socket.io server instance
   */
  public getServer(): SocketIOServer {
    return this.io;
  }

  /**
   * Debug: Get all rooms and their clients
   */
  public getAllRooms(): Map<string, Set<string>> {
    return this.io.sockets.adapter.rooms;
  }

  /**
   * Debug: Log all workflow rooms
   */
  public logWorkflowRooms(): void {
    const rooms = this.getAllRooms();
    console.log('\n📊 === SOCKET ROOMS DEBUG ===');
    console.log(`Total rooms: ${rooms.size}`);
    
    rooms.forEach((clients, roomName) => {
      if (roomName.startsWith('workflow:')) {
        console.log(`  ${roomName}: ${clients.size} client(s)`);
        clients.forEach(clientId => {
          console.log(`    - ${clientId}`);
        });
      }
    });
    console.log('📊 === END DEBUG ===\n');
  }

  /**
   * Get Redis adapter status
   * Returns connection state and any errors
   */
  public getAdapterStatus(): AdapterStatus {
    return {
      enabled: this.adapterEnabled,
      connected: this.isRedisConnected(),
      error: this.adapterError,
    };
  }

  /**
   * Check if Redis adapter is connected
   */
  public isRedisConnected(): boolean {
    if (!this.adapterEnabled) {
      return false;
    }

    // Check if both pub and sub clients are connected
    const pubConnected = this.redisPubClient?.isOpen ?? false;
    const subConnected = this.redisSubClient?.isOpen ?? false;

    return pubConnected && subConnected;
  }

  /**
   * Shutdown the socket service
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down Socket.io service...");

    // Clear the buffer cleanup interval
    if (this.bufferCleanupInterval) {
      clearInterval(this.bufferCleanupInterval);
    }

    // Disconnect all clients
    this.io.disconnectSockets();

    // Close Redis clients if they exist
    if (this.redisPubClient) {
      try {
        await this.redisPubClient.quit();
        logger.info("Redis pub client closed");
      } catch (error) {
        logger.error("Error closing Redis pub client:", error);
      }
    }

    if (this.redisSubClient) {
      try {
        await this.redisSubClient.quit();
        logger.info("Redis sub client closed");
      } catch (error) {
        logger.error("Error closing Redis sub client:", error);
      }
    }

    // Close the server
    this.io.close();

    logger.info("Socket.io service shutdown complete");
  }

  /**
   * Buffer execution event for late subscribers
   */
  private async bufferExecutionEvent(
    executionId: string,
    eventData: ExecutionEventData
  ): Promise<void> {
    if (this.eventBufferService) {
      await this.eventBufferService.bufferEvent(executionId, eventData);
    }
  }

  /**
   * Clean up old buffered events
   */
  private async cleanupEventBuffer(): Promise<void> {
    if (this.eventBufferService) {
      await this.eventBufferService.cleanupExpiredBuffers();
    }
  }

  /**
   * Handle workflow execution start via WebSocket
   */
  private async handleStartWorkflowExecution(
    socket: AuthenticatedSocket,
    data: {
      workflowId: string;
      triggerData?: any;
      options?: any;
      triggerNodeId?: string;
      workflowData?: { nodes?: any[]; connections?: any[]; settings?: any };
    },
    callback?: Function
  ): Promise<void> {
    try {
      logger.info(`User ${socket.userId} starting workflow execution via WebSocket`, {
        workflowId: data.workflowId,
        triggerNodeId: data.triggerNodeId,
      });

      // Get RealtimeExecutionEngine from global
      const globalAny = global as any;
      if (!globalAny.realtimeExecutionEngine) {
        throw new Error("RealtimeExecutionEngine not available");
      }

      // Validate required data
      if (!data.workflowData?.nodes || !data.workflowData?.connections) {
        throw new Error("Workflow data (nodes and connections) is required");
      }

      if (!data.triggerNodeId) {
        throw new Error("Trigger node ID is required");
      }

      // Get workspaceId from workflow if it exists (for saved workflows)
      let workspaceId: string | null = null;
      if (data.workflowId && data.workflowId !== "new") {
        const workflow = await db.query.workflows.findFirst({
          where: eq(workflows.id, data.workflowId),
          columns: { workspaceId: true },
        });
        workspaceId = workflow?.workspaceId || null;
      }

      // Start execution (returns immediately with execution ID)
      const executionId = await globalAny.realtimeExecutionEngine.startExecution(
        data.workflowId,
        socket.userId,
        data.triggerNodeId,
        data.triggerData,
        data.workflowData.nodes,
        data.workflowData.connections,
        { ...data.options, workspaceId } // Pass options including saveToDatabase and workspaceId
      );

      // Return execution ID immediately
      if (callback) {
        callback({
          success: true,
          executionId,
          message: "Workflow execution started",
        });
      }

      logger.info(`Workflow execution started: ${executionId}`);

    } catch (error: any) {
      logger.error(`Failed to start workflow execution:`, error);

      if (callback) {
        callback({
          success: false,
          error: error.message || "Failed to start execution",
        });
      }
    }
  }
}
