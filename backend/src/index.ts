// @ts-nocheck
// Main entry point for the node drop backend
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config"; // Must be first!
import express from "express";
import helmet from "helmet";
import { createServer } from "http";

// Import routes
import aiMemoryRoutes from "./routes/ai-memory.routes";
import { authRoutes } from "./routes/auth";
import credentialRoutes from "./routes/credentials";
import { customNodeRoutes } from "./routes/custom-nodes";
import environmentRoutes from "./routes/environment";
import executionControlRoutes from "./routes/execution-control";
import executionHistoryRoutes from "./routes/execution-history";
import executionRecoveryRoutes from "./routes/execution-recovery";
import executionResumeRoutes from "./routes/execution-resume";
import { executionRoutes } from "./routes/executions";
import flowExecutionRoutes from "./routes/flow-execution";
import googleRoutes from "./routes/google";
import { nodeTypeRoutes } from "./routes/node-types";
import { nodeRoutes } from "./routes/nodes";
import oauthGenericRoutes from "./routes/oauth-generic";
import { publicChatsRoutes } from "./routes/public-chats";
import { publicFormsRoutes } from "./routes/public-forms";
import teamRoutes from "./routes/teams";
import triggerRoutes from "./routes/triggers";
import userRoutes from "./routes/user.routes";
import variableRoutes from "./routes/variables";
import webhookRoutes from "./routes/webhook";
import webhookLogsRoutes from "./routes/webhook-logs";
import { workflowRoutes } from "./routes/workflows";
import workspaceRoutes from "./routes/workspaces";

// Import middleware
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Import services
import { getCredentialService } from "./services/CredentialService.factory";
import { ErrorTriggerService } from "./services/ErrorTriggerService";
import { ExecutionEventBridge, createExecutionEventBridge } from "./services/execution/ExecutionEventBridge";
import ExecutionHistoryService from "./services/execution/ExecutionHistoryService";
import { ExecutionQueueService, getExecutionQueueService } from "./services/execution/ExecutionQueueService";
import { executionServiceDrizzle } from "./services/execution/ExecutionService.factory";
import { ExecutionWorker, getExecutionWorker } from "./services/execution/ExecutionWorker";
import { RealtimeExecutionEngine } from "./services/execution/RealtimeExecutionEngine";
import { NodeLoader } from "./services/NodeLoader";
import { NodeService } from "./services/NodeService";
import { SocketService } from "./services/SocketService";
import { logger } from "./utils/logger";

// Import database after dotenv is loaded
import { db, disconnectDatabase } from "./db/client";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5678; // Default to 5678 

// Set server timeout to prevent gateway timeouts (5 minutes)
httpServer.timeout = 300000; // 5 minutes
httpServer.keepAliveTimeout = 65000; // 65 seconds (slightly higher than typical load balancer timeout)
httpServer.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

// Initialize services
const nodeService = new NodeService();
const credentialService = getCredentialService();

// Register core credentials (OAuth2, HTTP Basic Auth, API Key, etc.)
try {
  credentialService.registerCoreCredentials();
  logger.info("✅ Core credentials registered successfully");
} catch (error) {
  console.error("❌ Failed to register core credentials:", error);
}

// Initialize OAuth providers (Google, Microsoft, Slack, GitHub)
try {
  const { initializeOAuthProviders } = require("./oauth");
  initializeOAuthProviders();
  logger.info("✅ OAuth providers initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize OAuth providers:", error);
}

const nodeLoader = new NodeLoader(nodeService as any, credentialService as any);
const socketService = new SocketService(httpServer);

// Initialize ExecutionService (for HTTP endpoints)
const executionHistoryService = new ExecutionHistoryService();
// Use the Drizzle-based execution service from factory
const executionService = executionServiceDrizzle;

// Initialize RealtimeExecutionEngine (for WebSocket execution)
const realtimeExecutionEngine = new RealtimeExecutionEngine(db as any, nodeService as any);

// Initialize ErrorTriggerService (for workflow failure monitoring)
const errorTriggerService = new ErrorTriggerService(db as any);

