import { Router } from 'express';
import {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
} from '../controllers/achievementsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getAchievements);
router.post('/', requireAuth, createAchievement);
router.put('/:id', requireAuth, updateAchievement);
router.delete('/:id', requireAuth, deleteAchievement);

export default router;
