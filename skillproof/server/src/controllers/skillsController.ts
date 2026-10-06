import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { userSkillSchema } from '../validators/index.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { logAudit } from '../utils/audit.js';

export const getAllSkills = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, search } = req.query;

    const where: any = {};
    if (category) where.category = String(category);
    if (search) {
      where.name = { contains: String(search) };
    }

    const skills = await prisma.skill.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return sendSuccess(res, 'Skills retrieved successfully', skills);
  } catch (err) {
    next(err);
  }
};

export const createSkill = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return sendError(res, 'Skill name and category are required', 400);
    }

    const existing = await prisma.skill.findUnique({ where: { name: String(name) } });
    if (existing) {
      return sendError(res, 'Skill already exists in catalog', 409);
    }

    const skill = await prisma.skill.create({
      data: { name: String(name), category: String(category), description: description ? String(description) : null },
    });

    await logAudit(req.user?.userId || null, 'SKILL_CREATED', 'SKILL', skill.id, { name: skill.name });

    return sendSuccess(res, 'Skill created successfully', skill, 201);
  } catch (err) {
    next(err);
  }
};

export const getUserSkills = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) return sendError(res, 'Profile not found', 404);

    const userSkills = await prisma.userSkill.findMany({
      where: { profile_id: profile.id },
      include: { skill: true },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'User skills retrieved successfully', userSkills);
  } catch (err) {
    next(err);
  }
};

export const addUserSkill = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const validated = userSkillSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({
      where: { user_id: userId },
    });
    if (!profile) return sendError(res, 'Profile not found', 404);

    let skillId = validated.skill_id;

    if (!skillId && validated.skill_name) {
      const normalizedName = validated.skill_name.trim();
      let skill = await prisma.skill.findFirst({
        where: { name: { equals: normalizedName } },
      });
      if (!skill) {
        skill = await prisma.skill.create({
          data: { name: normalizedName, category: 'General' },
        });
      }
      skillId = skill.id;
    }

    if (!skillId) {
      return sendError(res, 'Skill ID or Skill Name is required', 400);
    }

    const existingUserSkill = await prisma.userSkill.findFirst({
      where: { profile_id: profile.id, skill_id: skillId },
    });

    if (existingUserSkill) {
      return sendError(res, 'Skill is already added to your profile', 409);
    }

    const userSkill = await prisma.userSkill.create({
      data: {
        profile_id: profile.id,
        skill_id: skillId,
        proficiency_level: validated.proficiency_level,
        verification_status: 'UNVERIFIED',
      },
      include: { skill: true },
    });

    await calculateProfileCompletion(profile.id);
    await logAudit(userId, 'USER_SKILL_ADDED', 'USER_SKILL', userSkill.id);

    return sendSuccess(res, 'Skill added to profile successfully', userSkill, 201);
  } catch (err) {
    next(err);
  }
};

export const updateUserSkill = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userSkillId = req.params.id as string;
    const { proficiency_level } = req.body;

    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    if (!proficiency_level || !validLevels.includes(String(proficiency_level).toUpperCase())) {
      return sendError(res, 'Invalid proficiency level. Allowed values: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT', 400);
    }

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const userSkill = await prisma.userSkill.findFirst({
      where: { id: userSkillId, profile_id: profile.id },
    });

    if (!userSkill) return sendError(res, 'User skill record not found', 404);

    const updated = await prisma.userSkill.update({
      where: { id: userSkillId },
      data: { proficiency_level: String(proficiency_level).toUpperCase() as any },
      include: { skill: true },
    });

    return sendSuccess(res, 'User skill updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

export const deleteUserSkill = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const userSkillId = req.params.id as string;

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const userSkill = await prisma.userSkill.findFirst({
      where: { id: userSkillId, profile_id: profile.id },
    });

    if (!userSkill) return sendError(res, 'User skill record not found', 404);

    await prisma.userSkill.delete({ where: { id: userSkillId } });
    await calculateProfileCompletion(profile.id);
    await logAudit(userId, 'USER_SKILL_DELETED', 'USER_SKILL', userSkillId);

    return sendSuccess(res, 'User skill removed from profile successfully');
  } catch (err) {
    next(err);
  }
};

