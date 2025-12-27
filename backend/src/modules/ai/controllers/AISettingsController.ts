
import { db } from '@/db/client';
import { userAiSettings } from '@/db/schema/ai_settings';
import { getCredentialService } from '@/services/CredentialService.factory';
import { logger } from '@/utils/logger';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

export class AISettingsController {

  /**
   * GET /api/ai/settings
   * Retrieve current user's AI settings
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      
      const settings = await db.query.userAiSettings.findFirst({
        where: eq(userAiSettings.userId, userId),
        with: {
          credential: true
        }
      });

      if (!settings) {
        return res.json({
          provider: 'openai',
          model: 'gpt-4o',
          hasKey: false
        });
      }

      return res.json({
        provider: settings.provider,
        model: settings.model,
        credentialId: settings.credentialId,
        hasKey: !!settings.credentialId
      });
    } catch (error) {
      logger.error('Failed to get AI settings', error as any);
      return res.status(500).json({ error: 'Failed to retrieve settings' });
    }
  }

  /**
   * PUT /api/ai/settings
   * Update settings and optional API key
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'anonymous';
      const { provider, model, apiKey } = req.body;

      // 1. Get or Create Settings Record
      let settings = await db.query.userAiSettings.findFirst({
        where: eq(userAiSettings.userId, userId)
      });

      if (!settings) {
        // Create initial record
        const [newSettings] = await db.insert(userAiSettings).values({
          userId,
          provider: provider || 'openai',
          model: model || 'gpt-4o'
        }).returning();
        settings = newSettings;
      } else {
        // Update basic fields
        if (provider || model) {
           const [updated] = await db.update(userAiSettings)
            .set({ 
              provider: provider ?? settings.provider,
              model: model ?? settings.model,
              updatedAt: new Date()
            })
            .where(eq(userAiSettings.id, settings.id))
            .returning();
           settings = updated;
        }
      }

      // 2. Handle API Key (if provided)
      // 2. Handle Credential Linking (if credentialId provided)
      const { credentialId } = req.body;
      if (credentialId) {
         // Verify credential exists and user has access (basic check via update for now, or trust ID from trusted selector)
         // In a stricter system, we'd verify ownership here.
         await db.update(userAiSettings)
            .set({ credentialId: credentialId })
            .where(eq(userAiSettings.id, settings.id));
      } else if (apiKey) {
        // Legacy/Direct mode: Create or Update specific API Key credential
        const credentialService = getCredentialService();
        
        if (settings.credentialId) {
          // Update existing credential
          await credentialService.updateCredential(settings.credentialId, userId, {
             data: { apiKey }
          });
        } else {
          // Create new credential
          const newCred = await credentialService.createCredential(
            userId, 
            `AI Key (${userId.substring(0, 5)})`, // Name
            'apiKey',                              // Type (must match registered type)
            { apiKey }                             // Data
          );
          
          // Link to settings
          await db.update(userAiSettings)
            .set({ credentialId: newCred.id })
            .where(eq(userAiSettings.id, settings.id));
        }
      } else if (req.body.credentialId === null) {
          // Explicit unlink
          await db.update(userAiSettings)
            .set({ credentialId: null })
            .where(eq(userAiSettings.id, settings.id));
      }

      return res.json({ success: true });
    } catch (error) {
      logger.error('Failed to save AI settings', error as any);
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  }
}
