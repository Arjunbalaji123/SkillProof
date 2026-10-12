import { z } from 'zod';

const safeUrlSchema = z.string().superRefine((val, ctx) => {
  if (!val) return;
  if (!/^https?:\/\//i.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'URL must start with http:// or https://',
    });
  }
}).or(z.literal('')).optional();

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email address')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['DEVELOPER', 'RECRUITER']).default('DEVELOPER'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email address')),
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
