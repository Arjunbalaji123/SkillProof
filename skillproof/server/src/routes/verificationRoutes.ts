import { Router } from 'express';
import {
  getVerifications,
  createVerificationRequest,
  reviewVerificationRequest,
} from '../controllers/verificationController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', requireAuth, getVerifications);
router.post('/', requireAuth, upload.single('proof'), createVerificationRequest);
router.put('/:id', requireAuth, requireAdmin, reviewVerificationRequest);

export default router;

