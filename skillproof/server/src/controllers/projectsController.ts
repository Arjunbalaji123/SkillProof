import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { ProjectService } from '../services/projectService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getUserProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const projects = await ProjectService.getUserProjects(userId);
    return sendSuccess(res, 'User projects retrieved', projects);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch projects', 500);
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const project = await ProjectService.createProject(userId, req.body);
    return sendSuccess(res, 'Project added successfully', project, 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to create project', 400);
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const projectId = req.params.id as string;
    const updated = await ProjectService.updateProject(userId, projectId, req.body);
    return sendSuccess(res, 'Project updated successfully', updated);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update project', 400);
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const projectId = req.params.id as string;
    await ProjectService.deleteProject(userId, projectId);
    return sendSuccess(res, 'Project removed successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to delete project', 400);
  }
};
