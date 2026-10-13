import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AdminService } from '../services/adminService.js';
import { QuestionService } from '../services/questionService.js';
import { ProctorService } from '../services/proctorService.js';
import { MessageService } from '../services/messageService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getStats = async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await AdminService.getPlatformStats();
    return sendSuccess(res, 'Platform stats retrieved', stats);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch stats', 500);
  }
};

export const listQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { language, difficulty, status, search } = req.query;
    const questions = await QuestionService.listQuestions({
      language: language as string,
      difficulty: difficulty as string,
      status: status as string,
      search: search as string,
    });
    return sendSuccess(res, 'Questions retrieved', questions);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch questions', 500);
  }
};

export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const question = await QuestionService.createQuestion(adminId, req.body);
    return sendSuccess(res, 'Question created successfully', question, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to create question', 400);
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const questionId = req.params.id as string;
    const question = await QuestionService.updateQuestion(adminId, questionId, req.body);
    return sendSuccess(res, 'Question updated successfully', question);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update question', 400);
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const questionId = req.params.id as string;
    await QuestionService.deleteQuestion(adminId, questionId);
    return sendSuccess(res, 'Question deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to delete question', 400);
  }
};

export const importQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return sendError(res, 'Questions must be a non-empty array', 400);
    }
    const result = await QuestionService.importQuestions(adminId, questions);
    return sendSuccess(res, `Successfully imported ${result.count} questions`, result, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to import questions', 400);
  }
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, role } = req.query;
    const users = await AdminService.listUsers(search as string, role as string);
    return sendSuccess(res, 'Users retrieved', users);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch users', 500);
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const userId = req.params.id as string;
    const { status } = req.body;
    const user = await AdminService.updateUserStatus(adminId, userId, status);
    return sendSuccess(res, `User status updated to ${status}`, user);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update user status', 400);
  }
};

export const getFlags = async (_req: AuthRequest, res: Response) => {
  try {
    const flags = await AdminService.getFlaggedQuestions();
    return sendSuccess(res, 'Flagged questions retrieved', flags);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch flagged questions', 500);
  }
};

export const resolveFlag = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const flagId = req.params.id as string;
    const { action } = req.body; // 'RESOLVE' | 'RETIRE_QUESTION'
    await AdminService.resolveFlag(adminId, flagId, action || 'RESOLVE');
    return sendSuccess(res, 'Flag action executed successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to process flag action', 400);
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = await AdminService.getAuditLogs(limit);
    return sendSuccess(res, 'Audit logs retrieved', logs);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch audit logs', 500);
  }
};

// ==========================================
// Catalog CRUD & Question Pool Health
// ==========================================
export const getCatalog = async (_req: AuthRequest, res: Response) => {
  try {
    const catalog = await AdminService.getCatalog();
    return sendSuccess(res, 'Catalog retrieved', catalog);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch catalog', 500);
  }
};

export const createTrack = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const track = await AdminService.createTrack(adminId, req.body);
    return sendSuccess(res, 'Track created successfully', track, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to create track', 400);
  }
};

export const updateTrack = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const track = await AdminService.updateTrack(adminId, req.params.id as string, req.body);
    return sendSuccess(res, 'Track updated successfully', track);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update track', 400);
  }
};

export const deleteTrack = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    await AdminService.deleteTrack(adminId, req.params.id as string);
    return sendSuccess(res, 'Track deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to delete track', 400);
  }
};

export const createSkillCatalog = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const skill = await AdminService.createSkillCatalog(adminId, req.body);
    return sendSuccess(res, 'Skill created successfully', skill, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to create skill', 400);
  }
};

export const updateSkillCatalog = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const skill = await AdminService.updateSkillCatalog(adminId, req.params.id as string, req.body);
    return sendSuccess(res, 'Skill updated successfully', skill);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update skill', 400);
  }
};

export const deleteSkillCatalog = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    await AdminService.deleteSkillCatalog(adminId, req.params.id as string);
    return sendSuccess(res, 'Skill deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to delete skill', 400);
  }
};

export const createTopic = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const topic = await AdminService.createTopic(adminId, req.body);
    return sendSuccess(res, 'Topic created successfully', topic, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to create topic', 400);
  }
};

export const updateTopic = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const topic = await AdminService.updateTopic(adminId, req.params.id as string, req.body);
    return sendSuccess(res, 'Topic updated successfully', topic);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update topic', 400);
  }
};

export const deleteTopic = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    await AdminService.deleteTopic(adminId, req.params.id as string);
    return sendSuccess(res, 'Topic deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to delete topic', 400);
  }
};

export const getQuestionPoolHealth = async (_req: AuthRequest, res: Response) => {
  try {
    const poolHealth = await AdminService.getQuestionPoolHealth();
    return sendSuccess(res, 'Question pool health retrieved', poolHealth);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch question pool health', 500);
  }
};

