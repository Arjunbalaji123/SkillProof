import { Router } from 'express';
import {
  createOpening,
  getMyOpenings,
  getMatchingOpenings,
  getOpeningDetails,
  updateOpening,
  getOpeningApplicants,
  approachOpening,
  decideApproach,
} from '../controllers/openingController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import {
  createOpeningSchema,
  updateOpeningSchema,
  approachOpeningSchema,
  decideApproachSchema,
} from '../validators/index.js';
import { approachRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
export const approachRouter = Router();

router.use(requireAuth);
approachRouter.use(requireAuth);

// Recruiter endpoints
router.post('/', requireRole('RECRUITER', 'ADMIN'), validateBody(createOpeningSchema), createOpening);
router.get('/mine', requireRole('RECRUITER', 'ADMIN'), getMyOpenings);

// Developer endpoints
router.get('/matches', requireRole('DEVELOPER', 'RECRUITER', 'ADMIN'), getMatchingOpenings);

// Shared / specific opening endpoints
router.get('/:id', requireRole('DEVELOPER', 'RECRUITER', 'ADMIN'), getOpeningDetails);
router.patch('/:id', requireRole('RECRUITER', 'ADMIN'), validateBody(updateOpeningSchema), updateOpening);
router.get('/:id/applicants', requireRole('RECRUITER', 'ADMIN'), getOpeningApplicants);
router.post(
  '/:id/approach',
  requireRole('DEVELOPER', 'RECRUITER', 'ADMIN'),
  approachRateLimiter,
  validateBody(approachOpeningSchema),
  approachOpening
);

// POST /api/approaches/:id/decide
approachRouter.post(
  '/:id/decide',
  requireRole('RECRUITER', 'ADMIN'),
  validateBody(decideApproachSchema),
  decideApproach
);

export default router;

