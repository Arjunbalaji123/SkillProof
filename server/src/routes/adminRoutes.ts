import { Router } from 'express';
import {
  getStats,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  listUsers,
  updateUserStatus,
  getFlags,
  resolveFlag,
  getAuditLogs,
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import { adminQuestionSchema, adminUserStatusSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', getStats);
router.get('/questions', listQuestions);
router.post('/questions', validateBody(adminQuestionSchema), createQuestion);
router.patch('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.post('/questions/import', importQuestions);

router.get('/users', listUsers);
router.patch('/users/:id/status', validateBody(adminUserStatusSchema), updateUserStatus);

router.get('/flags', getFlags);
router.post('/flags/:id/resolve', resolveFlag);

router.get('/audit', getAuditLogs);

export default router;
