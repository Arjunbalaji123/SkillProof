import { Router } from 'express';
import { getPublicPortfolio, updateProfile } from '../controllers/profileController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/index.js';

const router = Router();

// Public portfolio route (optionalAuth populates viewer bookmark status)
router.get('/public/:slug', optionalAuth, getPublicPortfolio);

// Authenticated profile update
router.patch('/', requireAuth, validateBody(updateProfileSchema), updateProfile);

export default router;
