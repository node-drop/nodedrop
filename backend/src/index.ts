// @ts-nocheck
/**
 * Main Entry Point - Node Drop Backend
 */
import "dotenv/config";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { createServer } from "http";

// Database
import { db, disconnectDatabase } from "./db/client";

// Services
import { NodeLoader, NodeService } from "./services";
import { getCredentialService } from "./services/CredentialService.factory";
import { ErrorTriggerService } from "./services/ErrorTriggerService";
import { ExecutionEventBridge } from "./services/execution/ExecutionEventBridge";
import ExecutionHistoryService from "./services/execution/ExecutionHistoryService";
import { ExecutionListenerManager } from "./services/execution/ExecutionListenerManager";
import { ExecutionQueueService } from "./services/execution/ExecutionQueueService";
import { getExecutionServiceInstance } from "./services/execution/ExecutionService.factory";
import { ExecutionWorker } from "./services/execution/ExecutionWorker";
import { RealtimeExecutionEngine } from "./services/execution/RealtimeExecutionEngine";
import { WaitJobManager, setWaitJobManager } from "./services/execution/WaitJobManager";
import { ScheduleJobManager } from "./scheduled-jobs/ScheduleJobManager";
import { SocketService } from "./services/SocketService";
import { workflowService } from "./services/WorkflowService";

// Startup modules
import { initializeNodeSystems } from "./startup";
import { registerExecutionEventHandlers } from "./startup/eventHandlers";
import { initializeServices } from "./startup/services";

// Middleware
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { webhookBodyParser } from "./middleware/webhookBodyParser";

// Routes
import { setupRoutes } from "./routes";

// Utils
import { logger } from "./utils/logger";

// ============================================================================
// Server Setup
// ============================================================================

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5678;

// Server timeouts
httpServer.timeout = 300000; // 5 minutes
httpServer.keepAliveTimeout = 65000;
httpServer.headersTimeout = 66000;

// ============================================================================
// Initialize Core Services
// ============================================================================

const nodeService = new NodeService();
const credentialService = getCredentialService();

// Register core credentials
try {
  credentialService.registerCoreCredentials();
  logger.info("✅ Core credentials registered");
} catch (error) {
  logger.error("❌ Failed to register core credentials", { error });
}

// Initialize OAuth providers
try {
  const { initializeOAuthProviders } = require("./oauth");
  initializeOAuthProviders();
  logger.info("✅ OAuth providers initialized");
} catch (error) {
  logger.error("❌ Failed to initialize OAuth providers", { error });
}

const nodeLoader = new NodeLoader(nodeService as any, credentialService as any);
const socketService = new SocketService(httpServer);
const executionHistoryService = new ExecutionHistoryService();
const executionService = getExecutionServiceInstance(nodeService);
const realtimeExecutionEngine = new RealtimeExecutionEngine(db as any, nodeService as any);
const executionListenerManager = new ExecutionListenerManager(realtimeExecutionEngine);
const errorTriggerService = new ErrorTriggerService(db as any);

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

const scheduleJobManager = new ScheduleJobManager(db as any, executionService, { redis: redisConfig });
const waitJobManager = new WaitJobManager(db as any, redisConfig);
setWaitJobManager(waitJobManager);

// Register event handlers
registerExecutionEventHandlers(realtimeExecutionEngine, socketService, errorTriggerService);

// ============================================================================
// Global Service References
// ============================================================================

declare global {
  var socketService: SocketService;
  var nodeLoader: NodeLoader;
  var nodeService: NodeService;
  var credentialService: any;
  var executionService: any;
  var realtimeExecutionEngine: RealtimeExecutionEngine;
  var executionListenerManager: ExecutionListenerManager;
  var errorTriggerService: ErrorTriggerService;
  var workflowService: any;
  var scheduleJobManager: ScheduleJobManager;
  var waitJobManager: WaitJobManager;
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
global.executionListenerManager = executionListenerManager;
global.errorTriggerService = errorTriggerService;
global.workflowService = workflowService;
global.scheduleJobManager = scheduleJobManager;
global.waitJobManager = waitJobManager;
global.db = db;

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:9000",
      "http://127.0.0.1:8080",
      "http://127.0.0.1:8081",
      "http://127.0.0.1:9000",
    ];

