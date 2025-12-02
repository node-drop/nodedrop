import {
  ExecutionFlowStatus,
  ExecutionHistoryEntry,
  ExecutionMetrics,
  NodeExecutionState,
  NodeExecutionStatus,
  NodeVisualState,
} from "@/types/execution";

export class ProgressTracker {
  // FIXED: Support multiple concurrent executions with separate state maps
  private executionStates: Map<string, Map<string, NodeExecutionState>> =
    new Map();
  private currentExecutionId: string = "default"; // Track which execution is currently active
  private listeners: Set<(status: ExecutionFlowStatus) => void> = new Set();

  /**
   * Get node states for a specific execution (or fallback to current/default)
   */
  private getNodeStatesForExecution(
    executionId: string
  ): Map<string, NodeExecutionState> {
    // Try to get states for the specific execution
    let states = this.executionStates.get(executionId);

    if (!states) {
      // If not found, try current execution
      states = this.executionStates.get(this.currentExecutionId);
    }

    if (!states) {
      // If still not found, try default
      states = this.executionStates.get("default");
    }

    if (!states) {
      // Create default if nothing exists
      states = new Map();
      this.executionStates.set("default", states);
    }

    return states;
  }

  /**
   * Set the current active execution ID
   */
  setCurrentExecution(executionId: string): void {
    this.currentExecutionId = executionId;
  }

