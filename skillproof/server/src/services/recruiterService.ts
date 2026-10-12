import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export interface RecruiterSearchFilter {
  language?: string;
  minScore?: number;
  level?: string;
  search?: string;
}

export class RecruiterService {
  /**
   * Discovers developers who have at least one VERIFIED skill.
   * Recruiter can filter by language, minScore, level, or name/slug.
   */
  static async searchVerifiedDevelopers(recruiterId: string, filter: RecruiterSearchFilter) {
    const skillWhere: any = {
      status: 'VERIFIED',
    };

    if (filter.language && filter.language !== 'ALL') {
      skillWhere.language = { equals: filter.language };
    }

    if (filter.minScore) {
      skillWhere.bestScore = { gte: Number(filter.minScore) };
    }

    const developers = await prisma.user.findMany({
      where: {
        role: 'DEVELOPER',
        status: 'ACTIVE',
        profile: {
          isPublic: true,
          ...(filter.search
            ? {
                OR: [
                  { publicSlug: { contains: filter.search } },
                  { bio: { contains: filter.search } },
                ],
              }
            : {}),
        },
        skills: {
          some: skillWhere,
        },
        ...(filter.search
          ? {
              OR: [
                { name: { contains: filter.search } },
                { profile: { publicSlug: { contains: filter.search } } },
              ],
            }
          : {}),
      },
      include: {
        profile: true,
        skills: {
          include: {
            assessments: {
              where: { status: 'SUBMITTED' },
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
          },
        },
        projects: true,
        bookmarksReceived: {
          where: { recruiterId },
        },
      },
    });

    // Format developer discovery cards
    return developers.map((dev) => {
      const verifiedSkills = dev.skills
        .filter((s) => s.status === 'VERIFIED')
        .map((s) => {
          const topicBreakdown = s.assessments[0]?.topicBreakdown ? JSON.parse(s.assessments[0].topicBreakdown) : {};
          const topicStrengths = Object.entries(topicBreakdown).map(([topic, stat]: any) => ({
            topic,
            accuracy: stat.accuracy,
            strength: stat.accuracy >= 75 ? 'Strong' : stat.accuracy >= 60 ? 'Proficient' : 'Needs Focus',
          }));

          return {
            language: s.language,
            score: s.bestScore,
            verifiedAt: s.verifiedAt,
            expiresAt: s.expiresAt,
            latestLevel: s.assessments[0]?.level || 'Basic',
            topicBreakdown,
            topicStrengths,
          };
        });

      const claimedSkills = dev.skills
        .filter((s) => s.status === 'CLAIMED')
        .map((s) => ({
          language: s.language,
          claimedLevel: s.claimedLevel,
          certificateUrl: s.certificateUrl,
          verified: false,
        }));

      return {
        id: dev.id,
        name: dev.name,
        publicSlug: dev.profile?.publicSlug,
        bio: dev.profile?.bio,
        githubUrl: dev.profile?.githubUrl,
        verifiedSkills,
        claimedSkills,
        projectCount: dev.projects.length,
        isBookmarked: dev.bookmarksReceived.length > 0,
        bookmarkNote: dev.bookmarksReceived[0]?.note || null,
        bookmarkId: dev.bookmarksReceived[0]?.id || null,
      };
    });
  }

  /**
   * Retrieves all bookmarked developers for a recruiter with personal notes.
   */
  static async getBookmarks(recruiterId: string) {
    const bookmarks = await prisma.bookmark.findMany({
      where: { recruiterId },
      include: {
        developer: {
          include: {
            profile: true,
            skills: {
              where: { status: 'VERIFIED' },
              include: {
                assessments: {
                  where: { status: 'SUBMITTED' },
                  orderBy: { submittedAt: 'desc' },
                  take: 1,
                },
              },
            },
            projects: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return bookmarks.map((b) => ({
      bookmarkId: b.id,
      developerId: b.developerId,
      name: b.developer.name,
      publicSlug: b.developer.profile?.publicSlug,
      bio: b.developer.profile?.bio,
      githubUrl: b.developer.profile?.githubUrl,
      note: b.note,
      updatedAt: b.updatedAt,
      verifiedSkills: b.developer.skills.map((s) => ({
        language: s.language,
        score: s.bestScore,
        level: s.assessments[0]?.level || 'Basic',
      })),
      projectCount: b.developer.projects.length,
    }));
  }

  /**
   * Adds or updates a bookmark for a developer.
   */
  static async setBookmark(recruiterId: string, developerId: string, note?: string) {
    const existing = await prisma.bookmark.findUnique({
      where: {
        recruiterId_developerId: {
          recruiterId,
          developerId,
        },
      },
    });

    let result;
    if (existing) {
      result = await prisma.bookmark.update({
        where: { id: existing.id },
        data: {
          note: note !== undefined ? note : existing.note,
        },
      });
      await logAudit(recruiterId, 'BOOKMARK_UPDATED', 'Bookmark', result.id, { developerId, note });
    } else {
      result = await prisma.bookmark.create({
        data: {
          recruiterId,
          developerId,
          note: note || '',
        },
      });
      await logAudit(recruiterId, 'BOOKMARK_CREATED', 'Bookmark', result.id, { developerId, note });
    }

    return result;
  }

  /**
   * Removes a bookmark.
   */
  static async removeBookmark(recruiterId: string, developerId: string) {
    const existing = await prisma.bookmark.findUnique({
      where: {
        recruiterId_developerId: {
          recruiterId,
          developerId,
        },
      },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id },
      });
      await logAudit(recruiterId, 'BOOKMARK_DELETED', 'Bookmark', existing.id, { developerId });
    }

    return { success: true };
  }
}

