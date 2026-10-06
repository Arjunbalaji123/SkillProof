import { Router } from 'express';
import {
  getAllSkills,
  createSkill,
  getUserSkills,
  addUserSkill,
  updateUserSkill,
  deleteUserSkill,
} from '../controllers/skillsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Master catalog
router.get('/', getAllSkills);
router.post('/', requireAuth, createSkill);

// User skills
router.get('/user', requireAuth, getUserSkills);
router.post('/user', requireAuth, addUserSkill);
router.put('/user/:id', requireAuth, updateUserSkill);
router.delete('/user/:id', requireAuth, deleteUserSkill);

export default router;