  /**
   * Update the status of a specific node
   */
  updateNodeStatus(
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
    }
  ): void {
    const nodeStates = this.getNodeStatesForExecution(executionId);

    const currentState = nodeStates.get(nodeId) || {
      nodeId,
      status: NodeExecutionStatus.IDLE,
      dependencies: [],
      dependents: [],
    };

    const now = Date.now();
    const updatedState: NodeExecutionState = {
      ...currentState,
      status,
      progress: data?.progress ?? currentState.progress,
      error: data?.error
        ? {
            message: data.error.message || String(data.error),
            timestamp: now,
            details: data.error,
          }
        : currentState.error,
      inputData: data?.inputData ?? currentState.inputData,
      outputData: data?.outputData ?? currentState.outputData,
    };

    // Update timing information
    if (status === NodeExecutionStatus.RUNNING && !updatedState.startTime) {
      updatedState.startTime = data?.startTime || now;
    }

    if (
      [
        NodeExecutionStatus.COMPLETED,
        NodeExecutionStatus.FAILED,
        NodeExecutionStatus.CANCELLED,
      ].includes(status)
    ) {
      updatedState.endTime = data?.endTime || now;
      if (updatedState.startTime && updatedState.endTime) {
        updatedState.duration = updatedState.endTime - updatedState.startTime;
      }
      updatedState.progress =
        status === NodeExecutionStatus.COMPLETED ? 100 : updatedState.progress;
    }

    nodeStates.set(nodeId, updatedState);

    // Notify listeners of the update
    this.notifyListeners(executionId);
  }

  /**
   * Calculate overall execution progress
   */
  calculateOverallProgress(
    nodeStates: Map<string, NodeExecutionState>
  ): number {
    if (nodeStates.size === 0) return 0;

    let totalProgress = 0;
    const totalNodes = nodeStates.size;

    for (const [, state] of nodeStates) {
      switch (state.status) {
        case NodeExecutionStatus.COMPLETED:
          totalProgress += 100;
          break;
        case NodeExecutionStatus.FAILED:
        case NodeExecutionStatus.CANCELLED:
        case NodeExecutionStatus.SKIPPED:
          totalProgress += 100; // These are "complete" even if not successful
          break;
        case NodeExecutionStatus.RUNNING:
          totalProgress += state.progress || 50; // Default to 50% if no specific progress
          break;
        case NodeExecutionStatus.QUEUED:
          totalProgress += 10; // Small progress for queued nodes
          break;
        case NodeExecutionStatus.IDLE:
          totalProgress += 0; // No progress for idle nodes
          break;
      }
    }

    return Math.round(totalProgress / totalNodes);
  }

  /**
   * Estimate remaining execution time
   */
  estimateTimeRemaining(
    nodeStates: Map<string, NodeExecutionState>,
    executionHistory: ExecutionHistoryEntry[]
  ): number {
    const runningNodes = Array.from(nodeStates.values()).filter(
      (state) => state.status === NodeExecutionStatus.RUNNING
    );
    const queuedNodes = Array.from(nodeStates.values()).filter(
      (state) => state.status === NodeExecutionStatus.QUEUED
    );

    if (runningNodes.length === 0 && queuedNodes.length === 0) {
      return 0;
    }

    // Calculate average node duration from history
    let totalHistoricalDuration = 0;
    let historicalNodeCount = 0;

    executionHistory.forEach((entry) => {
      if (entry.metrics) {
        totalHistoricalDuration += entry.metrics.averageNodeDuration;
        historicalNodeCount++;
      }
    });

    const averageNodeDuration =
      historicalNodeCount > 0
        ? totalHistoricalDuration / historicalNodeCount
        : 30000; // Default 30 seconds

    // Estimate time for running nodes
    let runningTimeEstimate = 0;
    runningNodes.forEach((node) => {
      if (node.startTime) {
        const elapsed = Date.now() - node.startTime;
        const progress = node.progress || 50;
        const estimatedTotal = elapsed / (progress / 100);
        runningTimeEstimate += Math.max(0, estimatedTotal - elapsed);
      } else {
        runningTimeEstimate += averageNodeDuration;
      }
    });

    // Estimate time for queued nodes
    const queuedTimeEstimate = queuedNodes.length * averageNodeDuration;

    return Math.round(runningTimeEstimate + queuedTimeEstimate);
  }

  /**
   * Get execution metrics
   */
  getExecutionMetrics(executionId: string): ExecutionMetrics {
    const nodeStates = Array.from(
      this.getNodeStatesForExecution(executionId).values()
    );
    const completedNodes = nodeStates.filter(
      (state) => state.status === NodeExecutionStatus.COMPLETED
    );
    const failedNodes = nodeStates.filter(
      (state) => state.status === NodeExecutionStatus.FAILED
    );

    // Calculate average duration for all nodes with duration (completed and failed)
    const allNodesWithDuration = nodeStates.filter(
      (node) => node.duration !== undefined
    );
    const durations = allNodesWithDuration
      .map((node) => node.duration!)
      .filter((duration) => duration > 0);

    const averageNodeDuration =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length
        : 0;

    // Find longest running node
    const runningNodes = nodeStates.filter(
      (state) => state.status === NodeExecutionStatus.RUNNING && state.startTime
    );
    const longestRunningNode = runningNodes.reduce((longest, current) => {
      const currentRuntime = current.startTime
        ? Date.now() - current.startTime
        : 0;
      const longestRuntime = longest.startTime
        ? Date.now() - longest.startTime
        : 0;
      return currentRuntime > longestRuntime ? current : longest;
    }, runningNodes[0]);

    // Identify bottleneck nodes (nodes that took significantly longer than average)
    const bottleneckThreshold = averageNodeDuration * 2;
    const bottleneckNodes = completedNodes
      .filter((node) => node.duration && node.duration > bottleneckThreshold)
      .map((node) => node.nodeId);

    // Calculate parallelism utilization (simplified)
    const currentlyRunning = nodeStates.filter(
      (state) => state.status === NodeExecutionStatus.RUNNING
    ).length;
    const maxPossibleParallel = Math.min(nodeStates.length, 5); // Assume max 5 parallel
    const parallelismUtilization =
      maxPossibleParallel > 0
        ? (currentlyRunning / maxPossibleParallel) * 100
        : 0;

    return {
      totalNodes: nodeStates.length,
      completedNodes: completedNodes.length,
      failedNodes: failedNodes.length,
      averageNodeDuration,
      longestRunningNode: longestRunningNode?.nodeId || "",
      bottleneckNodes,
      parallelismUtilization,
    };
  }

  /**
   * Get current execution flow status
   */
  getExecutionFlowStatus(executionId: string): ExecutionFlowStatus {
    const nodeStates = new Map(this.getNodeStatesForExecution(executionId));
    const nodeStatesArray = Array.from(nodeStates.values());

    const currentlyExecuting = nodeStatesArray
      .filter((state) => state.status === NodeExecutionStatus.RUNNING)
      .map((state) => state.nodeId);

    const completedNodes = nodeStatesArray
      .filter((state) => state.status === NodeExecutionStatus.COMPLETED)
      .map((state) => state.nodeId);

    const failedNodes = nodeStatesArray
      .filter((state) => state.status === NodeExecutionStatus.FAILED)
      .map((state) => state.nodeId);

    const queuedNodes = nodeStatesArray
      .filter((state) => state.status === NodeExecutionStatus.QUEUED)
      .map((state) => state.nodeId);

    // Determine overall status
    let overallStatus: "running" | "completed" | "failed" | "cancelled" =
      "running";

    if (
      failedNodes.length > 0 &&
      currentlyExecuting.length === 0 &&
      queuedNodes.length === 0
    ) {
      overallStatus = "failed";
    } else if (currentlyExecuting.length === 0 && queuedNodes.length === 0) {
      const hasActivenodes = nodeStatesArray.some(
        (state) =>
          state.status !== NodeExecutionStatus.IDLE &&
          state.status !== NodeExecutionStatus.SKIPPED
      );
      if (hasActivenodes) {
        overallStatus = "completed";
      }
    }

    // Build execution path (simplified - in order of completion)
    const executionPath = nodeStatesArray
      .filter((state) => state.endTime)
      .sort((a, b) => (a.endTime || 0) - (b.endTime || 0))
      .map((state) => state.nodeId);

    const progress = this.calculateOverallProgress(nodeStates);
    const estimatedTimeRemaining = this.estimateTimeRemaining(nodeStates, []);

    return {
      executionId,
      overallStatus,
      progress,
      nodeStates,
      currentlyExecuting,
      completedNodes,
      failedNodes,
      queuedNodes,
      executionPath,
      estimatedTimeRemaining,
    };
  }

  /**
   * Convert NodeExecutionState to NodeVisualState for UI
   */
  getNodeVisualState(nodeId: string): NodeVisualState {
    // Get state from current execution context
    const nodeStates = this.getNodeStatesForExecution(this.currentExecutionId);
    const state = nodeStates.get(nodeId);

    if (!state) {
      return {
        nodeId,
        status: NodeExecutionStatus.IDLE,
        progress: 0,
        animationState: "idle",
        lastUpdated: Date.now(),
      };
    }

    // Determine animation state based on status
    let animationState: NodeVisualState["animationState"] = "idle";
    switch (state.status) {
      case NodeExecutionStatus.RUNNING:
        animationState = "pulsing";
        break;
      case NodeExecutionStatus.QUEUED:
        animationState = "spinning";
        break;
      case NodeExecutionStatus.COMPLETED:
        animationState = "success";
        break;
      case NodeExecutionStatus.FAILED:
        animationState = "error";
        break;
      default:
        animationState = "idle";
    }

    return {
      nodeId,
      status: state.status,
      progress: state.progress || 0,
      animationState,
      lastUpdated: Date.now(),
      executionTime: state.duration,
      errorMessage: state.error?.message,
    };
  }

  /**
   * Initialize node states for a workflow execution
   */
  initializeNodeStates(
    nodeIds: string[],
    dependencies: Map<string, string[]>,
    executionId?: string
  ): void {
    const execId = executionId || this.currentExecutionId;

    // Create new state map for this execution
    const nodeStates = new Map<string, NodeExecutionState>();

    nodeIds.forEach((nodeId) => {
      nodeStates.set(nodeId, {
        nodeId,
        status: NodeExecutionStatus.IDLE,
        dependencies: dependencies.get(nodeId) || [],
        dependents: [],
      });
    });

    // Calculate dependents (reverse dependencies)
    for (const [nodeId, deps] of dependencies) {
      deps.forEach((depId) => {
        const depState = nodeStates.get(depId);
        if (depState) {
          depState.dependents.push(nodeId);
        }
      });
    }

    // Store this execution's state map
    this.executionStates.set(execId, nodeStates);
  }

  /**
   * Reset all node states
   */
  reset(): void {
    this.executionStates.clear();
    this.currentExecutionId = "default";
    this.listeners.clear();
  }

  /**
   * Clear states for a specific execution
   */
  clearExecution(executionId: string): void {
    this.executionStates.delete(executionId);

    // If we cleared the current execution, reset to default
    if (this.currentExecutionId === executionId) {
      this.currentExecutionId = "default";
    }
  }

  /**
   * Subscribe to execution status updates
   */
  subscribe(listener: (status: ExecutionFlowStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners(executionId: string): void {
    const status = this.getExecutionFlowStatus(executionId);
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Error in progress tracker listener:", error);
      }
    });
  }

  /**
   * Get all node visual states for UI rendering
   */
  getAllNodeVisualStates(): Map<string, NodeVisualState> {
    const visualStates = new Map<string, NodeVisualState>();
    const nodeStates = this.getNodeStatesForExecution(this.currentExecutionId);

    for (const nodeId of nodeStates.keys()) {
      visualStates.set(nodeId, this.getNodeVisualState(nodeId));
    }

    return visualStates;
  }
}
