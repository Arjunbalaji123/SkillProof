import { prisma } from '../config/db.js';

export const LEVEL_MULTIPLIERS: Record<string, number> = {
  Expert: 3.0,
  Advanced: 2.0,
  Intermediate: 1.5,
  Basic: 1.0,
  Beginner: 0.0,
};

function getWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

export interface UserPointsBreakdown {
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  points: number;
  earliestVerifiedAt: Date | null;
  verifiedSkills: {
    language: string;
    level: string;
    bestScore: number;
    skillPoints: number;
    isExpired: boolean;
  }[];
  extraSkillsBonus: number;
  weeklyBonus: number;
  topLevel: string;
}

// 60-second in-memory cache
const leaderboardCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

export class LeaderboardService {
  /**
   * Calculate points for a specific user according to specification:
   * - sum over VERIFIED skills of bestScore * level multiplier (Basic 1.0, Intermediate 1.5, Advanced 2.0, Expert 3.0)
   * - up to 10 hard-question bonus per skill (2.5 pts per hard correct question, max 10)
   * - +25 per extra verified skill
   * - +5 per week with a completed assessment (cap 50)
   * - Expired skills count at 50%
   * - Exclude attempts flagged for integrity (high tab-switch count >= 3)
   * - Exclude users with showOnLeaderboard = false
   */
  static async calculateUserPoints(
    userId: string,
    options: {
      scope?: 'global' | 'track' | 'skill';
      trackId?: string;
      skillId?: string;
      period?: 'all' | 'month';
    } = {}
  ): Promise<UserPointsBreakdown | null> {
    const { scope = 'global', trackId, skillId, period = 'all' } = options;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        skills: {
          where: { status: 'VERIFIED' },
          include: {
            skillCatalog: true,
          },
        },
        assessments: {
          where: {
            status: 'SUBMITTED',
            tabSwitchCount: { lt: 3 }, // Integrity filter: exclude high tab-switch attempts
            ...(period === 'month'
              ? {
                  submittedAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  },
                }
              : {}),
          },
          include: {
            questions: {
              include: {
                question: { select: { difficulty: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.status === 'SUSPENDED') return null;
    if (user.profile && user.profile.showOnLeaderboard === false) {
      return null; // Excluded from leaderboard
    }

    // Filter skills based on scope
    let relevantSkills = user.skills;
    if (scope === 'track' && trackId) {
      relevantSkills = relevantSkills.filter((s) => s.skillCatalog?.trackId === trackId);
    } else if (scope === 'skill' && skillId) {
      relevantSkills = relevantSkills.filter(
        (s) =>
          s.skillCatalogId === skillId ||
          s.language.toLowerCase() === skillId.toLowerCase()
      );
    }

    if ((scope === 'skill' || scope === 'track') && relevantSkills.length === 0) {
      return null;
    }

    let sumSkillPoints = 0;
    let earliestVerifiedAt: Date | null = null;
    const verifiedDetails: UserPointsBreakdown['verifiedSkills'] = [];

    const now = new Date();

    for (const skill of relevantSkills) {
      const level = skill.claimedLevel || 'Basic';
      const mult = LEVEL_MULTIPLIERS[level] ?? 1.0;
      const base = (skill.bestScore || 0) * mult;

      // Hard question bonus: count unique HARD questions answered correctly in valid assessments
      const hardCorrectQuestionIds = new Set<string>();
      const skillAssessments = user.assessments.filter(
        (a) => a.language.toLowerCase() === skill.language.toLowerCase()
      );

      for (const a of skillAssessments) {
        for (const q of a.questions) {
          if (q.question.difficulty === 'HARD' && q.isCorrect) {
            hardCorrectQuestionIds.add(q.questionId);
          }
        }
      }

      const hardBonus = Math.min(hardCorrectQuestionIds.size * 2.5, 10);
      let skillTotal = base + hardBonus;

      const isExpired = !!(skill.expiresAt && skill.expiresAt < now);
      if (isExpired) {
        skillTotal = skillTotal * 0.5;
      }

      sumSkillPoints += skillTotal;

      if (skill.verifiedAt) {
        if (!earliestVerifiedAt || skill.verifiedAt < earliestVerifiedAt) {
          earliestVerifiedAt = skill.verifiedAt;
        }
      }

      verifiedDetails.push({
        language: skill.language,
        level,
        bestScore: skill.bestScore || 0,
        skillPoints: Math.round(skillTotal * 10) / 10,
        isExpired,
      });
    }

    // Extra verified skills bonus: +25 per extra verified skill (in global scope)
    const extraSkillsBonus = scope === 'global' ? Math.max(0, relevantSkills.length - 1) * 25 : 0;

    // Weekly consistency bonus: +5 per week with a completed assessment (cap 50)
    const relevantAssessments = user.assessments.filter((a) => {
      if (scope === 'skill' && skillId) {
        return a.language.toLowerCase() === skillId.toLowerCase();
      }
      if (scope === 'track' && trackId) {
        return relevantSkills.some((s) => s.language.toLowerCase() === a.language.toLowerCase());
      }
      return true;
    });

    const distinctWeeks = new Set<string>();
    for (const a of relevantAssessments) {
      if (a.submittedAt) {
        distinctWeeks.add(getWeekKey(a.submittedAt));
      }
    }
    const weeklyBonus = Math.min(distinctWeeks.size * 5, 50);

    const totalPoints = Math.round((sumSkillPoints + extraSkillsBonus + weeklyBonus) * 10) / 10;

    // Find highest level badge
    const levelsRank = ['Expert', 'Advanced', 'Intermediate', 'Basic', 'Beginner'];
    let topLevel = 'Beginner';
    for (const l of levelsRank) {
      if (verifiedDetails.some((v) => v.level === l)) {
        topLevel = l;
        break;
      }
    }

    return {
      userId: user.id,
      username: user.username || user.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name: user.name,
      points: totalPoints,
      earliestVerifiedAt,
      verifiedSkills: verifiedDetails,
      extraSkillsBonus,
      weeklyBonus,
      topLevel,
    };
  }

  /**
   * Invalidate 60-second leaderboard cache
   */
  static clearCache() {
    leaderboardCache.clear();
  }

  /**
   * Recalculate leaderboard entries and persist to LeaderboardEntry table.
   * Ties: earlier verifiedAt wins.
   */
  static async recalculateLeaderboard(options: {
    scope?: 'global' | 'track' | 'skill';
    trackId?: string;
    skillId?: string;
    period?: 'all' | 'month';
  } = {}) {
    const { scope = 'global', trackId, skillId, period = 'all' } = options;

    const developers = await prisma.user.findMany({
      where: {
        role: 'DEVELOPER',
        status: 'ACTIVE',
        profile: {
          showOnLeaderboard: true,
        },
      },
      select: { id: true },
    });

    const candidates: UserPointsBreakdown[] = [];
    for (const dev of developers) {
      const breakdown = await this.calculateUserPoints(dev.id, {
        scope,
        trackId,
        skillId,
        period,
      });
      if (breakdown) {
        if ((scope === 'skill' || scope === 'track') && breakdown.verifiedSkills.length === 0) {
          continue;
        }
        if (scope === 'global' && breakdown.points === 0 && breakdown.verifiedSkills.length === 0) {
          continue;
        }
        candidates.push(breakdown);
      }
    }

    // Sort:
    // 1. Points descending
    // 2. Earlier verifiedAt wins (earlier timestamp ascending)
    candidates.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (a.earliestVerifiedAt && b.earliestVerifiedAt) {
        return a.earliestVerifiedAt.getTime() - b.earliestVerifiedAt.getTime();
      }
      if (a.earliestVerifiedAt && !b.earliestVerifiedAt) return -1;
      if (!a.earliestVerifiedAt && b.earliestVerifiedAt) return 1;
      return a.username.localeCompare(b.username);
    });

    // Delete existing entries for this scope & period & target
    await prisma.leaderboardEntry.deleteMany({
      where: {
        scope,
        period,
        ...(trackId ? { trackId } : {}),
        ...(skillId ? { skillId } : {}),
      },
    });

    // Bulk create ranked entries
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      await prisma.leaderboardEntry.create({
        data: {
          userId: c.userId,
          scope,
          period,
          trackId: trackId || null,
          skillId: skillId || null,
          points: c.points,
          rank: i + 1,
        },
      });
    }

    this.clearCache();
    return candidates;
  }

  /**
   * Recalculate after assessment submit
   */
  static async onAssessmentSubmitted(_userId: string, language: string) {
    // Invalidate cache immediately
    this.clearCache();

    // Recalculate global and skill-specific leaderboards in background
    Promise.all([
      this.recalculateLeaderboard({ scope: 'global', period: 'all' }),
      this.recalculateLeaderboard({ scope: 'global', period: 'month' }),
      this.recalculateLeaderboard({ scope: 'skill', skillId: language, period: 'all' }),
    ]).catch((err) => {
      console.error('Error recalculating leaderboard in background:', err);
    });
  }

  /**
   * Fetch paginated leaderboard with 60-second caching
   */
  static async getLeaderboard(params: {
    scope?: 'global' | 'track' | 'skill';
    id?: string; // trackId or skillId
    period?: 'all' | 'month';
    page?: number;
    limit?: number;
    currentUserId?: string;
  }) {
    const scope = params.scope || 'global';
    const period = params.period || 'all';
    const targetId = params.id;
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const currentUserId = params.currentUserId;

    const cacheKey = `${scope}_${period}_${targetId || ''}`;
    const cached = leaderboardCache.get(cacheKey);

    let rankedCandidates: UserPointsBreakdown[];

    if (cached && cached.expiresAt > Date.now()) {
      rankedCandidates = cached.data;
    } else {
      // Recalculate
      rankedCandidates = await this.recalculateLeaderboard({
        scope,
        period,
        trackId: scope === 'track' ? targetId : undefined,
        skillId: scope === 'skill' ? targetId : undefined,
      });

      leaderboardCache.set(cacheKey, {
        data: rankedCandidates,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    const total = rankedCandidates.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pageSlice = rankedCandidates.slice(offset, offset + limit);

    // Compute current user's rank
    let currentUserRank: any = null;
    if (currentUserId) {
      const userIndex = rankedCandidates.findIndex((c) => c.userId === currentUserId);
      if (userIndex >= 0) {
        const uCandidate = rankedCandidates[userIndex];
        const nextRankPointsDiff =
          userIndex > 0
            ? Math.round((rankedCandidates[userIndex - 1].points - uCandidate.points) * 10) / 10
            : 0;

        currentUserRank = {
          rank: userIndex + 1,
          points: uCandidate.points,
          nextRankPointsDiff,
          totalParticipants: total,
          level: uCandidate.topLevel,
        };
      }
    }

    // Format output: strictly NO EMAILS!
    const entries = pageSlice.map((item, idx) => ({
      rank: offset + idx + 1,
      userId: item.userId,
      username: item.username,
      name: item.name,
      points: item.points,
      level: item.topLevel,
      verifiedSkills: item.verifiedSkills.map((v) => v.language),
      isCurrentUser: currentUserId === item.userId,
    }));

    return {
      entries,
      total,
      page,
      limit,
      totalPages,
      currentUserRank,
    };
  }
}
