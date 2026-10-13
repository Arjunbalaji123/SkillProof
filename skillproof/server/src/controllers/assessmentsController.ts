import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AssessmentService } from '../services/assessmentService.js';
import { QuestionService } from '../services/questionService.js';
import { ProctorService } from '../services/proctorService.js';
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
        lockedUntil: err.lockedUntil || err.nextAvailableDate,
        lockoutId: err.lockoutId || null,
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

export const recordProctorEvent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const { type, snapshot } = req.body;
    const result = await ProctorService.recordProctorEvent(userId, assessmentId, type, snapshot);
    return sendSuccess(res, 'Proctor event processed', result);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to record proctor event', err.statusCode || 400);
  }
};

export const recordHeartbeat = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessmentId = req.params.id as string;
    const { cameraStatus, cameraActive } = req.body;
    const statusStr = cameraStatus || (cameraActive === false ? 'off' : 'ok');
    const result = await ProctorService.recordHeartbeat(userId, assessmentId, statusStr);
    return sendSuccess(res, 'Heartbeat processed', result);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to process heartbeat', err.statusCode || 400);
  }
};

export const getUserLockouts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const lockouts = await ProctorService.getUserLockouts(userId);
    return sendSuccess(res, 'Active skill lockouts retrieved', lockouts);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve skill lockouts', 500);
  }
};

export const submitLockoutAppeal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const lockoutId = req.params.id as string;
    const { appealText } = req.body;
    const updated = await ProctorService.submitAppeal(userId, lockoutId, appealText);
    return sendSuccess(res, 'Lockout appeal submitted for admin review', updated);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to submit appeal', err.statusCode || 400);
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

