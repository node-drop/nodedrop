
import { requireAuth } from '@/middleware/auth';
import { AIController } from '@/modules/ai/controllers/AIController';
import { AISettingsController } from '@/modules/ai/controllers/AISettingsController';
import { Router } from 'express';

const router = Router();

// Protect AI endpoints
router.post('/generate-workflow', requireAuth, AIController.generateWorkflow);

// Chat Session Management
router.get('/sessions', requireAuth, AIController.getSessions);
router.post('/sessions', requireAuth, AIController.createSession);
router.get('/sessions/:id/messages', requireAuth, AIController.getMessages);
router.delete('/sessions/:id', requireAuth, AIController.deleteSession);

// AI Settings
router.get('/settings', requireAuth, AISettingsController.getSettings);
router.put('/settings', requireAuth, AISettingsController.updateSettings);

export const aiRoutes = router;
