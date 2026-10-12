import { Router } from 'express';
import {
  startAssessment,
  saveAnswer,
  recordTabSwitch,
  submitAssessment,
  getAssessment,
  getAssessmentResult,
  getAssessmentHistory,
  flagQuestion,
} from '../controllers/assessmentsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeveloper } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import {
  startAssessmentSchema,
  saveAnswerSchema,
  flagQuestionSchema,
} from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/history', requireDeveloper, getAssessmentHistory);
router.post('/start', requireDeveloper, validateBody(startAssessmentSchema), startAssessment);
router.get('/:id', requireDeveloper, getAssessment);
router.post('/:id/answer', requireDeveloper, validateBody(saveAnswerSchema), saveAnswer);
router.post('/:id/tab-switch', requireDeveloper, recordTabSwitch);
router.post('/:id/submit', requireDeveloper, submitAssessment);
router.get('/:id/result', requireDeveloper, getAssessmentResult);
router.post('/questions/:id/flag', requireDeveloper, validateBody(flagQuestionSchema), flagQuestion);

export default router;
