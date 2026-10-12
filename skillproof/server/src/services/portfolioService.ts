import { prisma } from '../config/db.js';
import { LeaderboardService } from './leaderboardService.js';

export class PortfolioService {
  /**
   * Public developer portfolio.
   * Matches by username or publicSlug.
   * Clearly separates VERIFIED skills (with scores & level) from CLAIMED skills.
   * NEVER returns emails!
   */
  static async getPublicPortfolioBySlug(identifier: string) {
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
        status: true,
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
        certificateUrl: s.certificateUrl,
        verified: false,
      }));

    return {
      name: user.name,
      username: user.username,
      bio: profile.bio,
      githubUrl: profile.githubUrl,
      publicSlug: profile.publicSlug,
      redirectToUsername: user.username && user.username !== cleanId ? user.username : undefined,
      verifiedSkills,
      claimedSkills,
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
    const profile = await prisma.developerProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        publicSlug: data.publicSlug || 'dev-' + Math.random().toString(36).substring(2, 8),
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
