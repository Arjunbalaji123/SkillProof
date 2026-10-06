import { Router } from 'express';
import { getProfile, updateProfile, uploadAvatar, getPublicProfile } from '../controllers/profileController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', requireAuth, getProfile);
router.put('/', requireAuth, updateProfile);
router.post('/avatar', requireAuth, upload.single('avatar'), uploadAvatar);
router.get('/developer/:username', getPublicProfile);

export default router;

