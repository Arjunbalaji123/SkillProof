import { Router } from 'express';
import {
  getAssessments,
  getAssessmentById,
  startAssessment,
  startAssessmentForSkill,
  submitAssessment,
  getUserAssessmentResults,
} from '../controllers/assessmentsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getAssessments);
router.get('/results', requireAuth, getUserAssessmentResults);
router.post('/skill/:skillId/start', requireAuth, startAssessmentForSkill);
router.get('/:id', requireAuth, getAssessmentById);
router.post('/:id/start', requireAuth, startAssessment);
router.post('/:id/submit', requireAuth, submitAssessment);

export default router;

