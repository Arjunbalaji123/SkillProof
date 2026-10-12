import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { signToken } from '../utils/jwt.js';

export class AuthService {
  static async register(data: { name: string; username?: string; email: string; password: string; role?: string }) {
    const emailNormalized = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    // Sanitize or use username
    let usernameNormalized = data.username
      ? data.username.trim().toLowerCase()
      : data.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);

    // Validate regex: 3-20 chars, ^[a-z0-9_]+$
    if (!/^[a-z0-9_]{3,20}$/.test(usernameNormalized)) {
      throw new Error('Username must be 3-20 characters long, containing only lowercase letters, numbers, and underscores.');
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: usernameNormalized },
    });
    if (existingUsername) {
      throw new Error('Username is already taken.');
    }

    // Default role is DEVELOPER; prevent self-assigning ADMIN unless specified
    const assignedRole = data.role && ['DEVELOPER', 'RECRUITER'].includes(data.role.toUpperCase())
      ? data.role.toUpperCase()
      : 'DEVELOPER';

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        username: usernameNormalized,
        email: emailNormalized,
        passwordHash,
        role: assignedRole,
        profile: assignedRole === 'DEVELOPER' ? {
          create: {
            publicSlug: usernameNormalized,
            bio: 'Software developer exploring verified skill benchmarks.',
            isPublic: true,
            showOnLeaderboard: true,
          },
        } : undefined,
      },
      include: {
        profile: true,
      },
    });

    await logAudit(user.id, 'USER_REGISTER', 'User', user.id, { role: user.role, username: user.username });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
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
      username: user.username,
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
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile,
    };
  }
}