// Import WorkflowService, TriggerService singleton, and ScheduleJobManager
import { ScheduleJobManager } from "./scheduled-jobs/ScheduleJobManager";
import { getTriggerService, initializeTriggerService } from "./services/triggerServiceSingleton";
import { workflowService } from "./services/WorkflowService";

// WorkflowService is already initialized as a singleton

// Initialize ScheduleJobManager (for persistent schedule jobs)
const scheduleJobManager = new ScheduleJobManager(
  db as any,
  executionService,
  {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
  }
);

// Connect RealtimeExecutionEngine events to SocketService
realtimeExecutionEngine.on("execution-started", (data) => {
  socketService.broadcastExecutionEvent(data.executionId, {
    executionId: data.executionId,
    type: "started",
    timestamp: data.timestamp,
  });
});

realtimeExecutionEngine.on("node-started", (data) => {
  logger.info('🔵 [RealtimeEngine] node-started event received', {
    executionId: data.executionId,
    nodeId: data.nodeId,
    nodeName: data.nodeName,
    nodeType: data.nodeType,
  });
  
  socketService.broadcastExecutionEvent(data.executionId, {
    executionId: data.executionId,
    type: "node-started",
    nodeId: data.nodeId,
    data: { nodeName: data.nodeName, nodeType: data.nodeType },
    timestamp: data.timestamp,
  });
  
  logger.info('✅ [RealtimeEngine] node-started event broadcast', {
    nodeId: data.nodeId,
  });
});

realtimeExecutionEngine.on("node-completed", (data) => {
  logger.info('🟢 [RealtimeEngine] node-completed event received', {
    executionId: data.executionId,
    nodeId: data.nodeId,
    nodeName: data.nodeName,
    nodeType: data.nodeType,
  });
  
  socketService.broadcastExecutionEvent(data.executionId, {
    executionId: data.executionId,
    type: "node-completed",
    nodeId: data.nodeId,
    data: { 
      outputData: data.outputData, 
      duration: data.duration,
      activeConnections: data.activeConnections, // NEW: Include active connections for edge animation
    },
    timestamp: data.timestamp,
  });
  
  logger.info('✅ [RealtimeEngine] node-completed event broadcast', {
    nodeId: data.nodeId,
  });
});

realtimeExecutionEngine.on("node-failed", (data) => {
  logger.error('🔴 [RealtimeEngine] node-failed event received', {
    executionId: data.executionId,
    nodeId: data.nodeId,
    nodeName: data.nodeName,
    nodeType: data.nodeType,
    error: data.error,
  });
  
  socketService.broadcastExecutionEvent(data.executionId, {
    executionId: data.executionId,
    type: "node-failed",
    nodeId: data.nodeId,
    error: data.error,
    timestamp: data.timestamp,
  });
  
  logger.error('✅ [RealtimeEngine] node-failed event broadcast', {
    nodeId: data.nodeId,
    error: data.error,
  });
});

realtimeExecutionEngine.on("execution-completed", (data) => {
  socketService.broadcastExecutionEvent(data.executionId, {
    executionId: data.executionId,
    type: "completed",
    data: { duration: data.duration },
    timestamp: data.timestamp,
  });
});

realtimeExecutionEngine.on("execution-failed", async (data) => {
  socketService.broadcastExecutionEvent(data.executionId, {
    executionId: data.executionId,
    type: "failed",
    error: data.error,
    timestamp: data.timestamp,
  });

  // Fire error triggers for workflow failures
  try {
    await errorTriggerService.onWorkflowExecutionFailed({
      executionId: data.executionId,
      workflowId: data.workflowId || "",
      workflowName: data.workflowName || "Unknown Workflow",
      failedNodeId: data.failedNodeId,
      failedNodeName: data.failedNodeName,
      failedNodeType: data.failedNodeType,
      errorMessage: data.error?.message || "Unknown error",
      errorStack: data.error?.stack,
      errorTimestamp: data.timestamp?.toISOString() || new Date().toISOString(),
      executionStartedAt: data.executionStartedAt || new Date().toISOString(),
      executionMode: data.executionMode,
      userId: data.userId,
      errorContext: data.errorContext,
    });
  } catch (errorTriggerError) {
    logger.error("Failed to fire error triggers:", errorTriggerError);
  }
});

