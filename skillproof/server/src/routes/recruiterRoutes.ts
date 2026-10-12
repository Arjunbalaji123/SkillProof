import { Router } from 'express';
import {
  searchDevelopers,
  getBookmarks,
  setBookmark,
  removeBookmark,
} from '../controllers/recruiterController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRecruiter } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import { bookmarkSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireRecruiter);

router.get('/developers', searchDevelopers);
router.get('/bookmarks', getBookmarks);
router.post('/bookmarks', validateBody(bookmarkSchema), setBookmark);
router.delete('/bookmarks/:developerId', removeBookmark);

export default router;
