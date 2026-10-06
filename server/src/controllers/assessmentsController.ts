import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { logAudit } from '../utils/audit.js';

export const getAssessments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const assessments = await prisma.assessment.findMany({
      include: {
        skill: true,
        _count: { select: { questions: true } },
      },
      orderBy: { title: 'asc' },
    });

    return sendSuccess(res, 'Assessments list retrieved', assessments);
  } catch (err) {
    next(err);
  }
};

export const getAssessmentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        skill: true,
        questions: {
          select: {
            id: true,
            question_text: true,
            code_snippet: true,
            points: true,
            options: {
              select: {
                id: true,
                option_text: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) return sendError(res, 'Assessment not found', 404);

    return sendSuccess(res, 'Assessment retrieved for quiz player', assessment);
  } catch (err) {
    next(err);
  }
};

export const getOrCreateSkillAssessment = async (skillId: string) => {
  let assessment = await prisma.assessment.findFirst({
    where: { skill_id: skillId },
    include: { questions: { include: { options: true } } },
  });

  if (assessment && assessment.questions.length > 0) {
    return assessment;
  }

  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  const skillName = skill ? skill.name : 'Technical Skill';

  const questionTemplates = [
    {
      question_text: `What is a core architectural principle when developing with ${skillName}?`,
      code_snippet: `// ${skillName} production pattern example\nfunction configureModule() {\n  return { status: "initialized", valid: true };\n}`,
      explanation: `${skillName} requires modularity, explicit component boundaries, and robust design patterns.`,
      options: [
        { option_text: 'Modular, decoupled architecture with explicit type definitions', is_correct: true },
        { option_text: 'Monolithic synchronous blocking operations', is_correct: false },
        { option_text: 'Un-scoped global state mutation across threads', is_correct: false },
        { option_text: 'Swallowing runtime errors without reporting', is_correct: false },
      ],
    },
    {
      question_text: `Which optimization technique is recommended for high-throughput applications using ${skillName}?`,
      explanation: `Caching expensive operations, minimizing unneeded computations, and efficient resource allocation improve performance.`,
      options: [
        { option_text: 'Caching expensive computations and reusing immutable resources', is_correct: true },
        { option_text: 'Allocating large unused memory buffers inside hot loops', is_correct: false },
        { option_text: 'Executing synchronous file disk I/O inside API request handlers', is_correct: false },
        { option_text: 'Disabling garbage collection and process cleanup handlers', is_correct: false },
      ],
    },
    {
      question_text: `In ${skillName}, how should async error handling and exceptions ideally be managed?`,
      code_snippet: `try {\n  await executeServiceTask();\n} catch (error) {\n  logger.error("Execution failure", error);\n}`,
      explanation: `Structured try-catch blocks and explicit error boundaries prevent process crashes and unhandled promise rejections.`,
      options: [
        { option_text: 'Using structured try-catch blocks and error boundaries', is_correct: true },
        { option_text: 'Ignoring exceptions and swallowing error objects', is_correct: false },
        { option_text: 'Terminating the process on minor warnings', is_correct: false },
        { option_text: 'Relying exclusively on client-side visual alerts', is_correct: false },
      ],
    },
    {
      question_text: `What is a primary software engineering advantage of ${skillName}?`,
      explanation: `${skillName} enables developers to build maintainable, reliable, and scalable enterprise applications.`,
      options: [
        { option_text: 'Scalability, ecosystem tooling support, and maintainable codebase structure', is_correct: true },
        { option_text: 'Completely eliminating the need for unit testing', is_correct: false },
        { option_text: 'Bypassing authentication and authorization checks', is_correct: false },
        { option_text: 'Automatic deployment without build compilation', is_correct: false },
      ],
    },
    {
      question_text: `When testing applications built with ${skillName}, which testing methodology is most effective?`,
      explanation: `A comprehensive testing suite combining unit tests, integration tests, and static checks ensures reliability.`,
      options: [
        { option_text: 'Combining isolated unit tests with integration and assertion suites', is_correct: true },
        { option_text: 'Testing manually only after production release', is_correct: false },
        { option_text: 'Using debug console output statements without assertions', is_correct: false },
        { option_text: 'Writing tests only after major outage incidents', is_correct: false },
      ],
    },
  ];

  const shuffledTemplates = [...questionTemplates].sort(() => 0.5 - Math.random());

  assessment = await prisma.assessment.create({
    data: {
      skill_id: skillId,
      title: `${skillName} Technical Verification Quiz`,
      description: `Automated assessment for ${skillName} skill & certification verification. Pass this test to verify your pending credential.`,
      time_limit_minutes: 15,
      passing_percentage: 70,
      total_questions: shuffledTemplates.length,
      questions: {
        create: shuffledTemplates.map((q) => ({
          question_text: q.question_text,
          code_snippet: q.code_snippet || null,
          explanation: q.explanation,
          points: 1,
          options: {
            create: [...q.options].sort(() => 0.5 - Math.random()),
          },
        })),
      },
    },
    include: { questions: { include: { options: true } } },
  });

  return assessment;
};

export const startAssessmentForSkill = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const skillId = req.params.skillId as string;

    const assessment = await getOrCreateSkillAssessment(skillId);

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        user_id: userId,
        assessment_id: assessment.id,
        start_time: new Date(),
        total_questions: assessment.questions ? assessment.questions.length : 5,
        status: 'IN_PROGRESS',
      },
    });

    await logAudit(userId, 'ASSESSMENT_STARTED_DYNAMIC', 'ASSESSMENT_ATTEMPT', attempt.id, {
      assessment_title: assessment.title,
    });

    return sendSuccess(res, 'Assessment started successfully for pending skill/certification', {
      assessment,
      attemptId: attempt.id,
    }, 201);
  } catch (err) {
    next(err);
  }
};

