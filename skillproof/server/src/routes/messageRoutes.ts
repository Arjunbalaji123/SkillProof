import { Router } from 'express';
import {
  listConversations,
  getConversation,
  startConversation,
  sendMessage,
  markConversationRead,
  acceptConversationRequest,
  declineConversationRequest,
  archiveConversation,
  toggleMuteConversation,
  blockUser,
  unblockUser,
  reportMessage,
  getUnreadCount,
} from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateBody } from '../middleware/validate.js';
import {
  startConversationSchema,
  sendMessageSchema,
  reportMessageSchema,
} from '../validators/index.js';
import {
  messageSendRateLimiter,
  conversationStartRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// All messaging routes require authentication and active DEVELOPER or RECRUITER role
router.use(requireAuth);
router.use(requireRole('DEVELOPER', 'RECRUITER', 'ADMIN'));

router.get('/unread-count', getUnreadCount);
router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversation);

router.post(
  '/conversations',
  conversationStartRateLimiter,
  messageSendRateLimiter,
  validateBody(startConversationSchema),
  startConversation
);

router.post(
  '/conversations/:id/messages',
  messageSendRateLimiter,
  validateBody(sendMessageSchema),
  sendMessage
);

router.post('/conversations/:id/read', markConversationRead);
router.post('/conversations/:id/accept', acceptConversationRequest);
router.post('/conversations/:id/decline', declineConversationRequest);
router.post('/conversations/:id/archive', archiveConversation);
router.post('/conversations/:id/mute', toggleMuteConversation);

router.post('/blocks/:userId', blockUser);
router.delete('/blocks/:userId', unblockUser);

router.post(
  '/:messageId/report',
  validateBody(reportMessageSchema),
  reportMessage
);

export default router;

