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
      return sendError(res, 'This assessment attempt has already been submitted', 400);
    }

    const questions = await prisma.assessmentQuestion.findMany({
      where: { assessment_id: assessmentId },
      include: { options: true },
    });

    let correctCount = 0;
    const answerRecords: any[] = [];

    for (const ans of answers) {
      const { questionId, selectedOptionId } = ans;
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

    if (answerRecords.length > 0) {
      await prisma.assessmentAnswer.createMany({ data: answerRecords });
    }

    const totalQuestions = questions.length || attempt.total_questions || 1;
    const score = Number(correctCount.toFixed(2));
    const percentage = Number(((correctCount / totalQuestions) * 100).toFixed(2));
    const passed = percentage >= attempt.assessment.passing_percentage;
    const status = passed ? 'PASSED' : 'FAILED';

    const updatedAttempt = await prisma.assessmentAttempt.update({
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

    let skillVerified = false;

    if (passed) {
      const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
      if (profile) {
        let userSkill = await prisma.userSkill.findFirst({
          where: { profile_id: profile.id, skill_id: attempt.assessment.skill_id },
        });

        if (userSkill) {
          await prisma.userSkill.update({
            where: { id: userSkill.id },
            data: {
              verification_status: 'VERIFIED',
              verified_at: new Date(),
              verification_method: 'ASSESSMENT',
            },
          });
        } else {
          userSkill = await prisma.userSkill.create({
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
        await calculateProfileCompletion(profile.id);

        await prisma.notification.create({
          data: {
            user_id: userId,
            title: `Assessment Passed: ${attempt.assessment.title}! 🎉`,
            message: `Congratulations! You scored ${percentage}% (${correctCount}/${totalQuestions}) on your ${attempt.assessment.skill.name} assessment and earned a Verified Skill Badge!`,
            type: 'SUCCESS',
          },
        });
      }
    } else {
      await prisma.notification.create({
        data: {
          user_id: userId,
          title: `Assessment Result: ${attempt.assessment.title}`,
          message: `You scored ${percentage}% (${correctCount}/${totalQuestions}). A minimum of ${attempt.assessment.passing_percentage}% is required to verify. You can retry anytime.`,
          type: 'WARNING',
        },
      });
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

