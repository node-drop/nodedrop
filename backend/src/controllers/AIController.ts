import { Request, Response } from 'express';
import { AIChatService } from '../services/ai/AIChatService';
import { AIService } from '../services/ai/AIService';
import { logger } from '../utils/logger';

export class AIController {
  
  static async generateWorkflow(req: Request, res: Response) {
    try {
      const { prompt, currentWorkflow, openAiKey, sessionId, workflowId } = req.body;
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

      const aiService = new AIService(nodeService);
      const chatService = new AIChatService();
      
      // Save User Message if session exists
      if (sessionId) {
        await chatService.addMessage(sessionId, 'user', prompt, { workflowId });
      }

      const result = await aiService.generateWorkflow({
        prompt,
        currentWorkflow,
        openAiKey
      });

      // Save Assistant Message if session exists
      if (sessionId) {
        await chatService.addMessage(sessionId, 'assistant', result.message, { 
             workflow: result.workflow,
             missingNodeTypes: result.missingNodeTypes 
        });
      }

      return res.json(result);

    } catch (error) {
      logger.error('Error generating workflow', { error });
      return res.status(500).json({ 
        error: 'Failed to generate workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
