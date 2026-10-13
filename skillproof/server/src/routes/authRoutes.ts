import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { optionalAuth } from '../middleware/auth.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  checkUsernameRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// Public auth endpoints
router.post('/register', registerRateLimiter, AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/session', optionalAuth, AuthController.session);
router.get('/check-username', checkUsernameRateLimiter, AuthController.checkUsername);

export default router;

