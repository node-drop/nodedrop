/**
 * ExecutionWorker - BullMQ worker for processing workflow execution jobs
 *
 * Processes jobs from the execution queue and executes workflow nodes.
 * Supports horizontal scaling, fault tolerance, and retry with resume.
 *
 * Features:
 * - Configurable concurrency via environment variable
 * - Topological execution order for workflow graphs
 * - State persistence in Redis via ExecutionStateStore
 * - Progress events via ExecutionEventPublisher
 * - Retry resume from last completed node
 *
 * @module services/ExecutionWorker
 */

import { Worker, Job, Queue, ConnectionOptions } from "bullmq";
import { db } from "../../db/client";
import { executions, nodeExecutions } from "../../db/schema/executions";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { ExecutionStatus, NodeExecutionStatus } from "../../types/database";
import {
  ExecutionStateStore,
  getExecutionStateStore,
  WorkflowNode,
  WorkflowConnection,
  QueueExecutionContext,
} from "./ExecutionStateStore";
import {
  ExecutionEventPublisher,
  getExecutionEventPublisher,
} from "./ExecutionEventPublisher";
import {
  ExecutionQueueService,
  ExecutionJobData,
  getExecutionQueueService,
} from "./ExecutionQueueService";
import { NodeService } from "../NodeService";
import {
  buildCredentialsMapping,
  extractCredentialProperties,
} from "../../utils/credentialHelpers";

/**
 * Worker status interface
 */
export interface WorkerStatus {
  /** Whether the worker is currently running */
  isRunning: boolean;
  /** Number of jobs currently being processed */
  activeJobs: number;
  /** Total number of jobs processed since start */
  processedJobs: number;
  /** Total number of failed jobs since start */
  failedJobs: number;
}

/**
 * Default concurrency for worker
 */
const DEFAULT_CONCURRENCY = 5;

/**
 * Queue name for execution jobs (must match ExecutionQueueService)
 */
const EXECUTION_QUEUE_NAME = "workflow-executions";


/**
 * ExecutionWorker class for processing workflow execution jobs
 *
 * @class ExecutionWorker
 * @example
 * ```typescript
 * const worker = ExecutionWorker.getInstance();
 * await worker.initialize(nodeService);
 * await worker.start();
 *
 * // Get worker status
 * const status = worker.getStatus();
 *
 * // Graceful shutdown
 * await worker.stop();
 * ```
 */
export class ExecutionWorker {
  private static instance: ExecutionWorker;
  private queue: Queue<ExecutionJobData> | null = null;
  private worker: Worker<ExecutionJobData> | null = null;
  private stateStore: ExecutionStateStore;
  private eventPublisher: ExecutionEventPublisher;
  private nodeService: NodeService | null = null;
  private initialized: boolean = false;
  private isRunning: boolean = false;
  private processedJobs: number = 0;
  private failedJobs: number = 0;
  private activeJobs: number = 0;
  private concurrency: number;

  private constructor() {
    this.stateStore = getExecutionStateStore();
    this.eventPublisher = getExecutionEventPublisher();
    this.concurrency = parseInt(
      process.env.EXECUTION_WORKER_CONCURRENCY || String(DEFAULT_CONCURRENCY),
      10
    );

    if (isNaN(this.concurrency) || this.concurrency < 1) {
      this.concurrency = DEFAULT_CONCURRENCY;
    }
  }

  /**
   * Get the singleton instance of ExecutionWorker
   *
   * @returns {ExecutionWorker} The singleton instance
   */
  static getInstance(): ExecutionWorker {
    if (!ExecutionWorker.instance) {
      ExecutionWorker.instance = new ExecutionWorker();
    }
    return ExecutionWorker.instance;
  }

  /**
   * Initialize the worker with required services
   *
   * @param {NodeService} nodeService - The node service for executing nodes
   * @returns {Promise<void>}
   */
  async initialize(nodeService: NodeService): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.nodeService = nodeService;

      // Initialize state store and event publisher
      await this.stateStore.initialize();
      await this.eventPublisher.initialize();

      // Get queue from ExecutionQueueService
      const queueService = getExecutionQueueService();
      await queueService.initialize();
      this.queue = queueService.getQueue();

      if (!this.queue) {
        throw new Error("Failed to get execution queue");
      }