realtimeExecutionEngine.on("execution-cancelled", (data) => {
  socketService.broadcastExecutionEvent(data.executionId, {
    executionId: data.executionId,
    type: "cancelled",
    timestamp: data.timestamp,
  });
});

// Listen for execution-log events (tool calls, service calls, etc.)
realtimeExecutionEngine.on("execution-log", (logEntry) => {
  logger.debug('📝 [RealtimeEngine] execution-log event received', {
    executionId: logEntry.executionId,
    nodeId: logEntry.nodeId,
    level: logEntry.level,
    message: logEntry.message,
  });
  
  socketService.broadcastExecutionLog(logEntry.executionId, logEntry);
});

// Make services available globally for other services
declare global {
  var socketService: SocketService;
  var nodeLoader: NodeLoader;
  var nodeService: NodeService;
  var credentialService: any;
  var executionService: ExecutionService;
  var realtimeExecutionEngine: RealtimeExecutionEngine;
  var errorTriggerService: ErrorTriggerService;
  var workflowService: WorkflowService;
  var scheduleJobManager: ScheduleJobManager;
  var triggerService: any;
  var executionEventBridge: ExecutionEventBridge;
  var executionQueueService: ExecutionQueueService;
  var executionWorker: ExecutionWorker;
  var db: any;
}
global.socketService = socketService;
global.nodeLoader = nodeLoader;
global.nodeService = nodeService;
global.credentialService = credentialService as any;
global.executionService = executionService;
global.realtimeExecutionEngine = realtimeExecutionEngine;
global.errorTriggerService = errorTriggerService;
global.workflowService = workflowService;
global.scheduleJobManager = scheduleJobManager;
global.db = db;

// Initialize node systems
async function initializeNodeSystems() {
  try {
    // First, ensure built-in nodes are loaded
    await nodeService.waitForInitialization();

    // Check if nodes were successfully registered
    const nodeTypes = await nodeService.getNodeTypes();

    if (nodeTypes.length === 0) {
      try {
        await nodeService.registerDiscoveredNodes();
        const newNodeTypes = await nodeService.getNodeTypes();
        console.log(`✅ Registered ${newNodeTypes.length} nodes`);
      } catch (registrationError) {
        console.error("Failed to register nodes:", registrationError);
      }
    }

    // Then, load custom nodes
    await nodeLoader.initialize();
    
    // Show total nodes loaded
    const totalNodes = await nodeService.getNodeTypes();
    console.log(`✅ Loaded ${totalNodes.length} nodes`);
  } catch (error) {
    console.error("❌ Failed to initialize node systems:", error);
    // Don't throw the error - allow the application to start
  }
}

// Basic middleware
app.use(helmet());
// Configure CORS origins
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:8080", // For widget examples
    "http://localhost:8081", // Alternative widget port
    "http://localhost:9000", // Widget examples server
    "http://127.0.0.1:8080", // Alternative localhost
    "http://127.0.0.1:8081", // Alternative localhost
    "http://127.0.0.1:9000", // Alternative localhost
  ];

// Dynamic CORS origin function
const corsOriginFunction = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (same-origin requests, mobile apps, curl)
  if (!origin) return callback(null, true);

  // Check if origin is in allowed list
  if (corsOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Allow localhost origins (for unified Docker image and development)
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true);
  }

  // Log rejected origins for debugging
  console.warn(`CORS: Rejected origin: ${origin}`);
  return callback(new Error('Not allowed by CORS'), false);
};

