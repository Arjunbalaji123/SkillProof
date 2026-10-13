import { prisma } from '../config/db.js';
import { LeaderboardService } from './leaderboardService.js';

export class PortfolioService {
  /**
   * Public developer portfolio.
   * Matches by username or publicSlug.
   * Clearly separates VERIFIED skills (with scores & level) from CLAIMED skills.
   * NEVER returns emails!
   */
  static async getPublicPortfolioBySlug(identifier: string, viewerId?: string) {
    const cleanId = (identifier || '').trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { profile: { publicSlug: cleanId } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        isDemo: true,
        profile: true,
        skills: {
          include: {
            assessments: {
              where: { status: 'SUBMITTED' },
              orderBy: { weightedPercent: 'desc' },
              take: 1,
            },
          },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            repoUrl: true,
            techStack: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || !user.profile || !user.profile.isPublic) {
      return null;
    }

    let isBookmarked = false;
    let bookmarkNote: string | null = null;
    if (viewerId && viewerId !== user.id) {
      const bm = await prisma.bookmark.findUnique({
        where: {
          recruiterId_developerId: {
            recruiterId: viewerId,
            developerId: user.id,
          },
        },
      });
      if (bm) {
        isBookmarked = true;
        bookmarkNote = bm.note || null;
      }
    }

    const profile = user.profile;

    const verifiedSkills = user.skills
      .filter((s) => s.status === 'VERIFIED')
      .map((s) => {
        const derivedLevel =
          s.assessments[0]?.level ||
          (s.bestScore
            ? s.bestScore >= 90
              ? 'Expert'
              : s.bestScore >= 75
              ? 'Advanced'
              : s.bestScore >= 60
              ? 'Intermediate'
              : s.bestScore >= 40
              ? 'Basic'
              : 'Beginner'
            : 'Basic');
        const topicBreakdown = s.assessments[0]?.topicBreakdown
          ? JSON.parse(s.assessments[0].topicBreakdown)
          : {};
        const topicStrengths = Object.entries(topicBreakdown).map(([topic, stat]: any) => ({
          topic,
          accuracy: stat.accuracy,
          strength: stat.accuracy >= 75 ? 'Strong' : stat.accuracy >= 60 ? 'Proficient' : 'Needs Focus',
        }));

        return {
          id: s.id,
          language: s.language,
          score: s.bestScore,
          level: derivedLevel,
          claimedLevel: s.claimedLevel,
          certificateUrl: s.certificateUrl,
          verifiedAt: s.verifiedAt,
          expiresAt: s.expiresAt,
          topicBreakdown,
          topicStrengths,
        };
      });

    const claimedSkills = user.skills
      .filter((s) => s.status === 'CLAIMED')
      .map((s) => ({
        id: s.id,
        language: s.language,
        claimedLevel: s.claimedLevel,
        earnedLevel: s.assessments[0]?.level || null,
        lastScore: s.assessments[0]?.weightedPercent ?? null,
        certificateUrl: s.certificateUrl,
        verified: false,
      }));

    const certificates = user.skills
      .filter((s) => Boolean(s.certificateUrl))
      .map((s) => ({
        id: s.id,
        language: s.language,
        claimedLevel: s.claimedLevel,
        certificateUrl: s.certificateUrl,
        label: 'Unverified claim',
        verified: false,
      }));

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isDemo: Boolean(user.isDemo),
      isBookmarked,
      bookmarkNote,
      bio: profile.bio,
      githubUrl: profile.githubUrl,
      publicSlug: user.username,
      redirectToUsername: user.username && user.username !== cleanId ? user.username : undefined,
      verifiedSkills,
      claimedSkills,
      certificates,
      projects: user.projects,
    };
  }

  static async updateProfile(
    userId: string,
    data: {
      bio?: string;
      githubUrl?: string;
      isPublic?: boolean;
      publicSlug?: string;
      showOnLeaderboard?: boolean;
    }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const slugFromUsername = user?.username || data.publicSlug || userId.slice(0, 12);

    const profile = await prisma.developerProfile.upsert({
      where: { userId },
      update: {
        bio: data.bio,
        githubUrl: data.githubUrl,
        isPublic: data.isPublic,
        showOnLeaderboard: data.showOnLeaderboard,
        publicSlug: slugFromUsername,
      },
      create: {
        userId,
        publicSlug: slugFromUsername,
        bio: data.bio || '',
        githubUrl: data.githubUrl || '',
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        showOnLeaderboard: data.showOnLeaderboard !== undefined ? data.showOnLeaderboard : true,
      },
    });

    if (data.showOnLeaderboard !== undefined) {
      await LeaderboardService.recalculateUser(userId);
    }

    return profile;
  }
}
