import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { AuthRequest } from '../middleware/auth.js';
import { verifyToken } from '../utils/jwt.js';

const COOKIE_NAME = 'sp_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE,
});

export const setSessionCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  });
};

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Validation failed',
          errors,
        });
      }

      const { user, token } = await AuthService.register({
        name: parsed.data.name,
        username: parsed.data.username,
        email: parsed.data.email,
        password: parsed.data.password,
        role: parsed.data.role,
        companyName: parsed.data.companyName,
        jobTitle: parsed.data.jobTitle,
        companyWebsite: parsed.data.companyWebsite,
        linkedinUrl: parsed.data.linkedinUrl,
        bio: parsed.data.bio,
      });

      setSessionCookie(res, token);

      return res.status(201).json({
        success: true,
        data: { user },
        message:
          user.role === 'RECRUITER'
            ? 'Registration successful. Your recruiter account is pending approval.'
            : 'Registration successful',
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Registration failed',
        message: err.message || 'Registration failed',
        ...(err.field ? { errors: [{ field: err.field, message: err.message }] } : {}),
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Validation failed',
          errors,
        });
      }

      const { user, token } = await AuthService.login({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      setSessionCookie(res, token);

      return res.status(200).json({
        success: true,
        data: { user, token },
        message: 'Login successful',
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Login failed',
        message: err.message || 'Login failed',
      });
    }
  }

  static async logout(req: Request, res: Response) {
    clearSessionCookie(res);
    return res.status(200).json({
      success: true,
      data: null,
      message: 'Logged out successfully',
    });
  }

  static async session(req: AuthRequest, res: Response) {
    try {
      // Check if user is already loaded by middleware
      if (req.user) {
        return res.status(200).json({
          success: true,
          data: { user: AuthService.sanitizeUser(req.user) },
        });
      }

      // Check cookie directly
      const token =
        req.cookies?.sp_session ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.substring(7)
          : null);

      if (!token) {
        return res.status(200).json({
          success: true,
          data: { user: null },
        });
      }

      try {
        const payload = verifyToken(token);
        const user = await AuthService.getSession(payload.userId);
        if (!user) {
          clearSessionCookie(res);
          return res.status(200).json({
            success: true,
            data: { user: null },
          });
        }

        return res.status(200).json({
          success: true,
          data: { user },
        });
      } catch {
        clearSessionCookie(res);
        return res.status(200).json({
          success: true,
          data: { user: null },
        });
      }
    } catch (err: any) {
      return res.status(200).json({
        success: true,
        data: { user: null },
      });
    }
  }

  static async checkUsername(req: Request, res: Response) {
    try {
      const u = (req.query.u || '').toString();
      const available = await AuthService.checkUsername(u);
      return res.status(200).json({
        success: true,
        data: { available },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify username availability',
        message: 'Failed to verify username availability',
      });
    }
  }
}

