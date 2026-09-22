import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { logAudit } from '../utils/audit.js';
import { AuthRequest } from '../middleware/auth.js';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return sendError(res, 'Email address is already registered', 409);
    }

    const baseUsername = validated.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let username = baseUsername;
    let count = 1;
    while (await prisma.profile.findUnique({ where: { username } })) {
      username = `${baseUsername}${count++}`;
    }

    const password_hash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password_hash,
        role: validated.role,
        status: 'ACTIVE',
        profile: {
          create: {
            name: validated.name,
            username,
            profile_completion: 20,
          },
        },
      },
      include: { profile: true },
    });

    await logAudit(user.id, 'USER_REGISTERED', 'USER', user.id, { role: user.role });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.profile?.username,
    });

    return sendSuccess(res, 'User registered successfully', {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.profile,
      },
    }, 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: { profile: true },
    });

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (user.status === 'SUSPENDED') {
      return sendError(res, 'Your account has been suspended. Please contact admin support.', 403);
    }

    const isMatch = await bcrypt.compare(validated.password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    await logAudit(user.id, 'USER_LOGIN', 'USER', user.id);

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.profile?.username,
    });

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        profile: {
          include: {
            user_skills: { include: { skill: true } },
            projects: { include: { technologies: true } },
            education: true,
            certifications: true,
            achievements: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const { password_hash, ...userWithoutPassword } = user;

    return sendSuccess(res, 'Current user retrieved successfully', userWithoutPassword);
  } catch (err) {
    next(err);
  }
};

