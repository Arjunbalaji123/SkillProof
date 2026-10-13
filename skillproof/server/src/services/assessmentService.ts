import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { ScoringService } from './scoringService.js';
import { QuestionService } from './questionService.js';
import { LeaderboardService } from './leaderboardService.js';
import { ProctorService } from './proctorService.js';

export class AssessmentService {
  /**
   * Starts a new assessment for a user on a given language.
   * Enforces SkillLockout, 7-day cooldown, and max 3 attempts per 30 days (the longer one wins).
   */
  static async startAssessment(userId: string, language: string) {
    // Resolve catalog
    const catalog = await prisma.skillCatalog.findFirst({
      where: {
        OR: [
          { name: { equals: language } },
          { slug: { equals: language.toLowerCase() } },
        ],
      },
    });

    // 1. Ensure user has a skill entry for this language (claimed or existing)
    let skill = await prisma.skill.findUnique({
      where: {
        userId_language: {
          userId,
          language,
        },
      },
    });

    if (!skill) {
      skill = await prisma.skill.create({
        data: {
          userId,
          skillCatalogId: catalog?.id,
          language,
          claimedLevel: 'Intermediate',
          status: 'CLAIMED',
        },
      });
      await logAudit(userId, 'SKILL_AUTO_CLAIMED', 'Skill', skill.id, { language });
    } else if (!skill.skillCatalogId && catalog) {
      skill = await prisma.skill.update({
        where: { id: skill.id },
        data: { skillCatalogId: catalog.id },
      });
    }

    // 2. Check active SkillLockout and retake cooldowns (SUBMITTED + non-lifted TERMINATED attempts)
    const [activeLockout, pastAssessmentsRaw] = await Promise.all([
      ProctorService.getActiveLockout(userId, catalog?.id, language),
      prisma.assessment.findMany({
        where: {
          userId,
          language: { equals: language },
          status: { in: ['SUBMITTED', 'TERMINATED'] },
        },
        select: {
          startedAt: true,
          submittedAt: true,
          status: true,
          skillLockouts: {
            select: { liftedByAdmin: true },
          },
        },
      }),
    ]);

    const pastAssessments = pastAssessmentsRaw.map((a) => ({
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      status: a.status,
      liftedByAdmin: a.skillLockouts.some((l) => l.liftedByAdmin),
    }));

    const eligibility = ScoringService.evaluateRetakeEligibility(
      pastAssessments,
      activeLockout?.until || null
    );
    if (!eligibility.eligible) {
      const err: any = new Error(eligibility.reason || 'Assessment retake cooldown or lockout is active');
      err.statusCode = 400;
      err.cooldownRemainingMs = eligibility.cooldownRemainingMs;
      err.nextAvailableDate = eligibility.nextAvailableDate;
      err.lockedUntil = activeLockout?.until || eligibility.nextAvailableDate;
      err.lockoutId = activeLockout?.id || null;
      throw err;
    }

    // 3. Resume: Check if user already has an IN_PROGRESS assessment for that language that is still active
    const activeAssessment = await prisma.assessment.findFirst({
      where: {
        userId,
        language,
        status: 'IN_PROGRESS',
      },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (activeAssessment) {
      const elapsedSeconds = (Date.now() - new Date(activeAssessment.startedAt).getTime()) / 1000;
      if (elapsedSeconds < activeAssessment.durationSec) {
        // Return existing active assessment with sanitized questions
        const sanitizedQuestions = activeAssessment.questions.map((aq) => {
          let optionsParsed = [];
          try {
            optionsParsed = JSON.parse(aq.question.options);
          } catch {
            optionsParsed = [aq.question.options];
          }

          return {
            id: aq.id,
            questionId: aq.questionId,
            order: aq.order,
            prompt: aq.question.prompt,
            options: optionsParsed,
            type: aq.question.type,
            difficulty: aq.question.difficulty,
            topic: aq.question.topic,
            userAnswer: aq.userAnswer ? JSON.parse(aq.userAnswer) : null,
          };
        });

        return {
          assessmentId: activeAssessment.id,
          language: activeAssessment.language,
          startedAt: activeAssessment.startedAt,
          durationSec: activeAssessment.durationSec,
          status: activeAssessment.status,
          tabSwitchCount: activeAssessment.tabSwitchCount,
          questions: sanitizedQuestions,
        };
      } else {
        // Timer expired on the active assessment
        await prisma.assessment.update({
          where: { id: activeAssessment.id },
          data: { status: 'EXPIRED' },
        });
      }
    }

    // Clean up abandoned expired or abandoned old attempts (no answers and duration < 60s)
    const candidates = await prisma.assessment.findMany({
      where: {
        userId,
        language,
        status: { in: ['IN_PROGRESS', 'EXPIRED'] },
      },
      include: {
        questions: {
          select: { userAnswer: true },
        },
      },
    });

    for (const cand of candidates) {
      const elapsedSec = (Date.now() - new Date(cand.startedAt).getTime()) / 1000;
      const hasAnyAnswer = cand.questions.some((q) => q.userAnswer !== null && q.userAnswer !== '');
      if (!hasAnyAnswer && elapsedSec < 60) {
        // Delete truly empty abandoned attempt under 1 minute
        await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: cand.id } });
        await prisma.assessment.delete({ where: { id: cand.id } });
      } else if (cand.status === 'IN_PROGRESS') {
        await prisma.assessment.update({
          where: { id: cand.id },
          data: { status: 'EXPIRED' },
        });
      }
    }

