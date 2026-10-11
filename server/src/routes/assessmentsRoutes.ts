import { Router } from 'express';
import {
  startAssessment,
  saveAnswer,
  recordTabSwitch,
  submitAssessment,
  getAssessmentResult,
  getAssessmentHistory,
  flagQuestion,
} from '../controllers/assessmentsController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  startAssessmentSchema,
  saveAnswerSchema,
  flagQuestionSchema,
} from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.post('/start', validateBody(startAssessmentSchema), startAssessment);
router.post('/:id/answer', validateBody(saveAnswerSchema), saveAnswer);
router.post('/:id/tab-switch', recordTabSwitch);
router.post('/:id/submit', submitAssessment);
router.get('/:id/result', getAssessmentResult);
router.get('/history', getAssessmentHistory);
router.post('/questions/:id/flag', validateBody(flagQuestionSchema), flagQuestion);

export default router;
