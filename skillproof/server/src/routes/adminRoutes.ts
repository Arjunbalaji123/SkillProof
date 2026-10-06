import { Router } from 'express';
import {
  getDashboardStats,
  getUsersList,
  updateUserStatus,
  getAuditLogs,
  getReports,
} from '../controllers/adminController.js';
import { reviewVerificationRequest, getVerifications } from '../controllers/verificationController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsersList);
router.put('/users/:id/status', updateUserStatus);
router.get('/verifications', getVerifications);
router.put('/verifications/:id', reviewVerificationRequest);
router.get('/audit-logs', getAuditLogs);
router.get('/reports', getReports);

export default router;

