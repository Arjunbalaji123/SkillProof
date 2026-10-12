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
import { requireAdmin } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import { claimSkillSchema, updateClaimSkillSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', getDashboardSummary);
router.get('/', getUserSkills);
router.post('/claim', validateBody(claimSkillSchema), claimSkill);
router.patch('/:id', validateBody(updateClaimSkillSchema), updateClaimedSkill);
router.delete('/:id', deleteSkill);

// Admin or reviewer endpoint for certificate claims
router.get('/claims/unverified', requireAdmin, getCertificateClaims);

export default router;
