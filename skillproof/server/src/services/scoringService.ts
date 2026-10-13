export interface QuestionScoreInput {
  questionId: string;
  difficulty: string; // EASY | MEDIUM | HARD
  topic: string;
  userAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
}

export interface CoverageData {
  topicsCovered: number;
  questionsAnswered: number;
  attemptsCount: number;
}

export type ConfidenceLabel = 'Low' | 'Medium' | 'High';

export interface ScoreCalculationResult {
  totalQuestions: number;
  correctQuestions: number;
  scorePercent: number;
  weightedScore: number;
  maxWeightedScore: number;
  weightedPercent: number;
  level: 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
  hardAccuracyPercent: number;
  topicBreakdown: Record<string, { total: number; correct: number; accuracy: number }>;
  coverage: CoverageData;
  confidence: ConfidenceLabel;
  passed: boolean;
}

/**
 * Weights per difficulty:
 * EASY: 1 pt
 * MEDIUM: 2 pts
 * HARD: 3 pts
 */
export const DIFFICULTY_WEIGHTS: Record<string, number> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

export class ScoringService {
  /**
   * Normalizes an answer value (string, array, or JSON-encoded string) into a sorted array of strings.
   * Trims whitespace and converts to lowercase for case-insensitive comparison.
   */
  static normalize(value: any): string[] {
    if (value === undefined || value === null) return [];

    let parsed = value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = trimmed;
      }
    }

    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item !== undefined && item !== null)
        .map((item) => String(item).trim().toLowerCase())
        .filter((item) => item.length > 0)
        .sort();
    }

    const str = String(parsed).trim().toLowerCase();
    return str.length > 0 ? [str] : [];
  }

  /**
   * Evaluates if user answer matches the correct answer.
   * isCorrect = normalize(userAnswer) and normalize(correctAnswer) are equal as sets.
   */
  static isAnswerCorrect(userAnswer: any, correctAnswer: any): boolean {
    const normUser = ScoringService.normalize(userAnswer);
    const normCorrect = ScoringService.normalize(correctAnswer);

    if (normUser.length === 0 || normCorrect.length === 0) {
      return false;
    }

    if (normUser.length !== normCorrect.length) {
      return false;
    }

    return normUser.every((val, idx) => val === normCorrect[idx]);
  }

  /**
   * Computes confidence label:
   * Low = 1 attempt
   * Medium = 2 attempts
   * High = 3+ attempts or a 40-question Expert test
   */
  static computeConfidence(attemptsCount: number, questionCount: number = 20): ConfidenceLabel {
    if (questionCount >= 40) return 'High';
    if (attemptsCount >= 3) return 'High';
    if (attemptsCount === 2) return 'Medium';
    return 'Low';
  }

  /**
   * Computes coverage: topicsCovered, questionsAnswered, attemptsCount
   */
  static computeCoverage(results: QuestionScoreInput[], attemptsCount: number): CoverageData {
    const topics = new Set(results.map((r) => r.topic).filter(Boolean));
    const answered = results.filter((r) => {
      const norm = ScoringService.normalize(r.userAnswer);
      return norm.length > 0;
    }).length;

    return {
      topicsCovered: topics.size,
      questionsAnswered: answered,
      attemptsCount,
    };
  }

  /**
   * Computes score percent, weighted percent, level, hard accuracy, topic breakdown, coverage, and confidence.
   */
  static calculateScore(results: QuestionScoreInput[], attemptsCount: number = 1): ScoreCalculationResult {
    const totalQuestions = results.length;
    let correctQuestions = 0;
    let weightedScore = 0;
    let maxWeightedScore = 0;

    let hardTotal = 0;
    let hardCorrect = 0;

    const topicMap: Record<string, { total: number; correct: number }> = {};

    for (const item of results) {
      const weight = DIFFICULTY_WEIGHTS[item.difficulty.toUpperCase()] || 1;
      maxWeightedScore += weight;

      // Track by topic
      if (!topicMap[item.topic]) {
        topicMap[item.topic] = { total: 0, correct: 0 };
      }
      topicMap[item.topic].total += 1;

      // Track hard questions
      if (item.difficulty.toUpperCase() === 'HARD') {
        hardTotal += 1;
      }

      if (item.isCorrect) {
        correctQuestions += 1;
        weightedScore += weight;
        topicMap[item.topic].correct += 1;
        if (item.difficulty.toUpperCase() === 'HARD') {
          hardCorrect += 1;
        }
      }
    }

    const scorePercent = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100 * 10) / 10 : 0;
    const weightedPercent = maxWeightedScore > 0 ? Math.round((weightedScore / maxWeightedScore) * 100 * 10) / 10 : 0;

    const hardAccuracyPercent = hardTotal > 0 ? (hardCorrect / hardTotal) * 100 : 100;

    // Calculate level based on weightedPercent
    // Level thresholds: 0-39 Beginner, 40-59 Basic, 60-74 Intermediate, 75-89 Advanced, 90-100 Expert
    // Expert requirement: weightedPercent >= 90 AND hardAccuracyPercent >= 60%
    let level: 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced' | 'Expert' = 'Beginner';
    if (weightedPercent >= 90) {
      if (hardAccuracyPercent >= 60) {
        level = 'Expert';
      } else {
        // Falls back to Advanced if hard accuracy threshold is not satisfied
        level = 'Advanced';
      }
    } else if (weightedPercent >= 75) {
      level = 'Advanced';
    } else if (weightedPercent >= 60) {
      level = 'Intermediate';
    } else if (weightedPercent >= 40) {
      level = 'Basic';
    } else {
      level = 'Beginner';
    }

    // Format topic breakdown
    const topicBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const [topic, stats] of Object.entries(topicMap)) {
      topicBreakdown[topic] = {
        total: stats.total,
        correct: stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      };
    }

    const coverage = ScoringService.computeCoverage(results, attemptsCount);
    const confidence = ScoringService.computeConfidence(attemptsCount, totalQuestions);

    // Passed condition: weightedPercent >= 40 (reaches at least Basic)
    const passed = weightedPercent >= 40;

    return {
      totalQuestions,
      correctQuestions,
      scorePercent,
      weightedScore,
      maxWeightedScore,
      weightedPercent,
      level,
      hardAccuracyPercent,
      topicBreakdown,
      coverage,
      confidence,
      passed,
    };
  }

  /**
   * Retake policy validation:
   * - Active SkillLockout (2-day lockout after 3 proctoring violations, unless lifted by admin)
   * - 7-day cooldown per language after last submitted assessment
   * - Max 3 attempts (SUBMITTED + non-lifted TERMINATED) in any rolling 30-day window
   * - When multiple restrictions apply, the longer one wins.
   */
  static evaluateRetakeEligibility(
    pastAssessments: {
      startedAt: Date;
      submittedAt: Date | null;
      status: string;
      liftedByAdmin?: boolean;
    }[],
    activeLockoutUntil?: Date | null,
    nowOverride?: Date
  ): {
    eligible: boolean;
    reason?: string;
    cooldownRemainingMs?: number;
    nextAvailableDate?: Date;
  } {
    const now = (nowOverride ? new Date(nowOverride) : new Date()).getTime();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const restrictions: {
      reason: string;
      cooldownRemainingMs: number;
      nextAvailableDate: Date;
    }[] = [];

    // 0. Check active SkillLockout
    if (activeLockoutUntil) {
      const lockoutTime = new Date(activeLockoutUntil).getTime();
      if (lockoutTime > now) {
        const nextDate = new Date(lockoutTime);
        restrictions.push({
          reason: `Skill locked due to proctoring violations. You can retake this skill on ${nextDate.toLocaleDateString()} (${nextDate.toISOString()}).`,
          cooldownRemainingMs: lockoutTime - now,
          nextAvailableDate: nextDate,
        });
      }
    }

    // 1. Check 7-day cooldown from the most recent SUBMITTED attempt
    const submittedAssessments = pastAssessments.filter(
      (a) => a.status === 'SUBMITTED' && a.submittedAt !== null
    );

    if (submittedAssessments.length > 0) {
      const mostRecent = submittedAssessments.reduce((latest, current) => {
        const currentDate = current.submittedAt ? new Date(current.submittedAt).getTime() : new Date(current.startedAt).getTime();
        const latestDate = latest.submittedAt ? new Date(latest.submittedAt).getTime() : new Date(latest.startedAt).getTime();
        return currentDate > latestDate ? current : latest;
      });

      const mostRecentTime = mostRecent.submittedAt
        ? new Date(mostRecent.submittedAt).getTime()
        : new Date(mostRecent.startedAt).getTime();

      const timeSinceLast = now - mostRecentTime;
      if (timeSinceLast < SEVEN_DAYS_MS) {
        const remaining = SEVEN_DAYS_MS - timeSinceLast;
        const nextDate = new Date(mostRecentTime + SEVEN_DAYS_MS);
        restrictions.push({
          reason: `7-day cooldown in effect. You can retake this assessment on ${nextDate.toLocaleDateString()}.`,
          cooldownRemainingMs: remaining,
          nextAvailableDate: nextDate,
        });
      }
    }

    // 2. Check 3 attempts in rolling 30 days (SUBMITTED + non-lifted TERMINATED)
    const countableAttempts = pastAssessments.filter(
      (a) =>
        (a.status === 'SUBMITTED' && a.submittedAt !== null) ||
        (a.status === 'TERMINATED' && !a.liftedByAdmin)
    );

    const recentThirtyDayAttempts = countableAttempts
      .filter((a) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.startedAt).getTime();
        return now - aTime <= THIRTY_DAYS_MS;
      })
      .sort((a, b) => {
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : new Date(b.startedAt).getTime();
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.startedAt).getTime();
        return bTime - aTime;
      });

    if (recentThirtyDayAttempts.length >= 3) {
      // Find the 3rd most recent attempt to determine when the rolling 30-day window drops below 3
      const thirdMostRecent = recentThirtyDayAttempts[2];
      const oldestTime = thirdMostRecent.submittedAt
        ? new Date(thirdMostRecent.submittedAt).getTime()
        : new Date(thirdMostRecent.startedAt).getTime();
      const nextDate = new Date(oldestTime + THIRTY_DAYS_MS);

      if (nextDate.getTime() > now) {
        restrictions.push({
          reason: `Maximum limit of 3 assessment attempts reached within 30 days. Next attempt opens on ${nextDate.toLocaleDateString()}.`,
          cooldownRemainingMs: Math.max(0, nextDate.getTime() - now),
          nextAvailableDate: nextDate,
        });
      }
    }

    if (restrictions.length > 0) {
      // The longer restriction wins
      const longest = restrictions.reduce((prev, curr) =>
        curr.nextAvailableDate.getTime() > prev.nextAvailableDate.getTime() ? curr : prev
      );
      return {
        eligible: false,
        reason: longest.reason,
        cooldownRemainingMs: longest.cooldownRemainingMs,
        nextAvailableDate: longest.nextAvailableDate,
      };
    }

    return { eligible: true };
  }
}
