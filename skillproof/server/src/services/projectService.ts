import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export class ProjectService {
  static async getUserProjects(userId: string) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required to fetch projects');
    }
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createProject(userId: string, data: { title: string; description: string; repoUrl?: string; techStack: string }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required to create a project');
    }
    const project = await prisma.project.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        repoUrl: data.repoUrl || null,
        techStack: data.techStack,
      },
    });

    await logAudit(userId, 'PROJECT_CREATED', 'Project', project.id, { title: project.title });
    return project;
  }

  static async updateProject(userId: string, projectId: string, data: Partial<{ title: string; description: string; repoUrl?: string; techStack: string }>) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required to update a project');
    }
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Project not found or unauthorized');
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    await logAudit(userId, 'PROJECT_UPDATED', 'Project', projectId, data);
    return updated;
  }

  static async deleteProject(userId: string, projectId: string) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required to delete a project');
    }
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Project not found or unauthorized');
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    await logAudit(userId, 'PROJECT_DELETED', 'Project', projectId);
    return { success: true };
  }
}

