import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
});

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/me', requireAuth, getMe);

export default router;

