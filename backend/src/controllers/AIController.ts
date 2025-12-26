
import { Request, Response } from 'express';
import { AIService } from '../services/ai/AIService';
import { logger } from '../utils/logger';

export class AIController {
  
  static async generateWorkflow(req: Request, res: Response) {
    try {
      const { prompt, currentWorkflow, openAiKey } = req.body;

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
      
      const result = await aiService.generateWorkflow({
        prompt,
        currentWorkflow,
        openAiKey
      });

      return res.json(result);

    } catch (error) {
      logger.error('Error generating workflow', { error });
      return res.status(500).json({ 
        error: 'Failed to generate workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
