import { Router } from 'express';
import {
  getInterests,
  updateInterests,
  updateMessagingSettings,
  updateNotificationSettings,
} from '../controllers/profileController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  updateInterestsSchema,
  updateMessagingSettingsSchema,
  updateNotificationSettingsSchema,
} from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/interests', getInterests);
router.patch('/interests', validateBody(updateInterestsSchema), updateInterests);
router.patch('/messaging-settings', validateBody(updateMessagingSettingsSchema), updateMessagingSettings);
router.patch('/notification-settings', validateBody(updateNotificationSettingsSchema), updateNotificationSettings);

export default router;
