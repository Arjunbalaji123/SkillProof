import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { signToken } from '../utils/jwt.js';

export class AuthService {
  static async register(data: {
    name: string;
    username?: string;
    email: string;
    password: string;
    role?: string;
    companyName?: string;
    jobTitle?: string;
    companyWebsite?: string;
    linkedinUrl?: string;
    bio?: string;
  }) {
    const emailNormalized = (data.email || '').trim().toLowerCase();

    // Do NOT generate username or publicSlug from data.name. Require explicit username.
    const usernameNormalized = (data.username || '').trim().toLowerCase();

    // Validate regex: 3-20 chars, ^[a-z0-9_]+$
    if (!/^[a-z0-9_]{3,20}$/.test(usernameNormalized)) {
      const err: any = new Error(
        'Username must be 3-20 characters long, containing only lowercase letters, numbers, and underscores.'
      );
      err.statusCode = 400;
      throw err;
    }

    const assignedRole =
      data.role && ['DEVELOPER', 'RECRUITER'].includes(data.role.toUpperCase())
        ? data.role.toUpperCase()
        : 'DEVELOPER';

    if (assignedRole === 'RECRUITER') {
      if (!data.companyName || data.companyName.trim().length < 2 || !data.jobTitle || data.jobTitle.trim().length < 2) {
        const err: any = new Error(
          'Registration as RECRUITER requires companyName and jobTitle.'
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: emailNormalized },
    });

    if (existingEmail) {
      const err: any = new Error('Email already in use. Please sign in.');
      err.statusCode = 409;
      throw err;
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: usernameNormalized },
    });
    if (existingUsername) {
      const err: any = new Error('Username already taken');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const createAccountInTx = async (slugToUse: string) => {
      return prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: data.name.trim(),
            username: usernameNormalized,
            email: emailNormalized,
            passwordHash,
            role: assignedRole,
          },
        });

        let createdProfile = null;
        let createdRecruiterProfile = null;

        if (assignedRole === 'DEVELOPER') {
          createdProfile = await tx.developerProfile.create({
            data: {
              userId: createdUser.id,
              publicSlug: slugToUse,
              bio: data.bio?.trim() || 'Software developer exploring verified skill benchmarks.',
              isPublic: true,
              showOnLeaderboard: true,
              allowRecruiterMessages: true,
              notificationsPaused: false,
            },
          });
        } else if (assignedRole === 'RECRUITER') {
          createdRecruiterProfile = await tx.recruiterProfile.create({
            data: {
              userId: createdUser.id,
              companyName: data.companyName!.trim(),
              jobTitle: data.jobTitle!.trim(),
              companyWebsite: data.companyWebsite?.trim() || null,
              linkedinUrl: data.linkedinUrl?.trim() || null,
              bio: data.bio?.trim() || null,
              isVerified: false,
            },
          });
        }

        return {
          ...createdUser,
          profile: createdProfile,
          recruiterProfile: createdRecruiterProfile,
        };
      });
    };

    let user;
    try {
      user = await createAccountInTx(usernameNormalized);
    } catch (err: any) {
      const isP2002 =
        err?.code === 'P2002' ||
        (typeof err?.message === 'string' && err.message.includes('Unique constraint failed'));
      if (isP2002) {
        const target = Array.isArray(err?.meta?.target)
          ? err.meta.target.join(',')
          : String(err?.meta?.target || err?.message || '');

        if (target.includes('publicSlug')) {
          const staleProfile = await prisma.developerProfile.findUnique({
            where: { publicSlug: usernameNormalized },
            include: { user: true },
          });
          if (staleProfile && staleProfile.user && staleProfile.user.username !== usernameNormalized) {
            await prisma.developerProfile.update({
              where: { id: staleProfile.id },
              data: { publicSlug: staleProfile.user.username },
            });
            user = await createAccountInTx(usernameNormalized);
          } else {
            const suffix = Math.floor(100 + Math.random() * 900);
            const retrySlug = `${usernameNormalized}_${suffix}`;
            user = await createAccountInTx(retrySlug);
          }
        } else if (target.includes('username')) {
          const friendly: any = new Error('Username already taken');
          friendly.statusCode = 409;
          throw friendly;
        } else if (target.includes('email')) {
          const friendly: any = new Error('Email already in use. Please sign in.');
          friendly.statusCode = 409;
          throw friendly;
        } else {
          const friendly: any = new Error('An account with these details already exists.');
          friendly.statusCode = 409;
          throw friendly;
        }
      } else {
        console.error('[AuthService.register Error]:', err);
        const friendly: any = new Error('Registration could not be completed. Please try again.');
        friendly.statusCode = err?.statusCode || 500;
        throw friendly;
      }
    }

    await logAudit(user.id, 'USER_REGISTER', 'User', user.id, {
      role: user.role,
      username: user.username,
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    return { user, token };
  }

  static async login(data: { email: string; password: string }) {
    const emailNormalized = (data.email || '').trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: emailNormalized },
      include: {
        profile: true,
        recruiterProfile: true,
        interests: true,
      },
    });

    if (!user) {
      const allMatching = await prisma.user.findMany({
        include: { profile: true, recruiterProfile: true, interests: true },
      });
      user = allMatching.find((u) => u.email.trim().toLowerCase() === emailNormalized) || null;
    }

    if (!user || !user.passwordHash) {
      const err: any = new Error('Invalid email or password credentials');
      err.statusCode = 401;
      throw err;
    }

    if (user.status === 'SUSPENDED') {
      const err: any = new Error('Account suspended. Please contact platform administrators.');
      err.statusCode = 403;
      throw err;
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      const err: any = new Error('Invalid email or password credentials');
      err.statusCode = 401;
      throw err;
    }

    if (user.role === 'DEVELOPER' && !user.profile) {
      const fallbackSlug =
        user.username || emailNormalized.split('@')[0].replace(/[^a-z0-9_]/g, '_');
      const createdProfile = await prisma.developerProfile.create({
        data: {
          userId: user.id,
          bio: 'Software Engineer',
          publicSlug: fallbackSlug,
          isPublic: true,
          showOnLeaderboard: true,
          allowRecruiterMessages: true,
          notificationsPaused: false,
        },
      });
      user = { ...user, profile: createdProfile };
    } else if (user.role === 'RECRUITER' && !user.recruiterProfile) {
      const createdRecProfile = await prisma.recruiterProfile.create({
        data: {
          userId: user.id,
          companyName: 'SkillProof Partner',
          jobTitle: 'Technical Recruiter',
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
      user = { ...user, recruiterProfile: createdRecProfile };
    }

    await logAudit(user.id, 'USER_LOGIN', 'User', user.id);

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username || emailNormalized.split('@')[0],
    });

    return { user, token };
  }

  static async getSession(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        recruiterProfile: true,
        interests: true,
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
      isDemo: user.isDemo,
      profile: user.profile,
      recruiterProfile: user.recruiterProfile,
      interests: user.interests,
    };
  }
}
