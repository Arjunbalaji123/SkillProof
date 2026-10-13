import { Router } from 'express';
import { checkUsername, searchUsers } from '../controllers/userController.js';
import { searchRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/check-username', checkUsername);
router.get('/search', searchRateLimiter, searchUsers);

export default router;

