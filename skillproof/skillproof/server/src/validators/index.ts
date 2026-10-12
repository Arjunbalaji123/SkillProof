import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['DEVELOPER', 'RECRUITER', 'ADMIN']).default('DEVELOPER'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  headline: z.string().max(255).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(150).optional(),
  github_url: z.string().url('Invalid GitHub URL').or(z.literal('')).optional(),
  linkedin_url: z.string().url('Invalid LinkedIn URL').or(z.literal('')).optional(),
  portfolio_url: z.string().url('Invalid Portfolio URL').or(z.literal('')).optional(),
  years_experience: z.number().min(0).max(60).optional(),
});

export const userSkillSchema = z.object({
  skill_id: z.string().uuid('Invalid skill ID').optional(),
  skill_name: z.string().min(1).optional(),
  proficiency_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
});

export const projectSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  github_url: z.string().url('Invalid GitHub URL').or(z.literal('')).optional(),
  live_url: z.string().url('Invalid Live Demo URL').or(z.literal('')).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['COMPLETED', 'IN_PROGRESS', 'PLANNED']).default('COMPLETED'),
  technologies: z.array(z.string()).default([]),
});

export const educationSchema = z.object({
  institution: z.string().min(2, 'Institution is required'),
  degree: z.string().min(2, 'Degree is required'),
  field_of_study: z.string().min(2, 'Field of study is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  grade: z.string().optional(),
  description: z.string().optional(),
});

export const certificationSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  issuer: z.string().min(2, 'Issuer is required'),
  issue_date: z.string().min(1, 'Issue date is required'),
  expiry_date: z.string().optional(),
  credential_id: z.string().optional(),
  credential_url: z.string().url('Invalid Credential URL').or(z.literal('')).optional(),
});

export const achievementSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  date: z.string().optional(),
  issuer: z.string().optional(),
  url: z.string().url('Invalid URL').or(z.literal('')).optional(),
});

export const verificationRequestSchema = z.object({
  user_skill_id: z.string().min(1, 'User skill ID is required'),
  method: z.enum(['ASSESSMENT', 'CERTIFICATION', 'PROJECT', 'DOCUMENT']),
});

export const adminVerificationReviewSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  rejection_reason: z.string().optional(),
});