export const startAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { _count: { select: { questions: true } } },
    });

    if (!assessment) return sendError(res, 'Assessment not found', 404);

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        user_id: userId,
        assessment_id: assessmentId,
        start_time: new Date(),
        total_questions: assessment._count.questions,
        status: 'IN_PROGRESS',
      },
    });

    await logAudit(userId, 'ASSESSMENT_STARTED', 'ASSESSMENT_ATTEMPT', attempt.id, {
      assessment_title: assessment.title,
    });

    return sendSuccess(res, 'Assessment attempt started', attempt, 201);
  } catch (err) {
    next(err);
  }
};

export const submitAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const { attemptId, answers } = req.body;

    if (!attemptId || !Array.isArray(answers)) {
      return sendError(res, 'Attempt ID and answers array are required', 400);
    }

    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: String(attemptId), user_id: userId, assessment_id: assessmentId },
      include: { assessment: { include: { skill: true } } },
    });

    if (!attempt) return sendError(res, 'Assessment attempt not found or unauthorized', 404);

    if (attempt.status !== 'IN_PROGRESS') {
      return sendError(res, 'This assessment attempt has already been submitted or expired', 400);
    }

    // Time limit check (plus 60s buffer for network latency)
    const timeLimitMs = (attempt.assessment.time_limit_minutes || 15) * 60 * 1000 + 60000;
    const elapsedMs = Date.now() - new Date(attempt.start_time).getTime();

    if (elapsedMs > timeLimitMs) {
      await prisma.assessmentAttempt.update({
        where: { id: String(attemptId) },
        data: { status: 'EXPIRED', end_time: new Date(), score: 0, percentage: 0 },
      });
      return sendError(res, 'Assessment submission failed: Time limit exceeded', 400);
    }

    const questions = await prisma.assessmentQuestion.findMany({
      where: { assessment_id: assessmentId },
      include: { options: true },
    });

    // Deduplicate submitted answers by question_id
    const answerMap = new Map<string, string>();
    for (const ans of answers) {
      if (ans && ans.questionId && ans.selectedOptionId && !answerMap.has(ans.questionId)) {
        answerMap.set(String(ans.questionId), String(ans.selectedOptionId));
      }
    }

    let correctCount = 0;
    const answerRecords: any[] = [];

    for (const [questionId, selectedOptionId] of answerMap.entries()) {
      const question = questions.find((q) => q.id === questionId);
      if (!question) continue;

      const selectedOption = question.options.find((o) => o.id === selectedOptionId);
      const isCorrect = Boolean(selectedOption && selectedOption.is_correct);

      if (isCorrect) correctCount++;

      answerRecords.push({
        attempt_id: String(attemptId),
        question_id: questionId,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
      });
    }

    const totalQuestions = questions.length || attempt.total_questions || 1;
    const score = Number(correctCount.toFixed(2));
    const percentage = Number(((correctCount / totalQuestions) * 100).toFixed(2));
    const passed = percentage >= attempt.assessment.passing_percentage;
    const status = passed ? 'PASSED' : 'FAILED';

    let skillVerified = false;

    // Wrap operations in atomic transaction
    const updatedAttempt = await prisma.$transaction(async (tx) => {
      if (answerRecords.length > 0) {
        await tx.assessmentAnswer.createMany({ data: answerRecords });
      }

      const updated = await tx.assessmentAttempt.update({
        where: { id: String(attemptId) },
        data: {
          end_time: new Date(),
          total_questions: totalQuestions,
          correct_answers: correctCount,
          score,
          percentage,
          status,
        },
      });

      if (passed) {
        const profile = await tx.profile.findUnique({ where: { user_id: userId } });
        if (profile) {
          const userSkill = await tx.userSkill.findFirst({
            where: { profile_id: profile.id, skill_id: attempt.assessment.skill_id },
          });

          if (userSkill) {
            await tx.userSkill.update({
              where: { id: userSkill.id },
              data: {
                verification_status: 'VERIFIED',
                verified_at: new Date(),
                verification_method: 'ASSESSMENT',
              },
            });

            await tx.verificationRequest.updateMany({
              where: { user_skill_id: userSkill.id, status: 'PENDING' },
              data: { status: 'VERIFIED' },
            });
          } else {
            await tx.userSkill.create({
              data: {
                profile_id: profile.id,
                skill_id: attempt.assessment.skill_id,
                proficiency_level: 'ADVANCED',
                verification_status: 'VERIFIED',
                verified_at: new Date(),
                verification_method: 'ASSESSMENT',
              },
            });
          }

          skillVerified = true;
          await tx.notification.create({
            data: {
              user_id: userId,
              title: `Assessment Passed: ${attempt.assessment.title}! 🎉`,
              message: `Congratulations! You scored ${percentage}% (${correctCount}/${totalQuestions}) on your ${attempt.assessment.skill.name} assessment and earned a Verified Skill Badge!`,
              type: 'SUCCESS',
            },
          });
        }
      } else {
        await tx.notification.create({
          data: {
            user_id: userId,
            title: `Assessment Result: ${attempt.assessment.title}`,
            message: `You scored ${percentage}% (${correctCount}/${totalQuestions}). A minimum of ${attempt.assessment.passing_percentage}% is required to verify. You can retry anytime.`,
            type: 'WARNING',
          },
        });
      }

      return updated;
    });

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (profile) {
      await calculateProfileCompletion(profile.id);
    }

    await logAudit(userId, 'ASSESSMENT_SUBMITTED', 'ASSESSMENT_ATTEMPT', String(attemptId), {
      score,
      percentage,
      status,
      skillVerified,
    });

    return sendSuccess(res, `Assessment submitted. Result: ${status}`, {
      attempt: updatedAttempt,
      score,
      percentage,
      correctAnswers: correctCount,
      totalQuestions,
      passed,
      passingPercentage: attempt.assessment.passing_percentage,
      skillVerified,
      skillName: attempt.assessment.skill.name,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserAssessmentResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { user_id: userId },
      include: {
        assessment: {
          include: { skill: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Assessment results history retrieved', attempts);
  } catch (err) {
    next(err);
  }
};

