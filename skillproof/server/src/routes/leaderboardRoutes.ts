import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getLeaderboard);

export default router;

