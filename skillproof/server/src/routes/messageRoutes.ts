import { Router } from 'express';
import {
  startDirectConversation,
  listConversations,
  getConversationMessages,
  sendMessage,
  closeConversation,
  markConversationRead,
  archiveConversation,
  toggleMuteConversation,
  blockUser,
  unblockUser,
  reportMessage,
  getUnreadCount,
  getDirectQuota,
} from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import {
  startDirectConversationSchema,
  sendMessageSchema,
  reportMessageSchema,
} from '../validators/index.js';
import {
  messageSendRateLimiter,
  directConversationRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

router.use(requireAuth);

router.get('/unread-count', getUnreadCount);
router.get('/direct-quota', requireRole('RECRUITER', 'ADMIN'), getDirectQuota);

router.post(
  '/conversations',
  directConversationRateLimiter,
  validateBody(startDirectConversationSchema),
  startDirectConversation
);
router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversationMessages);
router.post(
  '/conversations/:id/messages',
  messageSendRateLimiter,
  validateBody(sendMessageSchema),
  sendMessage
);
router.post('/conversations/:id/close', requireRole('RECRUITER', 'ADMIN'), closeConversation);
router.post('/conversations/:id/read', markConversationRead);
router.post('/conversations/:id/archive', archiveConversation);
router.post('/conversations/:id/mute', toggleMuteConversation);

router.post('/blocks/:userId', blockUser);
router.delete('/blocks/:userId', unblockUser);

router.post('/:messageId/report', validateBody(reportMessageSchema), reportMessage);

export default router;
