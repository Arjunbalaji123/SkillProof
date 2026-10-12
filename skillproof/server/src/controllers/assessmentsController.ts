import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AssessmentService } from '../services/assessmentService.js';
import { QuestionService } from '../services/questionService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const startAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { language } = req.body;
    const assessment = await AssessmentService.startAssessment(userId, language);
    return sendSuccess(res, 'Assessment started successfully', assessment, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to start assessment', err.statusCode || 400, [
      {
        cooldownRemainingMs: err.cooldownRemainingMs,
        nextAvailableDate: err.nextAvailableDate,
      },
    ]);
  }
};

export const saveAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const { order, userAnswer } = req.body;

    const saved = await AssessmentService.saveAnswer(userId, assessmentId, order, userAnswer);
    return sendSuccess(res, 'Answer saved', saved);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to save answer', 400);
  }
};

export const recordTabSwitch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const result = await AssessmentService.recordTabSwitch(userId, assessmentId);
    return sendSuccess(res, 'Tab switch event recorded', result);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to record event', 400);
  }
};

export const submitAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const result = await AssessmentService.submitAssessment(userId, assessmentId);
    return sendSuccess(res, 'Assessment graded and submitted successfully', result);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to submit assessment', 400);
  }
};

export const getAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const result = await AssessmentService.getAssessmentDetails(userId, assessmentId);
    return sendSuccess(res, 'Assessment details retrieved', result);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve assessment', 400);
  }
};

export const getAssessmentResult = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const result = await AssessmentService.getAssessmentResult(userId, assessmentId);
    return sendSuccess(res, 'Assessment result retrieved', result);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve assessment result', 400);
  }
};

export const getAssessmentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const history = await AssessmentService.getUserAssessmentHistory(userId);
    return sendSuccess(res, 'Assessment history retrieved', history);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve assessment history', 500);
  }
};

export const flagQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const questionId = req.params.id as string;
    const { reason } = req.body;

    const flag = await QuestionService.flagQuestion(questionId, userId, reason);
    return sendSuccess(res, 'Question flagged for administrative review', flag, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to flag question', 400);
  }
};