// ==========================================
// Proctoring & Lockout Administration
// ==========================================
export const getProctoringOverview = async (_req: AuthRequest, res: Response) => {
  try {
    const data = await ProctorService.getAdminProctoringData();
    return sendSuccess(res, 'Proctoring overview retrieved', data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch proctoring overview', 500);
  }
};

export const liftLockout = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const lockoutId = req.params.id as string;
    const { reason } = req.body;
    const updated = await ProctorService.liftLockout(adminId, lockoutId, reason);
    return sendSuccess(res, 'Skill lockout lifted and attempt restored', updated);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to lift lockout', err.statusCode || 400);
  }
};

export const confirmViolation = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const lockoutId = req.params.id as string;
    const { notes } = req.body;
    const updated = await ProctorService.confirmViolation(adminId, lockoutId, notes);
    return sendSuccess(res, 'Violation confirmed', updated);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to confirm violation', err.statusCode || 400);
  }
};

export const serveProctorSnapshot = async (req: AuthRequest, res: Response) => {
  try {
    const filename = path.basename(req.params.filename as string);
    const filePath = path.join(ProctorService.getSnapshotDir(), filename);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'Snapshot not found', 404);
    }
    return res.sendFile(filePath);
  } catch (err: any) {
    return sendError(res, 'Failed to serve snapshot', 500);
  }
};

// ==========================================
// Recruiter Verification & Opening Moderation
// ==========================================
export const listRecruiters = async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const recruiters = await AdminService.listRecruitersForVerification(status);
    return sendSuccess(res, 'Recruiters retrieved', recruiters);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve recruiters', 500);
  }
};

export const verifyRecruiter = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const targetId = String(req.params.id || req.body.recruiterId || req.body.userId || '').trim();

    let decision: 'APPROVE' | 'REJECT' | 'UNVERIFY' = 'APPROVE';
    if (req.body.decision) {
      decision = req.body.decision;
    } else if (req.body.isVerified === false) {
      decision = 'UNVERIFY';
    } else if (req.body.isVerified === true) {
      decision = 'APPROVE';
    }

    const reason = req.body.reason || req.body.note;

    if (!targetId) {
      return sendError(res, 'Recruiter ID is required', 400);
    }

    const updated = await AdminService.setRecruiterVerification(adminId, targetId, decision, reason);
    const msg =
      decision === 'APPROVE'
        ? 'Recruiter verified successfully'
        : decision === 'REJECT'
        ? 'Recruiter verification rejected'
        : 'Recruiter verification revoked';

    return sendSuccess(res, msg, updated);
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    return sendError(res, err.message || 'Failed to update recruiter verification', statusCode);
  }
};

export const listAdminOpenings = async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const openings = await AdminService.listAllOpeningsForAdmin(status);
    return sendSuccess(res, 'Openings retrieved', openings);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to retrieve openings', 500);
  }
};

export const reviewAdminOpening = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const openingId = String(req.params.id || req.body.openingId || '').trim();
    if (!openingId) {
      return sendError(res, 'Opening ID is required', 400);
    }
    const { decision, reason } = req.body;
    const updated = await AdminService.reviewOpening(adminId, openingId, decision, reason);
    return sendSuccess(
      res,
      `Opening successfully ${decision === 'APPROVE' ? 'approved' : 'rejected'}`,
      updated
    );
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to review opening', err.statusCode || 400);
  }
};

export const moderateAdminOpening = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const openingId = String(req.params.id || req.body.openingId || '');
    if (!openingId) {
      return sendError(res, 'Opening ID is required', 400);
    }
    if (req.body.decision) {
      const updated = await AdminService.reviewOpening(
        adminId,
        openingId,
        req.body.decision,
        req.body.reason
      );
      return sendSuccess(
        res,
        `Opening successfully ${req.body.decision === 'APPROVE' ? 'approved' : 'rejected'}`,
        updated
      );
    }
    const { OpeningService } = await import('../services/openingService.js');
    const updated = await OpeningService.updateOpening(adminId, openingId, req.body, true);
    return sendSuccess(res, 'Opening moderated successfully', updated);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to moderate opening', err.statusCode || 400);
  }
};

// ==========================================
// Message Reports Moderation
// ==========================================
export const getMessageReports = async (req: AuthRequest, res: Response) => {
  try {
    const resolvedParam = req.query.resolved;
    const resolvedFilter =
      resolvedParam === 'true' ? true : resolvedParam === 'false' ? false : undefined;
    const reports = await MessageService.getAdminMessageReports(resolvedFilter);
    return sendSuccess(res, 'Message reports retrieved', reports);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch message reports', 500);
  }
};

export const resolveMessageReport = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const reportId = String(req.params.id || req.body.reportId || '');
    const action = req.body.action as string | undefined;

    const options = {
      deleteMessage: Boolean(req.body.deleteMessage || action === 'delete' || action === 'suspend'),
      warnSender: Boolean(req.body.warnSender || action === 'warn'),
      suspendSender: Boolean(req.body.suspendSender || action === 'suspend'),
    };

    const updated = await MessageService.resolveAdminMessageReport(adminId, reportId, options);
    return sendSuccess(res, `Message report processed`, updated);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to resolve message report', err.statusCode || 400);
  }
};



