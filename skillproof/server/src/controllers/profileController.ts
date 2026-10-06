import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { updateProfileSchema } from '../validators/index.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { logAudit } from '../utils/audit.js';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.profile.findUnique({
      where: { user_id: userId },
      include: {
        user_skills: {
          include: { skill: true },
          orderBy: { created_at: 'desc' },
        },
        projects: {
          include: { technologies: true },
          orderBy: { created_at: 'desc' },
        },
        education: { orderBy: { created_at: 'desc' } },
        certifications: { orderBy: { created_at: 'desc' } },
        achievements: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!profile) {
      return sendError(res, 'Profile not found', 404);
    }

    const completion = await calculateProfileCompletion(profile.id);
    profile.profile_completion = completion;

    return sendSuccess(res, 'Profile fetched successfully', profile);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const validated = updateProfileSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      return sendError(res, 'Profile not found', 404);
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: validated,
    });

    const completion = await calculateProfileCompletion(profile.id);
    updatedProfile.profile_completion = completion;

    await logAudit(userId, 'PROFILE_UPDATED', 'PROFILE', profile.id);

    return sendSuccess(res, 'Profile updated successfully', updatedProfile);
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      return sendError(res, 'No image file uploaded', 400);
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const profile = await prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      return sendError(res, 'Profile not found', 404);
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: { profile_image: avatarUrl },
    });

    const completion = await calculateProfileCompletion(profile.id);
    updatedProfile.profile_completion = completion;

    await logAudit(userId, 'AVATAR_UPLOADED', 'PROFILE', profile.id, { avatarUrl });

    return sendSuccess(res, 'Profile avatar uploaded successfully', updatedProfile);
  } catch (err) {
    next(err);
  }
};

export const getPublicProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username as string;

    const profile = await prisma.profile.findUnique({
      where: { username },
      include: {
        user: { select: { id: true, role: true, created_at: true } },
        user_skills: {
          include: { skill: true },
          orderBy: { created_at: 'desc' },
        },
        projects: {
          include: { technologies: true },
          orderBy: { created_at: 'desc' },
        },
        education: { orderBy: { created_at: 'desc' } },
        certifications: { orderBy: { created_at: 'desc' } },
        achievements: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!profile) {
      return sendError(res, `Developer profile '@${username}' not found`, 404);
    }

    return sendSuccess(res, 'Public profile retrieved successfully', profile);
  } catch (err) {
    next(err);
  }
};