// Apply CORS to all routes EXCEPT webhooks (webhooks have their own CORS logic)
app.use((req, res, next) => {
  // Skip global CORS for webhook routes - they handle CORS themselves
  if (req.path.startsWith('/webhook')) {
    return next();
  }
  
  // Apply global CORS for all other routes
  cors({
    origin: corsOriginFunction,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-workspace-id'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })(req, res, next);
});
app.use(compression());
app.use(cookieParser()); // Parse cookies

// Webhook body parsing middleware - MUST come before express.json()
import { webhookBodyParser } from "./middleware/webhookBodyParser";

// Apply webhook body parser for file uploads and special handling
app.use("/webhook", webhookBodyParser);

// Standard JSON parsing for all routes (including webhooks that aren't multipart)
app.use(express.json({ limit: "10mb", verify: (req: any, res, buf, encoding) => {
  // Store raw body for webhooks that might need it
  if (req.originalUrl && req.originalUrl.startsWith('/webhook')) {
    req.rawBody = buf;
    req.rawBodyString = buf.toString('utf-8');
  }
}}));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const nodeTypes = await nodeService.getNodeTypes();
    
    // Get queue statistics if available
    let queueStats = null;
    let queueStatus = "not_initialized";
    
    if (global.executionQueueService && global.executionQueueService.isConnected()) {
      try {
        queueStats = await global.executionQueueService.getQueueStats();
        queueStatus = "ok";
      } catch (queueError) {
        queueStatus = "error";
        logger.error("Failed to get queue stats for health check", { error: queueError });
      }
    }

    // Get worker status if available
    let workerStatus = null;
    if (global.executionWorker) {
      workerStatus = global.executionWorker.getStatus();
    }

    // Get Redis adapter status
    const adapterStatus = socketService.getAdapterStatus();

    // Determine overall status
    // Degraded if queue is unhealthy, adapter is enabled but disconnected, or worker is not running
    let overallStatus = "ok";
    if (queueStatus === "error" || (workerStatus && !workerStatus.isRunning)) {
      overallStatus = "degraded";
    }
    // Check if adapter is enabled but disconnected
    if (adapterStatus.enabled && !adapterStatus.connected) {
      overallStatus = "degraded";
    }

    res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: "node-drop-backend",
      version: "1.0.0",
      hot_reload: "BACKEND HOT RELOAD WORKING!",
      websocket: {
        connected_users: socketService.getConnectedUsersCount(),
        adapter: {
          enabled: adapterStatus.enabled,
          connected: adapterStatus.connected,
          ...(adapterStatus.error && { error: adapterStatus.error }),
        },
      },
      nodes: {
        registered_count: nodeTypes.length,
        status: nodeTypes.length > 0 ? "ok" : "no_nodes_registered"
      },
      queue: {
        status: queueStatus,
        stats: queueStats,
      },
      worker: workerStatus ? {
        status: workerStatus.isRunning ? "running" : "stopped",
        activeJobs: workerStatus.activeJobs,
        processedJobs: workerStatus.processedJobs,
        failedJobs: workerStatus.failedJobs,
      } : null,
    });
  } catch (error) {
    // Even in error case, try to get adapter status
    let adapterStatus = { enabled: false, connected: false };
    try {
      adapterStatus = socketService.getAdapterStatus();
    } catch (adapterError) {
      // Ignore adapter status errors in error handler
    }

    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      service: "node-drop-backend",
      version: "1.0.0",
      error: "Failed to check node status",
      websocket: {
        connected_users: 0,
        adapter: {
          enabled: adapterStatus.enabled,
          connected: adapterStatus.connected,
          ...(adapterStatus.error && { error: adapterStatus.error }),
        },
      },
      nodes: {
        registered_count: 0,
        status: "error"
      },
      queue: {
        status: "unknown",
        stats: null,
      },
      worker: null,
    });
  }
});

// API info route (moved to /api to avoid conflicting with frontend)
app.get("/api", (req, res) => {
  res.json({
    message: "node drop Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      workflows: "/api/workflows",
      executions: "/api/executions",
      nodes: "/api/nodes",
      nodeTypes: "/api/node-types",
      credentials: "/api/credentials",
      variables: "/api/variables",
      teams: "/api/teams",
      triggers: "/api/triggers",
      webhooks: "/webhook/{webhookId}",
      webhookTest: "/webhook/{webhookId}/test",
      forms: "/webhook/forms/{formId}",
      formSubmit: "/webhook/forms/{formId}/submit",
      chats: "/webhook/chats/{chatId}",
      chatMessage: "/webhook/chats/{chatId}/message",
      customNodes: "/api/custom-nodes",
      flowExecution: "/api/flow-execution",
      executionControl: "/api/execution-control",
      executionHistory: "/api/execution-history",
      executionRecovery: "/api/execution-recovery",
      oauth: "/api/oauth",
      google: "/api/google",
      health: "/health",
    },
  });
});

