import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";
import { CredentialService } from "./CredentialService";
import ExecutionHistoryService from "./ExecutionHistoryService";
import { ExecutionService } from "./ExecutionService";
import { SocketService } from "./SocketService";
import { TriggerService } from "./TriggerService";
import { IWorkflowService } from "./WorkflowService";

let triggerServiceInstance: TriggerService | null = null;

/**
 * Get or create the global TriggerService singleton
 * This ensures only one instance of TriggerService exists across the application
 */
export function getTriggerService(): TriggerService {
  if (!triggerServiceInstance) {
    throw new Error(
      "TriggerService not initialized. Call initializeTriggerService first."
    );
  }
  return triggerServiceInstance;
}

/**
 * Initialize the TriggerService singleton
 * Should be called once during application startup
 */
export async function initializeTriggerService(
  db: NodePgDatabase<typeof schema>,
  workflowService: IWorkflowService,
  executionService: ExecutionService,
  socketService: SocketService,
  nodeService: any,
  executionHistoryService: ExecutionHistoryService,
  credentialService: CredentialService
): Promise<TriggerService> {
  if (triggerServiceInstance) {
    return triggerServiceInstance;
  }

  triggerServiceInstance = new TriggerService(
    db,
    workflowService,
    executionService,
    socketService,
    nodeService,
    executionHistoryService,
    credentialService
  );

  await triggerServiceInstance.initialize();
  return triggerServiceInstance;
}

/**
 * Check if TriggerService has been initialized
 */
export function isTriggerServiceInitialized(): boolean {
  return triggerServiceInstance !== null;
}