      this.initialized = true;
      logger.info("[ExecutionWorker] Initialized successfully", {
        concurrency: this.concurrency,
      });
    } catch (error) {
      logger.error("[ExecutionWorker] Failed to initialize", { error });
      throw error;
    }
  }

  /**
   * Start processing jobs from the queue
   *
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    if (!this.initialized || !this.queue) {
      throw new Error("Worker not initialized. Call initialize() first.");
    }

    if (this.isRunning) {
      logger.warn("[ExecutionWorker] Worker is already running");
      return;
    }

    try {
      // Get Redis connection config from queue
      const queueService = getExecutionQueueService();
      const connection: ConnectionOptions = {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD,
      };

      // Create BullMQ Worker instance
      this.worker = new Worker<ExecutionJobData>(
        EXECUTION_QUEUE_NAME,
        async (job: Job<ExecutionJobData>) => {
          return this.processJob(job);
        },
        {
          connection,
          concurrency: this.concurrency,
        }
      );

      // Set up event handlers
      this.worker.on("completed", (job) => {
        logger.info("[ExecutionWorker] Job completed", {
          jobId: job.id,
          executionId: job.data.executionId,
        });
      });

      this.worker.on("failed", (job, err) => {
        logger.error("[ExecutionWorker] Job failed", {
          jobId: job?.id,
          executionId: job?.data?.executionId,
          error: err.message,
        });
      });

      this.isRunning = true;
      logger.info("[ExecutionWorker] Started processing jobs", {
        concurrency: this.concurrency,
      });
    } catch (error) {
      logger.error("[ExecutionWorker] Failed to start", { error });
      throw error;
    }
  }

  /**
   * Stop processing jobs (graceful shutdown)
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.worker) {
        // Close the worker (waits for active jobs to complete)
        await this.worker.close();
      }

      if (this.queue) {
        // Close the queue
        await this.queue.close();
      }

      this.isRunning = false;
      logger.info("[ExecutionWorker] Stopped", {
        processedJobs: this.processedJobs,
        failedJobs: this.failedJobs,
      });
    } catch (error) {
      logger.error("[ExecutionWorker] Error during shutdown", { error });
      throw error;
    }
  }

  /**
   * Get worker status
   *
   * @returns {WorkerStatus} Current worker status
   */
  getStatus(): WorkerStatus {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs,
      processedJobs: this.processedJobs,
      failedJobs: this.failedJobs,
    };
  }


  /**
   * Process a job from the queue
   *
   * @private
   * @param {Job<ExecutionJobData>} job - The job to process
   * @returns {Promise<any>} The execution result
   */
  private async processJob(job: Job<ExecutionJobData>): Promise<any> {
    const { executionId, workflowId, singleNodeMode } = {
      ...job.data,
      singleNodeMode: job.data.options?.singleNodeMode || false,
    };

    this.activeJobs++;

    logger.info("[ExecutionWorker] Processing job", {
      jobId: job.id,
      executionId,
      workflowId,
      singleNodeMode,
      attemptsMade: job.attemptsMade,
    });

    try {
      // Load execution state from Redis
      const context = await this.stateStore.getState(executionId);

      if (!context) {
        throw new Error(`Execution state not found for ${executionId}`);
      }

      // Update status to running
      await this.stateStore.updateStatus(executionId, "running");

      // Update database status
      if (context.saveToDatabase) {
        await db
          .update(executions)
          .set({
            status: ExecutionStatus.RUNNING,
            updatedAt: new Date(),
          })
          .where(eq(executions.id, executionId));
      }

      // Handle single node mode
      if (singleNodeMode) {
        return await this.executeSingleNode(job.data, context);
      }

      // Execute full workflow
      return await this.executeWorkflow(job.data, context);
    } catch (error: any) {
      this.failedJobs++;

      logger.error("[ExecutionWorker] Job failed", {
        jobId: job.id,
        executionId,
        error: error?.message,
        attemptsMade: job.attemptsMade,
      });

      // Record failure
      await this.handleExecutionFailure(executionId, error, job.data);

      throw error;
    } finally {
      this.activeJobs--;
      this.processedJobs++;
    }
  }

  /**
   * Execute a full workflow
   *
   * @private
   * @param {ExecutionJobData} jobData - The job data
   * @param {QueueExecutionContext} context - The execution context
   * @returns {Promise<any>} The execution result
   */
  private async executeWorkflow(
    jobData: ExecutionJobData,
    context: QueueExecutionContext
  ): Promise<any> {
    const { executionId, triggerNodeId, nodes, connections, lastCompletedNodeId } =
      jobData;

    const startTime = Date.now();

    try {
      // Build execution graph
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const graph = this.buildExecutionGraph(nodes, connections);

      // Get execution order (topological sort)
      const executionOrder = this.getTopologicalOrder(nodes, connections);

      logger.info("[ExecutionWorker] Execution order determined", {
        executionId,
        executionOrder,
        totalNodes: nodes.length,
      });

      // Load existing node outputs if resuming from retry
      const nodeOutputs = await this.stateStore.getAllNodeOutputs(executionId);

      // Determine starting point for execution
      let startIndex = 0;
      if (lastCompletedNodeId) {
        const lastIndex = executionOrder.indexOf(lastCompletedNodeId);
        if (lastIndex >= 0) {
          startIndex = lastIndex + 1;
          logger.info("[ExecutionWorker] Resuming from last completed node", {
            executionId,
            lastCompletedNodeId,
            startIndex,
          });
        }
      }

      // Execute nodes in topological order
      for (let i = startIndex; i < executionOrder.length; i++) {
        const nodeId = executionOrder[i];
        const node = nodeMap.get(nodeId);

        if (!node) {
          logger.warn("[ExecutionWorker] Node not found in map", {
            executionId,
            nodeId,
          });
          continue;
        }

        // Skip disabled nodes
        if (node.disabled) {
          logger.info("[ExecutionWorker] Skipping disabled node", {
            executionId,
            nodeId,
            nodeName: node.name,
          });
          continue;
        }

        // Check if node is a service node (no inputs)
        const isServiceNode = await this.isServiceNode(node.type);
        if (isServiceNode) {
          logger.info("[ExecutionWorker] Skipping service node", {
            executionId,
            nodeId,
            nodeType: node.type,
          });
          continue;
        }

        // Check if all upstream nodes have completed
        const upstreamComplete = this.checkUpstreamComplete(
          nodeId,
          connections,
          nodeOutputs,
          nodes
        );

        if (!upstreamComplete) {
          logger.info("[ExecutionWorker] Waiting for upstream nodes", {
            executionId,
            nodeId,
          });
          continue;
        }

        // Execute the node
        await this.executeNode(
          executionId,
          node,
          nodeMap,
          graph,
          context,
          nodeOutputs,
          connections
        );
      }

      // Complete execution
      const duration = Date.now() - startTime;
      await this.handleExecutionComplete(executionId, duration, context);

      return { success: true, duration };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Build execution graph from nodes and connections
   *
   * @private
   * @param {WorkflowNode[]} nodes - Workflow nodes
   * @param {WorkflowConnection[]} connections - Workflow connections
   * @returns {Map<string, string[]>} Adjacency list (nodeId -> downstream nodeIds)
   */
  private buildExecutionGraph(
    nodes: WorkflowNode[],
    connections: WorkflowConnection[]
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    // Initialize graph with all nodes
    nodes.forEach((node) => {
      graph.set(node.id, []);
    });

    // Build connections (source -> targets)
    connections.forEach((conn) => {
      const downstream = graph.get(conn.sourceNodeId) || [];
      if (!downstream.includes(conn.targetNodeId)) {
        downstream.push(conn.targetNodeId);
      }
      graph.set(conn.sourceNodeId, downstream);
    });

    return graph;
  }

  /**
   * Get topological order of nodes for execution
   *
   * @private
   * @param {WorkflowNode[]} nodes - Workflow nodes
   * @param {WorkflowConnection[]} connections - Workflow connections
   * @returns {string[]} Node IDs in topological order
   */
  private getTopologicalOrder(
    nodes: WorkflowNode[],
    connections: WorkflowConnection[]
  ): string[] {
    // Build in-degree map
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    // Initialize
    nodes.forEach((node) => {
      inDegree.set(node.id, 0);
      graph.set(node.id, []);
    });

    // Build graph and count in-degrees
    connections.forEach((conn) => {
      const downstream = graph.get(conn.sourceNodeId) || [];
      if (!downstream.includes(conn.targetNodeId)) {
        downstream.push(conn.targetNodeId);
        graph.set(conn.sourceNodeId, downstream);

        const currentInDegree = inDegree.get(conn.targetNodeId) || 0;
        inDegree.set(conn.targetNodeId, currentInDegree + 1);
      }
    });

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no incoming edges
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      const downstream = graph.get(nodeId) || [];
      for (const targetId of downstream) {
        const newDegree = (inDegree.get(targetId) || 1) - 1;
        inDegree.set(targetId, newDegree);

        if (newDegree === 0) {
          queue.push(targetId);
        }
      }
    }

    return result;
  }


  /**
   * Check if a node is a service node (has no inputs)
   *
   * @private
   * @param {string} nodeType - The node type identifier
   * @returns {Promise<boolean>} True if service node
   */
  private async isServiceNode(nodeType: string): Promise<boolean> {
    if (!this.nodeService) {
      return false;
    }

    try {
      const allNodeTypes = await this.nodeService.getNodeTypes();
      const nodeTypeInfo = allNodeTypes.find((nt) => nt.identifier === nodeType);

      if (!nodeTypeInfo) {
        return false;
      }

      // Trigger nodes should not be treated as service nodes
      if ((nodeTypeInfo as any).executionCapability === "trigger") {
        return false;
      }

      // Service nodes have no inputs
      return Array.isArray(nodeTypeInfo.inputs) && nodeTypeInfo.inputs.length === 0;
    } catch (error) {
      logger.error("[ExecutionWorker] Failed to check if node is service node", {
        nodeType,
        error,
      });
      return false;
    }
  }

  /**
   * Check if all upstream nodes have completed
   *
   * @private
   * @param {string} nodeId - The node to check
   * @param {WorkflowConnection[]} connections - Workflow connections
   * @param {Map<string, any>} nodeOutputs - Completed node outputs
   * @param {WorkflowNode[]} nodes - All workflow nodes
   * @returns {boolean} True if all upstream nodes are complete
   */
  private checkUpstreamComplete(
    nodeId: string,
    connections: WorkflowConnection[],
    nodeOutputs: Map<string, any>,
    nodes: WorkflowNode[]
  ): boolean {
    const incomingConnections = connections.filter(
      (conn) => conn.targetNodeId === nodeId
    );

    if (incomingConnections.length === 0) {
      return true;
    }

    const upstreamNodeIds = [...new Set(incomingConnections.map((c) => c.sourceNodeId))];

    for (const upstreamId of upstreamNodeIds) {
      const upstreamNode = nodes.find((n) => n.id === upstreamId);
      if (!upstreamNode) continue;

      // Skip service nodes from upstream check
      // Service nodes don't execute independently
      if (upstreamNode.type && this.isServiceNodeSync(upstreamNode.type)) {
        continue;
      }

      if (!nodeOutputs.has(upstreamId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Synchronous check if node is a service node (cached)
   *
   * @private
   * @param {string} nodeType - The node type
   * @returns {boolean} True if likely a service node
   */
  private isServiceNodeSync(nodeType: string): boolean {
    // Common service node types
    const serviceNodeTypes = [
      "openai-model",
      "anthropic-model",
      "memory",
      "tool",
      "langchain-tool",
    ];
    return serviceNodeTypes.some((t) => nodeType.toLowerCase().includes(t));
  }

  /**
   * Execute a single node
   *
   * @private
   * @param {string} executionId - The execution ID
   * @param {WorkflowNode} node - The node to execute
   * @param {Map<string, WorkflowNode>} nodeMap - Map of all nodes
   * @param {Map<string, string[]>} graph - Execution graph
   * @param {QueueExecutionContext} context - Execution context
   * @param {Map<string, any>} nodeOutputs - Node outputs map
   * @param {WorkflowConnection[]} connections - Workflow connections
   * @returns {Promise<void>}
   */
  private async executeNode(
    executionId: string,
    node: WorkflowNode,
    nodeMap: Map<string, WorkflowNode>,
    graph: Map<string, string[]>,
    context: QueueExecutionContext,
    nodeOutputs: Map<string, any>,
    connections: WorkflowConnection[]
  ): Promise<void> {
    if (!this.nodeService) {
      throw new Error("NodeService not initialized");
    }

    const nodeId = node.id;
    const startTime = Date.now();

    logger.info("[ExecutionWorker] Executing node", {
      executionId,
      nodeId,
      nodeName: node.name,
      nodeType: node.type,
    });

    // Update current node in state
    await this.stateStore.updateCurrentNode(executionId, nodeId);

    // Publish node started event
    await this.eventPublisher.publishNodeStarted(
      executionId,
      nodeId,
      node.name,
      node.type
    );

    // Create node execution record if saving to database
    let nodeExecution: any = null;
    if (context.saveToDatabase) {
      const result = await db
        .insert(nodeExecutions)
        .values({
          nodeId,
          executionId,
          status: NodeExecutionStatus.RUNNING,
          startedAt: new Date(),
        })
        .returning();
      nodeExecution = result[0];
    }

    try {
      // Get input data from connected nodes
      const inputData = await this.getNodeInputData(
        nodeId,
        connections,
        nodeOutputs,
        context
      );

      // Build credentials mapping
      const credentialsMapping = await this.buildNodeCredentialsMapping(
        node,
        context.userId
      );

      // Convert nodeIdToName to Map for NodeService
      const nodeIdToNameMap = new Map(Object.entries(context.nodeIdToName));

      // Execute the node
      const result = await this.nodeService.executeNode(
        node.type,
        node.parameters,
        inputData,
        credentialsMapping,
        executionId,
        context.userId,
        { timeout: 30000, nodeId },
        context.workflowId,
        node.settings,
        nodeOutputs,
        nodeIdToNameMap
      );

      const duration = Date.now() - startTime;

      if (!result.success && !result.data) {
        throw new Error(result.error?.message || "Node execution failed");
      }

      // Store output in Redis
      await this.stateStore.setNodeOutput(executionId, nodeId, result.data);
      nodeOutputs.set(nodeId, result.data);

      // Update last completed node for retry support
      await this.stateStore.updateLastCompletedNode(executionId, nodeId);

      // Update node execution record
      if (context.saveToDatabase && nodeExecution) {
        await db
          .update(nodeExecutions)
          .set({
            status: NodeExecutionStatus.SUCCESS,
            outputData: result.data as any,
            finishedAt: new Date(),
          })
          .where(eq(nodeExecutions.id, nodeExecution.id));
      }

      // Find active connections for this node
      const activeConnections = this.getActiveConnections(
        nodeId,
        connections,
        result.data
      );

      // Publish node completed event
      await this.eventPublisher.publishNodeCompleted(
        executionId,
        nodeId,
        result.data,
        duration,
        activeConnections
      );

      logger.info("[ExecutionWorker] Node completed", {
        executionId,
        nodeId,
        nodeName: node.name,
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error("[ExecutionWorker] Node failed", {
        executionId,
        nodeId,
        nodeName: node.name,
        error: error?.message,
      });

      // Update node execution record
      if (context.saveToDatabase && nodeExecution) {
        await db
          .update(nodeExecutions)
          .set({
            status: NodeExecutionStatus.ERROR,
            error: {
              message: error?.message || "Unknown error",
              stack: error?.stack,
            },
            finishedAt: new Date(),
          })
          .where(eq(nodeExecutions.id, nodeExecution.id));
      }

      // Publish node failed event
      await this.eventPublisher.publishNodeFailed(executionId, nodeId, error);

      throw error;
    }
  }

  /**
   * Get input data for a node from upstream nodes
   *
   * @private
   * @param {string} nodeId - The node ID
   * @param {WorkflowConnection[]} connections - Workflow connections
   * @param {Map<string, any>} nodeOutputs - Node outputs
   * @param {QueueExecutionContext} context - Execution context
   * @returns {Promise<any>} Input data for the node
   */
  private async getNodeInputData(
    nodeId: string,
    connections: WorkflowConnection[],
    nodeOutputs: Map<string, any>,
    context: QueueExecutionContext
  ): Promise<any> {
    const incomingConnections = connections.filter(
      (conn) => conn.targetNodeId === nodeId
    );

    // If no incoming connections, use trigger data
    if (incomingConnections.length === 0) {
      return context.triggerData
        ? { main: [[{ json: context.triggerData }]] }
        : { main: [[]] };
    }

    // Group connections by target input name
    const connectionsByInput = new Map<string, WorkflowConnection[]>();

    for (const connection of incomingConnections) {
      const targetInput = connection.targetInput || "main";
      if (!connectionsByInput.has(targetInput)) {
        connectionsByInput.set(targetInput, []);
      }
      connectionsByInput.get(targetInput)!.push(connection);
    }

    const inputData: any = {};

    // Process each named input
    for (const [inputName, conns] of connectionsByInput.entries()) {
      const isServiceInput = inputName !== "main" && inputName !== "done";

      if (isServiceInput && conns.length > 0) {
        // Service inputs - store node references
        const serviceNodes: any[] = [];

        for (const connection of conns) {
          const sourceNode = context.nodes.find(
            (n) => n.id === connection.sourceNodeId
          );
          if (sourceNode) {
            serviceNodes.push({
              id: sourceNode.id,
              type: sourceNode.type,
              nodeId: connection.sourceNodeId,
              parameters: sourceNode.parameters || {},
              credentials: sourceNode.credentials || {},
            });
          }
        }

        inputData[inputName] = serviceNodes;
      } else {
        // Regular data input
        const inputsPerConnection: any[][] = [];

        for (const connection of conns) {
          const sourceOutput = nodeOutputs.get(connection.sourceNodeId);
          const connectionData: any[] = [];

          if (sourceOutput) {
            const outputBranch = connection.sourceOutput || "main";

            if (sourceOutput.branches) {
              const branchData = sourceOutput.branches[outputBranch];
              if (Array.isArray(branchData) && branchData.length > 0) {
                connectionData.push(...branchData);
              }
            } else if (sourceOutput.main) {
              const mainData = sourceOutput.main;
              if (Array.isArray(mainData) && mainData.length > 0) {
                connectionData.push(...mainData);
              }
            }
          }

          inputsPerConnection.push(connectionData);
        }

        if (inputsPerConnection.length > 1) {
          inputData[inputName] = inputsPerConnection;
        } else if (inputsPerConnection.length === 1) {
          inputData[inputName] = [inputsPerConnection[0]];
        } else {
          inputData[inputName] = [[]];
        }
      }
    }

    // Ensure 'main' input exists
    if (!inputData.main) {
      inputData.main = [[]];
    }

    return inputData;
  }

  /**
   * Build credentials mapping for a node
   *
   * @private
   * @param {WorkflowNode} node - The node
   * @param {string} userId - The user ID
   * @returns {Promise<Record<string, string>>} Credentials mapping
   */
  private async buildNodeCredentialsMapping(
    node: WorkflowNode,
    userId: string
  ): Promise<Record<string, string>> {
    if (!this.nodeService) {
      return {};
    }

    let nodeTypeProperties: any[] = [];
    try {
      const allNodeTypes = await this.nodeService.getNodeTypes();
      const nodeTypeInfo = allNodeTypes.find((nt) => nt.identifier === node.type);
      nodeTypeProperties = extractCredentialProperties(nodeTypeInfo);
    } catch (error) {
      logger.error("[ExecutionWorker] Failed to get node type definition", {
        error,
      });
    }

    const { mapping, warnings } = await buildCredentialsMapping({
      nodeParameters: node.parameters || {},
      nodeTypeProperties,
      userId,
      legacyCredentials: node.credentials,
      logPrefix: "[ExecutionWorker]",
    });

    if (warnings.length > 0) {
      logger.warn("[ExecutionWorker] Credential mapping warnings", {
        nodeId: node.id,
        warnings,
      });
    }

    return mapping;
  }

  /**
   * Get active connections from a node based on output data
   *
   * @private
   * @param {string} nodeId - The source node ID
   * @param {WorkflowConnection[]} connections - All connections
   * @param {any} outputData - The node's output data
   * @returns {any[]} Active connections
   */
  private getActiveConnections(
    nodeId: string,
    connections: WorkflowConnection[],
    outputData: any
  ): any[] {
    const nodeConnections = connections.filter(
      (conn) => conn.sourceNodeId === nodeId
    );
    const activeConnections: any[] = [];

    for (const conn of nodeConnections) {
      const outputBranch = conn.sourceOutput || "main";
      let hasData = false;

      if (outputData?.branches) {
        const branchData = outputData.branches[outputBranch];
        hasData = Array.isArray(branchData) && branchData.length > 0;
      } else if (outputData?.main) {
        hasData = Array.isArray(outputData.main) && outputData.main.length > 0;
      } else {
        hasData = true;
      }

      if (hasData) {
        activeConnections.push({
          id: conn.id,
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
          sourceOutput: conn.sourceOutput,
        });
      }
    }

    return activeConnections;
  }


  /**
   * Handle execution completion
   *
   * @private
   * @param {string} executionId - The execution ID
   * @param {number} duration - Total execution duration in ms
   * @param {QueueExecutionContext} context - Execution context
   * @returns {Promise<void>}
   */
  private async handleExecutionComplete(
    executionId: string,
    duration: number,
    context: QueueExecutionContext
  ): Promise<void> {
    logger.info("[ExecutionWorker] Execution completed", {
      executionId,
      duration,
    });

    // Update Redis state
    await this.stateStore.updateStatus(executionId, "completed");
    await this.stateStore.setCompletionTTL(executionId);

    // Update database
    if (context.saveToDatabase) {
      await db
        .update(executions)
        .set({
          status: ExecutionStatus.SUCCESS,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(executions.id, executionId));
    }

    // Publish completion event
    await this.eventPublisher.publishExecutionCompleted(executionId, duration);
  }

  /**
   * Handle execution failure
   *
   * @private
   * @param {string} executionId - The execution ID
   * @param {any} error - The error that caused the failure
   * @param {ExecutionJobData} jobData - The job data
   * @returns {Promise<void>}
   */
  private async handleExecutionFailure(
    executionId: string,
    error: any,
    jobData: ExecutionJobData
  ): Promise<void> {
    logger.error("[ExecutionWorker] Execution failed", {
      executionId,
      error: error?.message,
    });

    // Update Redis state
    await this.stateStore.updateStatus(executionId, "failed");
    await this.stateStore.setCompletionTTL(executionId);

    // Update database
    if (jobData.options?.saveToDatabase !== false) {
      await db
        .update(executions)
        .set({
          status: ExecutionStatus.ERROR,
          finishedAt: new Date(),
          updatedAt: new Date(),
          error: {
            message: error?.message || "Unknown error",
            stack: error?.stack,
            timestamp: new Date(),
          },
        })
        .where(eq(executions.id, executionId));
    }

    // Publish failure event
    await this.eventPublisher.publishExecutionFailed(executionId, error);
  }

  /**
   * Execute a single node (for testing purposes)
   *
   * @private
   * @param {ExecutionJobData} jobData - The job data
   * @param {QueueExecutionContext} context - Execution context
   * @returns {Promise<any>} The node execution result
   */
  private async executeSingleNode(
    jobData: ExecutionJobData,
    context: QueueExecutionContext
  ): Promise<any> {
    if (!this.nodeService) {
      throw new Error("NodeService not initialized");
    }

    const { executionId, triggerNodeId, nodes } = jobData;
    const startTime = Date.now();

    // Find the target node
    const targetNode = nodes.find((n) => n.id === triggerNodeId);
    if (!targetNode) {
      throw new Error(`Node not found: ${triggerNodeId}`);
    }

    logger.info("[ExecutionWorker] Executing single node", {
      executionId,
      nodeId: triggerNodeId,
      nodeName: targetNode.name,
      nodeType: targetNode.type,
    });

    // Publish node started event
    await this.eventPublisher.publishNodeStarted(
      executionId,
      triggerNodeId,
      targetNode.name,
      targetNode.type
    );

    try {
      // Build credentials mapping
      const credentialsMapping = await this.buildNodeCredentialsMapping(
        targetNode,
        context.userId
      );

      // Prepare input data from trigger data
      const inputData = context.triggerData
        ? { main: [[{ json: context.triggerData }]] }
        : { main: [[]] };

      // Convert nodeIdToName to Map
      const nodeIdToNameMap = new Map(Object.entries(context.nodeIdToName));

      // Execute the node
      const result = await this.nodeService.executeNode(
        targetNode.type,
        targetNode.parameters,
        inputData,
        credentialsMapping,
        executionId,
        context.userId,
        { timeout: 30000, nodeId: triggerNodeId },
        context.workflowId,
        targetNode.settings,
        new Map(),
        nodeIdToNameMap
      );

      const duration = Date.now() - startTime;

      if (!result.success && !result.data) {
        throw new Error(result.error?.message || "Node execution failed");
      }

      // Store output in Redis
      await this.stateStore.setNodeOutput(executionId, triggerNodeId, result.data);

      // Publish node completed event
      await this.eventPublisher.publishNodeCompleted(
        executionId,
        triggerNodeId,
        result.data,
        duration,
        []
      );

      // Complete execution
      await this.handleExecutionComplete(executionId, duration, context);

      return {
        success: true,
        data: result.data,
        duration,
      };
    } catch (error: any) {
      // Publish node failed event
      await this.eventPublisher.publishNodeFailed(executionId, triggerNodeId, error);

      throw error;
    }
  }
}

// Export singleton instance getter
export const getExecutionWorker = (): ExecutionWorker => {
  return ExecutionWorker.getInstance();
};
