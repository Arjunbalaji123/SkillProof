import { Router } from 'express';
import {
  getUserProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectsController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { projectSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/', getUserProjects);
router.post('/', validateBody(projectSchema), createProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
