import { Response, Router } from "express";
// import { asyncHandler } from "../middleware/asyncHandler";
// import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
// import ExecutionHistoryService from "../services/ExecutionHistoryService";
// import ExecutionRecoveryService from "../services/ExecutionRecoveryService";
// import { executionServiceDrizzle } from "../services/ExecutionService.factory";

const router = Router();

// // Initialize services (in production, these would be injected)
// const historyService = new ExecutionHistoryService();
// const recoveryService = new ExecutionRecoveryService(
//   null, // SocketService not needed for recovery analysis
//   historyService
// );

// /**
//  * POST /api/execution-recovery/analyze
//  * Analyze execution failure and get recovery recommendations
//  */
// router.post(
//   "/analyze",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { executionId, error } = req.body;

//     if (!executionId) {
//       return res.status(400).json({
//         success: false,
//         error: "executionId is required",
//       });
//     }

//     try {
//       const analysis = await recoveryService.analyzeFailure(
//         executionId,
//         error || {}
//       );

//       res.json({
//         success: true,
//         data: {
//           analysis,
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

// /**
//  * POST /api/execution-recovery/recover
//  * Attempt to recover a failed execution
//  */
// router.post(
//   "/recover",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { executionId, strategy } = req.body;

//     if (!executionId || !strategy) {
//       return res.status(400).json({
//         success: false,
//         error: "executionId and strategy are required",
//       });
//     }

//     if (!["retry", "skip", "restart", "manual"].includes(strategy.type)) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid strategy type",
//       });
//     }

//     try {
//       const success = await recoveryService.recoverExecution(
//         executionId,
//         strategy
//       );

//       res.json({
//         success: true,
//         data: {
//           recovered: success,
//           strategy,
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

// /**
//  * POST /api/execution-recovery/auto-recover
//  * Attempt automatic recovery based on failure analysis
//  */
// router.post(
//   "/auto-recover",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { executionId, error } = req.body;

//     if (!executionId) {
//       return res.status(400).json({
//         success: false,
//         error: "executionId is required",
//       });
//     }

//     try {
//       const success = await recoveryService.autoRecover(
//         executionId,
//         error || {}
//       );

//       res.json({
//         success: true,
//         data: {
//           autoRecovered: success,
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

// /**
//  * POST /api/execution-recovery/checkpoint
//  * Create a recovery checkpoint for an execution
//  */
// router.post(
//   "/checkpoint",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { executionId, nodeId, state } = req.body;

//     if (!executionId || !nodeId || !state) {
//       return res.status(400).json({
//         success: false,
//         error: "executionId, nodeId, and state are required",
//       });
//     }

//     try {
//       const checkpointId = await recoveryService.createRecoveryPoint(
//         executionId,
//         nodeId,
//         state
//       );

//       res.json({
//         success: true,
//         data: {
//           checkpointId,
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

// /**
//  * GET /api/execution-recovery/checkpoints/:executionId
//  * Get recovery checkpoints for an execution
//  */
// router.get(
//   "/checkpoints/:executionId",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { executionId } = req.params;

//     if (!executionId) {
//       return res.status(400).json({
//         success: false,
//         error: "executionId is required",
//       });
//     }

//     try {
//       const recoveryPoints = recoveryService.getRecoveryPoints(executionId);

//       res.json({
//         success: true,
//         data: {
//           recoveryPoints,
//           count: recoveryPoints.length,
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

// /**
//  * DELETE /api/execution-recovery/cleanup/:executionId
//  * Clean up recovery data for a completed execution
//  */
// router.delete(
//   "/cleanup/:executionId",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { executionId } = req.params;

//     if (!executionId) {
//       return res.status(400).json({
//         success: false,
//         error: "executionId is required",
//       });
//     }

//     try {
//       recoveryService.cleanupRecoveryData(executionId);

//       res.json({
//         success: true,
//         data: {
//           cleaned: true,
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

