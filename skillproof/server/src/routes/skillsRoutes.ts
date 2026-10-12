import { Router } from 'express';
import {
  getDashboardSummary,
  getUserSkills,
  claimSkill,
  updateClaimedSkill,
  deleteSkill,
  getCertificateClaims,
} from '../controllers/skillsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireDeveloper } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import { claimSkillSchema, updateClaimSkillSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', requireDeveloper, getDashboardSummary);
router.get('/', requireDeveloper, getUserSkills);
router.post('/claim', requireDeveloper, validateBody(claimSkillSchema), claimSkill);
router.patch('/:id', requireDeveloper, validateBody(updateClaimSkillSchema), updateClaimedSkill);
router.delete('/:id', requireDeveloper, deleteSkill);

// Admin or reviewer endpoint for certificate claims
router.get('/claims/unverified', requireAdmin, getCertificateClaims);

export default router;
