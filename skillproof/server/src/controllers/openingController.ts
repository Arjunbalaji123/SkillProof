import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { OpeningService, OpeningError } from '../services/openingService.js';
import { MessageService, MessageError } from '../services/messageService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createOpening = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const skillCatalogIds = req.body.skillCatalogIds || req.body.skillIds || [];
    const opening = await OpeningService.createOpening(recruiterId, {
      ...req.body,
      skillCatalogIds,
    });
    return sendSuccess(res, 'Opening published successfully', opening, 201);
  } catch (err: any) {
    const status = err instanceof OpeningError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to create opening', status);
  }
};

export const getMyOpenings = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const openings = await OpeningService.getRecruiterOpenings(recruiterId);
    return sendSuccess(res, 'Recruiter openings retrieved', openings);
  } catch (err: any) {
    const status = err instanceof OpeningError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to retrieve openings', status);
  }
};

export const getMatchingOpenings = async (req: AuthRequest, res: Response) => {
  try {
    const developerId = req.user!.userId;
    const openings = await OpeningService.getMatchingOpeningsForDeveloper(developerId);
    return sendSuccess(res, 'Matching openings retrieved', openings);
  } catch (err: any) {
    const status = err instanceof OpeningError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to retrieve matching openings', status);
  }
};

export const getOpeningDetails = async (req: AuthRequest, res: Response) => {
  try {
    const viewerId = req.user!.userId;
    const openingId = req.params.id as string;
    const opening = await OpeningService.getOpeningDetails(viewerId, openingId);
    return sendSuccess(res, 'Opening details retrieved', opening);
  } catch (err: any) {
    const status = err instanceof OpeningError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to retrieve opening details', status);
  }
};

export const updateOpening = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const openingId = req.params.id as string;
    const skillCatalogIds = req.body.skillCatalogIds || req.body.skillIds;

    const updated = await OpeningService.updateOpening(
      actorId,
      openingId,
      {
        ...req.body,
        ...(skillCatalogIds ? { skillCatalogIds } : {}),
      },
      isAdmin
    );
    return sendSuccess(res, 'Opening updated successfully', updated);
  } catch (err: any) {
    const status = err instanceof OpeningError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to update opening', status);
  }
};

export const getOpeningApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const openingId = req.params.id as string;
    const applicants = await OpeningService.getOpeningApplicants(recruiterId, openingId, isAdmin);
    return sendSuccess(res, 'Opening applicants retrieved', applicants);
  } catch (err: any) {
    const status = err instanceof OpeningError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to retrieve applicants', status);
  }
};

export const approachOpening = async (req: AuthRequest, res: Response) => {
  try {
    const developerId = req.user!.userId;
    const openingId = req.params.id as string;
    const { message } = req.body;
    const result = await MessageService.approachOpening(developerId, openingId, message);
    return sendSuccess(res, 'Approach sent successfully', result, 201);
  } catch (err: any) {
    const status =
      err instanceof MessageError || err instanceof OpeningError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to approach opening', status);
  }
};

export const decideApproach = async (req: AuthRequest, res: Response) => {
  try {
    const recruiterId = req.user!.userId;
    const approachId = req.params.id as string;
    const { decision } = req.body;
    const result = await MessageService.decideApproach(recruiterId, approachId, decision);
    return sendSuccess(res, `Approach ${String(decision).toLowerCase()}`, result);
  } catch (err: any) {
    const status = err instanceof MessageError ? err.statusCode : 400;
    return sendError(res, err.message || 'Failed to decide on approach', status);
  }
};

