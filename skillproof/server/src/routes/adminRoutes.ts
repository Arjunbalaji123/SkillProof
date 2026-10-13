import { Router } from 'express';
import {
  getStats,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  listUsers,
  updateUserStatus,
  getFlags,
  resolveFlag,
  getAuditLogs,
  getCatalog,
  createTrack,
  updateTrack,
  deleteTrack,
  createSkillCatalog,
  updateSkillCatalog,
  deleteSkillCatalog,
  createTopic,
  updateTopic,
  deleteTopic,
  getQuestionPoolHealth,
  getProctoringOverview,
  liftLockout,
  confirmViolation,
  serveProctorSnapshot,
  listRecruiters,
  verifyRecruiter,
  listAdminOpenings,
  moderateAdminOpening,
  reviewAdminOpening,
  getMessageReports,
  resolveMessageReport,
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import {
  adminQuestionSchema,
  adminUserStatusSchema,
  liftLockoutSchema,
  confirmViolationSchema,
  adminResolveMessageReportSchema,
  adminVerifyRecruiterSchema,
  updateOpeningSchema,
  adminReviewOpeningSchema,
} from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', getStats);
router.get('/questions', listQuestions);
router.post('/questions', validateBody(adminQuestionSchema), createQuestion);
router.patch('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.post('/questions/import', importQuestions);
router.get('/pool-health', getQuestionPoolHealth);

// Catalog management
router.get('/catalog', getCatalog);
router.post('/tracks', createTrack);
router.patch('/tracks/:id', updateTrack);
router.delete('/tracks/:id', deleteTrack);

router.post('/skills', createSkillCatalog);
router.patch('/skills/:id', updateSkillCatalog);
router.delete('/skills/:id', deleteSkillCatalog);

router.post('/topics', createTopic);
router.patch('/topics/:id', updateTopic);
router.delete('/topics/:id', deleteTopic);

router.get('/users', listUsers);
router.patch('/users/:id/status', validateBody(adminUserStatusSchema), updateUserStatus);

router.get('/flags', getFlags);
router.post('/flags/:id/resolve', resolveFlag);

// Proctoring administration
router.get('/proctoring', getProctoringOverview);
router.post('/proctoring/lockouts/:id/lift', validateBody(liftLockoutSchema), liftLockout);
router.post('/proctoring/lockouts/:id/confirm', validateBody(confirmViolationSchema), confirmViolation);
router.get('/proctor/snapshots/:filename', serveProctorSnapshot);

// Recruiter verification
router.get('/recruiters', listRecruiters);
router.patch('/recruiters/:id', validateBody(adminVerifyRecruiterSchema), verifyRecruiter);
router.patch('/recruiters/:id/verify', validateBody(adminVerifyRecruiterSchema), verifyRecruiter);
router.patch('/recruiters', validateBody(adminVerifyRecruiterSchema), verifyRecruiter);


// Opening moderation & review
router.get('/openings', listAdminOpenings);
router.patch('/openings/:id/review', validateBody(adminReviewOpeningSchema), reviewAdminOpening);
router.patch('/openings/:id', moderateAdminOpening);
router.patch('/openings', moderateAdminOpening);

// Message report moderation
router.get('/message-reports', getMessageReports);
router.patch('/message-reports/:id', validateBody(adminResolveMessageReportSchema), resolveMessageReport);
router.patch('/message-reports', validateBody(adminResolveMessageReportSchema), resolveMessageReport);

router.get('/audit', getAuditLogs);

export default router;
