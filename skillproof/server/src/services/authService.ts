import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { signToken } from '../utils/jwt.js';

export class AuthService {
  static async register(data: { name: string; email: string; password: string; role?: string }) {
    const emailNormalized = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    // Default role is DEVELOPER; prevent self-assigning ADMIN unless specified
    const assignedRole = data.role && ['DEVELOPER', 'RECRUITER'].includes(data.role.toUpperCase())
      ? data.role.toUpperCase()
      : 'DEVELOPER';

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: emailNormalized,
        passwordHash,
        role: assignedRole,
        profile: assignedRole === 'DEVELOPER' ? {
          create: {
            publicSlug: data.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7),
            bio: 'Software developer exploring verified skill benchmarks.',
            isPublic: true,
          },
        } : undefined,
      },
      include: {
        profile: true,
      },
    });

    await logAudit(user.id, 'USER_REGISTER', 'User', user.id, { role: user.role });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.name,
    });

    return { user, token };
  }

  static async login(data: { email: string; password: string }) {
    const emailNormalized = data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or password credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('Account suspended. Please contact platform administrators.');
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      throw new Error('Invalid email or password credentials');
    }

    await logAudit(user.id, 'USER_LOGIN', 'User', user.id);

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.name,
    });

    return { user, token };
  }

  static async getSession(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user || user.status === 'SUSPENDED') {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile,
    };
  }
}