    // 4. Select 20 questions (8 Easy, 8 Medium, 4 Hard)
    const selectedQuestions = await QuestionService.selectQuestionsForAssessment({
      language,
      userId,
    });

    // 5. Create Assessment record
    const assessment = await prisma.assessment.create({
      data: {
        userId,
        skillId: skill.id,
        skillCatalogId: catalog?.id,
        language,
        durationSec: catalog?.durationSec || 1800,
        status: 'IN_PROGRESS',
        questions: {
          create: selectedQuestions.map((q, idx) => ({
            questionId: q.id,
            order: idx + 1,
          })),
        },
      },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    await logAudit(userId, 'ASSESSMENT_STARTED', 'Assessment', assessment.id, {
      language,
      questionCount: selectedQuestions.length,
    });

    // Redact correct answers and explanations before sending to client
    const sanitizedQuestions = assessment.questions.map((aq) => {
      let optionsParsed = [];
      try {
        optionsParsed = JSON.parse(aq.question.options);
      } catch {
        optionsParsed = [aq.question.options];
      }

      // Randomize options presentation order
      const shuffledOptions = [...optionsParsed].sort(() => 0.5 - Math.random());

      return {
        id: aq.id,
        questionId: aq.questionId,
        order: aq.order,
        prompt: aq.question.prompt,
        options: shuffledOptions,
        type: aq.question.type,
        difficulty: aq.question.difficulty,
        topic: aq.question.topic,
        userAnswer: aq.userAnswer ? JSON.parse(aq.userAnswer) : null,
      };
    });

    return {
      assessmentId: assessment.id,
      language: assessment.language,
      startedAt: assessment.startedAt,
      durationSec: assessment.durationSec,
      status: assessment.status,
      tabSwitchCount: assessment.tabSwitchCount,
      questions: sanitizedQuestions,
    };
  }

  /**
   * Retrieves active assessment details with sanitized questions and proctoring warning state.
   */
  static async getAssessmentDetails(userId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
        proctorEvents: {
          where: { counted: true },
          orderBy: { createdAt: 'asc' },
        },
        skillLockouts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!assessment) throw new Error('Assessment not found');
    if (assessment.userId !== userId) throw new Error('Unauthorized');

    const warningNumber = assessment.proctorEvents.length;
    const remainingWarnings = Math.max(0, 2 - warningNumber);
    const lockoutUntil = assessment.skillLockouts[0]?.until || null;

    // If assessment is already submitted or terminated, return indication without questions
    if (assessment.status === 'SUBMITTED' || assessment.status === 'TERMINATED') {
      return {
        assessmentId: assessment.id,
        language: assessment.language,
        startedAt: assessment.startedAt,
        durationSec: assessment.durationSec,
        status: assessment.status,
        tabSwitchCount: assessment.tabSwitchCount,
        warningNumber,
        remainingWarnings,
        until: lockoutUntil,
        questions: [],
      };
    }

    const sanitizedQuestions = assessment.questions.map((aq) => {
      let optionsParsed = [];
      try {
        optionsParsed = JSON.parse(aq.question.options);
      } catch {
        optionsParsed = [aq.question.options];
      }

      return {
        id: aq.id,
        questionId: aq.questionId,
        order: aq.order,
        prompt: aq.question.prompt,
        options: optionsParsed,
        type: aq.question.type,
        difficulty: aq.question.difficulty,
        topic: aq.question.topic,
        userAnswer: aq.userAnswer ? JSON.parse(aq.userAnswer) : null,
      };
    });

    return {
      assessmentId: assessment.id,
      language: assessment.language,
      startedAt: assessment.startedAt,
      durationSec: assessment.durationSec,
      status: assessment.status,
      tabSwitchCount: assessment.tabSwitchCount,
      warningNumber,
      remainingWarnings,
      until: lockoutUntil,
      questions: sanitizedQuestions,
    };
  }

