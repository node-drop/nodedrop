/**
 * Services Initialization
 * 
 * Initializes all services that run after the HTTP server starts
 */

import { db } from "../db/client";
import { ScheduleJobManager } from "../scheduled-jobs/ScheduleJobManager";
import { NodeService } from "../services";
import { getCredentialService } from "../services/CredentialService.factory";
import { ErrorTriggerService } from "../services/ErrorTriggerService";
import { createExecutionEventBridge } from "../services/execution/ExecutionEventBridge";
import ExecutionHistoryService from "../services/execution/ExecutionHistoryService";
import { getExecutionQueueService } from "../services/execution/ExecutionQueueService";
import { getExecutionWorker } from "../services/execution/ExecutionWorker";
import { RealtimeExecutionEngine } from "../services/execution/RealtimeExecutionEngine";
import { WaitJobManager } from "../services/execution/WaitJobManager";
import { SocketService } from "../services/SocketService";
import { getTriggerService, initializeTriggerService } from "../services/triggerServiceSingleton";
import { workflowService } from "../services/WorkflowService";
import { logger } from "../utils/logger";

interface InitServicesParams {
  nodeService: NodeService;
  socketService: SocketService;
  executionService: any;
  executionHistoryService: ExecutionHistoryService;
  errorTriggerService: ErrorTriggerService;
  scheduleJobManager: ScheduleJobManager;
  waitJobManager: WaitJobManager;
  realtimeExecutionEngine: RealtimeExecutionEngine;
}

/**
 * Initialize all services after server starts
 */
export async function initializeServices(params: InitServicesParams): Promise<void> {
  const {
    nodeService,
    socketService,
    executionService,
    executionHistoryService,
    errorTriggerService,
    scheduleJobManager,
    waitJobManager,
    realtimeExecutionEngine,
  } = params;

  const credentialService = getCredentialService();

  // Initialize Git storage
  await initializeGitStorage();

  // Initialize TriggerService
  await initializeTriggers(
    executionService,
    socketService,
    nodeService,
    executionHistoryService,
    credentialService
  );

  // Initialize ErrorTriggerService
  await initializeErrorTriggers(errorTriggerService, executionService);

  // Initialize ScheduleJobManager
  await initializeScheduleJobs(scheduleJobManager);

  // Initialize WaitJobManager
  await initializeWaitJobs(waitJobManager, realtimeExecutionEngine);

  // Initialize ExecutionEventBridge
  await initializeEventBridge(socketService);

  // Initialize ExecutionQueueService
  await initializeExecutionQueue();

  // Initialize ExecutionWorker
  await initializeExecutionWorker(nodeService);
}

async function initializeGitStorage(): Promise<void> {
  try {
    const { initializeGitStorage } = await import("../config/git");
    await initializeGitStorage();
    logger.info(`✅ Initialized Git storage directories`);
  } catch (error) {
    logger.error(`❌ Failed to initialize Git storage`, { error });
  }
}

async function initializeTriggers(
  executionService: any,
  socketService: SocketService,
  nodeService: NodeService,
  executionHistoryService: ExecutionHistoryService,
  credentialService: any
): Promise<void> {
  try {
    await initializeTriggerService(
      db,
      workflowService,
      executionService,
      socketService,
      nodeService,
      executionHistoryService,
      credentialService
    );
    global.triggerService = getTriggerService();
    logger.info(`✅ Initialized triggers & webhooks`);
  } catch (error) {
    logger.error(`Failed to initialize TriggerService`, { error });
  }
}

async function initializeErrorTriggers(
  errorTriggerService: ErrorTriggerService,
  executionService: any
): Promise<void> {
  try {
    errorTriggerService.setExecutionService(executionService);
    await errorTriggerService.initialize();
    logger.info(`✅ Initialized error triggers (${errorTriggerService.getActiveCount()} active)`);
  } catch (error) {
    logger.error(`Failed to initialize ErrorTriggerService`, { error });
  }
}

async function initializeScheduleJobs(scheduleJobManager: ScheduleJobManager): Promise<void> {
  try {
    await scheduleJobManager.initialize();
    logger.info(`✅ Initialized schedule jobs`);
  } catch (error) {
    logger.error(`❌ Failed to initialize ScheduleJobManager`, { error });
  }
}

async function initializeWaitJobs(
  waitJobManager: WaitJobManager,
  realtimeExecutionEngine: RealtimeExecutionEngine
): Promise<void> {
  try {
    waitJobManager.setResumeCallback(
      async (waitId, executionId, workflowId, nodeId, inputData, executionState, webhookData) => {
        logger.info(`Resuming execution from wait: ${waitId}`, { executionId, workflowId, nodeId });

        try {
          await realtimeExecutionEngine.resumeFromWait(
            waitId,
            executionId,
            workflowId,
            nodeId,
            inputData,
            executionState,
            webhookData
          );
          logger.info(`Execution resumed successfully from wait: ${waitId}`, { executionId });
        } catch (error) {
          logger.error(`Failed to resume execution from wait: ${waitId}`, {
            executionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    await waitJobManager.initialize();
    logger.info(`✅ Initialized wait job manager`);
  } catch (error) {
    logger.error(`❌ Failed to initialize WaitJobManager`, { error });
  }
}

async function initializeEventBridge(socketService: SocketService): Promise<void> {
  try {
    global.executionEventBridge = await createExecutionEventBridge(socketService);
    logger.info(`✅ Initialized execution event bridge (Redis -> WebSocket)`);
  } catch (error) {
    logger.error(`❌ Failed to initialize ExecutionEventBridge`, { error });
  }
}

async function initializeExecutionQueue(): Promise<void> {
  try {
    global.executionQueueService = getExecutionQueueService();
    await global.executionQueueService.initialize();
    logger.info(`✅ Initialized execution queue service`);
  } catch (error) {
    logger.error(`❌ Failed to initialize ExecutionQueueService`, { error });
  }
}

async function initializeExecutionWorker(nodeService: NodeService): Promise<void> {
  const workerMode = process.env.WORKER_MODE || "hybrid";

  if (workerMode === "api-only") {
    logger.info(`ℹ️  Worker disabled (WORKER_MODE=${workerMode})`);
    return;
  }

  try {
    global.executionWorker = getExecutionWorker();
    await global.executionWorker.initialize(nodeService);
    await global.executionWorker.start();
    const workerStatus = global.executionWorker.getStatus();
    logger.info(`✅ Initialized execution worker (running: ${workerStatus.isRunning}, mode: ${workerMode})`);
  } catch (error) {
    logger.error(`❌ Failed to initialize ExecutionWorker`, { error });
  }
}
