import { Router } from 'express';
import {
  searchDevelopers,
  getBookmarks,
  setBookmark,
  removeBookmark,
} from '../controllers/recruiterController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRecruiter, requireRole } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import { bookmarkSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/developers', requireRecruiter, searchDevelopers);
router.get('/bookmarks', requireRole('DEVELOPER', 'RECRUITER', 'ADMIN'), getBookmarks);
router.post('/bookmarks', requireRole('DEVELOPER', 'RECRUITER', 'ADMIN'), validateBody(bookmarkSchema), setBookmark);
router.delete('/bookmarks/:developerId', requireRole('DEVELOPER', 'RECRUITER', 'ADMIN'), removeBookmark);

export default router;
