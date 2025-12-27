/**
 * Get Execution Logs Tool Handler
 * 
 * Handles the get_latest_execution_logs tool call from AI.
 * Fetches logs from context or database.
 */

import { db } from '@/db/client';
import { logger } from '@/utils/logger';
import { ToolContext, ToolHandler, ToolResult } from './types';

export const getExecutionLogsHandler: ToolHandler = {
  name: 'get_latest_execution_logs',
  isFinal: false, // This tool continues the loop

  async execute(args: any, context: ToolContext): Promise<ToolResult> {
    const { request } = context;
    const execContext = request.executionContext;
    
    let toolResult: any = {
      status: 'unknown',
      errors: [],
      full_logs: [],
      source: 'context'
    };

    // Only use context if it provides actual details (logs or errors)
    const hasUsefulContext = execContext && (
      (execContext.logs && execContext.logs.length > 0) || 
      (execContext.errors && execContext.errors.length > 0)
    );

    if (hasUsefulContext) {
      toolResult = {
        status: execContext.lastRunStatus || 'unknown',
        errors: execContext.errors || [],
        full_logs: execContext.logs || [],
        source: 'context'
      };
    } else {
      // Fallback: Query Database for latest execution
      const workflowIdToQuery = request.currentWorkflow?.id || request.workflowId;
      
      if (workflowIdToQuery) {
        try {
          const { executions, nodeExecutions } = await import('@/db/schema/executions');
          const { desc, eq } = await import('drizzle-orm');
          
          logger.info(`[AI] Querying DB for executions of workflow: ${workflowIdToQuery}`);
          
          const latestExec = await db.query.executions.findFirst({
            where: eq(executions.workflowId, workflowIdToQuery),
            orderBy: [desc(executions.createdAt)],
          });

          logger.info(`[AI] DB Execution Result: ${latestExec ? latestExec.id : 'None found'}`);

          if (latestExec) {
            const nodeRuns = await db.query.nodeExecutions.findMany({
              where: eq(nodeExecutions.executionId, latestExec.id),
            });

            const errors = nodeRuns
              .filter(n => n.status === 'ERROR')
              .map(n => ({
                nodeId: n.nodeId,
                nodeName: request.currentWorkflow?.nodes?.find((wn: any) => wn.id === n.nodeId)?.name || n.nodeId,
                error: typeof n.error === 'string' ? n.error : JSON.stringify(n.error)
              }));

            toolResult = {
              status: latestExec.status,
              startedAt: latestExec.startedAt,
              finishedAt: latestExec.finishedAt,
              errors: errors,
              full_logs: nodeRuns.map(n => `[${n.status}] Node ${n.nodeId}: ${n.status === 'ERROR' ? JSON.stringify(n.error) : 'Completed'}`),
              source: 'database'
            };
          } else {
            toolResult = {
              status: 'not_found',
              message: "No execution history found for this workflow in the database.",
              source: 'database'
            };
          }
        } catch (dbError) {
          logger.error('Failed to query execution logs from DB', { error: dbError });
          toolResult = {
            status: 'error',
            message: "Failed to retrieve logs from database.",
            source: 'database_error'
          };
        }
      } else {
        toolResult = {
          status: 'not_found',
          message: "No execution context provided and no Workflow ID available to query.",
          source: 'none'
        };
      }
    }

    return { data: toolResult };
  }
};
