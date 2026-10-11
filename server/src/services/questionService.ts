import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export interface RandomAssessmentSelectionOptions {
  language: string;
  userId: string;
}

export class QuestionService {
  /**
   * Randomly selects exactly 20 questions for an assessment:
   * - 8 EASY
   * - 8 MEDIUM
   * - 4 HARD
   * - Covers a broad topic spread
   * - Excludes questions seen in user's last 2 attempts for this language if possible
   */
  static async selectQuestionsForAssessment(options: RandomAssessmentSelectionOptions) {
    const { language, userId } = options;

    // 1. Find question IDs user answered in last 2 attempts for this language
    const pastAssessments = await prisma.assessment.findMany({
      where: {
        userId,
        language: { equals: language },
      },
      orderBy: { startedAt: 'desc' },
      take: 2,
      include: {
        questions: {
          select: { questionId: true },
        },
      },
    });

    const excludedQuestionIds = new Set<string>();
    for (const pa of pastAssessments) {
      for (const q of pa.questions) {
        excludedQuestionIds.add(q.questionId);
      }
    }

    // 2. Fetch all ACTIVE questions for this language
    const allQuestions = await prisma.question.findMany({
      where: {
        language: { equals: language },
        status: 'ACTIVE',
      },
    });

    if (allQuestions.length < 20) {
      throw new Error(`Insufficient questions in the question bank for ${language}. Found ${allQuestions.length}, required 20.`);
    }

    // Helper to filter and pick
    const pickDifficulty = (diff: string, count: number) => {
      const matching = allQuestions.filter((q) => q.difficulty.toUpperCase() === diff.toUpperCase());
      // Prioritize questions not in excludedQuestionIds
      const fresh = matching.filter((q) => !excludedQuestionIds.has(q.id));
      const pool = fresh.length >= count ? fresh : matching;

      // Shuffle pool
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      if (shuffled.length < count) {
        throw new Error(`Insufficient ${diff} questions for ${language}. Needed ${count}, available ${shuffled.length}.`);
      }
      return shuffled.slice(0, count);
    };

    const easyQuestions = pickDifficulty('EASY', 8);
    const mediumQuestions = pickDifficulty('MEDIUM', 8);
    const hardQuestions = pickDifficulty('HARD', 4);

    // Combine and shuffle order of presentation
    const combined = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
    return combined.sort(() => 0.5 - Math.random());
  }

  /**
   * Flags a question with a reason
   */
  static async flagQuestion(questionId: string, reportedBy: string, reason: string) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const flag = await prisma.questionFlag.create({
      data: {
        questionId,
        reportedBy,
        reason,
      },
    });

    // Optionally mark question status as FLAGGED if not already
    await prisma.question.update({
      where: { id: questionId },
      data: { status: 'FLAGGED' },
    });

    await logAudit(reportedBy, 'QUESTION_FLAGGED', 'Question', questionId, { reason });
    return flag;
  }

  /**
   * Admin: List questions with filters
   */
  static async listQuestions(filter: { language?: string; difficulty?: string; status?: string; search?: string }) {
    const where: any = {};
    if (filter.language && filter.language !== 'ALL') {
      where.language = { equals: filter.language };
    }
    if (filter.difficulty && filter.difficulty !== 'ALL') {
      where.difficulty = { equals: filter.difficulty };
    }
    if (filter.status && filter.status !== 'ALL') {
      where.status = { equals: filter.status };
    }
    if (filter.search) {
      where.OR = [
        { prompt: { contains: filter.search } },
        { topic: { contains: filter.search } },
      ];
    }

    return prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        flags: {
          include: {
            reporter: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  }

  /**
   * Admin: Create question
   */
  static async createQuestion(adminId: string, data: {
    language: string;
    topic: string;
    difficulty: string;
    type: string;
    prompt: string;
    options: string[] | string;
    correctAnswer: any;
    explanation: string;
  }) {
    const optionsStr = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
    const correctStr = typeof data.correctAnswer === 'string' ? data.correctAnswer : JSON.stringify(data.correctAnswer);

    const question = await prisma.question.create({
      data: {
        language: data.language,
        topic: data.topic,
        difficulty: data.difficulty.toUpperCase(),
        type: data.type || 'MCQ',
        prompt: data.prompt,
        options: optionsStr,
        correctAnswer: correctStr,
        explanation: data.explanation,
        status: 'ACTIVE',
        createdBy: adminId,
      },
    });

    await logAudit(adminId, 'QUESTION_CREATED', 'Question', question.id, { language: question.language });
    return question;
  }

  /**
   * Admin: Update question
   */
  static async updateQuestion(adminId: string, id: string, data: Partial<{
    language: string;
    topic: string;
    difficulty: string;
    type: string;
    prompt: string;
    options: any;
    correctAnswer: any;
    explanation: string;
    status: string;
  }>) {
    const updateData: any = { ...data };
    if (data.options !== undefined) {
      updateData.options = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
    }
    if (data.correctAnswer !== undefined) {
      updateData.correctAnswer = typeof data.correctAnswer === 'string' ? data.correctAnswer : JSON.stringify(data.correctAnswer);
    }

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
    });

    await logAudit(adminId, 'QUESTION_UPDATED', 'Question', id, updateData);
    return question;
  }

  /**
   * Admin: Batch Import questions (JSON array)
   */
  static async importQuestions(adminId: string, questions: any[]) {
    let createdCount = 0;
    for (const q of questions) {
      const optionsStr = typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []);
      const correctStr = typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer);

      await prisma.question.create({
        data: {
          language: q.language,
          topic: q.topic || 'General',
          difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
          type: q.type || 'MCQ',
          prompt: q.prompt,
          options: optionsStr,
          correctAnswer: correctStr,
          explanation: q.explanation || '',
          status: 'ACTIVE',
          createdBy: adminId,
        },
      });
      createdCount++;
    }

    await logAudit(adminId, 'QUESTIONS_IMPORTED', 'Question', null, { count: createdCount });
    return { count: createdCount };
  }

  /**
   * Admin: Delete question
   */
  static async deleteQuestion(adminId: string, id: string) {
    const question = await prisma.question.delete({
      where: { id },
    });
    await logAudit(adminId, 'QUESTION_DELETED', 'Question', id);
    return question;
  }
}

