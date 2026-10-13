import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export interface RandomAssessmentSelectionOptions {
  language: string;
  userId: string;
}

export class QuestionService {
  /**
   * Blueprint sampling:
   * - Validates question pool has at least 60 active questions; blocks if < 60.
   * - Selects questions per topic according to topic weights (stratified).
   * - Enforces 8 EASY / 8 MEDIUM / 4 HARD split inside the sample.
   * - Excludes questions seen in the user's last 2 SUBMITTED attempts for this skill.
   * - Falls back to the nearest topic and logs a warning if a topic has too few questions.
   */
  static async selectQuestionsForAssessment(options: RandomAssessmentSelectionOptions) {
    const { language, userId } = options;

    // 1. Resolve SkillCatalog & Topics
    const catalog = await prisma.skillCatalog.findFirst({
      where: {
        OR: [
          { name: { equals: language } },
          { slug: { equals: language.toLowerCase() } },
        ],
      },
      include: {
        topics: {
          orderBy: { weightPercent: 'desc' },
        },
      },
    });

    // 2. Count active questions in the pool for this skill
    const poolFilter: any = {
      status: 'ACTIVE',
      OR: [
        ...(catalog ? [{ skillCatalogId: catalog.id }] : []),
        { language: { equals: language } },
      ],
    };

    const activeCount = await prisma.question.count({ where: poolFilter });
    if (activeCount < 60) {
      throw new Error(
        `Cannot start assessment. The question pool for ${language} has fewer than 60 active questions (found ${activeCount}).`
      );
    }

    // 3. Exclude questions from user's last 2 SUBMITTED attempts for this language
    const pastAssessments = await prisma.assessment.findMany({
      where: {
        userId,
        language: { equals: language },
        status: 'SUBMITTED',
      },
      orderBy: { startedAt: 'desc' },
      take: 2,
      include: {
        questions: { select: { questionId: true } },
      },
    });

    const excludedQuestionIds = new Set<string>();
    for (const pa of pastAssessments) {
      for (const q of pa.questions) {
        excludedQuestionIds.add(q.questionId);
      }
    }

    // 4. Fetch all active questions in this pool
    const allQuestions = await prisma.question.findMany({
      where: poolFilter,
      include: {
        topicRelation: true,
      },
    });

    // 5. Blueprint Topic Quota Calculation
    // Total questions required: 20 (8 EASY, 8 MEDIUM, 4 HARD)
    const TOTAL_QUESTIONS = 20;
    const topics = catalog?.topics || [];

    // Calculate target question count per topic based on topic weights
    const topicQuotas: { topicId?: string; topicName: string; quota: number }[] = [];
    if (topics.length > 0) {
      let allocatedTotal = 0;
      for (const t of topics) {
        const rawQuota = Math.round((t.weightPercent / 100) * TOTAL_QUESTIONS);
        topicQuotas.push({ topicId: t.id, topicName: t.name, quota: rawQuota });
        allocatedTotal += rawQuota;
      }

      // Adjust rounding discrepancies on the highest-weighted topic
      let diff = TOTAL_QUESTIONS - allocatedTotal;
      if (diff !== 0 && topicQuotas.length > 0) {
        topicQuotas[0].quota += diff;
      }
    } else {
      // Fallback: group existing questions by string topic name
      const uniqueTopicNames = Array.from(new Set(allQuestions.map((q) => q.topic))).filter(Boolean);
      const quotaPerTopic = Math.floor(TOTAL_QUESTIONS / (uniqueTopicNames.length || 1));
      let allocatedTotal = 0;
      for (let i = 0; i < uniqueTopicNames.length; i++) {
        const quota = i === uniqueTopicNames.length - 1 ? TOTAL_QUESTIONS - allocatedTotal : quotaPerTopic;
        topicQuotas.push({ topicName: uniqueTopicNames[i], quota });
        allocatedTotal += quota;
      }
    }

    // Allocate the 8 EASY, 8 MEDIUM, 4 HARD difficulty breakdown across topics
    interface TopicDiffNeed {
      topicName: string;
      topicId?: string;
      easy: number;
      med: number;
      hard: number;
    }

    let remainingEasy = 8;
    let remainingMed = 8;
    let remainingHard = 4;

    const topicDiffNeeds: TopicDiffNeed[] = topicQuotas.map((t) => {
      let quota = t.quota;
      // Proportions: ~40% Easy, ~40% Med, ~20% Hard
      let h = Math.min(remainingHard, Math.floor(quota * 0.25));
      if (h === 0 && remainingHard > 0 && quota >= 4) h = 1;
      remainingHard -= h;
      quota -= h;

      let e = Math.min(remainingEasy, Math.ceil(quota * 0.5));
      remainingEasy -= e;
      quota -= e;

      let m = Math.min(remainingMed, quota);
      remainingMed -= m;

      return {
        topicName: t.topicName,
        topicId: t.topicId,
        easy: e,
        med: m,
        hard: h,
      };
    });

    // Distribute any remaining difficulty slots
    let topicIdx = 0;
    while (remainingEasy > 0) {
      topicDiffNeeds[topicIdx % topicDiffNeeds.length].easy++;
      remainingEasy--;
      topicIdx++;
    }
    while (remainingMed > 0) {
      topicDiffNeeds[topicIdx % topicDiffNeeds.length].med++;
      remainingMed--;
      topicIdx++;
    }
    while (remainingHard > 0) {
      topicDiffNeeds[topicIdx % topicDiffNeeds.length].hard++;
      remainingHard--;
      topicIdx++;
    }

    // 6. Stratified Sampling with Topic Fallback
    const selectedQuestionIds = new Set<string>();
    const selectedQuestions: any[] = [];

    const pickQuestionsForTopicAndDiff = (
      topicName: string,
      topicId: string | undefined,
      difficulty: string,
      needed: number
    ) => {
      if (needed <= 0) return;

      // Filter available questions for this topic and difficulty
      const candidateMatches = allQuestions.filter((q) => {
        if (selectedQuestionIds.has(q.id)) return false;
        if (q.difficulty.toUpperCase() !== difficulty.toUpperCase()) return false;
        if (topicId && q.topicId === topicId) return true;
        return q.topic.toLowerCase() === topicName.toLowerCase();
      });

      // Prefer questions not in excludedQuestionIds
      const freshCandidates = candidateMatches.filter((q) => !excludedQuestionIds.has(q.id));
      const candidates = freshCandidates.length >= needed ? freshCandidates : candidateMatches;

      // Shuffle candidates
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, needed);

      for (const p of picked) {
        selectedQuestionIds.add(p.id);
        selectedQuestions.push(p);
      }

      const deficit = needed - picked.length;
      if (deficit > 0) {
        // Fall back to nearest topic in the same skill
        console.warn(
          `⚠️ [QuestionService] Topic '${topicName}' has insufficient ${difficulty} questions (needed ${needed}, found ${picked.length}). Falling back to nearest topic in ${language}.`
        );

        // Find nearest topic with available questions of that difficulty
        const fallbackCandidates = allQuestions.filter(
          (q) =>
            !selectedQuestionIds.has(q.id) &&
            q.difficulty.toUpperCase() === difficulty.toUpperCase()
        );

        const freshFallback = fallbackCandidates.filter((q) => !excludedQuestionIds.has(q.id));
        const finalFallbackPool = freshFallback.length >= deficit ? freshFallback : fallbackCandidates;
        const fallbackPicked = [...finalFallbackPool].sort(() => 0.5 - Math.random()).slice(0, deficit);

        for (const fp of fallbackPicked) {
          selectedQuestionIds.add(fp.id);
          selectedQuestions.push(fp);
        }
      }
    };

