import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { SkillService } from '../services/skillService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const summary = await SkillService.getDashboardSummary(userId);
    return sendSuccess(res, 'Dashboard summary retrieved', summary);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch dashboard summary', 500);
  }
};

export const getUserSkills = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const skills = await SkillService.getUserSkills(userId);
    return sendSuccess(res, 'User skills retrieved', skills);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch skills', 500);
  }
};

export const claimSkill = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const skill = await SkillService.claimSkill(userId, req.body);
    return sendSuccess(res, 'Skill claimed successfully. Pass assessment to verify.', skill, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to claim skill', 400);
  }
};

export const updateClaimedSkill = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const skillId = req.params.id as string;
    const updated = await SkillService.updateClaimedSkill(userId, skillId, req.body);
    return sendSuccess(res, 'Claimed skill updated', updated);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update skill', 400);
  }
};

export const deleteSkill = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const skillId = req.params.id as string;
    await SkillService.deleteSkill(userId, skillId);
    return sendSuccess(res, 'Skill removed successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to delete skill', 400);
  }
};

export const getCertificateClaims = async (_req: AuthRequest, res: Response) => {
  try {
    const claims = await SkillService.getCertificateClaims();
    return sendSuccess(res, 'Certificate claims retrieved (unverified)', claims);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch certificate claims', 500);
  }
};

export const getSkillCatalog = async (_req: AuthRequest, res: Response) => {
  try {
    const catalog = await SkillService.getSkillCatalog();
    return sendSuccess(res, 'Skill catalog retrieved', catalog);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch skill catalog', 500);
  }
};