const corsOriginFunction = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (!origin) return callback(null, true);
  if (corsOrigins.includes(origin)) return callback(null, true);
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
  logger.warn(`CORS: Rejected origin: ${origin}`);
  return callback(new Error("Not allowed by CORS"), false);
};

app.use((req, res, next) => {
  if (req.path.startsWith("/webhook")) return next();
  cors({
    origin: corsOriginFunction,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "x-workspace-id"],
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })(req, res, next);
});

app.use(compression());
app.use(cookieParser());
app.use("/webhook", webhookBodyParser);
app.use(
  express.json({
    limit: "10mb",
    verify: (req: any, res, buf) => {
      if (req.originalUrl?.startsWith("/webhook")) {
        req.rawBody = buf;
        req.rawBodyString = buf.toString("utf-8");
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.http({ method: req.method, path: req.path });
  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get("/health", async (req, res) => {
  try {
    const nodes = await nodeService.getNodeTypes();
    let queueStats = null;
    let queueStatus = "not_initialized";

    if (global.executionQueueService?.isConnected()) {
      try {
        queueStats = await global.executionQueueService.getQueueStats();
        queueStatus = "ok";
      } catch {
        queueStatus = "error";
      }
    }

    const workerStatus = global.executionWorker?.getStatus() || null;
    const adapterStatus = socketService.getAdapterStatus();
    const listenerStats = executionListenerManager.getStats();

    let overallStatus = "ok";
    if (queueStatus === "error" || (workerStatus && !workerStatus.isRunning)) overallStatus = "degraded";
    if (adapterStatus.enabled && !adapterStatus.connected) overallStatus = "degraded";
    if (listenerStats.totalListeners > 500) overallStatus = "degraded";

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: "node-drop-backend",
      version: "1.0.0",
      websocket: {
        connected_users: socketService.getConnectedUsersCount(),
        adapter: adapterStatus,
      },
      nodes: { registered_count: nodes.length, status: nodes.length > 0 ? "ok" : "no_nodes_registered" },
      queue: { status: queueStatus, stats: queueStats },
      worker: workerStatus
        ? {
            status: workerStatus.isRunning ? "running" : "stopped",
            activeJobs: workerStatus.activeJobs,
            processedJobs: workerStatus.processedJobs,
            failedJobs: workerStatus.failedJobs,
          }
        : null,
      listeners: listenerStats,
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: "Health check failed" });
  }
});

// API info
app.get("/api", (req, res) => {
  res.json({
    message: "Node Drop Backend API",
    version: "1.0.0",
    health: "/health",
  });
});

// Setup all API routes
setupRoutes(app);

// Static files (frontend)
const publicPath = path.join(__dirname, "..", "public");
app.use(
  express.static(publicPath, {
    maxAge: "1y",
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  })
);

// SPA fallback
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/webhook") || req.path.startsWith("/health")) {
    return next();
  }
  res.sendFile(path.join(publicPath, "index.html"), (err) => {
    if (err) next();
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

httpServer.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Health: http://localhost:${PORT}/health`);

  // Initialize node systems (load, register, embeddings)
  await initializeNodeSystems(nodeService, nodeLoader);

  // Initialize all other services
  await initializeServices({
    nodeService,
    socketService,
    executionService,
    executionHistoryService,
    errorTriggerService,
    scheduleJobManager,
    waitJobManager,
    realtimeExecutionEngine,
  });
});

// ============================================================================
// Memory Monitoring
// ============================================================================

setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

  if (heapUsedMB > 1024) {
    logger.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
    if (global.gc) global.gc();
  }
}, 30000);

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);

  executionListenerManager.cleanupAll();
  realtimeExecutionEngine.removeAllListeners();

  const { drainConnectionPool } = await import("./db/client");

  await nodeLoader.cleanup();
  await socketService.shutdown();
  await scheduleJobManager.shutdown();
  await waitJobManager.shutdown();

  if (global.executionEventBridge) await global.executionEventBridge.stop();
  if (global.executionWorker) await global.executionWorker.stop();
  if (global.executionQueueService) await global.executionQueueService.shutdown();

  await drainConnectionPool(30000);
  await disconnectDatabase();

  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app };
export default app;
