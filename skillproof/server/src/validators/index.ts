import { z } from 'zod';

const safeUrlSchema = z.string().superRefine((val, ctx) => {
  if (!val) return;
  if (!/^https?:\/\//i.test(val) && !val.startsWith('/uploads/')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'URL must start with http://, https://, or /uploads/',
    });
  }
}).or(z.literal('')).optional();

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 characters');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3-20 characters, lowercase alphanumeric or underscore');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name cannot exceed 60 characters');

export const registerSchema = z
  .object({
    name: nameSchema,
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(['DEVELOPER', 'RECRUITER'], {
      errorMap: () => ({ message: 'Role must be DEVELOPER or RECRUITER' }),
    }),
    companyName: z.string().trim().optional(),
    jobTitle: z.string().trim().optional(),
    companyWebsite: safeUrlSchema,
    linkedinUrl: safeUrlSchema,
    bio: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === 'RECRUITER') {
      if (!val.companyName || val.companyName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyName'],
          message: 'Company name is required for recruiter registration',
        });
      }
      if (!val.jobTitle || val.jobTitle.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['jobTitle'],
          message: 'Job title is required for recruiter registration',
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const claimSkillSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  claimedLevel: z.enum(['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert']).default('Intermediate'),
  certificateUrl: safeUrlSchema,
});

export const updateClaimSkillSchema = z.object({
  claimedLevel: z.enum(['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert']).optional(),
  certificateUrl: safeUrlSchema,
});

export const startAssessmentSchema = z.object({
  language: z.string().min(1, 'Language is required'),
});

export const saveAnswerSchema = z.object({
  order: z.number().int().min(1),
  userAnswer: z.any(),
});

export const flagQuestionSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

export const projectSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  repoUrl: safeUrlSchema,
  techStack: z.string().min(1, 'Tech stack is required'),
});

export const updateProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  githubUrl: safeUrlSchema,
  isPublic: z.boolean().optional(),
  showOnLeaderboard: z.boolean().optional(),
  allowRecruiterMessages: z.boolean().optional(),
  notificationsPaused: z.boolean().optional(),
  companyName: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  companyWebsite: safeUrlSchema,
  linkedinUrl: safeUrlSchema,
});

export const bookmarkSchema = z.object({
  developerId: z.string().min(1, 'Developer ID is required'),
  note: z.string().max(1000).optional(),
});

export const adminQuestionSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  topic: z.string().min(1, 'Topic is required'),
  skillCatalogId: z.string().optional(),
  topicId: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  type: z.enum(['MCQ', 'MULTI', 'CODE_OUTPUT', 'SCENARIO']).default('MCQ'),
  prompt: z.string().min(5, 'Prompt must be at least 5 characters'),
  options: z.any(),
  correctAnswer: z.any(),
  explanation: z.string().default(''),
});

export const adminUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const proctorEventSchema = z.object({
  type: z.enum(['PHONE', 'BOOK', 'NO_FACE', 'MULTI_FACE', 'CAMERA_OFF', 'NO_HEARTBEAT']),
  snapshot: z.string().optional().nullable(),
});

export const proctorHeartbeatSchema = z.object({
  cameraStatus: z.string().optional(),
  cameraActive: z.boolean().optional(),
});

export const lockoutAppealSchema = z.object({
  appealText: z.string().min(3, 'Appeal explanation must be at least 3 characters').max(2000),
});

export const liftLockoutSchema = z.object({
  reason: z.string().min(3, 'Reason for lifting lockout is required').max(1000),
});

export const confirmViolationSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const createOpeningSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  trackId: z.string().trim().min(1, 'Track is required'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  skillCatalogIds: z.array(z.string().min(1)).optional(),
  skillIds: z.array(z.string().min(1)).optional(),
  minLevel: z.enum(['Basic', 'Intermediate', 'Advanced', 'Expert']).optional().nullable(),
  minScore: z.number().min(0).max(100).optional().nullable(),
  positions: z.number().int().min(1).max(100).default(1),
  expiresAt: z.string().optional(),
});

export const updateOpeningSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  trackId: z.string().trim().min(1).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  skillCatalogIds: z.array(z.string().min(1)).optional(),
  skillIds: z.array(z.string().min(1)).optional(),
  minLevel: z.enum(['Basic', 'Intermediate', 'Advanced', 'Expert']).optional().nullable(),
  minScore: z.number().min(0).max(100).optional().nullable(),
  positions: z.number().int().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED', 'PENDING_REVIEW', 'REJECTED']).optional(),
});

export const adminReviewOpeningSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.decision === 'REJECT') {
        return !!data.reason && data.reason.trim().length >= 3;
      }
      return true;
    },
    {
      message: 'A rejection reason of at least 3 characters is required when rejecting an opening',
      path: ['reason'],
    }
  );

export const approachOpeningSchema = z.object({
  message: z.string().min(1, 'Approach message cannot be empty').max(500, 'Approach message cannot exceed 500 characters'),
});

export const decideApproachSchema = z.object({
  decision: z.enum(['ACCEPTED', 'DECLINED', 'SAVED']),
});

export const startDirectConversationSchema = z.object({
  developerUsername: z.string().trim().min(1).optional(),
  recipientUsername: z.string().trim().min(1).optional(),
  body: z.string().min(1, 'Message body cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  reason: z.string().max(500).optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
});

export const reportMessageSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500, 'Reason cannot exceed 500 characters'),
});

export const adminResolveMessageReportSchema = z.object({
  action: z.enum(['resolve', 'warn', 'suspend', 'delete']).optional(),
  deleteMessage: z.boolean().optional(),
  warnSender: z.boolean().optional(),
  suspendSender: z.boolean().optional(),
  note: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateInterestsSchema = z.object({
  trackIds: z.array(z.string()).default([]),
  skillIds: z.array(z.string()).default([]),
});

export const updateMessagingSettingsSchema = z.object({
  allowRecruiterMessages: z.boolean(),
});

export const updateNotificationSettingsSchema = z.object({
  notificationsPaused: z.boolean(),
});

export const adminVerifyRecruiterSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'UNVERIFY']).optional(),
  isVerified: z.boolean().optional(),
  reason: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});




