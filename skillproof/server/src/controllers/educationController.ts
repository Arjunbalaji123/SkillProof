import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { educationSchema } from '../validators/index.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { logAudit } from '../utils/audit.js';

export const getEducation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const education = await prisma.education.findMany({
      where: { profile_id: profile.id },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Education entries retrieved', education);
  } catch (err) {
    next(err);
  }
};

export const createEducation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const validated = educationSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const entry = await prisma.education.create({
      data: {
        profile_id: profile.id,
        institution: validated.institution,
        degree: validated.degree,
        field_of_study: validated.field_of_study,
        start_date: validated.start_date,
        end_date: validated.end_date || null,
        grade: validated.grade || null,
        description: validated.description || null,
      },
    });

    await calculateProfileCompletion(profile.id);
    await logAudit(userId, 'EDUCATION_ADDED', 'EDUCATION', entry.id);

    return sendSuccess(res, 'Education entry created successfully', entry, 201);
  } catch (err) {
    next(err);
  }
};

export const updateEducation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const validated = educationSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const updated = await prisma.education.update({
      where: { id },
      data: {
        institution: validated.institution,
        degree: validated.degree,
        field_of_study: validated.field_of_study,
        start_date: validated.start_date,
        end_date: validated.end_date || null,
        grade: validated.grade || null,
        description: validated.description || null,
      },
    });

    return sendSuccess(res, 'Education entry updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

export const deleteEducation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    await prisma.education.delete({ where: { id } });
    await calculateProfileCompletion(profile.id);
    await logAudit(userId, 'EDUCATION_DELETED', 'EDUCATION', id);

    return sendSuccess(res, 'Education entry deleted successfully');
  } catch (err) {
    next(err);
  }
};