// /**
//  * GET /api/execution-recovery/error-patterns
//  * Get common error patterns and statistics
//  */
// router.get(
//   "/error-patterns",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { days = 7, limit = 10 } = req.query;

//     try {
//       // Get recent failed executions to analyze patterns
//       const result = await executionServiceDrizzle.listExecutions(req.user!.id, {
//         status: "ERROR",
//         limit: parseInt(limit as string),
//       });
      
//       const failedExecutions = (result.executions || []).filter((e: any) => {
//         const startDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
//         return e.startedAt >= startDate;
//       });

//       // Analyze error patterns
//       const errorPatterns = new Map<string, number>();
//       const nodeFailures = new Map<string, number>();
//       const workflowFailures = new Map<string, number>();

//       for (const execution of failedExecutions) {
//         // Extract error type from error data
//         const error = execution.error as any;
//         const errorType = error?.type || "unknown";

//         errorPatterns.set(errorType, (errorPatterns.get(errorType) || 0) + 1);
//         workflowFailures.set(
//           execution.workflow?.name || "Unknown",
//           (workflowFailures.get(execution.workflow?.name || "Unknown") || 0) + 1
//         );
//       }

//       // Convert maps to sorted arrays
//       const sortedErrorPatterns = Array.from(errorPatterns.entries())
//         .sort((a, b) => b[1] - a[1])
//         .map(([type, count]) => ({
//           type,
//           count,
//           percentage: ((count / failedExecutions.length) * 100).toFixed(1),
//         }));

//       const sortedWorkflowFailures = Array.from(workflowFailures.entries())
//         .sort((a, b) => b[1] - a[1])
//         .map(([workflow, count]) => ({
//           workflow,
//           count,
//           percentage: ((count / failedExecutions.length) * 100).toFixed(1),
//         }));

//       const sortedNodeFailures = Array.from(nodeFailures.entries())
//         .sort((a, b) => b[1] - a[1])
//         .map(([node, count]) => ({
//           node,
//           count,
//           percentage: ((count / failedExecutions.length) * 100).toFixed(1),
//         }));

//       res.json({
//         success: true,
//         data: {
//           summary: {
//             totalFailures: failedExecutions.length,
//             period: `${days} days`,
//             uniqueErrorTypes: errorPatterns.size,
//             affectedWorkflows: workflowFailures.size,
//           },
//           patterns: {
//             errorTypes: sortedErrorPatterns,
//             workflowFailures: sortedWorkflowFailures,
//             nodeFailures: sortedNodeFailures,
//           },
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

// /**
//  * GET /api/execution-recovery/statistics
//  * Get recovery success statistics
//  */
// router.get(
//   "/statistics",
//   requireAuth,
//   asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
//     const { days = 30 } = req.query;

//     try {
//       const startDate = new Date(
//         Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000
//       );

//       // Get execution statistics
//       const stats = await executionServiceDrizzle.getExecutionStats(req.user!.id);
      
//       const totalExecutions = stats.total || 0;
//       const failedExecutions = stats.failed || 0;
//       const successfulExecutions = stats.successful || 0;

//       // Calculate rates
//       const failureRate =
//         totalExecutions > 0
//           ? ((failedExecutions / totalExecutions) * 100).toFixed(2)
//           : "0.00";
//       const successRate =
//         totalExecutions > 0
//           ? ((successfulExecutions / totalExecutions) * 100).toFixed(2)
//           : "0.00";

//       res.json({
//         success: true,
//         data: {
//           period: `${days} days`,
//           executions: {
//             total: totalExecutions,
//             successful: successfulExecutions,
//             failed: failedExecutions,
//             successRate: `${successRate}%`,
//             failureRate: `${failureRate}%`,
//           },
//           recovery: {
//             // In a real implementation, you'd track recovery attempts and success rates
//             attemptsCount: 0,
//             successCount: 0,
//             successRate: "0.00%",
//           },
//           timestamp: new Date().toISOString(),
//         },
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message,
//       });
//     }
//   })
// );

export default router;
