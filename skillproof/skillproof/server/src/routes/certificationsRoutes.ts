import { Router } from 'express';
import {
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
} from '../controllers/certificationsController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', requireAuth, getCertifications);
router.post('/', requireAuth, upload.single('document'), createCertification);
router.put('/:id', requireAuth, upload.single('document'), updateCertification);
router.delete('/:id', requireAuth, deleteCertification);

export default router;

