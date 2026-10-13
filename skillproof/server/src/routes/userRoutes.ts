import { Router } from 'express';
import { checkUsername, searchUsers } from '../controllers/userController.js';
import { searchRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/check-username', checkUsername);
router.get('/search', requireAuth, searchRateLimiter, searchUsers);

export default router;