// Debug routes (remove in production)
import debugCredentialsRoutes from "./routes/debug-credentials";
app.use("/api", debugCredentialsRoutes);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// System routes
import editionRoutes from "./routes/edition";
import systemRoutes from "./routes/system";
app.use("/api/system", systemRoutes);
app.use("/api/edition", editionRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api", environmentRoutes); // Environment routes are nested under workflows
app.use("/api/executions", executionRoutes);
app.use("/api/nodes", nodeRoutes);
app.use("/api/node-types", nodeTypeRoutes);
app.use("/api/credentials", credentialRoutes);
app.use("/api/variables", variableRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/triggers", triggerRoutes);
app.use("/api/custom-nodes", customNodeRoutes);
app.use("/api/flow-execution", flowExecutionRoutes);
app.use("/api/execution-control", executionControlRoutes);
app.use("/api/execution-history", executionHistoryRoutes);
app.use("/api/execution-recovery", executionRecoveryRoutes);
app.use("/api/executions", executionResumeRoutes);
app.use("/api", oauthGenericRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/ai-memory", aiMemoryRoutes);
app.use("/api", webhookLogsRoutes);

// Webhook routes (public endpoints without /api prefix for easier external integration)
// All webhook-based triggers are under /webhook for consistency
// IMPORTANT: Register specific routes BEFORE generic webhook route
app.use("/webhook/forms", publicFormsRoutes);
app.use("/webhook/chats", publicChatsRoutes);
app.use("/webhook", webhookRoutes);

// Serve frontend static files (for unified Docker image)
// This allows the backend to serve the frontend in production
import path from "path";
const publicPath = path.join(__dirname, "..", "public");

// Serve static files with proper caching
app.use(express.static(publicPath, {
  maxAge: "1y", // Cache static assets for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Don't cache index.html
    if (filePath.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }
  },
}));

// SPA fallback - serve index.html for all non-API routes
// This must come AFTER all API routes but BEFORE 404 handler
app.get("*", (req, res, next) => {
  // Skip if this is an API route or webhook
  if (req.path.startsWith("/api") || req.path.startsWith("/webhook") || req.path.startsWith("/health")) {
    return next();
  }
  
  // Serve index.html for all other routes (SPA routing)
  const indexPath = path.join(publicPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html doesn't exist, continue to 404 handler
      next();
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT} - BACKEND HOT RELOAD WORKS!`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io enabled for real-time updates`);
  console.log(`🔗 API endpoints:`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   - Workflows: http://localhost:${PORT}/api/workflows`);
  console.log(`   - Executions: http://localhost:${PORT}/api/executions`);
  console.log(`   - Nodes: http://localhost:${PORT}/api/nodes`);
  console.log(`   - Node Types: http://localhost:${PORT}/api/node-types`);
  console.log(`   - Credentials: http://localhost:${PORT}/api/credentials`);
  console.log(`   - Variables: http://localhost:${PORT}/api/variables`);
  console.log(`   - Triggers: http://localhost:${PORT}/api/triggers`);
  console.log(`   - Custom Nodes: http://localhost:${PORT}/api/custom-nodes`);
  console.log(`📨 Webhook endpoint (public):`);
  console.log(`   - http://localhost:${PORT}/webhook/{webhookId}`);

  // Initialize node systems after server starts
  await initializeNodeSystems();

  // Initialize TriggerService singleton to load active triggers
  try {
    await initializeTriggerService(
      db,
      workflowService,
      executionService,
      socketService,
      nodeService,
      executionHistoryService,
      credentialService as any
    );
    global.triggerService = getTriggerService();
    console.log(`✅ Initialized triggers & webhooks`);
  } catch (error) {
    console.error(`Failed to initialize TriggerService:`, error);
  }

  // Initialize ErrorTriggerService for workflow failure monitoring
  try {
    errorTriggerService.setExecutionService(executionService);
    await errorTriggerService.initialize();
    console.log(`✅ Initialized error triggers (${errorTriggerService.getActiveCount()} active)`);
  } catch (error) {
    console.error(`Failed to initialize ErrorTriggerService:`, error);
  }

  // Initialize ScheduleJobManager for persistent schedule jobs
  try {
    await scheduleJobManager.initialize();
    console.log(`✅ Initialized schedule jobs`);
  } catch (error) {
    console.error(`❌ Failed to initialize ScheduleJobManager:`, error);
  }

  // Initialize ExecutionEventBridge for Redis Pub/Sub to WebSocket forwarding
  try {
    global.executionEventBridge = await createExecutionEventBridge(socketService);
    console.log(`✅ Initialized execution event bridge (Redis -> WebSocket)`);
  } catch (error) {
    console.error(`❌ Failed to initialize ExecutionEventBridge:`, error);
  }

  // Initialize ExecutionQueueService for queue-based workflow execution
  try {
    global.executionQueueService = getExecutionQueueService();
    await global.executionQueueService.initialize();
    console.log(`✅ Initialized execution queue service`);
  } catch (error) {
    console.error(`❌ Failed to initialize ExecutionQueueService:`, error);
    // Don't throw - allow fallback to direct execution
  }

  // Initialize ExecutionWorker for processing queued jobs
  // Only start worker if not in API-only mode
  const workerMode = process.env.WORKER_MODE || 'hybrid'; // hybrid | api-only | worker-only
  
  if (workerMode !== 'api-only') {
    try {
      global.executionWorker = getExecutionWorker();
      await global.executionWorker.initialize(nodeService);
      await global.executionWorker.start();
      const workerStatus = global.executionWorker.getStatus();
      console.log(`✅ Initialized execution worker (running: ${workerStatus.isRunning}, mode: ${workerMode})`);
    } catch (error) {
      console.error(`❌ Failed to initialize ExecutionWorker:`, error);
      // Don't throw - allow fallback to direct execution
    }
  } else {
    console.log(`ℹ️  Worker disabled (WORKER_MODE=${workerMode})`);
  }
});

// Memory monitoring to detect leaks
setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  
  // Memory monitoring (silent)
  
  // Alert if memory usage is high
  if (heapUsedMB > 1024) { // 1GB threshold
    console.warn(`⚠️  High memory usage detected: ${heapUsedMB}MB`);
    
    // Log active resources
    const activeExecutions = (realtimeExecutionEngine as any).activeExecutions?.size || 0;
    const connectedSockets = socketService.getConnectedUsersCount();
    const eventBufferSize = (socketService as any).executionEventBuffer?.size || 0;
    
    console.log(`  Active executions: ${activeExecutions}`);
    console.log(`  Connected sockets: ${connectedSockets}`);
    console.log(`  Event buffer size: ${eventBufferSize}`);
    
    // Force garbage collection if available
    if (global.gc) {
      console.log('  Running garbage collection...');
      global.gc();
    }
  }
}, 30000); // Every 30 seconds

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  
  // Remove all event listeners to prevent memory leaks
  realtimeExecutionEngine.removeAllListeners();
  
  // Import drain function for graceful connection pool shutdown
  const { drainConnectionPool } = await import('./db/client');
  
  await nodeLoader.cleanup();
  await socketService.shutdown();
  await scheduleJobManager.shutdown();
  
  // Stop execution event bridge
  if (global.executionEventBridge) {
    await global.executionEventBridge.stop();
  }

  // Stop execution worker
  if (global.executionWorker) {
    await global.executionWorker.stop();
  }

  // Shutdown execution queue service
  if (global.executionQueueService) {
    await global.executionQueueService.shutdown();
  }
  
  // Drain connection pool before closing
  await drainConnectionPool(30000);
  await disconnectDatabase();
  
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  
  // Remove all event listeners to prevent memory leaks
  realtimeExecutionEngine.removeAllListeners();
  
  await nodeLoader.cleanup();
  await socketService.shutdown();
  await scheduleJobManager.shutdown();
  
  // Stop execution event bridge
  if (global.executionEventBridge) {
    await global.executionEventBridge.stop();
  }

  // Stop execution worker
  if (global.executionWorker) {
    await global.executionWorker.stop();
  }

  // Shutdown execution queue service
  if (global.executionQueueService) {
    await global.executionQueueService.shutdown();
  }
  
  // Drain connection pool before closing
  const { drainConnectionPool } = await import('./db/client');
  await drainConnectionPool(30000);
  await disconnectDatabase();
  
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export { app };
export default app;



