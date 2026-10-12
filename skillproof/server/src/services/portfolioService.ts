import { prisma } from '../config/db.js';

export class PortfolioService {
  /**
   * Public developer portfolio.
   * Clearly separates VERIFIED skills (with scores & level) from CLAIMED skills.
   */
  static async getPublicPortfolioBySlug(slug: string) {
    const profile = await prisma.developerProfile.findUnique({
      where: { publicSlug: slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
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
            },
          },
        },
      },
    });

    if (!profile || !profile.isPublic || profile.user.status !== 'ACTIVE') {
      return null;
    }

    const verifiedSkills = profile.user.skills
      .filter((s) => s.status === 'VERIFIED')
      .map((s) => {
        const derivedLevel = s.assessments[0]?.level || (s.bestScore ? (s.bestScore >= 90 ? 'Expert' : s.bestScore >= 75 ? 'Advanced' : s.bestScore >= 60 ? 'Intermediate' : s.bestScore >= 40 ? 'Basic' : 'Beginner') : 'Basic');
        return {
          id: s.id,
          language: s.language,
          score: s.bestScore,
          level: derivedLevel,
          verifiedAt: s.verifiedAt,
          expiresAt: s.expiresAt,
          topicBreakdown: s.assessments[0]?.topicBreakdown ? JSON.parse(s.assessments[0].topicBreakdown) : {},
        };
      });

    const claimedSkills = profile.user.skills
      .filter((s) => s.status === 'CLAIMED')
      .map((s) => ({
        id: s.id,
        language: s.language,
        claimedLevel: s.claimedLevel,
        certificateUrl: s.certificateUrl,
        verified: false,
      }));

    return {
      name: profile.user.name,
      bio: profile.bio,
      githubUrl: profile.githubUrl,
      publicSlug: profile.publicSlug,
      verifiedSkills,
      claimedSkills,
      projects: profile.user.projects,
    };
  }

  static async updateProfile(userId: string, data: { bio?: string; githubUrl?: string; isPublic?: boolean; publicSlug?: string }) {
    return prisma.developerProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        publicSlug: data.publicSlug || 'dev-' + Math.random().toString(36).substring(2, 8),
        bio: data.bio || '',
        githubUrl: data.githubUrl || '',
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
      },
    });
  }
}