  /**
   * Records an answer for a specific question in an ongoing assessment.
   */
  static async saveAnswer(userId: string, assessmentId: string, questionOrderId: number, userAnswer: any) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) throw new Error('Assessment not found');
    if (assessment.userId !== userId) throw new Error('Unauthorized access to assessment');
    if (assessment.status !== 'IN_PROGRESS') throw new Error('Assessment is no longer in progress');

    // Check timer expiration
    const elapsedSeconds = (Date.now() - new Date(assessment.startedAt).getTime()) / 1000;
    if (elapsedSeconds > assessment.durationSec + 15) {
      // 15 sec grace period for network latency
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Assessment timer has expired');
    }

    const aq = await prisma.assessmentQuestion.findFirst({
      where: {
        assessmentId,
        order: questionOrderId,
      },
    });

    if (!aq) throw new Error('Question not found in assessment');

    // Canonical format: always store userAnswer as an array of strings
    let normalizedUserAnswer: string[] = [];
    if (Array.isArray(userAnswer)) {
      normalizedUserAnswer = userAnswer.map(String);
    } else if (userAnswer !== undefined && userAnswer !== null) {
      normalizedUserAnswer = [String(userAnswer)];
    }

    const updated = await prisma.assessmentQuestion.update({
      where: { id: aq.id },
      data: {
        userAnswer: JSON.stringify(normalizedUserAnswer),
      },
    });

    return updated;
  }

  /**
   * Tracks tab switch/blur event
   */
  static async recordTabSwitch(userId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment || assessment.userId !== userId) {
      throw new Error('Assessment not found or unauthorized');
    }

    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        tabSwitchCount: { increment: 1 },
      },
    });

    return { tabSwitchCount: updated.tabSwitchCount };
  }

  /**
   * Submits and automatically grades the assessment.
   * Computes score, level, and per-topic breakdown.
   * If weightedPercent >= 40, sets Skill status to VERIFIED for 12 months.
   */
  static async submitAssessment(userId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!assessment) throw new Error('Assessment not found');
    if (assessment.userId !== userId) throw new Error('Unauthorized');
    if (assessment.status === 'TERMINATED') {
      throw new Error('Assessment was terminated due to proctoring violations and cannot be submitted.');
    }
    if (assessment.status === 'SUBMITTED') {
      return this.getAssessmentResult(userId, assessmentId);
    }

    // Evaluate each question
    const questionEvaluations = [];
    for (const aq of assessment.questions) {
      let parsedUserAnswer = null;
      if (aq.userAnswer) {
        try {
          parsedUserAnswer = JSON.parse(aq.userAnswer);
        } catch {
          parsedUserAnswer = aq.userAnswer;
        }
      }

      let parsedCorrectAnswer = null;
      try {
        parsedCorrectAnswer = JSON.parse(aq.question.correctAnswer);
      } catch {
        parsedCorrectAnswer = aq.question.correctAnswer;
      }

      const isCorrect = ScoringService.isAnswerCorrect(parsedUserAnswer, parsedCorrectAnswer);

      // Save correctness to AssessmentQuestion
      await prisma.assessmentQuestion.update({
        where: { id: aq.id },
        data: { isCorrect },
      });

      questionEvaluations.push({
        questionId: aq.questionId,
        difficulty: aq.question.difficulty,
        topic: aq.question.topic,
        userAnswer: parsedUserAnswer,
        correctAnswer: parsedCorrectAnswer,
        isCorrect,
      });
    }

    // Calculate score using ScoringService with user's attempt count
    const pastSubmittedCount = await prisma.assessment.count({
      where: {
        userId,
        language: { equals: assessment.language },
        status: 'SUBMITTED',
      },
    });
    const attemptsCount = pastSubmittedCount + 1;
    const scoreResult = ScoringService.calculateScore(questionEvaluations, attemptsCount);

    // Save assessment result and update Developer Skill atomically in the same transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Assessment record
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          scorePercent: scoreResult.scorePercent ?? 0,
          weightedPercent: scoreResult.weightedPercent ?? 0,
          level: scoreResult.level || 'Beginner',
          topicBreakdown: JSON.stringify(scoreResult.topicBreakdown || {}),
          coverage: JSON.stringify(scoreResult.coverage || {}),
          confidence: scoreResult.confidence || 'Low',
        },
      });

      // 2. Update Developer Skill if passed (weightedPercent >= 40)
      if (scoreResult.passed) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 12 months validity

        const existingSkill = await tx.skill.findUnique({
          where: { id: assessment.skillId },
        });

        // Best score comparison: keep the highest
        const newBestScore = Math.max(existingSkill?.bestScore || 0, scoreResult.weightedPercent);

        const updatedSkill = await tx.skill.update({
          where: { id: assessment.skillId },
          data: {
            status: 'VERIFIED',
            claimedLevel: scoreResult.level,
            bestScore: newBestScore,
            verifiedAt: now,
            expiresAt,
          },
          include: {
            skillCatalog: true,
          },
        });

        const catalogId = updatedSkill.skillCatalogId || assessment.skillCatalogId;
        if (catalogId) {
          const existingSkillInterest = await tx.developerInterest.findFirst({
            where: { userId, skillCatalogId: catalogId },
          });
          if (!existingSkillInterest) {
            await tx.developerInterest.create({
              data: { userId, skillCatalogId: catalogId },
            });
          }
          const trackId = updatedSkill.skillCatalog?.trackId;
          if (trackId) {
            const existingTrackInterest = await tx.developerInterest.findFirst({
              where: { userId, trackId },
            });
            if (!existingTrackInterest) {
              await tx.developerInterest.create({
                data: { userId, trackId },
              });
            }
          }
        }
      }

      // 3. Recalculate leaderboard entries inside the same transaction
      await LeaderboardService.recalculateUser(userId, tx);

      // 4. Safety net: verify consistency between verified skills and leaderboard entries
      await LeaderboardService.validateConsistency(userId, tx);
    });

    if (scoreResult.passed) {
      await logAudit(userId, 'SKILL_VERIFIED', 'Skill', assessment.skillId, {
        language: assessment.language,
        score: scoreResult.weightedPercent,
        level: scoreResult.level,
      });
    }

    await logAudit(userId, 'ASSESSMENT_SUBMITTED', 'Assessment', assessmentId, {
      scorePercent: scoreResult.scorePercent,
      weightedPercent: scoreResult.weightedPercent,
      level: scoreResult.level,
    });

    return this.getAssessmentResult(userId, assessmentId);
  }

  /**
   * Retrieves full result with explanations for review.
   */
  static async getAssessmentResult(userId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!assessment) throw new Error('Assessment not found');
    if (assessment.userId !== userId) throw new Error('Unauthorized');

    let parsedBreakdown = {};
    if (assessment.topicBreakdown) {
      try {
        parsedBreakdown = JSON.parse(assessment.topicBreakdown);
      } catch {
        parsedBreakdown = {};
      }
    }

    const reviewedQuestions = assessment.questions.map((aq) => {
      let optionsParsed = [];
      try {
        optionsParsed = JSON.parse(aq.question.options);
      } catch {
        optionsParsed = [aq.question.options];
      }

      let parsedUser = null;
      if (aq.userAnswer) {
        try {
          parsedUser = JSON.parse(aq.userAnswer);
        } catch {
          parsedUser = aq.userAnswer;
        }
      }

      let parsedCorrect = null;
      try {
        parsedCorrect = JSON.parse(aq.question.correctAnswer);
      } catch {
        parsedCorrect = aq.question.correctAnswer;
      }

      return {
        id: aq.id,
        order: aq.order,
        questionId: aq.questionId,
        prompt: aq.question.prompt,
        options: optionsParsed,
        userAnswer: parsedUser,
        correctAnswer: parsedCorrect,
        isCorrect: aq.isCorrect ?? false,
        explanation: aq.question.explanation,
        difficulty: aq.question.difficulty,
        topic: aq.question.topic,
        type: aq.question.type,
      };
    });

    let parsedCoverage = null;
    if (assessment.coverage) {
      try {
        parsedCoverage = JSON.parse(assessment.coverage);
      } catch {
        parsedCoverage = null;
      }
    }

    const cumulativeProfile = await AssessmentService.getCumulativeTopicProfile(
      userId,
      assessment.language
    );

    return {
      id: assessment.id,
      language: assessment.language,
      startedAt: assessment.startedAt,
      submittedAt: assessment.submittedAt,
      status: assessment.status,
      scorePercent: assessment.scorePercent,
      weightedPercent: assessment.weightedPercent,
      level: assessment.level,
      tabSwitchCount: assessment.tabSwitchCount,
      topicBreakdown: parsedBreakdown,
      coverage: parsedCoverage || {
        topicsCovered: Object.keys(parsedBreakdown).length,
        questionsAnswered: assessment.questions.filter((q) => q.userAnswer).length,
        attemptsCount: 1,
      },
      confidence: assessment.confidence || 'Low',
      cumulativeProfile,
      passed: (assessment.weightedPercent || 0) >= 40,
      questions: reviewedQuestions,
    };
  }

  /**
   * Builds cumulative per-topic profile from all SUBMITTED attempts for a user and skill
   */
  static async getCumulativeTopicProfile(userId: string, language: string) {
    const submittedAssessments = await prisma.assessment.findMany({
      where: {
        userId,
        language: { equals: language },
        status: 'SUBMITTED',
      },
      include: {
        questions: {
          include: { question: true },
        },
      },
    });

    const topicStats: Record<string, { total: number; correct: number }> = {};
    for (const a of submittedAssessments) {
      for (const aq of a.questions) {
        const topic = aq.question.topic || 'General';
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0 };
        }
        topicStats[topic].total += 1;
        if (aq.isCorrect) {
          topicStats[topic].correct += 1;
        }
      }
    }

    return Object.entries(topicStats).map(([topic, stat]) => {
      const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      const strength: 'Strong' | 'Proficient' | 'Needs Focus' =
        accuracy >= 75 ? 'Strong' : accuracy >= 60 ? 'Proficient' : 'Needs Focus';

      const studySuggestion = accuracy < 60
        ? `Focus on reviewing core principles and hands-on exercises for ${topic}.`
        : undefined;

      return {
        topic,
        total: stat.total,
        correct: stat.correct,
        accuracy,
        strength,
        studySuggestion,
      };
    });
  }

  /**
   * User's past assessment history
   */
  static async getUserAssessmentHistory(userId: string) {
    return prisma.assessment.findMany({
      where: {
        userId,
        status: 'SUBMITTED',
      },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        language: true,
        startedAt: true,
        submittedAt: true,
        status: true,
        scorePercent: true,
        weightedPercent: true,
        level: true,
        tabSwitchCount: true,
      },
    });
  }
}

