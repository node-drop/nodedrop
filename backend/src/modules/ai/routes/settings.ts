
import { Router } from 'express';
import { AISettingsController } from '../controllers/AISettingsController';

const router = Router();

// Retrieve settings
router.get('/settings', AISettingsController.getSettings);

// Update settings
router.post('/settings', AISettingsController.updateSettings); // Using POST/PUT

export const aiSettingsRoutes = router;
