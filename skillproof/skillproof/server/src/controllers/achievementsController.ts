import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { achievementSchema } from '../validators/index.js';
import { logAudit } from '../utils/audit.js';

export const getAchievements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const achievements = await prisma.achievement.findMany({
      where: { profile_id: profile.id },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Achievements retrieved successfully', achievements);
  } catch (err) {
    next(err);
  }
};

export const createAchievement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const validated = achievementSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const achievement = await prisma.achievement.create({
      data: {
        profile_id: profile.id,
        title: validated.title,
        description: validated.description,
        date: validated.date || null,
        issuer: validated.issuer || null,
        url: validated.url || null,
      },
    });

    await logAudit(userId, 'ACHIEVEMENT_ADDED', 'ACHIEVEMENT', achievement.id);

    return sendSuccess(res, 'Achievement created successfully', achievement, 201);
  } catch (err) {
    next(err);
  }
};

export const updateAchievement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const validated = achievementSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const updated = await prisma.achievement.update({
      where: { id },
      data: {
        title: validated.title,
        description: validated.description,
        date: validated.date || null,
        issuer: validated.issuer || null,
        url: validated.url || null,
      },
    });

    return sendSuccess(res, 'Achievement updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

export const deleteAchievement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    await prisma.achievement.delete({ where: { id } });
    await logAudit(userId, 'ACHIEVEMENT_DELETED', 'ACHIEVEMENT', id);

    return sendSuccess(res, 'Achievement deleted successfully');
  } catch (err) {
    next(err);
  }
};

