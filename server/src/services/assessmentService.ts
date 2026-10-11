import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { ScoringService } from './scoringService.js';
import { QuestionService } from './questionService.js';

export class AssessmentService {
  /**
   * Starts a new assessment for a user on a given language.
   * Enforces 7-day cooldown and max 3 attempts per 30 days.
   */
  static async startAssessment(userId: string, language: string) {
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
          language,
          claimedLevel: 'Intermediate',
          status: 'CLAIMED',
        },
      });
      await logAudit(userId, 'SKILL_AUTO_CLAIMED', 'Skill', skill.id, { language });
    }

    // 2. Check retake cooldowns
    const pastAssessments = await prisma.assessment.findMany({
      where: {
        userId,
        language: { equals: language },
      },
      select: {
        startedAt: true,
        submittedAt: true,
        status: true,
      },
    });

    const eligibility = ScoringService.evaluateRetakeEligibility(pastAssessments);
    if (!eligibility.eligible) {
      const err: any = new Error(eligibility.reason || 'Assessment retake cooldown is active');
      err.statusCode = 400;
      err.cooldownRemainingMs = eligibility.cooldownRemainingMs;
      err.nextAvailableDate = eligibility.nextAvailableDate;
      throw err;
    }

    // 3. Cancel or mark EXPIRED any previous IN_PROGRESS assessments for this user & language
    await prisma.assessment.updateMany({
      where: {
        userId,
        language,
        status: 'IN_PROGRESS',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // 4. Select 20 questions (8 Easy, 8 Medium, 4 Hard)
    const selectedQuestions = await QuestionService.selectQuestionsForAssessment({
      language,
      userId,
    });

    // 5. Create Assessment record (30 min = 1800 sec duration)
    const assessment = await prisma.assessment.create({
      data: {
        userId,
        skillId: skill.id,
        language,
        durationSec: 1800,
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

    const updated = await prisma.assessmentQuestion.update({
      where: { id: aq.id },
      data: {
        userAnswer: JSON.stringify(userAnswer),
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

    // Calculate score using ScoringService
    const scoreResult = ScoringService.calculateScore(questionEvaluations);

    // Update Assessment record
    const submittedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        scorePercent: scoreResult.scorePercent,
        weightedPercent: scoreResult.weightedPercent,
        level: scoreResult.level,
        topicBreakdown: JSON.stringify(scoreResult.topicBreakdown),
      },
    });

    // Update Developer Skill if passed (weightedPercent >= 40)
    if (scoreResult.passed) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 12 months validity

      const existingSkill = await prisma.skill.findUnique({
        where: { id: assessment.skillId },
      });

      // Best score comparison
      const newBestScore = Math.max(existingSkill?.bestScore || 0, scoreResult.weightedPercent);

      await prisma.skill.update({
        where: { id: assessment.skillId },
        data: {
          status: 'VERIFIED',
          bestScore: newBestScore,
          verifiedAt: now,
          expiresAt,
        },
      });

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
      passed: (assessment.weightedPercent || 0) >= 40,
      questions: reviewedQuestions,
    };
  }

  /**
   * User's past assessment history
   */
  static async getUserAssessmentHistory(userId: string) {
    return prisma.assessment.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
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

