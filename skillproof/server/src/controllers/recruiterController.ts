import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../utils/audit.js';

export const searchDevelopers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      skill,
      location,
      verified,
      proficiency,
      page = '1',
      limit = '10',
      sort = 'completion',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const userSkillWhere: any = {};
    if (skill) {
      userSkillWhere.skill = { name: { contains: String(skill) } };
    }
    if (verified === 'true') {
      userSkillWhere.verification_status = 'VERIFIED';
    }
    if (proficiency) {
      userSkillWhere.proficiency_level = String(proficiency);
    }

    const profileWhere: any = {
      user: { role: 'DEVELOPER', status: 'ACTIVE' },
    };

    if (search) {
      profileWhere.OR = [
        { name: { contains: String(search) } },
        { username: { contains: String(search) } },
        { headline: { contains: String(search) } },
      ];
    }

    if (location) {
      profileWhere.location = { contains: String(location) };
    }

    if (skill || verified === 'true' || proficiency) {
      profileWhere.user_skills = {
        some: userSkillWhere,
      };
    }

    let orderBy: any = { profile_completion: 'desc' };
    if (sort === 'name') orderBy = { name: 'asc' };

    const totalCount = await prisma.profile.count({ where: profileWhere });

    const profiles = await prisma.profile.findMany({
      where: profileWhere,
      include: {
        user: { select: { id: true, created_at: true } },
        user_skills: {
          include: { skill: true },
        },
        projects: {
          select: { id: true, title: true, image: true, status: true },
        },
        certifications: {
          select: { id: true, title: true, issuer: true },
        },
      },
      orderBy,
      skip,
      take: limitNum,
    });

    let bookmarkedDevIds: string[] = [];
    if (req.user?.userId) {
      const bookmarks = await prisma.recruiterBookmark.findMany({
        where: { recruiter_id: req.user.userId },
        select: { developer_id: true },
      });
      bookmarkedDevIds = bookmarks.map((b) => b.developer_id);
    }

    const formattedDevelopers = profiles.map((p) => {
      const verifiedCount = p.user_skills.filter((s) => s.verification_status === 'VERIFIED').length;
      return {
        ...p,
        isBookmarked: bookmarkedDevIds.includes(p.user_id),
        verifiedSkillCount: verifiedCount,
        totalSkillCount: p.user_skills.length,
      };
    });

    return sendSuccess(res, 'Developers search completed', formattedDevelopers, 200, {
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getBookmarks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const recruiterId = req.user!.userId;

    const bookmarks = await prisma.recruiterBookmark.findMany({
      where: { recruiter_id: recruiterId },
      include: {
        developer: {
          select: {
            id: true,
            email: true,
            profile: {
              include: {
                user_skills: { include: { skill: true } },
                projects: true,
                certifications: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Bookmarked developers retrieved', bookmarks);
  } catch (err) {
    next(err);
  }
};

export const addBookmark = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const recruiterId = req.user!.userId;
    const { developer_id } = req.body;

    if (!developer_id) return sendError(res, 'Developer ID is required', 400);

    const devUser = await prisma.user.findFirst({
      where: { id: String(developer_id), role: 'DEVELOPER' },
    });

    if (!devUser) return sendError(res, 'Developer user not found', 404);

    const existing = await prisma.recruiterBookmark.findUnique({
      where: {
        recruiter_id_developer_id: {
          recruiter_id: recruiterId,
          developer_id: String(developer_id),
        },
      },
    });

    if (existing) return sendError(res, 'Developer already bookmarked', 409);

    const bookmark = await prisma.recruiterBookmark.create({
      data: {
        recruiter_id: recruiterId,
        developer_id: String(developer_id),
      },
    });

    await logAudit(recruiterId, 'BOOKMARK_ADDED', 'USER', String(developer_id));

    return sendSuccess(res, 'Developer bookmarked successfully', bookmark, 201);
  } catch (err) {
    next(err);
  }
};

export const removeBookmark = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const recruiterId = req.user!.userId;
    const developerId = req.params.developerId as string;

    const bookmark = await prisma.recruiterBookmark.findFirst({
      where: { recruiter_id: recruiterId, developer_id: developerId },
    });

    if (!bookmark) return sendError(res, 'Bookmark not found', 404);

    await prisma.recruiterBookmark.delete({ where: { id: bookmark.id } });
    await logAudit(recruiterId, 'BOOKMARK_REMOVED', 'USER', developerId);

    return sendSuccess(res, 'Bookmark removed successfully');
  } catch (err) {
    next(err);
  }
};

