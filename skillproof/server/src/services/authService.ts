import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { logAudit } from '../utils/audit.js';

// Precomputed bcrypt cost 10 hash used to defend against timing attacks when user does not exist
const DUMMY_HASH = '$2a$10$wK1nKqEa6vQzE5Xn4k0kQ.7sWJgW5Q1vYQxG5mZzBwK1nKqEa6vQz';

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'DEVELOPER' | 'RECRUITER';
  companyName?: string;
  jobTitle?: string;
  companyWebsite?: string;
  linkedinUrl?: string;
  bio?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Cleans user record for client consumption (never returning passwordHash).
   */
  static sanitizeUser(user: any, profile?: any, recruiterProfile?: any) {
    const { passwordHash, ...safeUser } = user;
    return {
      ...safeUser,
      profile: profile !== undefined ? profile : user.profile || null,
      recruiterProfile: recruiterProfile !== undefined ? recruiterProfile : user.recruiterProfile || null,
    };
  }

  /**
   * Registers a new user with single-transaction guarantee.
   */
  static async register(data: RegisterInput) {
    if (data.role !== 'DEVELOPER' && data.role !== 'RECRUITER') {
      const err: any = new Error('Role must be DEVELOPER or RECRUITER');
      err.statusCode = 400;
      err.field = 'role';
      throw err;
    }

    if (data.role === 'RECRUITER') {
      if (!data.companyName || data.companyName.trim().length === 0) {
        const err: any = new Error('Company name is required for recruiter registration');
        err.statusCode = 400;
        err.field = 'companyName';
        throw err;
      }
      if (!data.jobTitle || data.jobTitle.trim().length === 0) {
        const err: any = new Error('Job title is required for recruiter registration');
        err.statusCode = 400;
        err.field = 'jobTitle';
        throw err;
      }
    }

    const email = data.email.trim().toLowerCase();
    const username = data.username.trim().toLowerCase();
    const name = data.name.trim();

    // Hash password with bcrypt cost 10, exactly once
    const passwordHash = await bcrypt.hash(data.password, 10);

    let createdUser: any;
    let createdProfile: any = null;
    let createdRecruiterProfile: any = null;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            username,
            name,
            passwordHash,
            role: data.role,
            status: 'ACTIVE',
            failedLoginCount: 0,
          },
        });

        if (data.role === 'RECRUITER') {
          const recProfile = await tx.recruiterProfile.create({
            data: {
              userId: newUser.id,
              companyName: data.companyName!.trim(),
              jobTitle: data.jobTitle!.trim(),
              companyWebsite: data.companyWebsite || null,
              linkedinUrl: data.linkedinUrl || null,
              bio: data.bio || null,
              isVerified: false,
            },
          });
          return { user: newUser, profile: null, recruiterProfile: recProfile };
        } else {
          const devProfile = await tx.developerProfile.create({
            data: {
              userId: newUser.id,
              bio: data.bio || 'Software developer exploring verified skill benchmarks.',
              githubUrl: null,
              isPublic: true,
              showOnLeaderboard: true,
              allowRecruiterMessages: true,
              notificationsPaused: false,
            },
          });
          return { user: newUser, profile: devProfile, recruiterProfile: null };
        }
      });

      createdUser = result.user;
      createdProfile = result.profile;
      createdRecruiterProfile = result.recruiterProfile;
    } catch (err: any) {
      if (err.code === 'P2002') {
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(',')
          : String(err.meta?.target || err.message || '');

        if (target.includes('username')) {
          const friendly: any = new Error('Username already taken');
          friendly.statusCode = 409;
          friendly.field = 'username';
          throw friendly;
        } else if (target.includes('email')) {
          const friendly: any = new Error('Email already in use. Please sign in.');
          friendly.statusCode = 409;
          friendly.field = 'email';
          throw friendly;
        } else {
          const friendly: any = new Error('A record with these details already exists.');
          friendly.statusCode = 409;
          throw friendly;
        }
      }

      console.error('[AuthService.register Error]:', err);
      const friendly: any = new Error('Registration could not be completed. Please try again.');
      friendly.statusCode = err?.statusCode || 500;
      throw friendly;
    }

    await logAudit(createdUser.id, 'USER_REGISTER', 'User', createdUser.id, {
      role: createdUser.role,
      username: createdUser.username,
    });

    const token = signToken({
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      username: createdUser.username,
    });

    return {
      user: this.sanitizeUser(createdUser, createdProfile, createdRecruiterProfile),
      token,
    };
  }

  /**
   * Logs in a user with timing-attack defense, lockout policy, and 401 error parity.
   */
  static async login(data: LoginInput) {
    const emailNormalized = (data.email || '').trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
      include: {
        profile: true,
        recruiterProfile: true,
      },
    });

    // Timing-attack defense: always run bcrypt.compare even if user does not exist
    if (!user || !user.passwordHash) {
      await bcrypt.compare(data.password, DUMMY_HASH);
      const err: any = new Error('Incorrect email or password');
      err.statusCode = 401;
      throw err;
    }

    // Account lockout policy
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000))
      );
      const err: any = new Error(`Too many failed attempts. Try again in ${remainingMinutes} minutes`);
      err.statusCode = 423;
      throw err;
    }

    // Suspended check
    if (user.status === 'SUSPENDED') {
      const err: any = new Error('This account is suspended');
      err.statusCode = 403;
      throw err;
    }

    // Verify password
    const validPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!validPassword) {
      const newFailedCount = (user.failedLoginCount || 0) + 1;

      if (newFailedCount >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: newFailedCount,
            lockedUntil,
          },
        });
        const err: any = new Error('Too many failed attempts. Try again in 15 minutes');
        err.statusCode = 423;
        throw err;
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: newFailedCount },
        });
        const err: any = new Error('Incorrect email or password');
        err.statusCode = 401;
        throw err;
      }
    }

    // Password is valid - reset lock and update lastLoginAt
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
      include: {
        profile: true,
        recruiterProfile: true,
      },
    });

    // Ensure user always has matching profile for its role
    let profile = updatedUser.profile;
    let recruiterProfile = updatedUser.recruiterProfile;

    if (updatedUser.role === 'DEVELOPER' && !profile) {
      profile = await prisma.developerProfile.create({
        data: {
          userId: updatedUser.id,
          bio: 'Software Engineer',
          isPublic: true,
          showOnLeaderboard: true,
          allowRecruiterMessages: true,
          notificationsPaused: false,
        },
      });
    } else if (updatedUser.role === 'RECRUITER' && !recruiterProfile) {
      recruiterProfile = await prisma.recruiterProfile.create({
        data: {
          userId: updatedUser.id,
          companyName: 'SkillProof Partner',
          jobTitle: 'Technical Recruiter',
          isVerified: false,
        },
      });
    }

    await logAudit(updatedUser.id, 'USER_LOGIN', 'User', updatedUser.id);

    const token = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      username: updatedUser.username,
    });

    return {
      user: this.sanitizeUser(updatedUser, profile, recruiterProfile),
      token,
    };
  }

  /**
   * Retrieves active session details for a given userId.
   */
  static async getSession(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        recruiterProfile: true,
      },
    });

    if (!user || user.status === 'SUSPENDED') {
      return null;
    }

    return this.sanitizeUser(user);
  }

  /**
   * Checks if a username is available.
   */
  static async checkUsername(username: string): Promise<boolean> {
    const normalized = (username || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      return false;
    }
    const existing = await prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true },
    });
    return !existing;
  }
}

