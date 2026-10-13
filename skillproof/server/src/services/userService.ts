import { prisma } from '../config/db.js';
import { LeaderboardService } from './leaderboardService.js';

export class UserService {
  /**
   * Check if a username is valid and available
   */
  static async checkUsername(username: string): Promise<{ available: boolean; message: string }> {
    if (!username) {
      return { available: false, message: 'Username is required.' };
    }

    const normalized = username.trim().toLowerCase();

    // Enforce 3-20 chars, regex ^[a-z0-9_]+$
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      return {
        available: false,
        message: 'Username must be 3-20 characters long, lowercase letters, numbers, and underscores only.',
      };
    }

    const existing = await prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true },
    });

    if (existing) {
      return { available: false, message: 'Username is already taken.' };
    }

    return { available: true, message: 'Username is available.' };
  }

  /**
   * Search users: min 2 chars, case-insensitive match on username & name, max 8 results,
   * only users with a public profile. Return username, name, avatar, top verified skill and points only.
   * NEVER returns emails!
   */
  static async searchUsers(query: string) {
    const q = (query || '').trim().toLowerCase();
    if (q.length < 2) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        role: 'DEVELOPER',
        status: 'ACTIVE',
        profile: {
          isPublic: true,
        },
        OR: [
          { username: { contains: q } },
          { name: { contains: q } },
        ],
      },
      include: {
        skills: {
          where: { status: 'VERIFIED' },
          orderBy: { bestScore: 'desc' },
          take: 1,
          include: {
            assessments: {
              where: { status: 'SUBMITTED' },
              orderBy: { weightedPercent: 'desc' },
              take: 1,
              select: { level: true },
            },
          },
        },
      },
      take: 8,
    });

    const results = [];
    for (const u of users) {
      const breakdown = await LeaderboardService.calculateUserPoints(u.id);
      const top = u.skills[0];
      const earnedLevel = top?.assessments?.[0]?.level || top?.claimedLevel || 'Basic';

      results.push({
        username: u.username,
        name: u.name,
        isDemo: Boolean(u.isDemo),
        topSkill: top
          ? {
              language: top.language,
              level: earnedLevel,
              score: top.bestScore || 0,
            }
          : null,
        points: breakdown?.points || 0,
      });
    }

    return results;
  }
}

