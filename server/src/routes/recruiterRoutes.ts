import { Router } from 'express';
import {
  searchDevelopers,
  getBookmarks,
  addBookmark,
  removeBookmark,
} from '../controllers/recruiterController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRecruiter } from '../middleware/role.js';

const router = Router();

router.get('/developers', optionalAuth, searchDevelopers);
router.get('/bookmarks', requireAuth, requireRecruiter, getBookmarks);
router.post('/bookmarks', requireAuth, requireRecruiter, addBookmark);
router.delete('/bookmarks/:developerId', requireAuth, requireRecruiter, removeBookmark);

export default router;

