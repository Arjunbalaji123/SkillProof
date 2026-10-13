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
   * Never returns emails!
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
        },
        skills: {
          some: skillWhere,
        },
        ...(filter.search
          ? {
              OR: [
                { name: { contains: filter.search } },
                { username: { contains: filter.search } },
                { profile: { bio: { contains: filter.search } } },
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

    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: recruiterId }, { blockedId: recruiterId }],
      },
    });
    const blockedDevIds = new Set(
      blocks.map((b) => (b.blockerId === recruiterId ? b.blockedId : b.blockerId))
    );

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

      const allowRecruiterMessages = Boolean(dev.profile?.allowRecruiterMessages ?? true);
      const canDirectMessage = Boolean(
        dev.profile?.isPublic &&
          allowRecruiterMessages &&
          !dev.isDemo &&
          dev.status === 'ACTIVE' &&
          verifiedSkills.length > 0 &&
          !blockedDevIds.has(dev.id)
      );

      return {
        id: dev.id,
        name: dev.name,
        username: dev.username,
        isDemo: Boolean(dev.isDemo),
        allowRecruiterMessages,
        canDirectMessage,
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
   * Never returns emails!
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

    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: recruiterId }, { blockedId: recruiterId }],
      },
    });
    const blockedDevIds = new Set(
      blocks.map((b) => (b.blockerId === recruiterId ? b.blockedId : b.blockerId))
    );

    return bookmarks.map((b) => {
      const allowRecruiterMessages = Boolean(b.developer.profile?.allowRecruiterMessages ?? true);
      const canDirectMessage = Boolean(
        b.developer.profile?.isPublic &&
          allowRecruiterMessages &&
          !b.developer.isDemo &&
          b.developer.status === 'ACTIVE' &&
          b.developer.skills.length > 0 &&
          !blockedDevIds.has(b.developerId)
      );

      return {
        bookmarkId: b.id,
        developerId: b.developerId,
        name: b.developer.name,
        username: b.developer.username,
        isDemo: Boolean(b.developer.isDemo),
        allowRecruiterMessages,
        canDirectMessage,
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
      };
    });
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

  /**
   * GET /api/recruiters/:username
   * Returns recruiter profile (name, company, job title, verified badge, bio, counts; no email).
   */
  static async getRecruiterProfileByUsername(username: string, viewerId?: string) {
    const cleanUsername = String(username || '').trim().toLowerCase();
    if (!cleanUsername) return null;

    const recruiter = await prisma.user.findUnique({
      where: { username: cleanUsername },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        isDemo: true,
        createdAt: true,
        recruiterProfile: true,
        openingsCreated: {
          orderBy: { createdAt: 'desc' },
          include: {
            track: true,
            skills: {
              include: {
                skillCatalog: true,
              },
            },
          },
        },
      },
    });

    if (!recruiter || recruiter.role !== 'RECRUITER' || recruiter.status !== 'ACTIVE') {
      return null;
    }

    const now = new Date();
    const activeOpenings = recruiter.openingsCreated
      .filter((o) => o.status === 'ACTIVE' && new Date(o.expiresAt) > now)
      .map((o) => ({
        id: o.id,
        title: o.title,
        track: o.track ? { id: o.track.id, name: o.track.name, title: o.track.name } : null,
        minLevel: o.minLevel,
        minScore: o.minScore,
        positions: o.positions,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
        skills: o.skills.map((s) => ({
          id: s.skillCatalogId,
          name: s.skillCatalog.name,
        })),
      }));

    let existingConversation: { id: string; status: string; origin: string } | null = null;
    if (viewerId && viewerId !== recruiter.id) {
      const conv = await prisma.conversation.findUnique({
        where: {
          recruiterId_developerId: {
            recruiterId: recruiter.id,
            developerId: viewerId,
          },
        },
        select: {
          id: true,
          status: true,
          origin: true,
        },
      });
      existingConversation = conv;
    }

    return {
      id: recruiter.id,
      name: recruiter.name,
      username: recruiter.username,
      isDemo: Boolean(recruiter.isDemo),
      companyName: recruiter.recruiterProfile?.companyName || 'Organization',
      jobTitle: recruiter.recruiterProfile?.jobTitle || 'Recruiter',
      companyWebsite: recruiter.recruiterProfile?.companyWebsite || null,
      linkedinUrl: recruiter.recruiterProfile?.linkedinUrl || null,
      bio: recruiter.recruiterProfile?.bio || null,
      isVerified: Boolean(recruiter.recruiterProfile?.isVerified),
      verifiedAt: recruiter.recruiterProfile?.verifiedAt || null,
      createdAt: recruiter.createdAt,
      counts: {
        activeOpenings: activeOpenings.length,
        totalOpenings: recruiter.openingsCreated.length,
      },
      activeOpenings,
      existingConversation,
    };
  }
}
