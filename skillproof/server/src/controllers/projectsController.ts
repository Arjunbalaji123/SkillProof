import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { projectSchema } from '../validators/index.js';
import { calculateProfileCompletion } from '../utils/completion.js';
import { logAudit } from '../utils/audit.js';
import { verifyResourceOwnership } from '../middleware/ownership.js';

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const projects = await prisma.project.findMany({
      where: { profile_id: profile.id },
      include: { technologies: true },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, 'Projects retrieved successfully', projects);
  } catch (err) {
    next(err);
  }
};

export const getProjectById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        technologies: true,
        profile: {
          select: { name: true, username: true, profile_image: true },
        },
      },
    });

    if (!project) return sendError(res, 'Project not found', 404);

    return sendSuccess(res, 'Project details retrieved successfully', project);
  } catch (err) {
    next(err);
  }
};

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const validated = projectSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
    if (!profile) return sendError(res, 'Profile not found', 404);

    const project = await prisma.project.create({
      data: {
        profile_id: profile.id,
        title: validated.title,
        description: validated.description,
        github_url: validated.github_url || null,
        live_url: validated.live_url || null,
        start_date: validated.start_date || null,
        end_date: validated.end_date || null,
        status: validated.status,
        technologies: {
          create: validated.technologies.map((tech) => ({ technology_name: tech })),
        },
      },
      include: { technologies: true },
    });

    await calculateProfileCompletion(profile.id);
    await logAudit(userId, 'PROJECT_CREATED', 'PROJECT', project.id, { title: project.title });

    return sendSuccess(res, 'Project created successfully', project, 201);
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id as string;
    const validated = projectSchema.parse(req.body);

    const ownership = await verifyResourceOwnership('project', projectId, userId, res);
    if (!ownership) return;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.projectTechnology.deleteMany({ where: { project_id: projectId } });
      return tx.project.update({
        where: { id: projectId },
        data: {
          title: validated.title,
          description: validated.description,
          github_url: validated.github_url || null,
          live_url: validated.live_url || null,
          start_date: validated.start_date || null,
          end_date: validated.end_date || null,
          status: validated.status,
          technologies: {
            create: validated.technologies.map((tech) => ({ technology_name: tech })),
          },
        },
        include: { technologies: true },
      });
    });

    return sendSuccess(res, 'Project updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id as string;

    const ownership = await verifyResourceOwnership('project', projectId, userId, res);
    if (!ownership) return;

    await prisma.project.delete({ where: { id: projectId } });
    await calculateProfileCompletion(ownership.profileId);
    await logAudit(userId, 'PROJECT_DELETED', 'PROJECT', projectId);

    return sendSuccess(res, 'Project deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const uploadProjectImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id as string;

    if (!req.file) return sendError(res, 'No image file uploaded', 400);

    const ownership = await verifyResourceOwnership('project', projectId, userId, res);
    if (!ownership) return;

    const imageUrl = `/uploads/${req.file.filename}`;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { image: imageUrl },
      include: { technologies: true },
    });

    return sendSuccess(res, 'Project image uploaded successfully', updated);
  } catch (err) {
    next(err);
  }
};