    // Run selection across each topic and difficulty requirement
    for (const need of topicDiffNeeds) {
      pickQuestionsForTopicAndDiff(need.topicName, need.topicId, 'EASY', need.easy);
      pickQuestionsForTopicAndDiff(need.topicName, need.topicId, 'MEDIUM', need.med);
      pickQuestionsForTopicAndDiff(need.topicName, need.topicId, 'HARD', need.hard);
    }

    // Safety fallback: if total selected is still under 20, fill with any available questions
    if (selectedQuestions.length < TOTAL_QUESTIONS) {
      const remainingUnselected = allQuestions.filter((q) => !selectedQuestionIds.has(q.id));
      const filler = [...remainingUnselected].sort(() => 0.5 - Math.random()).slice(0, TOTAL_QUESTIONS - selectedQuestions.length);
      for (const f of filler) {
        selectedQuestions.push(f);
      }
    }

    // Shuffle presentation order so questions from different topics/difficulties interleave
    return [...selectedQuestions].sort(() => 0.5 - Math.random());
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
        skillCatalog: true,
        topicRelation: true,
        flags: {
          include: {
            reporter: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
    });
  }

  /**
   * Helper to ensure correctAnswer is stored canonically as JSON array of strings
   */
  static normalizeCorrectAnswer(val: any): string {
    if (val === undefined || val === null) return JSON.stringify([]);
    if (Array.isArray(val)) {
      return JSON.stringify(val.map(String).map((s) => s.trim()).filter(Boolean));
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return JSON.stringify(parsed.map(String).map((s) => s.trim()).filter(Boolean));
        }
        return JSON.stringify([String(parsed).trim()]);
      } catch {
        return JSON.stringify([val.trim()]);
      }
    }
    return JSON.stringify([String(val).trim()]);
  }

  /**
   * Admin: Create question linked to SkillCatalog and Topic
   */
  static async createQuestion(adminId: string, data: {
    language: string;
    topic: string;
    skillCatalogId?: string;
    topicId?: string;
    difficulty: string;
    type: string;
    prompt: string;
    options: string[] | string;
    correctAnswer: any;
    explanation: string;
  }) {
    const optionsStr = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
    const correctStr = QuestionService.normalizeCorrectAnswer(data.correctAnswer);

    // Resolve catalog and topic if not provided directly
    let skillCatalogId = data.skillCatalogId;
    let topicId = data.topicId;

    if (!skillCatalogId) {
      const catalog = await prisma.skillCatalog.findFirst({
        where: { name: { equals: data.language } },
      });
      if (catalog) skillCatalogId = catalog.id;
    }

    if (skillCatalogId && !topicId) {
      const t = await prisma.topic.findFirst({
        where: {
          skillCatalogId,
          name: { equals: data.topic },
        },
      });
      if (t) topicId = t.id;
    }

    const question = await prisma.question.create({
      data: {
        skillCatalogId,
        topicId,
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

    await logAudit(adminId, 'QUESTION_CREATED', 'Question', question.id, {
      language: question.language,
      topic: question.topic,
    });
    return question;
  }

  /**
   * Admin: Update question
   */
  static async updateQuestion(adminId: string, id: string, data: Partial<{
    language: string;
    topic: string;
    skillCatalogId: string;
    topicId: string;
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
      updateData.correctAnswer = QuestionService.normalizeCorrectAnswer(data.correctAnswer);
    }

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
    });

    await logAudit(adminId, 'QUESTION_UPDATED', 'Question', id, updateData);
    return question;
  }

  /**
   * Admin: Batch Import questions (JSON array or CSV parsed objects).
   * Requires a skill and topic.
   */
  static async importQuestions(adminId: string, questions: any[]) {
    let createdCount = 0;

    for (const q of questions) {
      if (!q.language || !q.topic) {
        throw new Error(`Every imported question must specify a skill ("language") and a "topic". Missing on prompt: "${q.prompt?.slice(0, 30)}..."`);
      }

      // Resolve skillCatalogId & topicId
      let skillCatalogId = q.skillCatalogId;
      let topicId = q.topicId;

      if (!skillCatalogId) {
        const catalog = await prisma.skillCatalog.findFirst({
          where: { name: { equals: q.language } },
        });
        if (catalog) skillCatalogId = catalog.id;
      }

      if (skillCatalogId && !topicId) {
        const t = await prisma.topic.findFirst({
          where: {
            skillCatalogId,
            name: { equals: q.topic },
          },
        });
        if (t) topicId = t.id;
      }

      const optionsStr = typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []);
      const correctStr = QuestionService.normalizeCorrectAnswer(q.correctAnswer);

      await prisma.question.create({
        data: {
          skillCatalogId,
          topicId,
          language: q.language,
          topic: q.topic,
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
