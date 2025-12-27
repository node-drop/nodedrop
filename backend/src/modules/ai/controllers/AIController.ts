import { AIChatService } from '@/modules/ai/services/AIChatService';
import { AIService } from '@/modules/ai/services/AIService';
import { logger } from '@/utils/logger';
import { Request, Response } from 'express';

export class AIController {
  
  static async generateWorkflow(req: Request, res: Response) {
    try {
      const { prompt, currentWorkflow, openAiKey, sessionId, workflowId, model, executionContext } = req.body;
      const userId = (req as any).user?.id || 'anonymous'; // Fallback for dev

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Access the global nodeService
      const nodeService = global.nodeService;
      if (!nodeService) {
        logger.error('NodeService not initialized');
        return res.status(500).json({ error: 'System not ready' });
      }

      // Initialize SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // For Nginx
      });

      const aiService = new AIService(nodeService);
      const chatService = new AIChatService();
      
      // Save User Message if session exists
      let chatHistory: { role: 'user' | 'assistant' | 'system', content: string }[] = [];
      if (sessionId) {
        await chatService.addMessage(sessionId, 'user', prompt, { workflowId });
        
        // Fetch history for context
        const session = await chatService.getSession(sessionId);
        if (session && session.messages) {
            chatHistory = session.messages
                .slice(-10) // Keeping last 10 messages for context
                .map(m => ({ 
                    role: m.role as 'user' | 'assistant' | 'system', 
                    content: m.content 
                }));
        }
      }

      // Stream progress
      const result = await aiService.generateWorkflow({
        prompt,
        currentWorkflow,
        workflowId,
        openAiKey,
        chatHistory,
        userId,
        model,
        executionContext
      }, (event, data) => {
        res.write(`data: ${JSON.stringify({ type: event, ...data })}\n\n`);
      });

      // Save Assistant Message if session exists
      if (sessionId) {
        await chatService.addMessage(sessionId, 'assistant', result.message, { 
             workflow: result.workflow,
             missingNodeTypes: result.missingNodeTypes 
        });
      }

      // Send final result
      res.write(`data: ${JSON.stringify({ type: 'result', result })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      logger.error('Error generating workflow', { error });
      // If headers already sent, we can only send an error event
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (!res.headersSent) {
          return res.status(500).json({ error: 'Failed to generate workflow', details: errorMsg });
      } else {
          res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
          res.end();
      }
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const { workflowId } = req.query;
      const userId = (req as any).user?.id || 'anonymous';
      
      if (!workflowId) return res.status(400).json({ error: "workflowId required" });

      const chatService = new AIChatService();
      const sessions = await chatService.getSessions(userId, String(workflowId));
      return res.json(sessions);
    } catch (err) {
      logger.error('Failed to get sessions', { error: err });
      return res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }

  static async createSession(req: Request, res: Response) {
    try {
        const { workflowId, title } = req.body;
        const userId = (req as any).user?.id || 'anonymous';
        
        const chatService = new AIChatService();
        const session = await chatService.createSession(userId, workflowId, title);
        return res.json(session);
    } catch (err) {
        logger.error('Failed to create session', { error: err });
        return res.status(500).json({ error: "Failed to create session" });
    }
  }

  static async getMessages(req: Request, res: Response) {
      try {
          const { id } = req.params;
          const chatService = new AIChatService();
          const session = await chatService.getSession(id);
          if (!session) return res.status(404).json({ error: "Session not found" });
          
          return res.json(session.messages);
      } catch (err) {
          logger.error('Failed to get messages', { error: err });
          return res.status(500).json({ error: "Failed to fetch messages" });
      }
  }

  static async deleteSession(req: Request, res: Response) {
      try {
          const { id } = req.params;
          const userId = (req as any).user?.id || 'anonymous';
          const chatService = new AIChatService();
          await chatService.deleteSession(id, userId);
          return res.json({ success: true });
      } catch (err) {
          logger.error('Failed to delete session', { error: err });
          return res.status(500).json({ error: "Failed to delete session" });
      }
  }
}
