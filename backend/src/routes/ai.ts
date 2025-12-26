
import { Router } from 'express';
import { AIController } from '../controllers/AIController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect AI endpoints
router.post('/generate-workflow', requireAuth, AIController.generateWorkflow);

export const aiRoutes = router;
