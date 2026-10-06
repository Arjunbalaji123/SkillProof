import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectImage,
} from '../controllers/projectsController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', requireAuth, getProjects);
router.get('/:id', getProjectById);
router.post('/', requireAuth, createProject);
router.put('/:id', requireAuth, updateProject);
router.delete('/:id', requireAuth, deleteProject);
router.post('/:id/image', requireAuth, upload.single('image'), uploadProjectImage);

export default router;

