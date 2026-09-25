import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from './auth.js';
import { sendError } from '../utils/response.js';

export async function verifyResourceOwnership(
  model: 'project' | 'education' | 'certification' | 'achievement',
  resourceId: string,
  userId: string,
  res: Response
): Promise<{ profileId: string; resource: any } | null> {
  const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
  if (!profile) {
    sendError(res, 'Profile not found', 404);
    return null;
  }

  let resource: any = null;
  if (model === 'project') {
    resource = await prisma.project.findUnique({ where: { id: resourceId } });
  } else if (model === 'education') {
    resource = await prisma.education.findUnique({ where: { id: resourceId } });
  } else if (model === 'certification') {
    resource = await prisma.certification.findUnique({ where: { id: resourceId } });
  } else if (model === 'achievement') {
    resource = await prisma.achievement.findUnique({ where: { id: resourceId } });
  }

  if (!resource) {
    sendError(res, `${model.charAt(0).toUpperCase() + model.slice(1)} not found`, 404);
    return null;
  }

  if (resource.profile_id !== profile.id) {
    sendError(res, `Forbidden: You do not own this ${model}`, 403);
    return null;
  }

  return { profileId: profile.id, resource };
}

